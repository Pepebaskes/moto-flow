import { Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
    if (!cliente || !window.confirm(`Eliminar cliente ${cliente.nombre}?`)) return;
    const result = await deleteCliente(cliente.id);
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    navigate("/clientes");
  }

  const motosCliente = motocicletas.filter((moto) => moto.cliente_id === cliente.id);

  return (
    <div className="min-w-0">
      <PageHeader
        title={cliente.nombre}
        subtitle="Detalle y edicion del cliente."
        actions={<Button type="button" variant="danger" onClick={() => void removeCliente()}><Trash2 className="h-4 w-4 shrink-0" /> Eliminar</Button>}
      />
      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
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
          <h2 className="mb-3 text-lg font-semibold text-white">Motocicletas</h2>
          <div className="space-y-2">
            {motosCliente.map((moto) => (
              <Link key={moto.id} to={`/motocicletas/${moto.id}`} className="block min-w-0 rounded-2xl border border-white/10 bg-[#151515] p-3 transition hover:border-[#F2B705]/35 hover:bg-[#1c1a16]">
                <p className="break-words font-semibold text-white">{moto.marca} {moto.modelo}</p>
                <p className="break-words text-sm text-[#FFF2E1]/60">{moto.placas} | {moto.kilometraje.toLocaleString()} km</p>
              </Link>
            ))}
            {motosCliente.length === 0 ? <p className="text-sm text-[#FFF2E1]/60">Este cliente aun no tiene motos registradas.</p> : null}
          </div>
          <Link to="/motocicletas/nueva"><Button className="mt-4 w-full sm:w-auto" variant="secondary">Agregar moto</Button></Link>
        </Card>
      </div>
    </div>
  );
}
