import { supabase } from "@/lib/supabase";
import type { Cliente, EstadoOrden, Motocicleta, NotificacionCliente, OrdenTrabajo } from "@/types/motoflow";
import { estadoLabels } from "@/utils/format";

type NotificationInput = {
  tallerId?: string;
  cliente?: Cliente;
  moto?: Motocicleta;
  orden: OrdenTrabajo;
  estado: EstadoOrden;
};

type NotificationPayload = {
  taller_id: string;
  cliente_id: string;
  orden_id: string;
  canal: "whatsapp";
  telefono: string;
  mensaje: string;
  estado: NotificacionCliente["estado"];
  evento: EstadoOrden | "orden_recibida";
  proveedor?: string | null;
  proveedor_message_id?: string | null;
  error?: string | null;
  enviado_at?: string | null;
};

function getPublicAppUrl() {
  const configured = import.meta.env.VITE_PUBLIC_APP_URL as string | undefined;
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

function getProvider() {
  return (import.meta.env.VITE_WHATSAPP_PROVIDER as string | undefined)?.trim();
}

function hasNotificationId(value: unknown): value is NotificacionCliente {
  return Boolean(value && typeof value === "object" && "id" in value);
}

function eventForStatus(estado: EstadoOrden): EstadoOrden | "orden_recibida" {
  return estado === "recibida" ? "orden_recibida" : estado;
}

export function buildOrderStatusMessage({ cliente, moto, orden, estado }: NotificationInput) {
  const clienteNombre = cliente?.nombre ?? "cliente";
  const motoLabel = moto ? `${moto.marca} ${moto.modelo}` : "tu moto";
  const estadoLegible = estadoLabels[estado] ?? estado.replaceAll("_", " ");
  const portalUrl = `${getPublicAppUrl()}/consulta/${encodeURIComponent(moto?.placas || orden.codigo_publico)}`;

  if (estado === "lista") {
    return `Hola ${clienteNombre}, tu moto ${motoLabel} ya esta lista para entrega.\nPuedes consultar el estado aqui: ${portalUrl}`;
  }

  if (estado === "esperando_autorizacion") {
    return `Hola ${clienteNombre}, tu moto ${motoLabel} ya fue revisada y esta esperando tu autorizacion.\nPuedes consultar el avance aqui: ${portalUrl}`;
  }

  return `Hola ${clienteNombre}, te contactamos del taller para actualizarte sobre tu moto ${motoLabel}.\nEl estado actual de tu servicio es: ${estadoLegible}.\nPuedes consultar el avance aqui: ${portalUrl}`;
}

export async function sendWhatsAppNotificationMock(notification: Pick<NotificationPayload, "telefono" | "mensaje" | "evento">) {
  console.info("[MotoFlow] Notificacion WhatsApp simulada", {
    telefono: notification.telefono,
    evento: notification.evento,
    mensaje: notification.mensaje,
  });

  return {
    estado: "omitido" as const,
    proveedor: "mock",
    proveedor_message_id: null,
    error: "Envio real pendiente de configurar proveedor WhatsApp.",
    enviado_at: new Date().toISOString(),
  };
}

async function sendWhatsAppNotificationViaProvider(notification: NotificacionCliente) {
  if (!supabase) throw new Error("Supabase no esta configurado para invocar la funcion de WhatsApp.");

  const { data, error } = await supabase.functions.invoke("send-whatsapp-notification", {
    body: { notification_id: notification.id },
  });

  if (error) throw error;
  return data as { ok: boolean; estado?: NotificacionCliente["estado"]; proveedor_message_id?: string; error?: string };
}

export async function createOrderStatusNotification(input: NotificationInput) {
  const { tallerId, cliente, orden, estado } = input;
  const evento = eventForStatus(estado);

  if (!cliente?.id) return { ok: false as const, reason: "cliente_no_encontrado" };
  if (!cliente.telefono) return { ok: false as const, reason: "cliente_sin_telefono" };
  if (cliente.acepta_notificaciones === false) return { ok: false as const, reason: "cliente_no_acepta" };
  if (orden.ultima_notificacion_estado === estado) return { ok: false as const, reason: "estado_ya_notificado" };

  const mensaje = buildOrderStatusMessage(input);
  const provider = getProvider();

  if (!supabase || !tallerId) {
    const mock = await sendWhatsAppNotificationMock({ telefono: cliente.telefono, mensaje, evento });
    return { ok: true as const, notification: { ...mock, mensaje, telefono: cliente.telefono, evento } };
  }

  const { data: existing, error: existingError } = await supabase
    .from("notificaciones_cliente")
    .select("id")
    .eq("orden_id", orden.id)
    .eq("evento", evento)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return { ok: false as const, reason: "notificacion_duplicada" };

  const payload: NotificationPayload = {
    taller_id: tallerId,
    cliente_id: cliente.id,
    orden_id: orden.id,
    canal: "whatsapp",
    telefono: cliente.telefono,
    mensaje,
    estado: "pendiente",
    evento,
    proveedor: provider || null,
    proveedor_message_id: null,
    error: null,
    enviado_at: null,
  };

  const { data, error } = await supabase
    .from("notificaciones_cliente")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return { ok: true as const, notification: data as NotificacionCliente };
}

export async function notifyOrderStatusChange(input: NotificationInput) {
  try {
    const created = await createOrderStatusNotification(input);
    if (!created.ok) return created;

    const provider = getProvider();
    if (!provider || !supabase || !hasNotificationId(created.notification)) {
      const mock = await sendWhatsAppNotificationMock({
        telefono: input.cliente?.telefono ?? "",
        mensaje: "mensaje" in created.notification ? created.notification.mensaje : buildOrderStatusMessage(input),
        evento: eventForStatus(input.estado),
      });

      if (supabase && hasNotificationId(created.notification)) {
        await supabase
          .from("notificaciones_cliente")
          .update(mock)
          .eq("id", created.notification.id);
      }

      return { ok: true as const, notification: created.notification };
    }

    const sent = await sendWhatsAppNotificationViaProvider(created.notification);
    if (!sent.ok) {
      return { ok: false as const, reason: "provider_error", error: sent.error };
    }

    console.info("[MotoFlow] Notificacion WhatsApp enviada con proveedor", provider, sent);
    return { ok: true as const, notification: created.notification };
  } catch (error) {
    console.error("[MotoFlow] No se pudo generar notificacion de cliente", error);
    return { ok: false as const, reason: "error", error };
  }
}
