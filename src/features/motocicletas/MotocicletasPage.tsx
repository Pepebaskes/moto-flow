import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { useWorkshopStore } from "@/stores/workshopStore";

export function MotocicletasPage() {
  const { motocicletas, getCliente } = useWorkshopStore();

  return (
    <div>
      <PageHeader title="Motocicletas" subtitle="Unidades registradas en el taller." actions={<Link to="/motocicletas/nueva"><Button>Nueva moto</Button></Link>} />
      {motocicletas.length === 0 ? <EmptyState title="Aun no hay motocicletas" /> : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {motocicletas.map((moto) => (
          <Link key={moto.id} to={`/motocicletas/${moto.id}`}>
            <Card className="h-full transition hover:border-neutral-300 hover:bg-neutral-50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold">{moto.marca} {moto.modelo}</p>
                  <p className="mt-1 text-sm text-neutral-500">{moto.anio} · {moto.color}</p>
                </div>
                <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-700">{moto.placas}</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-neutral-50 p-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase text-neutral-500">Kilometraje</p>
                  <p className="font-semibold">{moto.kilometraje.toLocaleString()} km</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-neutral-500">Serie</p>
                  <p className="truncate font-semibold">{moto.numero_serie || "Sin serie"}</p>
                </div>
              </div>

              {moto.notas ? <p className="mt-3 line-clamp-2 text-sm text-neutral-600">{moto.notas}</p> : null}

              <div className="mt-4 border-t border-neutral-100 pt-3">
                <p className="text-xs font-semibold uppercase text-neutral-500">Cliente</p>
                <p className="text-sm font-semibold">{getCliente(moto.cliente_id)?.nombre}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
