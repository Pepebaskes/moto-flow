import { Bike, BookOpen, ClipboardCheck, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { useWorkshopStore } from "@/stores/workshopStore";
import { currency } from "@/utils/format";

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

  const metrics = [
    { label: "Motos en sistema", value: motocicletas.length, icon: Bike },
    { label: "Bitacoras creadas", value: movimientos.length, icon: BookOpen },
    { label: "Avances publicos", value: movimientos.filter((movimiento) => movimiento.publico).length, icon: ClipboardCheck },
    { label: "Cotizado en bitacoras", value: currency(cotizado), icon: FileText },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Resumen operativo del taller."
        actions={
          <>
            <Link to="/motocicletas/nueva"><Button>Registrar moto</Button></Link>
            <Link to="/bitacoras"><Button variant="secondary">Abrir bitacoras</Button></Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-neutral-500">{metric.label}</p>
                  <p className="mt-2 text-3xl font-bold">{metric.value}</p>
                </div>
                <div className="rounded-lg bg-neutral-100 p-3"><Icon className="h-5 w-5" /></div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <h2 className="mb-3 text-lg font-bold">Bitacoras recientes</h2>
          <div className="space-y-3">
            {movimientosRecientes.length === 0 ? <p className="text-sm text-neutral-500">Aun no hay movimientos registrados.</p> : null}
            {movimientosRecientes.map((movimiento) => {
              const moto = movimiento.moto_id ? getMoto(movimiento.moto_id) : undefined;
              const cliente = moto ? getCliente(moto.cliente_id) : undefined;

              return (
                <Link key={movimiento.id} to="/bitacoras" className="block rounded-lg border border-neutral-200 p-3 transition hover:bg-neutral-50">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{movimiento.titulo}</p>
                    <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-bold">{movimiento.tipo}</span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-500">
                    {moto ? `${moto.marca} ${moto.modelo} · ${moto.placas}` : "Moto vinculada a trabajo anterior"}
                    {cliente ? ` · ${cliente.nombre}` : ""} · {formatDate(movimiento.created_at)}
                  </p>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-bold">Accesos rapidos</h2>
          <div className="grid gap-2">
            <Link to="/clientes/nuevo"><Button className="w-full" variant="secondary">Nuevo cliente</Button></Link>
            <Link to="/motocicletas/nueva"><Button className="w-full" variant="secondary">Registrar moto</Button></Link>
            <Link to="/bitacoras"><Button className="w-full" variant="secondary">Trabajar bitacora</Button></Link>
            <Link to="/cotizaciones"><Button className="w-full" variant="secondary">Cotizaciones</Button></Link>
          </div>
          <div className="mt-4 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600">
            Al registrar una moto se crea automaticamente su primera bitacora como recibida dentro del taller.
          </div>
          <div className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600">
            Cotizaciones creadas: <strong>{cotizaciones.length}</strong>
          </div>
        </Card>
      </div>
    </div>
  );
}
