import { AlertTriangle, Bike, CheckCircle2, Clock3, FileText, Gauge } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { useWorkshopStore } from "@/stores/workshopStore";
import { currency } from "@/utils/format";
import { estadoOperativoLabels, isTrabajoActivo, prioridadTrabajoLabels, priorityTone, tamanoTrabajoLabels, tipoTrabajoLabels } from "@/utils/workflow";

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DashboardPage() {
  const { motocicletas, movimientos, cotizaciones, getCliente, getMoto } = useWorkshopStore();
  const movimientosRecientes = [...movimientos].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6);
  const cotizado = movimientos.reduce((sum, movimiento) => sum + (Number(movimiento.costo) || 0), 0);

  const trabajos = motocicletas
    .map((moto) => {
      const historial = movimientos
        .filter((movimiento) => movimiento.moto_id === moto.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return { moto, cliente: getCliente(moto.cliente_id), historial, ultimo: historial[0] };
    })
    .filter((item) => isTrabajoActivo(item.moto, item.historial));

  const urgentes = trabajos.filter((item) => ["urgente", "alta"].includes(item.moto.prioridad_trabajo ?? "media"));
  const bloqueados = trabajos.filter((item) => ["esperando_refaccion", "esperando_autorizacion"].includes(item.moto.estado_operativo ?? ""));
  const rapidos = trabajos.filter((item) => item.moto.tamano_trabajo === "rapido" || item.moto.tipo_trabajo === "servicio_rapido");
  const mayores = trabajos.filter((item) => item.moto.tamano_trabajo === "proyecto" || item.moto.tipo_trabajo === "trabajo_mayor");
  const listas = trabajos.filter((item) => item.moto.estado_operativo === "lista_para_entregar");

  const metrics = [
    { label: "Trabajos activos", value: trabajos.length, icon: Bike },
    { label: "Alta prioridad", value: urgentes.length, icon: AlertTriangle },
    { label: "Bloqueados", value: bloqueados.length, icon: Clock3 },
    { label: "Listas para entregar", value: listas.length, icon: CheckCircle2 },
    { label: "Cotizado en trabajos", value: currency(cotizado), icon: FileText },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Prioridades del dia, trabajos bloqueados y motos listas para entregar."
        actions={
          <>
            <Link to="/motocicletas/nueva"><Button>Registrar moto</Button></Link>
            <Link to="/bitacoras"><Button variant="secondary">Trabajos activos</Button></Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-[#FFF2E1]/60">{metric.label}</p>
                  <p className="mt-2 break-words text-3xl font-semibold">{metric.value}</p>
                </div>
                <div className="rounded-2xl bg-[#F2B705]/10 p-3 text-[#FFD08A]"><Icon className="h-5 w-5" /></div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">Cola de trabajo</h2>
            <span className="rounded-full bg-[#F2B705]/12 px-3 py-1 text-xs font-semibold text-[#FFD08A]">
              {rapidos.length} rapidos | {mayores.length} mayores
            </span>
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            {urgentes.slice(0, 4).map((item) => (
              <Link key={item.moto.id} to="/bitacoras" className="rounded-2xl border border-white/10 bg-[#151515] p-3 transition hover:border-[#F2B705]/40 hover:bg-[#1f1b14] active:scale-[0.99]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{item.moto.marca} {item.moto.modelo}</p>
                    <p className="mt-1 truncate text-sm text-[#FFF2E1]/62">{item.cliente?.nombre ?? "Sin cliente"} | {item.moto.placas}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${priorityTone(item.moto.prioridad_trabajo ?? "media")}`}>
                    {prioridadTrabajoLabels[item.moto.prioridad_trabajo ?? "media"]}
                  </span>
                </div>
                <p className="mt-3 text-xs font-semibold uppercase text-[#FFF2E1]/50">{estadoOperativoLabels[item.moto.estado_operativo ?? "recibida"]}</p>
              </Link>
            ))}
            {urgentes.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#151515] p-3 text-sm text-[#FFF2E1]/70">
                No hay trabajos marcados como alta prioridad.
              </div>
            ) : null}
          </div>

          <h2 className="mb-3 text-lg font-semibold">Movimientos recientes</h2>
          <div className="space-y-3">
            {movimientosRecientes.length === 0 ? <p className="text-sm text-[#FFF2E1]/60">Aun no hay movimientos registrados.</p> : null}
            {movimientosRecientes.map((movimiento) => {
              const moto = movimiento.moto_id ? getMoto(movimiento.moto_id) : undefined;
              const cliente = moto ? getCliente(moto.cliente_id) : undefined;

              return (
                <Link key={movimiento.id} to="/bitacoras" className="block rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition hover:border-[#F2B705]/30 hover:bg-white/[0.08] active:scale-[0.99]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{movimiento.titulo}</p>
                    <span className="rounded-full bg-[#F2B705]/10 px-2.5 py-1 text-xs font-semibold text-[#FFF2E1]">{movimiento.tipo}</span>
                  </div>
                  <p className="mt-1 text-sm text-[#FFF2E1]/60">
                    {moto ? `${moto.marca} ${moto.modelo} | ${moto.placas}` : "Moto vinculada a trabajo anterior"}
                    {cliente ? ` | ${cliente.nombre}` : ""} | {formatDate(movimiento.created_at)}
                  </p>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold">Accesos rapidos</h2>
          <div className="grid gap-2">
            <Link to="/clientes/nuevo"><Button className="w-full" variant="secondary">Nuevo cliente</Button></Link>
            <Link to="/motocicletas/nueva"><Button className="w-full" variant="secondary">Registrar moto</Button></Link>
            <Link to="/bitacoras"><Button className="w-full" variant="secondary">Trabajos activos</Button></Link>
            <Link to="/cotizaciones"><Button className="w-full" variant="secondary">Cotizaciones</Button></Link>
          </div>
          <div className="mt-4 rounded-2xl bg-[#0B0B0B]/45 p-3 text-sm text-[#FFF2E1]/75">
            Al registrar una moto se crea automaticamente su ingreso. Diagnostico, prioridad y costos se trabajan desde Trabajos activos.
          </div>
          <div className="mt-3 grid gap-2">
            <div className="rounded-2xl bg-[#0B0B0B]/45 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white"><Gauge className="h-4 w-4 text-[#F2B705]" /> Tipos de trabajo</div>
              <p className="mt-2 text-sm text-[#FFF2E1]/70">Rapidos: {rapidos.length} | Mayores: {mayores.length} | Bloqueados: {bloqueados.length}</p>
            </div>
            <div className="rounded-2xl bg-[#0B0B0B]/45 p-3 text-sm text-[#FFF2E1]/75">
              Tamano dominante: <strong>{tamanoTrabajoLabels[mayores[0]?.moto.tamano_trabajo ?? trabajos[0]?.moto.tamano_trabajo ?? "medio"]}</strong>
            </div>
            <div className="rounded-2xl bg-[#0B0B0B]/45 p-3 text-sm text-[#FFF2E1]/75">
              Tipo frecuente: <strong>{tipoTrabajoLabels[trabajos[0]?.moto.tipo_trabajo ?? "diagnostico"]}</strong>
            </div>
          </div>
          <div className="mt-3 rounded-2xl bg-[#0B0B0B]/45 p-3 text-sm text-[#FFF2E1]/75">
            Cotizaciones creadas: <strong>{cotizaciones.length}</strong>
          </div>
        </Card>
      </div>
    </div>
  );
}
