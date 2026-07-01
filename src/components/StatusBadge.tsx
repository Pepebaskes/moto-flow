import type { EstadoOrden, PrioridadOrden } from "@/types/motoflow";
import { estadoLabels, prioridadLabels } from "@/utils/format";

const statusStyles: Record<EstadoOrden, string> = {
  recibida: "bg-slate-100 text-slate-700",
  diagnostico: "bg-blue-50 text-blue-700",
  esperando_autorizacion: "bg-amber-50 text-amber-700",
  autorizada: "bg-emerald-50 text-emerald-700",
  esperando_refacciones: "bg-orange-50 text-orange-700",
  en_reparacion: "bg-indigo-50 text-indigo-700",
  lista: "bg-green-50 text-green-700",
  entregada: "bg-neutral-100 text-neutral-600",
  cancelada: "bg-red-50 text-red-700",
};

const priorityStyles: Record<PrioridadOrden, string> = {
  baja: "bg-neutral-100 text-neutral-600",
  media: "bg-blue-50 text-blue-700",
  alta: "bg-orange-50 text-orange-700",
  urgente: "bg-red-50 text-red-700",
};

export function StatusBadge({ value }: { value: EstadoOrden }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[value]}`}>{estadoLabels[value]}</span>;
}

export function PriorityBadge({ value }: { value: PrioridadOrden }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityStyles[value]}`}>{prioridadLabels[value]}</span>;
}
