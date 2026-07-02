import { Link, useNavigate, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { MotoForm, type MotoFormData } from "@/features/motocicletas/MotoForm";
import { useWorkshopStore } from "@/stores/workshopStore";
import { shortDate } from "@/utils/format";

function DetailItem({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="rounded-lg bg-neutral-50 p-3">
      <p className="text-xs font-semibold uppercase text-neutral-500">{label}</p>
      <p className="mt-1 font-semibold text-neutral-950">{value || "No registrado"}</p>
    </div>
  );
}

export function MotoCreatePage() {
  const addMoto = useWorkshopStore((state) => state.addMoto);
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="Nueva motocicleta" subtitle="Al guardar se crea automaticamente la primera bitacora: recibida dentro del taller." />
      <Card><MotoForm onSubmit={async (data) => { await addMoto(data); navigate("/bitacoras"); }} /></Card>
    </>
  );
}

export function MotoDetailPage() {
  const { id = "" } = useParams();
  const { getMoto, getCliente, updateMoto, deleteMoto, ordenes, movimientos } = useWorkshopStore();
  const moto = getMoto(id);
  const navigate = useNavigate();

  if (!moto) return <Card>Motocicleta no encontrada.</Card>;

  const cliente = getCliente(moto.cliente_id);
  const ordenesMoto = ordenes.filter((orden) => orden.moto_id === moto.id);
  const historialMoto = movimientos
    .filter((movimiento) => movimiento.moto_id === moto.id || ordenesMoto.some((orden) => orden.id === movimiento.orden_id))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  async function removeMoto() {
    if (!moto || !window.confirm(`¿Eliminar moto ${moto.marca} ${moto.modelo}?`)) return;
    const result = await deleteMoto(moto.id);
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    navigate("/motocicletas");
  }

  return (
    <div>
      <PageHeader
        title={`${moto.marca} ${moto.modelo}`}
        subtitle={`Placas ${moto.placas} · ${cliente?.nombre ?? "Sin cliente"}`}
        actions={
          <>
            <Link to="/bitacoras"><Button variant="secondary">Abrir bitacora</Button></Link>
            <Button type="button" variant="danger" onClick={() => void removeMoto()}><Trash2 className="h-4 w-4" /> Eliminar</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,520px)_1fr]">
        <div className="space-y-5">
          <Card>
            <h2 className="mb-3 text-lg font-semibold">Ficha de la motocicleta</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailItem label="Marca" value={moto.marca} />
              <DetailItem label="Modelo" value={moto.modelo} />
              <DetailItem label="Año" value={moto.anio} />
              <DetailItem label="Placas" value={moto.placas} />
              <DetailItem label="Color" value={moto.color} />
              <DetailItem label="Kilometraje" value={`${moto.kilometraje.toLocaleString()} km`} />
              <DetailItem label="Salida estimada" value={moto.fecha_estimada_salida ? shortDate(moto.fecha_estimada_salida) : "Por definir"} />
              <DetailItem label="Numero de serie" value={moto.numero_serie} />
              <DetailItem label="Cliente" value={cliente?.nombre} />
            </div>
            {moto.notas ? (
              <div className="mt-3 rounded-lg border border-neutral-200 p-3">
                <p className="text-xs font-semibold uppercase text-neutral-500">Notas de la moto</p>
                <p className="mt-1 text-sm text-neutral-700">{moto.notas}</p>
              </div>
            ) : null}
          </Card>

          <Card>
            <h2 className="mb-3 text-lg font-semibold">Editar datos</h2>
            <MotoForm initial={moto} onSubmit={async (data: MotoFormData) => { await updateMoto(moto.id, data); navigate("/motocicletas"); }} />
          </Card>
        </div>

        <Card>
          <h2 className="mb-3 text-lg font-semibold">Historial de la moto</h2>
          <div className="space-y-2">
            {historialMoto.length === 0 ? <p className="text-sm text-neutral-500">Aun no hay bitacora registrada.</p> : null}
            {historialMoto.map((movimiento) => (
              <div key={movimiento.id} className="rounded-lg border border-neutral-200 p-3">
                <p className="font-semibold">{movimiento.titulo || "Actualizacion"}</p>
                <p className="text-xs font-semibold uppercase text-neutral-500">{new Date(movimiento.created_at).toLocaleString("es-MX")} · {movimiento.tipo}</p>
                {movimiento.nota ? <p className="mt-1 whitespace-pre-line text-sm text-neutral-700">{movimiento.nota}</p> : null}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
