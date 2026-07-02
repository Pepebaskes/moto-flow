import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadge";
import { useWorkshopStore } from "@/stores/workshopStore";
import { currency, shortDate } from "@/utils/format";

export function OrdenesPage() {
  const { ordenes, getCliente, getMoto } = useWorkshopStore();
  return (
    <div>
      <PageHeader title="Ordenes de trabajo" subtitle="Seguimiento de diagnósticos, reparaciones y entregas." actions={<Link to="/ordenes/nueva"><Button>Nueva orden</Button></Link>} />
      {ordenes.length === 0 ? <EmptyState title="Aun no hay ordenes" /> : null}
      <div className="space-y-3">
        {ordenes.map((orden) => (
          <Link key={orden.id} to={`/ordenes/${orden.id}`}>
            <Card className="transition hover:border-neutral-300 hover:bg-neutral-50">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-semibold">{orden.titulo}</p>
                  <p className="text-sm text-neutral-500">
                    {getCliente(orden.cliente_id)?.nombre} · {getMoto(orden.moto_id)?.marca} {getMoto(orden.moto_id)?.modelo} · {shortDate(orden.fecha_estimada)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge value={orden.prioridad} />
                  <StatusBadge value={orden.estado} />
                  <span className="text-sm font-semibold">{currency(orden.total_estimado)}</span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
