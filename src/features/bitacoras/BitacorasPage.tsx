import { ArrowLeft, CalendarDays, FileClock, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field, Input, Select, Textarea } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { useWorkshopStore } from "@/stores/workshopStore";
import type { MovimientoOrden } from "@/types/motoflow";
import { currency, shortDate } from "@/utils/format";

type Tab = "avance" | "fecha" | "historial";

const tipoBitacoraDescripcion = {
  entrada: "Condiciones iniciales, primera revision y detalles con los que llega.",
  proceso: "Avances del mecanico, piezas revisadas, pruebas, pendientes y cambios del dia.",
  salida: "Revision final, entrega y resumen de lo realizado.",
};

const tabs = [
  { id: "avance" as const, label: "Avance", icon: Plus },
  { id: "fecha" as const, label: "Fecha", icon: CalendarDays },
  { id: "historial" as const, label: "Historial", icon: FileClock },
];

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isAutoEntrada(movimiento: MovimientoOrden) {
  return movimiento.tipo === "entrada" && movimiento.titulo.toLowerCase().includes("recibida dentro del taller");
}

export function BitacorasPage() {
  const store = useWorkshopStore();
  const [motoId, setMotoId] = useState("");
  const [tab, setTab] = useState<Tab>("avance");
  const [saving, setSaving] = useState(false);
  const [savingDate, setSavingDate] = useState(false);

  const bitacoras = useMemo(() => {
    return store.motocicletas
      .map((moto) => {
        const cliente = store.getCliente(moto.cliente_id);
        const ordenIds = store.ordenes.filter((orden) => orden.moto_id === moto.id).map((orden) => orden.id);
        const historial = store.movimientos
          .filter((movimiento) => movimiento.moto_id === moto.id || Boolean(movimiento.orden_id && ordenIds.includes(movimiento.orden_id)))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const ultima = historial[0];
        const total = historial.reduce((sum, movimiento) => sum + (Number(movimiento.costo) || 0), 0);
        return { moto, cliente, historial, ultima, total };
      })
      .sort((a, b) => new Date(b.ultima?.created_at ?? b.moto.created_at).getTime() - new Date(a.ultima?.created_at ?? a.moto.created_at).getTime());
  }, [store]);

  const seleccionada = bitacoras.find((bitacora) => bitacora.moto.id === motoId);
  const moto = seleccionada?.moto;
  const cliente = seleccionada?.cliente;
  const historial = seleccionada?.historial ?? [];

  function openMoto(id: string) {
    setMotoId(id);
    setTab("avance");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeMoto() {
    setMotoId("");
    setTab("avance");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeMovimiento(id: string, titulo: string) {
    if (!window.confirm(`Eliminar bitacora "${titulo}"?`)) return;
    const result = await store.deleteMovimiento(id);
    if (!result.ok) window.alert(result.message);
  }

  async function saveBitacora(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!moto) return;

    const form = new FormData(event.currentTarget);
    setSaving(true);
    await store.addMovimiento({
      moto_id: moto.id,
      tipo: form.get("tipo") as MovimientoOrden["tipo"],
      titulo: String(form.get("titulo") || "Actualizacion de taller"),
      nota: String(form.get("nota") || ""),
      publico: form.get("publico") === "on",
      costo: Number(form.get("costo") || 0),
      kilometraje: Number(form.get("kilometraje") || moto.kilometraje || 0),
    });
    setSaving(false);
    event.currentTarget.reset();
    setTab("historial");
  }

  async function saveFechaEstimada(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!moto) return;

    const form = new FormData(event.currentTarget);
    setSavingDate(true);
    await store.updateMotoFechaEstimada(moto.id, String(form.get("fecha_estimada_salida") || ""));
    setSavingDate(false);
    setTab("historial");
  }

  if (!moto) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Bitacoras"
          subtitle="Primero elige una moto. Al abrirla se muestra su expediente, formulario e historial sin amontonar la pantalla."
          actions={
            <Link to="/motocicletas/nueva">
              <Button>Registrar moto</Button>
            </Link>
          }
        />

        {bitacoras.length === 0 ? (
          <Card>
            <p className="font-semibold text-white">Todavia no hay bitacoras.</p>
            <p className="mt-1 text-sm text-[#FFF2E1]/70">Registra una moto y el sistema creara la primera entrada automaticamente.</p>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {bitacoras.map((item) => (
            <button
              key={item.moto.id}
              type="button"
              onClick={() => openMoto(item.moto.id)}
              className="group w-full overflow-hidden rounded-3xl border border-white/10 bg-[#151515] p-4 text-left text-[#FFF2E1] shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:border-[#F2B705]/70 hover:bg-[#1c1a16] active:translate-y-0 active:scale-[0.99]"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-white group-hover:text-[#F2B705]">
                    {item.moto.marca} {item.moto.modelo}
                  </p>
                  <p className="mt-1 truncate text-sm text-[#FFF2E1]/72">
                    {item.moto.anio} | {item.moto.color} | placas {item.moto.placas}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[#F2B705] px-2.5 py-1 text-xs font-semibold text-[#0B0B0B]">
                  {item.historial.length}
                </span>
              </div>

              <div className="mt-4 rounded-2xl bg-[#2F2A24] p-3">
                <p className="truncate text-sm font-semibold text-white">{item.cliente?.nombre ?? "Sin cliente"}</p>
                <p className="mt-1 text-xs text-[#FFF2E1]/68">{item.moto.kilometraje.toLocaleString()} km</p>
              </div>

              <div className="mt-3 rounded-2xl border border-white/10 bg-[#0B0B0B] p-3">
                <p className="truncate text-sm font-semibold text-[#FFD08A]">{item.ultima?.titulo ?? "Sin movimientos"}</p>
                <p className="mt-1 text-xs text-[#FFF2E1]/65">{item.ultima ? formatDate(item.ultima.created_at) : "Esperando primera entrada"}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={closeMoto}
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-2xl border border-white/10 bg-[#151515] px-4 text-sm font-semibold text-[#FFF2E1] transition hover:border-[#F2B705]/60 hover:bg-[#2F2A24] active:scale-[0.98]"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a motos
        </button>
        <Link to={`/motocicletas/${moto.id}`}>
          <Button variant="secondary">Ver ficha de moto</Button>
        </Link>
      </div>

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#FFD08A]">Expediente de moto</p>
            <h1 className="mt-1 break-words text-2xl font-semibold text-white sm:text-3xl">
              {moto.marca} {moto.modelo}
            </h1>
            <p className="mt-1 text-sm text-[#FFF2E1]/72">
              {moto.anio} | {moto.color} | placas {moto.placas} | {moto.kilometraje.toLocaleString()} km
            </p>
            <p className="mt-2 text-sm font-semibold text-[#FFF2E1]">
              {cliente?.nombre ?? "Sin cliente"} {cliente?.telefono ? `| ${cliente.telefono}` : ""}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:min-w-[420px]">
            <div className="rounded-2xl bg-[#2F2A24] p-3">
              <p className="text-[11px] font-semibold uppercase text-[#FFF2E1]/65">Entradas</p>
              <p className="text-lg font-semibold text-white">{historial.length}</p>
            </div>
            <div className="rounded-2xl bg-[#2F2A24] p-3">
              <p className="text-[11px] font-semibold uppercase text-[#FFF2E1]/65">Cotizado</p>
              <p className="text-lg font-semibold text-white">{currency(seleccionada?.total ?? 0)}</p>
            </div>
            <div className="rounded-2xl bg-[#2F2A24] p-3">
              <p className="text-[11px] font-semibold uppercase text-[#FFF2E1]/65">Salida</p>
              <p className="text-sm font-semibold text-white">{moto.fecha_estimada_salida ? shortDate(moto.fecha_estimada_salida) : "Pendiente"}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="sticky top-[73px] z-10 rounded-3xl border border-white/10 bg-[#0B0B0B]/90 p-2 shadow-xl shadow-black/30 backdrop-blur">
        <div className="grid grid-cols-3 gap-2">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition active:scale-[0.98] ${
                  tab === item.id ? "bg-[#F2B705] text-[#0B0B0B]" : "text-[#FFF2E1]/72 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" /> {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "avance" ? (
        <Card>
          <h2 className="mb-4 text-xl font-semibold text-white">Agregar avance</h2>
          <form className="grid gap-4" onSubmit={saveBitacora}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Tipo">
                <Select name="tipo" defaultValue="proceso">
                  <option value="entrada">Entrada</option>
                  <option value="proceso">Proceso</option>
                  <option value="salida">Salida</option>
                  <option value="cotizacion">Cotizacion</option>
                  <option value="nota">Nota</option>
                </Select>
              </Field>
              <Field label="Kilometraje">
                <Input name="kilometraje" type="number" min="0" defaultValue={moto.kilometraje} />
              </Field>
            </div>

            <Field label="Titulo">
              <Input name="titulo" placeholder="Ej. Diagnosticando moto, cambio de balatas..." required />
            </Field>

            <div className="rounded-2xl border border-white/10 bg-[#2F2A24] p-3 text-xs leading-5 text-[#FFF2E1]/75">
              <p><strong className="text-[#FFD08A]">Entrada:</strong> {tipoBitacoraDescripcion.entrada}</p>
              <p><strong className="text-[#FFD08A]">Proceso:</strong> {tipoBitacoraDescripcion.proceso}</p>
              <p><strong className="text-[#FFD08A]">Salida:</strong> {tipoBitacoraDescripcion.salida}</p>
            </div>

            <Field label="Notas">
              <Textarea name="nota" placeholder="Describe que se hizo hoy, que se encontro, que falta o que se cotizo." />
            </Field>

            <Field label="Costo agregado">
              <Input name="costo" type="number" min="0" step="0.01" defaultValue="0" />
            </Field>

            <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-white/10 bg-[#151515] px-3 text-sm font-semibold text-[#FFF2E1]">
              <input name="publico" type="checkbox" className="h-4 w-4 accent-[#F2B705]" defaultChecked />
              Visible para el cliente
            </label>

            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar avance"}</Button>
          </form>
        </Card>
      ) : null}

      {tab === "fecha" ? (
        <Card>
          <h2 className="mb-4 text-xl font-semibold text-white">Fecha estimada de salida</h2>
          <form className="grid gap-4 sm:grid-cols-[1fr_auto]" onSubmit={saveFechaEstimada}>
            <Field label="Fecha actual">
              <Input name="fecha_estimada_salida" type="date" defaultValue={moto.fecha_estimada_salida ?? ""} />
            </Field>
            <Button type="submit" className="self-end" disabled={savingDate}>
              {savingDate ? "Guardando..." : "Actualizar fecha"}
            </Button>
          </form>
        </Card>
      ) : null}

      {tab === "historial" ? (
        <Card>
          <h2 className="mb-4 text-xl font-semibold text-white">Historial de la moto</h2>
          <div className="space-y-3">
            {historial.length === 0 ? <p className="text-sm text-[#FFF2E1]/70">Aun no hay entradas para esta moto.</p> : null}
            {historial.map((movimiento) => (
              <article key={movimiento.id} className="rounded-3xl border border-white/10 bg-[#151515] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-lg font-semibold text-white">{movimiento.titulo}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#FFF2E1]/60">
                      {formatDate(movimiento.created_at)} | {movimiento.tipo}
                      {movimiento.publico ? " | visible para cliente" : " | interno"}
                    </p>
                  </div>
                  {!isAutoEntrada(movimiento) ? (
                    <button
                      type="button"
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-red-500/12 text-red-200 transition hover:bg-red-500 hover:text-white active:scale-95"
                      onClick={() => void removeMovimiento(movimiento.id, movimiento.titulo)}
                      aria-label="Eliminar bitacora"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                {movimiento.nota ? <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#FFF2E1]/82">{movimiento.nota}</p> : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {movimiento.costo ? <span className="rounded-full bg-[#F2B705] px-3 py-1 text-xs font-semibold text-[#0B0B0B]">{currency(movimiento.costo)}</span> : null}
                  {movimiento.kilometraje ? <span className="rounded-full bg-[#2F2A24] px-3 py-1 text-xs font-semibold text-[#FFF2E1]">{movimiento.kilometraje.toLocaleString()} km</span> : null}
                </div>
              </article>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
