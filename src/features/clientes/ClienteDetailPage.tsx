import { Link, useNavigate, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { ClienteForm, type ClienteFormData } from "@/features/clientes/ClienteForm";
import { useWorkshopStore } from "@/stores/workshopStore";

export function ClienteCreatePage() {
  const addCliente = useWorkshopStore((state) => state.addCliente);
  const navigate = useNavigate();
  const save = async (data: ClienteFormData) => {
    await addCliente(data);
    navigate("/clientes");
  };
  return <><PageHeader title="Nuevo cliente" /><Card><ClienteForm onSubmit={save} /></Card></>;
}

export function ClienteDetailPage() {
  const { id = "" } = useParams();
  const { getCliente, updateCliente, deleteCliente, motocicletas } = useWorkshopStore();
  const cliente = getCliente(id);
  const navigate = useNavigate();

  if (!cliente) return <Card>Cliente no encontrado.</Card>;

  async function removeCliente() {
    if (!cliente || !window.confirm(`¿Eliminar cliente ${cliente.nombre}?`)) return;
    const result = await deleteCliente(cliente.id);
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    navigate("/clientes");
  }

  return (
    <div>
      <PageHeader
        title={cliente.nombre}
        subtitle="Detalle y edicion del cliente."
        actions={<Button type="button" variant="danger" onClick={() => void removeCliente()}><Trash2 className="h-4 w-4" /> Eliminar</Button>}
      />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[420px_1fr]">
        <Card>
          <ClienteForm
            initial={cliente}
            onSubmit={async (data) => {
              await updateCliente(cliente.id, data);
              navigate("/clientes");
            }}
          />
        </Card>
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Motocicletas</h2>
          <div className="space-y-2">
            {motocicletas.filter((moto) => moto.cliente_id === cliente.id).map((moto) => (
              <Link key={moto.id} to={`/motocicletas/${moto.id}`} className="block rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50">
                <p className="font-semibold">{moto.marca} {moto.modelo}</p>
                <p className="text-sm text-neutral-500">{moto.placas} · {moto.kilometraje.toLocaleString()} km</p>
              </Link>
            ))}
          </div>
          <Link to="/motocicletas/nueva"><Button className="mt-4" variant="secondary">Agregar moto</Button></Link>
        </Card>
      </div>
    </div>
  );
}
