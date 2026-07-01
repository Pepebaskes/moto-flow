import { Card } from "@/components/Card";
import { Select } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { PriorityBadge } from "@/components/StatusBadge";
import { useWorkshopStore } from "@/stores/workshopStore";
import type { EstadoOrden } from "@/types/motoflow";
import { estadoLabels, estadosOrden, shortDate } from "@/utils/format";

export function KanbanPage() {
  const { ordenes, getCliente, getMoto, changeOrderStatus } = useWorkshopStore();
  return (
    <div>
      <PageHeader title="Kanban" subtitle="Vista por estado. El cambio se hace con selector." />
      <div className="grid auto-cols-[minmax(280px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-3">
        {estadosOrden.map((estado) => (
          <section key={estado} className="min-w-[280px]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase text-neutral-600">{estadoLabels[estado]}</h2>
              <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-bold">{ordenes.filter((orden) => orden.estado === estado).length}</span>
            </div>
            <div className="space-y-3">
              {ordenes.filter((orden) => orden.estado === estado).map((orden) => (
                <Card key={orden.id}>
                  <p className="font-bold">{orden.titulo}</p>
                  <p className="mt-1 text-sm text-neutral-500">{getCliente(orden.cliente_id)?.nombre}</p>
                  <p className="text-sm text-neutral-500">{getMoto(orden.moto_id)?.marca} {getMoto(orden.moto_id)?.modelo}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <PriorityBadge value={orden.prioridad} />
                    <span className="text-xs font-semibold text-neutral-500">{shortDate(orden.fecha_estimada)}</span>
                  </div>
                  <Select className="mt-3" value={orden.estado} onChange={(event) => void changeOrderStatus(orden.id, event.target.value as EstadoOrden)}>
                    {estadosOrden.map((item) => <option key={item} value={item}>{estadoLabels[item]}</option>)}
                  </Select>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
