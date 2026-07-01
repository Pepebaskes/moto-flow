import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { useWorkshopStore } from "@/stores/workshopStore";

export function ClientesPage() {
  const clientes = useWorkshopStore((state) => state.clientes);
  const motocicletas = useWorkshopStore((state) => state.motocicletas);

  return (
    <div>
      <PageHeader title="Clientes" subtitle="Directorio del taller." actions={<Link to="/clientes/nuevo"><Button>Nuevo cliente</Button></Link>} />
      {clientes.length === 0 ? <EmptyState title="Aun no hay clientes" /> : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {clientes.map((cliente) => (
          <Link key={cliente.id} to={`/clientes/${cliente.id}`}>
            <Card className="h-full transition hover:border-neutral-300 hover:bg-neutral-50">
              <p className="text-lg font-bold">{cliente.nombre}</p>
              <p className="mt-1 text-sm text-neutral-500">{cliente.telefono}</p>
              <p className="text-sm text-neutral-500">{cliente.email || "Sin email"}</p>
              <p className="mt-4 text-sm font-semibold">{motocicletas.filter((moto) => moto.cliente_id === cliente.id).length} motos</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
