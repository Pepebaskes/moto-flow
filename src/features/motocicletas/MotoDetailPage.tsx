import { Power, PowerOff, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { MotoForm, type MotoFormData } from "@/features/motocicletas/MotoForm";
import { useWorkshopStore } from "@/stores/workshopStore";
import { estadoOperativoLabels } from "@/utils/workflow";

function DetailItem({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="min-w-0 rounded-2xl bg-[#151515] p-3">
      <p className="text-xs font-semibold uppercase text-[#FFF2E1]/50">{label}</p>
      <p className="mt-1 break-words font-semibold text-white">{value || "No registrado"}</p>
    </div>
  );
}

export function MotoCreatePage() {
  const addMoto = useWorkshopStore((state) => state.addMoto);
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="Nueva motocicleta" subtitle="Registra solo la ficha de la unidad. El trabajo, diagnostico y avances se llevan despues en Trabajos activos." />
      <Card><MotoForm onSubmit={async (data) => { await addMoto(data); navigate("/bitacoras", { state: { notice: "Motocicleta registrada correctamente. Se creo su ingreso de taller." } }); }} /></Card>
    </>
  );
}

export function MotoDetailPage() {
  const { id = "" } = useParams();
  const { getMoto, getCliente, updateMoto, deleteMoto, activateMoto, deactivateMoto, ordenes, movimientos } = useWorkshopStore();
  const moto = getMoto(id);
  const navigate = useNavigate();

  if (!moto) return <Card>Motocicleta no encontrada.</Card>;

  const cliente = getCliente(moto.cliente_id);
  const ordenesMoto = ordenes.filter((orden) => orden.moto_id === moto.id);
  const historialMoto = movimientos
    .filter((movimiento) => movimiento.moto_id === moto.id || ordenesMoto.some((orden) => orden.id === movimiento.orden_id))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  async function removeMoto() {
    if (!moto || !window.confirm(`Eliminar moto ${moto.marca} ${moto.modelo}?`)) return;
    const result = await deleteMoto(moto.id);
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    navigate("/motocicletas");
  }

  async function toggleActive() {
    if (!moto) return;
    if (moto.activa !== false) {
      if (!window.confirm("Marcar esta moto como inactiva? Se quitara de Trabajos activos.")) return;
      await deactivateMoto(moto.id);
      return;
    }

    if (!window.confirm("Activar esta moto y abrir un nuevo trabajo limpio?")) return;
    await activateMoto(moto.id);
  }

  return (
    <div className="min-w-0">
      <PageHeader
        title={`${moto.marca} ${moto.modelo}`}
        subtitle={`Placas ${moto.placas} | ${cliente?.nombre ?? "Sin cliente"}`}
        actions={
          <>
            <Link to="/bitacoras"><Button variant="secondary">Abrir trabajo</Button></Link>
            <Button type="button" variant={moto.activa !== false ? "secondary" : "primary"} onClick={() => void toggleActive()}>
              {moto.activa !== false ? <PowerOff className="h-4 w-4 shrink-0" /> : <Power className="h-4 w-4 shrink-0" />}
              {moto.activa !== false ? "Inactivar" : "Activar"}
            </Button>
            <Button type="button" variant="danger" onClick={() => void removeMoto()}><Trash2 className="h-4 w-4 shrink-0" /> Eliminar</Button>
          </>
        }
      />

      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <Card>
            <h2 className="mb-3 text-lg font-semibold text-white">Ficha de la motocicleta</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailItem label="Marca" value={moto.marca} />
              <DetailItem label="Modelo" value={moto.modelo} />
              <DetailItem label="Anio" value={moto.anio} />
              <DetailItem label="Placas" value={moto.placas} />
              <DetailItem label="Color" value={moto.color} />
              <DetailItem label="Kilometraje" value={`${moto.kilometraje.toLocaleString()} km`} />
              <DetailItem label="Estado expediente" value={moto.activa !== false ? "Activa en taller" : "Inactiva"} />
              <DetailItem label="Estado de trabajo" value={moto.activa !== false ? estadoOperativoLabels[moto.estado_operativo ?? "recibida"] : "Sin trabajo activo"} />
              <DetailItem label="Numero de serie" value={moto.numero_serie} />
              <DetailItem label="Cliente" value={cliente?.nombre} />
            </div>
            {moto.notas ? (
              <div className="mt-3 rounded-2xl border border-white/10 bg-[#151515] p-3">
                <p className="text-xs font-semibold uppercase text-[#FFF2E1]/50">Notas de la moto</p>
                <p className="mt-1 break-words text-sm text-[#FFF2E1]/72">{moto.notas}</p>
              </div>
            ) : null}
          </Card>

          <Card>
            <h2 className="mb-3 text-lg font-semibold text-white">Editar datos</h2>
            <MotoForm initial={moto} onSubmit={async (data: MotoFormData) => { await updateMoto(moto.id, data); navigate("/motocicletas"); }} />
          </Card>
        </div>

        <Card>
          <h2 className="mb-3 text-lg font-semibold text-white">Historial de la moto</h2>
          <div className="space-y-2">
            {historialMoto.length === 0 ? <p className="text-sm text-[#FFF2E1]/60">Aun no hay movimientos registrados.</p> : null}
            {historialMoto.map((movimiento) => (
              <div key={movimiento.id} className="min-w-0 rounded-2xl border border-white/10 bg-[#151515] p-3">
                <p className="break-words font-semibold text-white">{movimiento.titulo || "Actualizacion"}</p>
                <p className="text-xs font-semibold uppercase text-[#FFF2E1]/50">{new Date(movimiento.created_at).toLocaleString("es-MX")} | {movimiento.tipo}</p>
                {movimiento.nota ? <p className="mt-1 whitespace-pre-line break-words text-sm text-[#FFF2E1]/72">{movimiento.nota}</p> : null}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
