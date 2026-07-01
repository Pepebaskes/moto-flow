import { create } from "zustand";
import { persist } from "zustand/middleware";
import { mockData } from "@/lib/mockData";
import { hasSupabaseCredentials, storageBucket, supabase } from "@/lib/supabase";
import type { Cliente, Cotizacion, EstadoOrden, Evidencia, Motocicleta, MovimientoOrden, OrdenTrabajo, TipoEvidencia, WorkshopState } from "@/types/motoflow";
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

type Store = WorkshopState & {
  usingSupabase: boolean;
  isLoading: boolean;
  error?: string;
  tallerId?: string;
  loadFromSupabase: () => Promise<void>;
  addCliente: (data: NewCliente) => Promise<void>;
  updateCliente: (id: string, data: NewCliente) => Promise<void>;
  addMoto: (data: NewMoto) => Promise<void>;
  updateMoto: (id: string, data: NewMoto) => Promise<void>;
  updateMotoFechaEstimada: (id: string, fecha_estimada_salida: string) => Promise<void>;
  addOrden: (data: NewOrden) => Promise<void>;
  addCotizacion: (data: NewCotizacion) => Promise<void>;
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
    kilometraje?: number;
    estado_nuevo?: EstadoOrden;
  }) => Promise<void>;
  addEvidence: (data: { orden_id: string; tipo: TipoEvidencia; nota?: string; file: File }) => Promise<void>;
  getCliente: (id: string) => Cliente | undefined;
  getMoto: (id: string) => Motocicleta | undefined;
  getOrden: (id: string) => OrdenTrabajo | undefined;
};

const localTallerId = "11111111-1111-4111-8111-111111111111";

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

function motoEntradaText(moto: Pick<Motocicleta, "marca" | "modelo" | "anio" | "placas" | "color" | "kilometraje" | "fecha_estimada_salida" | "numero_serie">) {
  return [
    `Moto recibida dentro del taller.`,
    `Unidad: ${moto.marca} ${moto.modelo} ${moto.anio}.`,
    `Placas: ${moto.placas}.`,
    `Color: ${moto.color}.`,
    `Kilometraje: ${moto.kilometraje.toLocaleString()} km.`,
    moto.fecha_estimada_salida ? `Fecha estimada de salida: ${moto.fecha_estimada_salida}.` : "",
    moto.numero_serie ? `Serie: ${moto.numero_serie}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function requireTallerId(current?: string) {
  if (!supabase) return localTallerId;

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return localTallerId;

  if (current) return current;

  const { data, error } = await supabase.rpc("bootstrap_taller", { p_nombre: "MotoFlow Taller" });
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

export const useWorkshopStore = create<Store>()(
  persist(
    (set, get) => ({
      ...mockData,
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
          set({ tallerId, clientes, motocicletas, ordenes, evidencias, movimientos, cotizaciones, isLoading: false });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "No se pudo cargar Supabase.", isLoading: false });
        }
      },

      addCliente: async (data) => {
        if (supabase) {
          const taller_id = await requireTallerId(get().tallerId);
          const cliente = await insertRow<Cliente>("clientes", { ...data, email: data.email || null, taller_id });
          if (cliente) set((state) => ({ clientes: [cliente, ...state.clientes], tallerId: taller_id }));
          return;
        }
        set((state) => ({ clientes: [...state.clientes, withBase("cliente", data)] }));
      },

      updateCliente: async (id, data) => {
        if (supabase) {
          const cliente = await updateRow<Cliente>("clientes", id, { ...data, email: data.email || null });
          if (cliente) set((state) => ({ clientes: state.clientes.map((item) => (item.id === id ? cliente : item)) }));
          return;
        }
        set((state) => ({ clientes: state.clientes.map((cliente) => (cliente.id === id ? { ...cliente, ...data, updated_at: stamp() } : cliente)) }));
      },

      addMoto: async (data) => {
        if (supabase) {
          const taller_id = await requireTallerId(get().tallerId);
          const moto = await insertRow<Motocicleta>("motocicletas", { ...data, fecha_estimada_salida: data.fecha_estimada_salida || null, numero_serie: data.numero_serie || null, taller_id });
          if (moto) {
            const movimiento = await insertRow<MovimientoOrden>("movimientos_orden", {
              taller_id,
              moto_id: moto.id,
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
        const moto = withBase("moto", data);
        const movimiento = withBase("mov", {
          moto_id: moto.id,
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
          const moto = await updateRow<Motocicleta>("motocicletas", id, { ...data, fecha_estimada_salida: data.fecha_estimada_salida || null, numero_serie: data.numero_serie || null });
          if (moto) set((state) => ({ motocicletas: state.motocicletas.map((item) => (item.id === id ? moto : item)) }));
          return;
        }
        set((state) => ({ motocicletas: state.motocicletas.map((moto) => (moto.id === id ? { ...moto, ...data, updated_at: stamp() } : moto)) }));
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
          return;
        }

        set((state) => ({
          ordenes: state.ordenes.map((item) => (item.id === id ? { ...item, estado, updated_at: stamp() } : item)),
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
      },

      addMovimiento: async (data) => {
        if (supabase) {
          const taller_id = await requireTallerId(get().tallerId);
          const movimiento = await insertRow<MovimientoOrden>("movimientos_orden", {
            taller_id,
            ...data,
            costo: data.costo || null,
            kilometraje: data.kilometraje || null,
          });
          if (movimiento) set((state) => ({ movimientos: [movimiento, ...state.movimientos], tallerId: taller_id }));
          return;
        }

        const movimiento = withBase("mov", data);
        set((state) => ({ movimientos: [movimiento, ...state.movimientos] }));
      },

      addEvidence: async ({ orden_id, tipo, nota, file }) => {
        let url = URL.createObjectURL(file);
        let taller_id = get().tallerId ?? localTallerId;

        if (supabase) {
          taller_id = await requireTallerId(get().tallerId);
          const path = `${orden_id}/${Date.now()}-${file.name}`;
          const { error } = await supabase.storage.from(storageBucket).upload(path, file, { upsert: true });
          if (error) throw error;
          url = supabase.storage.from(storageBucket).getPublicUrl(path).data.publicUrl;
          const evidence = await insertRow<Evidencia>("evidencias", { taller_id, orden_id, tipo, nota: nota || null, url });
          if (evidence) set((state) => ({ evidencias: [evidence, ...state.evidencias], tallerId: taller_id }));
          return;
        }

        const evidence: Evidencia = withBase("evidencia", { orden_id, tipo, nota, url }, taller_id);
        set((state) => ({ evidencias: [...state.evidencias, evidence] }));
      },

      getCliente: (id) => get().clientes.find((cliente) => cliente.id === id),
      getMoto: (id) => get().motocicletas.find((moto) => moto.id === id),
      getOrden: (id) => get().ordenes.find((orden) => orden.id === id),
    }),
    {
      name: "motoflow-workshop",
      partialize: (state) => ({
        clientes: state.clientes,
        motocicletas: state.motocicletas,
        ordenes: state.ordenes,
        evidencias: state.evidencias,
        movimientos: state.movimientos,
        cotizaciones: state.cotizaciones,
        tallerId: state.tallerId,
      }),
    },
  ),
);
