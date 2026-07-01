import type { EstadoOrden, PrioridadOrden } from "@/types/motoflow";

export const estadoLabels: Record<EstadoOrden, string> = {
  recibida: "Recibida",
  diagnostico: "Diagnostico",
  esperando_autorizacion: "Esperando autorizacion",
  autorizada: "Autorizada",
  esperando_refacciones: "Esperando refacciones",
  en_reparacion: "En reparacion",
  lista: "Lista",
  entregada: "Entregada",
  cancelada: "Cancelada",
};

export const prioridadLabels: Record<PrioridadOrden, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  urgente: "Urgente",
};

export const estadosOrden = Object.keys(estadoLabels) as EstadoOrden[];
export const prioridadesOrden = Object.keys(prioridadLabels) as PrioridadOrden[];

export function currency(value?: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value ?? 0);
}

export function shortDate(value?: string) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function isLate(value?: string) {
  if (!value) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${value}T00:00:00`) < today;
}

export function createPublicCode() {
  return `MF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function uid(prefix = "id") {
  return `${prefix}-${crypto.randomUUID()}`;
}
