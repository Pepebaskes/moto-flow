import type { EstadoOperativo, Motocicleta, MovimientoOrden, PrioridadTrabajo, TamanoTrabajo, TipoTrabajo } from "@/types/motoflow";

export const prioridadTrabajoLabels: Record<PrioridadTrabajo, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  urgente: "Urgente",
};

export const tipoTrabajoLabels: Record<TipoTrabajo, string> = {
  servicio_rapido: "Servicio rapido",
  diagnostico: "Diagnostico",
  reparacion: "Reparacion",
  trabajo_mayor: "Trabajo mayor",
  esperando_refaccion: "Esperando refaccion",
  esperando_autorizacion: "Esperando autorizacion",
};

export const estadoOperativoLabels: Record<EstadoOperativo, string> = {
  recibida: "Recibida",
  diagnosticando: "Diagnosticando",
  cotizando: "Cotizando",
  esperando_autorizacion: "Esperando autorizacion",
  esperando_refaccion: "Esperando refaccion",
  en_trabajo: "En trabajo",
  lista_para_entregar: "Lista para entregar",
  entregada: "Entregada",
};

export const tamanoTrabajoLabels: Record<TamanoTrabajo, string> = {
  rapido: "Rapido",
  medio: "Medio",
  largo: "Largo",
  proyecto: "Proyecto",
};

export const prioridadesTrabajo = Object.keys(prioridadTrabajoLabels) as PrioridadTrabajo[];
export const tiposTrabajo = Object.keys(tipoTrabajoLabels) as TipoTrabajo[];
export const estadosOperativos = Object.keys(estadoOperativoLabels) as EstadoOperativo[];
export const tamanosTrabajo = Object.keys(tamanoTrabajoLabels) as TamanoTrabajo[];

export function isTrabajoActivo(moto: Motocicleta, historial: MovimientoOrden[]) {
  return moto.activa !== false && moto.estado_operativo !== "entregada" && !historial.some((movimiento) => movimiento.tipo === "salida");
}

export function priorityTone(value: PrioridadTrabajo = "media") {
  if (value === "urgente") return "bg-red-500 text-white";
  if (value === "alta") return "bg-[#F2B705] text-[#0B0B0B]";
  if (value === "media") return "bg-[#FFD08A]/18 text-[#FFD08A]";
  return "bg-white/10 text-[#FFF2E1]/75";
}
