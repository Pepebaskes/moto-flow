import { AlertTriangle, Bike, CalendarClock, CheckCircle2, Clock3, FileText, Gauge, ListChecks, ShieldAlert, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { useWorkshopStore } from "@/stores/workshopStore";
import type { Motocicleta, MovimientoOrden } from "@/types/motoflow";
import { currency, shortDate } from "@/utils/format";
import { estadoOperativoLabels, isTrabajoActivo, prioridadTrabajoLabels, priorityTone, tamanoTrabajoLabels, tipoTrabajoLabels } from "@/utils/workflow";

type WorkItem = {
  moto: Motocicleta;
  cliente?: ReturnType<ReturnType<typeof useWorkshopStore>["getCliente"]>;
  historial: MovimientoOrden[];
  ultimo?: MovimientoOrden;
  total: number;
  dias: number;
};

function daysOpen(value: string) {
  const start = new Date(value);
  if (Number.isNaN(start.getTime())) return 0;
  const diff = Date.now() - start.getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isLate(moto: Motocicleta) {
  if (!moto.fecha_estimada_salida) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${moto.fecha_estimada_salida}T00:00:00`) < today;
}

function WorkCard({ item, reason }: { item: WorkItem; reason?: string }) {
  return (
    <Link to="/bitacoras" className="block rounded-3xl border border-white/10 bg-[#151515] p-4 text-[#FFF2E1] shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:border-[#F2B705]/55 hover:bg-[#1e1b15] active:translate-y-0 active:scale-[0.99]">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-white">{item.moto.marca} {item.moto.modelo}</p>
          <p className="mt-1 truncate text-sm text-[#FFF2E1]/65">{item.cliente?.nombre ?? "Sin cliente"} | {item.moto.placas}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${priorityTone(item.moto.prioridad_trabajo ?? "media")}`}>
          {prioridadTrabajoLabels[item.moto.prioridad_trabajo ?? "media"]}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-[#2F2A24] p-3">
          <p className="text-[11px] font-semibold uppercase text-[#FFF2E1]/50">Estado</p>
          <p className="mt-1 truncate text-sm font-semibold text-white">{estadoOperativoLabels[item.moto.estado_operativo ?? "recibida"]}</p>
        </div>
        <div className="rounded-2xl bg-[#2F2A24] p-3">
          <p className="text-[11px] font-semibold uppercase text-[#FFF2E1]/50">Abierta</p>
          <p className="mt-1 text-sm font-semibold text-white">{item.dias} dias</p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-[#0B0B0B] p-3">
        <p className="truncate text-sm font-semibold text-[#FFD08A]">{reason ?? item.ultimo?.titulo ?? "Sin movimientos"}</p>
        <p className="mt-1 text-xs text-[#FFF2E1]/56">
          {item.moto.fecha_estimada_salida ? `Salida ${shortDate(item.moto.fecha_estimada_salida)}` : "Salida por definir"}
        </p>
      </div>
    </Link>
  );
}

function MetricCard({ label, value, icon: Icon, tone = "neutral" }: { label: string; value: string | number; icon: typeof Bike; tone?: "neutral" | "danger" | "success" }) {
  const color = tone === "danger" ? "text-red-300 bg-red-500/12" : tone === "success" ? "text-emerald-300 bg-emerald-500/12" : "text-[#FFD08A] bg-[#F2B705]/10";
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-[#FFF2E1]/60">{label}</p>
          <p className="mt-2 break-words text-3xl font-semibold text-white">{value}</p>
        </div>
        <div className={`rounded-2xl p-3 ${color}`}><Icon className="h-5 w-5" /></div>
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const { motocicletas, movimientos, cotizaciones, getCliente, getMoto } = useWorkshopStore();

  const trabajos: WorkItem[] = motocicletas
    .map((moto) => {
      const historial = movimientos
        .filter((movimiento) => movimiento.moto_id === moto.id)
        .filter((movimiento) => !moto.ciclo_trabajo_id || !movimiento.ciclo_trabajo_id || movimiento.ciclo_trabajo_id === moto.ciclo_trabajo_id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return {
        moto,
        cliente: getCliente(moto.cliente_id),
        historial,
        ultimo: historial[0],
        total: historial.reduce((sum, movimiento) => sum + (Number(movimiento.costo) || 0), 0),
        dias: daysOpen(moto.created_at),
      };
    })
    .filter((item) => isTrabajoActivo(item.moto, item.historial));

  const urgentes = trabajos
    .filter((item) => ["urgente", "alta"].includes(item.moto.prioridad_trabajo ?? "media"))
    .sort((a, b) => (b.moto.prioridad_trabajo === "urgente" ? 1 : 0) - (a.moto.prioridad_trabajo === "urgente" ? 1 : 0) || b.dias - a.dias);
  const atrasadas = trabajos.filter((item) => isLate(item.moto)).sort((a, b) => b.dias - a.dias);
  const bloqueados = trabajos.filter((item) => ["esperando_refaccion", "esperando_autorizacion"].includes(item.moto.estado_operativo ?? ""));
  const listas = trabajos.filter((item) => item.moto.estado_operativo === "lista_para_entregar");
  const rapidos = trabajos.filter((item) => item.moto.tamano_trabajo === "rapido" || item.moto.tipo_trabajo === "servicio_rapido");
  const mayores = trabajos.filter((item) => item.moto.tamano_trabajo === "proyecto" || item.moto.tipo_trabajo === "trabajo_mayor");
  const cotizado = trabajos.reduce((sum, item) => sum + item.total, 0);
  const movimientosRecientes = [...movimientos].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  const focoDelDia = [
    ...urgentes.map((item) => ({ item, reason: "Prioridad alta/urgente" })),
    ...atrasadas.map((item) => ({ item, reason: "Fecha estimada vencida" })),
    ...bloqueados.map((item) => ({ item, reason: estadoOperativoLabels[item.moto.estado_operativo ?? "recibida"] })),
  ].filter((value, index, array) => array.findIndex((other) => other.item.moto.id === value.item.moto.id) === index).slice(0, 4);

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Pizarra del taller"
        subtitle="Vista limpia para decidir que moto atender, cual esta bloqueada y que se entrega hoy."
        actions={
          <>
            <Link to="/bitacoras"><Button className="w-full sm:w-auto">Abrir trabajos</Button></Link>
            <Link to="/motocicletas/nueva"><Button className="w-full sm:w-auto" variant="secondary">Registrar moto</Button></Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Trabajos activos" value={trabajos.length} icon={Bike} />
        <MetricCard label="Urgentes / altas" value={urgentes.length} icon={ShieldAlert} tone={urgentes.length ? "danger" : "neutral"} />
        <MetricCard label="Atrasadas" value={atrasadas.length} icon={CalendarClock} tone={atrasadas.length ? "danger" : "neutral"} />
        <MetricCard label="Listas para entregar" value={listas.length} icon={CheckCircle2} tone="success" />
      </div>

      <Card className="border-[#F2B705]/20 bg-[#151515]">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#F2B705]">Que atender primero</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">Foco del dia</h2>
          </div>
          <span className="w-fit rounded-full bg-[#F2B705] px-3 py-1 text-xs font-semibold text-[#0B0B0B]">
            {focoDelDia.length} puntos de atencion
          </span>
        </div>

        {focoDelDia.length ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-4">
            {focoDelDia.map(({ item, reason }) => <WorkCard key={item.moto.id} item={item} reason={reason} />)}
          </div>
        ) : (
          <EmptyState title="No hay urgencias por ahora" />
        )}
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-white">Bloqueadas</h2>
                <p className="mt-1 text-sm text-[#FFF2E1]/58">Esperando refaccion o autorizacion.</p>
              </div>
              <Clock3 className="h-5 w-5 shrink-0 text-[#FFD08A]" />
            </div>
            {bloqueados.length ? (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {bloqueados.slice(0, 4).map((item) => <WorkCard key={item.moto.id} item={item} />)}
              </div>
            ) : <EmptyState title="Nada bloqueado" />}
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-white">Trabajo operativo</h2>
                <p className="mt-1 text-sm text-[#FFF2E1]/58">Rapidos para sacar flujo y mayores que no deben perderse.</p>
              </div>
              <Gauge className="h-5 w-5 shrink-0 text-[#FFD08A]" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-[#151515] p-4">
                <p className="text-sm font-semibold text-[#FFD08A]">Servicios rapidos</p>
                <p className="mt-2 text-3xl font-semibold text-white">{rapidos.length}</p>
                <p className="mt-1 text-sm text-[#FFF2E1]/60">Llantas, servicios cortos y trabajos de salida rapida.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-[#151515] p-4">
                <p className="text-sm font-semibold text-[#FFD08A]">Trabajos mayores</p>
                <p className="mt-2 text-3xl font-semibold text-white">{mayores.length}</p>
                <p className="mt-1 text-sm text-[#FFF2E1]/60">Proyectos largos que ocupan seguimiento constante.</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <h2 className="text-xl font-semibold text-white">Resumen del mes</h2>
            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl bg-[#0B0B0B]/45 p-3">
                <p className="text-xs font-semibold uppercase text-[#FFF2E1]/50">Cotizado en trabajos activos</p>
                <p className="mt-1 text-2xl font-semibold text-white">{currency(cotizado)}</p>
              </div>
              <div className="rounded-2xl bg-[#0B0B0B]/45 p-3">
                <p className="text-xs font-semibold uppercase text-[#FFF2E1]/50">Cotizaciones creadas</p>
                <p className="mt-1 text-2xl font-semibold text-white">{cotizaciones.length}</p>
              </div>
              <div className="rounded-2xl bg-[#0B0B0B]/45 p-3">
                <p className="text-xs font-semibold uppercase text-[#FFF2E1]/50">Promedio de dias abiertos</p>
                <p className="mt-1 text-2xl font-semibold text-white">{trabajos.length ? Math.round(trabajos.reduce((sum, item) => sum + item.dias, 0) / trabajos.length) : 0}</p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-xl font-semibold text-white">Actividad reciente</h2>
            <div className="space-y-3">
              {movimientosRecientes.length === 0 ? <p className="text-sm text-[#FFF2E1]/60">Aun no hay movimientos registrados.</p> : null}
              {movimientosRecientes.map((movimiento) => {
                const moto = movimiento.moto_id ? getMoto(movimiento.moto_id) : undefined;
                const cliente = moto ? getCliente(moto.cliente_id) : undefined;

                return (
                  <Link key={movimiento.id} to="/bitacoras" className="block rounded-2xl border border-white/10 bg-[#151515] p-3 transition hover:border-[#F2B705]/35 hover:bg-[#1e1b15] active:scale-[0.99]">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-[#F2B705]/12 text-[#FFD08A]">
                        {movimiento.tipo === "cotizacion" ? <FileText className="h-4 w-4" /> : movimiento.tipo === "salida" ? <CheckCircle2 className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{movimiento.titulo}</p>
                        <p className="mt-1 truncate text-sm text-[#FFF2E1]/58">
                          {moto ? `${moto.marca} ${moto.modelo} | ${moto.placas}` : "Trabajo anterior"}
                          {cliente ? ` | ${cliente.nombre}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-[#FFF2E1]/45">{formatDate(movimiento.created_at)}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
