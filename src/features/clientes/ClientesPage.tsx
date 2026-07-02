import { Eye, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { useWorkshopStore } from "@/stores/workshopStore";

export function ClientesPage() {
  const clientes = useWorkshopStore((state) => state.clientes);
  const motocicletas = useWorkshopStore((state) => state.motocicletas);
  const deleteCliente = useWorkshopStore((state) => state.deleteCliente);

  async function removeCliente(id: string, nombre: string) {
    if (!window.confirm(`¿Eliminar cliente ${nombre}?`)) return;
    const result = await deleteCliente(id);
    if (!result.ok) window.alert(result.message);
  }

  return (
    <div>
      <PageHeader title="Clientes" subtitle="Directorio del taller." actions={<Link to="/clientes/nuevo"><Button>Nuevo cliente</Button></Link>} />
      {clientes.length === 0 ? <EmptyState title="Aun no hay clientes" /> : null}
      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {clientes.map((cliente) => {
          const motosCliente = motocicletas.filter((moto) => moto.cliente_id === cliente.id).length;
          return (
            <Card key={cliente.id} className="h-full transition hover:border-[#F2B705]/30 hover:bg-white/[0.09]">
              <p className="text-lg font-semibold">{cliente.nombre}</p>
              <p className="mt-1 text-sm text-[#FFF2E1]/60">{cliente.telefono}</p>
              <p className="break-words text-sm text-[#FFF2E1]/60">{cliente.localidad || "Sin localidad"}</p>
              <p className="mt-4 text-sm font-semibold">{motosCliente} motos</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link to={`/clientes/${cliente.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-3 text-sm font-semibold text-[#FFF2E1] transition hover:border-[#F2B705]/35 hover:bg-white/12 active:scale-[0.98]">
                  <Eye className="h-4 w-4" /> Ver
                </Link>
                <Button type="button" variant="danger" onClick={() => void removeCliente(cliente.id, cliente.nombre)}>
                  <Trash2 className="h-4 w-4" /> Eliminar
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
