import type { Cliente, Motocicleta, MovimientoOrden } from "@/types/motoflow";
import { currency, shortDate } from "@/utils/format";

function normalizePhoneForWhatsApp(phone?: string) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.length === 10 ? `52${digits}` : digits;
}

export function buildWorkHistoryWhatsAppMessage({
  cliente,
  moto,
  historial,
}: {
  cliente?: Pick<Cliente, "nombre" | "telefono">;
  moto: Motocicleta;
  historial: MovimientoOrden[];
}) {
  const publicHistory = historial.filter((movimiento) => movimiento.publico).slice(0, 6);
  const total = publicHistory.reduce((sum, movimiento) => sum + (Number(movimiento.costo) || 0), 0);
  const portalUrl = `${window.location.origin}/consulta/${encodeURIComponent(moto.placas)}`;
  const lines = [
    `Hola ${cliente?.nombre || "cliente"}, te compartimos el avance de tu moto ${moto.marca} ${moto.modelo}.`,
    ``,
    `Placas: ${moto.placas}`,
    `Estado: ${moto.estado_operativo?.replaceAll("_", " ") || "en trabajo"}`,
    `Salida estimada: ${moto.fecha_estimada_salida ? shortDate(moto.fecha_estimada_salida) : "por confirmar"}`,
    total > 0 ? `Cotizacion acumulada: ${currency(total)}` : "",
    ``,
    `Historial reciente:`,
    ...publicHistory.map((movimiento, index) => {
      const cost = movimiento.costo ? ` (${currency(movimiento.costo)})` : "";
      const note = movimiento.nota ? ` - ${movimiento.nota.replace(/\s+/g, " ").slice(0, 160)}` : "";
      return `${index + 1}. ${movimiento.titulo}${cost}${note}`;
    }),
    ``,
    `Puedes consultar el detalle aqui: ${portalUrl}`,
    ``,
    `Taller de Motos Villa`,
  ];

  return lines.filter((line) => line !== "").join("\n");
}

export function buildWhatsAppUrl(phone: string | undefined, message: string) {
  const normalized = normalizePhoneForWhatsApp(phone);
  if (!normalized) return "";
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
