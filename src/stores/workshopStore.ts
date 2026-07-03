import { create } from "zustand";
import { persist } from "zustand/middleware";
import { mockData } from "@/lib/mockData";
import { notifyOrderStatusChange, notifyWorkUpdate } from "@/lib/notifications";
import { allowLocalMode, hasSupabaseCredentials, storageBucket, supabase } from "@/lib/supabase";
import type { Cliente, Cotizacion, EstadoOperativo, EstadoOrden, Evidencia, GastoBalance, Motocicleta, MovimientoOrden, NotificacionCliente, OrdenTrabajo, PrioridadTrabajo, TamanoTrabajo, TipoEvidencia, TipoTrabajo, WorkshopState } from "@/types/motoflow";
import { createPublicCode, uid } from "@/utils/format";

type NewCliente = Omit<Cliente, "id" | "taller_id" | "created_at" | "updated_at">;
type NewMoto = Omit<Motocicleta, "id" | "taller_id" | "created_at" | "updated_at">;
type NewOrden = Omit<OrdenTrabajo, "id" | "taller_id" | "created_at" | "updated_at" | "codigo_publico"> & {
  codigo_publico?: string;
};
type NewCotizacion = Omit<Cotizacion, "id" | "taller_id" | "created_at" | "updated_at" | "folio" | "fecha" | "estado"> & {
  folio?: string;
  fecha?: string;
  estado?: Cotizacion["estado"];
};
type NewGastoBalance = Omit<GastoBalance, "id" | "taller_id" | "created_at" | "updated_at">;

type Store = WorkshopState & {
  usingSupabase: boolean;
  isLoading: boolean;
  error?: string;
  tallerId?: string;
  loadFromSupabase: () => Promise<void>;
  addCliente: (data: NewCliente) => Promise<void>;
  updateCliente: (id: string, data: NewCliente) => Promise<void>;
  deleteCliente: (id: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  addMoto: (data: NewMoto) => Promise<void>;
  updateMoto: (id: string, data: NewMoto) => Promise<void>;
  activateMoto: (id: string) => Promise<void>;
  deactivateMoto: (id: string) => Promise<void>;
  updateMotoFechaEstimada: (id: string, fecha_estimada_salida: string) => Promise<void>;
  updateMotoTrabajo: (id: string, data: { prioridad_trabajo?: PrioridadTrabajo; tipo_trabajo?: TipoTrabajo; estado_operativo?: EstadoOperativo; tamano_trabajo?: TamanoTrabajo }) => Promise<void>;
  deleteMoto: (id: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  addOrden: (data: NewOrden) => Promise<void>;
  addCotizacion: (data: NewCotizacion) => Promise<void>;
  deleteCotizacion: (id: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  addGastoBalance: (data: NewGastoBalance) => Promise<void>;
  deleteGastoBalance: (id: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  updateOrden: (id: string, data: NewOrden) => Promise<void>;
  updateFechaEstimada: (id: string, fecha_estimada: string) => Promise<void>;
  changeOrderStatus: (id: string, estado: EstadoOrden) => Promise<void>;
  addMovimiento: (data: {
    orden_id?: string;
    moto_id?: string;
    tipo: MovimientoOrden["tipo"];
    titulo: string;
    nota?: string;
    publico: boolean;
    costo?: number;
    refaccion?: string;
    costo_refaccion?: number;
    costo_mano_obra?: number;
    kilometraje?: number;
    estado_nuevo?: EstadoOrden;
    ciclo_trabajo_id?: string;
  }) => Promise<MovimientoOrden | undefined>;
  deleteMovimiento: (id: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  addEvidence: (data: { orden_id?: string; moto_id?: string; movimiento_id?: string; tipo: TipoEvidencia; nota?: string; publico?: boolean; file: File }) => Promise<void>;
  getCliente: (id: string) => Cliente | undefined;
  getMoto: (id: string) => Motocicleta | undefined;
  getOrden: (id: string) => OrdenTrabajo | undefined;
};

const localTallerId = "local-taller";

function stamp() {
  return new Date().toISOString();
}

function withBase<T extends object>(prefix: string, data: T, taller_id = localTallerId) {
  const at = stamp();
  return {
    ...data,
    id: uid(prefix),
    taller_id,
    created_at: at,
    updated_at: at,
  };
}

function motoEntradaText(moto: Pick<Motocicleta, "marca" | "modelo" | "anio" | "placas" | "color" | "kilometraje" | "numero_serie">) {
  return [
    `Moto recibida dentro del taller.`,
    `Unidad: ${moto.marca} ${moto.modelo} ${moto.anio}.`,
    `Placas: ${moto.placas}.`,
    `Color: ${moto.color}.`,
    `Kilometraje: ${moto.kilometraje.toLocaleString()} km.`,
    moto.numero_serie ? `Serie: ${moto.numero_serie}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function withTrabajoDefaults<T extends Partial<Motocicleta>>(data: T) {
  return {
    ...data,
    activa: data.activa ?? true,
    ciclo_trabajo_id: data.ciclo_trabajo_id ?? uid("trabajo"),
    prioridad_trabajo: data.prioridad_trabajo ?? "media",
    tipo_trabajo: data.tipo_trabajo ?? "diagnostico",
    estado_operativo: data.estado_operativo ?? "recibida",
    tamano_trabajo: data.tamano_trabajo ?? "medio",
  };
}

function motoPayload(data: NewMoto) {
  const payload = withTrabajoDefaults(data);
  return {
    ...payload,
    fecha_estimada_salida: payload.fecha_estimada_salida || null,
    numero_serie: payload.numero_serie || null,
  };
}

async function requireTallerId(_current?: string) {
  if (!supabase && !allowLocalMode) throw new Error("Supabase no esta configurado. No se puede guardar en la base de datos.");
  if (!supabase) return localTallerId;

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error("Inicia sesion con un usuario de Supabase para guardar datos reales del taller.");
  }

  const { data: perfil, error: perfilError } = await supabase
    .from("perfiles")
    .select("taller_id")
    .eq("user_id", sessionData.session.user.id)
    .maybeSingle();

  if (perfilError) throw perfilError;
  if (perfil?.taller_id) return perfil.taller_id as string;

  const { data, error } = await supabase.rpc("bootstrap_taller", { p_nombre: "Taller de Motos Villa" });
  if (error) throw error;
  return data as string;
}

async function selectTable<T>(table: string) {
  if (!supabase) return [] as T[];
  const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as T[];
}

async function insertRow<T>(table: string, payload: Record<string, unknown>) {
  if (!supabase) return null;
  const { data, error } = await supabase.from(table).insert(payload).select("*").single();
  if (error) throw error;
  return data as T;
}

async function updateRow<T>(table: string, id: string, payload: Record<string, unknown>) {
  if (!supabase) return null;
  const { data, error } = await supabase.from(table).update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  return data as T;
}

async function deleteRow(table: string, id: string) {
  if (!supabase) return;
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

export const useWorkshopStore = create<Store>()(
  persist(
    (set, get) => ({
      ...(allowLocalMode ? { ...mockData, notificaciones: [], gastosBalance: [] } : { clientes: [], motocicletas: [], ordenes: [], evidencias: [], movimientos: [], cotizaciones: [], notificaciones: [], gastosBalance: [] }),
      usingSupabase: hasSupabaseCredentials,
      isLoading: false,
      error: undefined,
      tallerId: undefined,

      loadFromSupabase: async () => {
        if (!supabase) return;
        set({ isLoading: true, error: undefined });
        try {
          const tallerId = await requireTallerId(get().tallerId);
          const [clientes, motocicletas, ordenes, evidencias, movimientos] = await Promise.all([
            selectTable<Cliente>("clientes"),
            selectTable<Motocicleta>("motocicletas"),
            selectTable<OrdenTrabajo>("ordenes_trabajo"),
            selectTable<Evidencia>("evidencias"),
            selectTable<MovimientoOrden>("movimientos_orden"),
          ]);
          const cotizaciones = await selectTable<Cotizacion>("cotizaciones").catch(() => get().cotizaciones);
          const notificaciones = await selectTable<NotificacionCliente>("notificaciones_cliente").catch(() => get().notificaciones);
          const gastosBalance = await selectTable<GastoBalance>("balance_gastos").catch(() => get().gastosBalance);
          set({ tallerId, clientes, motocicletas, ordenes, evidencias, movimientos, cotizaciones, notificaciones, gastosBalance, isLoading: false });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "No se pudo cargar Supabase.", isLoading: false });
        }
      },

      addCliente: async (data) => {
        if (supabase) {
          const taller_id = await requireTallerId(get().tallerId);
          const cliente = await insertRow<Cliente>("clientes", { ...data, localidad: data.localidad || null, taller_id });
          if (cliente) set((state) => ({ clientes: [cliente, ...state.clientes], tallerId: taller_id }));
          return;
        }
        set((state) => ({ clientes: [...state.clientes, withBase("cliente", data)] }));
      },

      updateCliente: async (id, data) => {
        if (supabase) {
          const cliente = await updateRow<Cliente>("clientes", id, { ...data, localidad: data.localidad || null });
          if (cliente) set((state) => ({ clientes: state.clientes.map((item) => (item.id === id ? cliente : item)) }));
          return;
        }
        set((state) => ({ clientes: state.clientes.map((cliente) => (cliente.id === id ? { ...cliente, ...data, updated_at: stamp() } : cliente)) }));
      },

      deleteCliente: async (id) => {
        const motosCliente = get().motocicletas.filter((moto) => moto.cliente_id === id);
        if (motosCliente.length > 0) {
          return { ok: false, message: "No puedes eliminar un cliente con motocicletas registradas. Elimina o reasigna sus motos primero." };
        }

        if (supabase) await deleteRow("clientes", id);
        set((state) => ({ clientes: state.clientes.filter((cliente) => cliente.id !== id) }));
        return { ok: true };
      },

      addMoto: async (data) => {
        const trabajoId = uid("trabajo");
        const baseMoto = withTrabajoDefaults({ ...data, activa: true, ciclo_trabajo_id: trabajoId });
        if (supabase) {
          const taller_id = await requireTallerId(get().tallerId);
          const moto = await insertRow<Motocicleta>("motocicletas", { ...motoPayload(baseMoto), taller_id });
          if (moto) {
            const movimiento = await insertRow<MovimientoOrden>("movimientos_orden", {
              taller_id,
              moto_id: moto.id,
              ciclo_trabajo_id: moto.ciclo_trabajo_id,
              tipo: "entrada",
              titulo: "Recibida dentro del taller",
              nota: motoEntradaText(moto),
              publico: true,
              kilometraje: moto.kilometraje,
            });
            set((state) => ({
              motocicletas: [moto, ...state.motocicletas],
              movimientos: movimiento ? [movimiento, ...state.movimientos] : state.movimientos,
              tallerId: taller_id,
            }));
          }
          return;
        }
        const moto = withBase("moto", baseMoto);
        const movimiento = withBase("mov", {
          moto_id: moto.id,
          ciclo_trabajo_id: moto.ciclo_trabajo_id,
          tipo: "entrada" as const,
          titulo: "Recibida dentro del taller",
          nota: motoEntradaText(moto),
          publico: true,
          kilometraje: moto.kilometraje,
        });
        set((state) => ({ motocicletas: [moto, ...state.motocicletas], movimientos: [movimiento, ...state.movimientos] }));
      },

      updateMoto: async (id, data) => {
        if (supabase) {
          const current = get().motocicletas.find((moto) => moto.id === id);
          const moto = await updateRow<Motocicleta>("motocicletas", id, motoPayload({ ...current, ...data }));
          if (moto) set((state) => ({ motocicletas: state.motocicletas.map((item) => (item.id === id ? moto : item)) }));
          return;
        }
        set((state) => ({ motocicletas: state.motocicletas.map((moto) => (moto.id === id ? { ...moto, ...withTrabajoDefaults({ ...moto, ...data }), updated_at: stamp() } : moto)) }));
      },

      activateMoto: async (id) => {
        const current = get().motocicletas.find((moto) => moto.id === id);
        if (!current || current.activa) return;
        const ciclo_trabajo_id = uid("trabajo");
        const payload = {
          activa: true,
          ciclo_trabajo_id,
          estado_operativo: "recibida" as EstadoOperativo,
          prioridad_trabajo: "media" as PrioridadTrabajo,
          tipo_trabajo: "diagnostico" as TipoTrabajo,
          tamano_trabajo: "medio" as TamanoTrabajo,
          fecha_estimada_salida: null,
        };

        let updated: Motocicleta | null = null;
        if (supabase) {
          updated = await updateRow<Motocicleta>("motocicletas", id, payload);
        }

        const moto = updated ?? { ...current, ...payload, fecha_estimada_salida: undefined, updated_at: stamp() };
        set((state) => ({ motocicletas: state.motocicletas.map((item) => (item.id === id ? moto : item)) }));

        await get().addMovimiento({
          moto_id: id,
          ciclo_trabajo_id,
          tipo: "entrada",
          titulo: "Recibida dentro del taller",
          nota: motoEntradaText(moto),
          publico: true,
          kilometraje: moto.kilometraje,
        });
      },

      deactivateMoto: async (id) => {
        const current = get().motocicletas.find((moto) => moto.id === id);
        if (!current || current.activa === false) return;
        const payload = {
          activa: false,
          estado_operativo: "entregada" as EstadoOperativo,
        };

        let updated: Motocicleta | null = null;
        if (supabase) {
          updated = await updateRow<Motocicleta>("motocicletas", id, payload);
        }

        const moto = updated ?? { ...current, ...payload, updated_at: stamp() };
        set((state) => ({ motocicletas: state.motocicletas.map((item) => (item.id === id ? moto : item)) }));

        await get().addMovimiento({
          moto_id: id,
          ciclo_trabajo_id: current.ciclo_trabajo_id,
          tipo: "estado",
          titulo: "Trabajo archivado",
          nota: "La moto se marco como inactiva en el expediente. Se conserva su historial para futuras visitas.",
          publico: false,
          kilometraje: current.kilometraje,
        });
      },

      updateMotoTrabajo: async (id, data) => {
        const payload = Object.fromEntries(Object.entries(data).filter(([, value]) => Boolean(value)));
        if (Object.keys(payload).length === 0) return;

        if (supabase) {
          const moto = await updateRow<Motocicleta>("motocicletas", id, payload);
          if (moto) set((state) => ({ motocicletas: state.motocicletas.map((item) => (item.id === id ? moto : item)) }));
          return;
        }

        set((state) => ({ motocicletas: state.motocicletas.map((moto) => (moto.id === id ? { ...moto, ...payload, updated_at: stamp() } : moto)) }));
      },

      updateMotoFechaEstimada: async (id, fecha_estimada_salida) => {
        const current = get().motocicletas.find((moto) => moto.id === id);
        if (!current) return;

        if (supabase) {
          const moto = await updateRow<Motocicleta>("motocicletas", id, { fecha_estimada_salida: fecha_estimada_salida || null });
          if (moto) set((state) => ({ motocicletas: state.motocicletas.map((item) => (item.id === id ? moto : item)) }));
        } else {
          set((state) => ({
            motocicletas: state.motocicletas.map((moto) => (moto.id === id ? { ...moto, fecha_estimada_salida, updated_at: stamp() } : moto)),
          }));
        }

        await get().addMovimiento({
          moto_id: id,
          tipo: "nota",
          titulo: "Fecha estimada actualizada",
          nota: `Nueva fecha estimada de salida: ${fecha_estimada_salida || "Sin fecha definida"}`,
          publico: true,
          costo: 0,
          kilometraje: current.kilometraje,
        });
      },

      deleteMoto: async (id) => {
        const movimientosMoto = get().movimientos.filter((movimiento) => movimiento.moto_id === id);
        const cotizacionesMoto = get().cotizaciones.filter((cotizacion) => cotizacion.moto_id === id);
        if (movimientosMoto.length > 0 || cotizacionesMoto.length > 0) {
          return { ok: false, message: "No puedes eliminar una moto con trabajos o cotizaciones. Borra primero esos registros si realmente quieres quitarla." };
        }

        if (supabase) await deleteRow("motocicletas", id);
        set((state) => ({ motocicletas: state.motocicletas.filter((moto) => moto.id !== id) }));
        return { ok: true };
      },

      addOrden: async (data) => {
        const payload = { ...data, codigo_publico: data.codigo_publico || createPublicCode() };
        if (supabase) {
          const taller_id = await requireTallerId(get().tallerId);
          const orden = await insertRow<OrdenTrabajo>("ordenes_trabajo", { ...payload, taller_id });
          if (orden) {
            const movimiento = await insertRow<MovimientoOrden>("movimientos_orden", {
              taller_id,
              orden_id: orden.id,
              tipo: "entrada",
              titulo: "Entrada de motocicleta",
              nota: `${orden.descripcion_problema}${orden.fecha_estimada ? `\nFecha estimada de salida: ${orden.fecha_estimada}` : ""}`,
              publico: true,
              costo: orden.total_estimado || null,
            });
            set((state) => ({
              ordenes: [orden, ...state.ordenes],
              movimientos: movimiento ? [movimiento, ...state.movimientos] : state.movimientos,
              tallerId: taller_id,
            }));
          }
          return;
        }
        const orden = withBase("orden", payload);
        const movimiento = withBase("mov", {
          orden_id: orden.id,
          tipo: "entrada" as const,
          titulo: "Entrada de motocicleta",
          nota: `${orden.descripcion_problema}${orden.fecha_estimada ? `\nFecha estimada de salida: ${orden.fecha_estimada}` : ""}`,
          publico: true,
          costo: orden.total_estimado || 0,
          kilometraje: get().motocicletas.find((moto) => moto.id === orden.moto_id)?.kilometraje ?? 0,
        });
        set((state) => ({ ordenes: [orden, ...state.ordenes], movimientos: [movimiento, ...state.movimientos] }));
      },

      addCotizacion: async (data) => {
        const payload = {
          ...data,
          folio: data.folio || `COT-${String(get().cotizaciones.length + 1).padStart(4, "0")}`,
          fecha: data.fecha || new Date().toISOString().slice(0, 10),
          estado: data.estado || "borrador",
        };

        if (supabase) {
          const taller_id = await requireTallerId(get().tallerId);
          const cotizacion = await insertRow<Cotizacion>("cotizaciones", { ...payload, taller_id });
          if (cotizacion) set((state) => ({ cotizaciones: [cotizacion, ...state.cotizaciones], tallerId: taller_id }));
          return;
        }

        const cotizacion = withBase("cotizacion", payload);
        set((state) => ({ cotizaciones: [cotizacion, ...state.cotizaciones] }));
      },

      deleteCotizacion: async (id) => {
        if (supabase) await deleteRow("cotizaciones", id);
        set((state) => ({ cotizaciones: state.cotizaciones.filter((cotizacion) => cotizacion.id !== id) }));
        return { ok: true };
      },

      addGastoBalance: async (data) => {
        const payload = {
          ...data,
          concepto: data.concepto.trim(),
          nota: data.nota?.trim() || null,
          monto: Number(data.monto || 0),
          fecha: data.fecha || new Date().toISOString().slice(0, 10),
        };

        if (supabase) {
          const taller_id = await requireTallerId(get().tallerId);
          const gasto = await insertRow<GastoBalance>("balance_gastos", { ...payload, taller_id });
          if (gasto) set((state) => ({ gastosBalance: [gasto, ...state.gastosBalance], tallerId: taller_id }));
          return;
        }

        const gasto = withBase("gasto", payload);
        set((state) => ({ gastosBalance: [gasto, ...state.gastosBalance] }));
      },

      deleteGastoBalance: async (id) => {
        if (supabase) await deleteRow("balance_gastos", id);
        set((state) => ({ gastosBalance: state.gastosBalance.filter((gasto) => gasto.id !== id) }));
        return { ok: true };
      },

      updateOrden: async (id, data) => {
        const current = get().ordenes.find((orden) => orden.id === id);
        const payload = { ...data, codigo_publico: data.codigo_publico || current?.codigo_publico || createPublicCode() };
        if (supabase) {
          const orden = await updateRow<OrdenTrabajo>("ordenes_trabajo", id, payload);
          if (orden) set((state) => ({ ordenes: state.ordenes.map((item) => (item.id === id ? orden : item)) }));
          return;
        }
        set((state) => ({ ordenes: state.ordenes.map((orden) => (orden.id === id ? { ...orden, ...payload, updated_at: stamp() } : orden)) }));
      },

      updateFechaEstimada: async (id, fecha_estimada) => {
        const current = get().ordenes.find((orden) => orden.id === id);
        if (!current) return;

        if (supabase) {
          const orden = await updateRow<OrdenTrabajo>("ordenes_trabajo", id, { fecha_estimada });
          if (orden) set((state) => ({ ordenes: state.ordenes.map((item) => (item.id === id ? orden : item)) }));
        } else {
          set((state) => ({
            ordenes: state.ordenes.map((orden) => (orden.id === id ? { ...orden, fecha_estimada, updated_at: stamp() } : orden)),
          }));
        }

        await get().addMovimiento({
          orden_id: id,
          tipo: "nota",
          titulo: "Fecha estimada actualizada",
          nota: `Nueva fecha estimada de salida: ${fecha_estimada || "Sin fecha definida"}`,
          publico: true,
          costo: 0,
          kilometraje: get().getMoto(current.moto_id)?.kilometraje ?? 0,
        });
      },

      changeOrderStatus: async (id, estado) => {
        const orden = get().ordenes.find((item) => item.id === id);
        if (!orden) return;
        if (orden.estado === estado) return;

        if (supabase) {
          const taller_id = await requireTallerId(get().tallerId);
          const updated = await updateRow<OrdenTrabajo>("ordenes_trabajo", id, { estado });
          const movimiento = await insertRow<MovimientoOrden>("movimientos_orden", {
            taller_id,
            orden_id: id,
            estado_anterior: orden.estado,
            estado_nuevo: estado,
            tipo: "estado",
            titulo: `Estado: ${estado.replaceAll("_", " ")}`,
            publico: true,
            nota: "Cambio de estado desde MotoFlow",
          });
          set((state) => ({
            ordenes: state.ordenes.map((item) => (item.id === id && updated ? updated : item)),
            movimientos: movimiento ? [movimiento, ...state.movimientos] : state.movimientos,
          }));
          if (updated) {
            const cliente = get().getCliente(updated.cliente_id);
            const moto = get().getMoto(updated.moto_id);
            const notification = await notifyOrderStatusChange({ tallerId: taller_id, cliente, moto, orden: updated, estado });
            if (notification.ok) {
              const ordenNotificada = await updateRow<OrdenTrabajo>("ordenes_trabajo", id, { ultima_notificacion_estado: estado });
              if (ordenNotificada) set((state) => ({ ordenes: state.ordenes.map((item) => (item.id === id ? ordenNotificada : item)) }));
              const notificaciones = await selectTable<NotificacionCliente>("notificaciones_cliente").catch(() => get().notificaciones);
              set({ notificaciones });
            }
          }
          return;
        }

        const updatedLocal = { ...orden, estado, updated_at: stamp() };
        set((state) => ({
          ordenes: state.ordenes.map((item) => (item.id === id ? updatedLocal : item)),
          movimientos: [
            ...state.movimientos,
            withBase("mov", {
              orden_id: id,
              estado_anterior: orden.estado,
              estado_nuevo: estado,
              tipo: "estado",
              titulo: `Estado: ${estado.replaceAll("_", " ")}`,
              publico: true,
              nota: "Cambio de estado desde MotoFlow",
            }),
          ],
        }));
        const cliente = get().getCliente(orden.cliente_id);
        const moto = get().getMoto(orden.moto_id);
        const notification = await notifyOrderStatusChange({ tallerId: get().tallerId, cliente, moto, orden: updatedLocal, estado });
        if (notification.ok) {
          set((state) => ({
            ordenes: state.ordenes.map((item) => (item.id === id ? { ...item, ultima_notificacion_estado: estado, updated_at: stamp() } : item)),
          }));
        }
      },

      addMovimiento: async (data) => {
        const moto = data.moto_id ? get().motocicletas.find((item) => item.id === data.moto_id) : undefined;
        const orden = data.orden_id ? get().ordenes.find((item) => item.id === data.orden_id) : undefined;
        const costo_refaccion = Number(data.costo_refaccion || 0);
        const costo_mano_obra = Number(data.costo_mano_obra || 0);
        const costo = Number(data.costo || 0) || costo_refaccion + costo_mano_obra;
        const payload = {
          ...data,
          ciclo_trabajo_id: data.ciclo_trabajo_id || moto?.ciclo_trabajo_id || null,
          refaccion: data.refaccion || null,
          costo_refaccion: costo_refaccion || null,
          costo_mano_obra: costo_mano_obra || null,
          costo: costo || null,
          kilometraje: data.kilometraje || null,
        };

        if (supabase) {
          const taller_id = await requireTallerId(get().tallerId);
          const movimiento = await insertRow<MovimientoOrden>("movimientos_orden", {
            taller_id,
            ...payload,
          });
          if (movimiento) {
            set((state) => ({ movimientos: [movimiento, ...state.movimientos], tallerId: taller_id }));
            if (movimiento.publico) {
              const motoNotificada = moto ?? (orden?.moto_id ? get().getMoto(orden.moto_id) : undefined);
              const cliente = motoNotificada ? get().getCliente(motoNotificada.cliente_id) : orden ? get().getCliente(orden.cliente_id) : undefined;
              const notification = await notifyWorkUpdate({ tallerId: taller_id, cliente, moto: motoNotificada, movimiento });
              if (notification.ok) {
                const notificaciones = await selectTable<NotificacionCliente>("notificaciones_cliente").catch(() => get().notificaciones);
                set({ notificaciones });
              }
            }
          }
          return movimiento ?? undefined;
        }

        const movimiento = withBase("mov", payload);
        set((state) => ({ movimientos: [movimiento, ...state.movimientos] }));
        if (movimiento.publico) {
          const motoNotificada = moto ?? (orden?.moto_id ? get().getMoto(orden.moto_id) : undefined);
          const cliente = motoNotificada ? get().getCliente(motoNotificada.cliente_id) : orden ? get().getCliente(orden.cliente_id) : undefined;
          await notifyWorkUpdate({ tallerId: get().tallerId, cliente, moto: motoNotificada, movimiento });
        }
        return movimiento;
      },

      deleteMovimiento: async (id) => {
        const movimiento = get().movimientos.find((item) => item.id === id);
        if (!movimiento) return { ok: false, message: "No encontramos ese movimiento." };
        if (movimiento.tipo === "entrada" && movimiento.titulo.toLowerCase().includes("recibida dentro del taller")) {
          return { ok: false, message: "El ingreso automatico no se elimina. Es el registro de entrada de la moto." };
        }

        if (supabase) await deleteRow("movimientos_orden", id);
        set((state) => ({ movimientos: state.movimientos.filter((item) => item.id !== id) }));
        return { ok: true };
      },

      addEvidence: async ({ orden_id, moto_id, movimiento_id, tipo, nota, publico = true, file }) => {
        let url = URL.createObjectURL(file);
        let taller_id = get().tallerId ?? localTallerId;

        if (supabase) {
          taller_id = await requireTallerId(get().tallerId);
          const owner = movimiento_id ?? moto_id ?? orden_id ?? "sin-vinculo";
          const path = `${owner}/${Date.now()}-${file.name}`;
          const { error } = await supabase.storage.from(storageBucket).upload(path, file, { upsert: true });
          if (error) throw error;
          url = supabase.storage.from(storageBucket).getPublicUrl(path).data.publicUrl;
          const evidence = await insertRow<Evidencia>("evidencias", {
            taller_id,
            orden_id: orden_id || null,
            moto_id: moto_id || null,
            movimiento_id: movimiento_id || null,
            tipo,
            nota: nota || null,
            publico,
            url,
          });
          if (evidence) set((state) => ({ evidencias: [evidence, ...state.evidencias], tallerId: taller_id }));
          return;
        }

        const evidence: Evidencia = withBase("evidencia", { orden_id, moto_id, movimiento_id, tipo, nota, publico, url }, taller_id);
        set((state) => ({ evidencias: [...state.evidencias, evidence] }));
      },

      getCliente: (id) => get().clientes.find((cliente) => cliente.id === id),
      getMoto: (id) => get().motocicletas.find((moto) => moto.id === id),
      getOrden: (id) => get().ordenes.find((orden) => orden.id === id),
    }),
    {
      name: allowLocalMode ? "motoflow-workshop-local" : "motoflow-workshop-supabase",
      partialize: (state) =>
        allowLocalMode
          ? {
              clientes: state.clientes,
              motocicletas: state.motocicletas,
              ordenes: state.ordenes,
              evidencias: state.evidencias,
              movimientos: state.movimientos,
              cotizaciones: state.cotizaciones,
              notificaciones: state.notificaciones,
              gastosBalance: state.gastosBalance,
            }
          : {},
    },
  ),
);
