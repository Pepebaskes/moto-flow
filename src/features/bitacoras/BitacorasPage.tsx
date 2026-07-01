import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field, Input, Select, Textarea } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { useWorkshopStore } from "@/stores/workshopStore";
import type { MovimientoOrden } from "@/types/motoflow";
import { currency, shortDate } from "@/utils/format";

const tipoBitacoraDescripcion = {
  entrada: "Recepcion, condiciones iniciales, primera revision y detalles con los que llega.",
  proceso: "Avances del mecanico, piezas revisadas, pruebas, pendientes y cambios del dia.",
  salida: "Revision final, entrega y resumen de lo realizado.",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BitacorasPage() {
  const store = useWorkshopStore();
  const [motoId, setMotoId] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingDate, setSavingDate] = useState(false);

  const bitacoras = useMemo(() => {
    return store.motocicletas
      .map((moto) => {
        const cliente = store.getCliente(moto.cliente_id);
        const ordenesMoto = store.ordenes.filter((orden) => orden.moto_id === moto.id);
        const ordenIds = ordenesMoto.map((orden) => orden.id);
        const historial = store.movimientos
          .filter((movimiento) => movimiento.moto_id === moto.id || Boolean(movimiento.orden_id && ordenIds.includes(movimiento.orden_id)))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const ultima = historial[0];
        const total = historial.reduce((sum, movimiento) => sum + (Number(movimiento.costo) || 0), 0);

        return { moto, cliente, historial, ultima, total };
      })
      .sort((a, b) => new Date(b.ultima?.created_at ?? b.moto.created_at).getTime() - new Date(a.ultima?.created_at ?? a.moto.created_at).getTime());
  }, [store]);

  useEffect(() => {
    if (!motoId && bitacoras[0]) setMotoId(bitacoras[0].moto.id);
    if (motoId && !bitacoras.some((bitacora) => bitacora.moto.id === motoId)) {
      setMotoId(bitacoras[0]?.moto.id ?? "");
    }
  }, [bitacoras, motoId]);

  const seleccionada = bitacoras.find((bitacora) => bitacora.moto.id === motoId);
  const moto = seleccionada?.moto;
  const cliente = seleccionada?.cliente;
  const historial = seleccionada?.historial ?? [];

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
  }

  async function saveFechaEstimada(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!moto) return;

    const form = new FormData(event.currentTarget);
    setSavingDate(true);
    await store.updateMotoFechaEstimada(moto.id, String(form.get("fecha_estimada_salida") || ""));
    setSavingDate(false);
  }

  return (
    <div>
      <PageHeader
        title="Bitacoras"
        subtitle="Cada moto registrada abre su bitacora automaticamente con fecha, hora y estado de recibida dentro del taller."
        actions={<Link to="/motocicletas/nueva"><Button>Registrar moto</Button></Link>}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[380px_1fr]">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase text-neutral-500">Bitacoras activas</h2>
            <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-bold">{bitacoras.length}</span>
          </div>

          {bitacoras.length === 0 ? (
            <Card>
              <p className="font-semibold">Todavia no hay bitacoras.</p>
              <p className="mt-1 text-sm text-neutral-500">Registra una moto y el sistema creara la primera entrada automaticamente.</p>
            </Card>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {bitacoras.map((item) => {
              const active = item.moto.id === motoId;

              return (
                <button
                  key={item.moto.id}
                  type="button"
                  onClick={() => setMotoId(item.moto.id)}
                  className={`rounded-lg border bg-white p-4 text-left shadow-sm transition ${
                    active ? "border-neutral-950 ring-2 ring-neutral-200" : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{item.moto.marca} {item.moto.modelo}</p>
                      <p className="text-sm text-neutral-500">{item.moto.anio} · {item.moto.color} · {item.moto.placas}</p>
                    </div>
                    <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-bold">{item.historial.length}</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold">{item.cliente?.nombre ?? "Sin cliente"}</p>
                  <p className="mt-1 text-xs text-neutral-500">{item.moto.kilometraje.toLocaleString()} km</p>
                  <div className="mt-3 rounded-lg bg-neutral-50 p-2 text-xs text-neutral-600">
                    <p className="font-bold text-neutral-800">{item.ultima?.titulo ?? "Sin movimientos"}</p>
                    <p>{item.ultima ? formatDate(item.ultima.created_at) : "Esperando primera entrada"}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {!moto ? (
          <Card>
            <p className="font-semibold">Selecciona una moto para trabajar su bitacora.</p>
          </Card>
        ) : (
          <section className="space-y-5">
            <Card>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-neutral-500">Expediente de moto</p>
                  <h2 className="text-2xl font-bold">{moto.marca} {moto.modelo}</h2>
                  <p className="text-sm text-neutral-500">
                    {moto.anio} · {moto.color} · placas {moto.placas} · {moto.kilometraje.toLocaleString()} km
                  </p>
                  <p className="mt-1 text-sm font-semibold">{cliente?.nombre} · {cliente?.telefono}</p>
                </div>
                <Link to={`/motocicletas/${moto.id}`}><Button variant="secondary">Ver moto</Button></Link>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-neutral-50 p-3">
                  <p className="text-xs font-semibold uppercase text-neutral-500">Entradas</p>
                  <p className="mt-1 font-bold">{historial.length}</p>
                </div>
                <div className="rounded-lg bg-neutral-50 p-3">
                  <p className="text-xs font-semibold uppercase text-neutral-500">Cotizado hasta ahora</p>
                  <p className="mt-1 font-bold">{currency(seleccionada?.total ?? 0)}</p>
                </div>
                <div className="rounded-lg bg-neutral-50 p-3">
                  <p className="text-xs font-semibold uppercase text-neutral-500">Salida estimada</p>
                  <p className="mt-1 font-bold">{moto.fecha_estimada_salida ? shortDate(moto.fecha_estimada_salida) : "Por definir"}</p>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[420px_1fr]">
              <div className="space-y-5">
                <Card>
                  <h2 className="mb-3 text-lg font-bold">Fecha estimada de salida</h2>
                  <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={saveFechaEstimada}>
                    <Field label="Fecha actual">
                      <Input name="fecha_estimada_salida" type="date" defaultValue={moto.fecha_estimada_salida ?? ""} />
                    </Field>
                    <Button type="submit" className="self-end" disabled={savingDate}>
                      {savingDate ? "Guardando..." : "Actualizar"}
                    </Button>
                  </form>
                </Card>

                <Card>
                  <h2 className="mb-3 text-lg font-bold">Agregar entrada</h2>
                  <form className="grid gap-3" onSubmit={saveBitacora}>
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
                    <Input name="titulo" placeholder="Ej. Diagnosticando moto, cambio de balatas, prueba final..." required />
                  </Field>

                  <div className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">
                    <p><strong>Entrada:</strong> {tipoBitacoraDescripcion.entrada}</p>
                    <p className="mt-1"><strong>Proceso:</strong> {tipoBitacoraDescripcion.proceso}</p>
                    <p className="mt-1"><strong>Salida:</strong> {tipoBitacoraDescripcion.salida}</p>
                  </div>

                  <Field label="Notas">
                    <Textarea name="nota" placeholder="Describe que se hizo hoy, que se encontro, que falta o que se cotizo." />
                  </Field>

                  <Field label="Costo agregado">
                    <Input name="costo" type="number" min="0" step="0.01" defaultValue="0" />
                  </Field>

                  <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                    <input name="publico" type="checkbox" className="h-4 w-4" defaultChecked />
                    Visible para el cliente
                  </label>

                  <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar en bitacora"}</Button>
                </form>
                </Card>
              </div>

              <Card>
                <h2 className="mb-3 text-lg font-bold">Historial de la moto</h2>
                <div className="space-y-3">
                  {historial.length === 0 ? <p className="text-sm text-neutral-500">Aun no hay entradas para esta moto.</p> : null}
                  {historial.map((movimiento) => (
                    <div key={movimiento.id} className="rounded-lg border border-neutral-200 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-bold">{movimiento.titulo}</p>
                          <p className="text-xs font-semibold uppercase text-neutral-500">
                            {formatDate(movimiento.created_at)} · {movimiento.tipo}
                            {movimiento.publico ? " · visible para cliente" : " · interno"}
                          </p>
                        </div>
                        {movimiento.costo ? <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-bold">{currency(movimiento.costo)}</span> : null}
                      </div>
                      {movimiento.nota ? <p className="mt-2 whitespace-pre-line text-sm text-neutral-700">{movimiento.nota}</p> : null}
                      {movimiento.kilometraje ? <p className="mt-2 text-xs font-semibold text-neutral-500">{movimiento.kilometraje.toLocaleString()} km</p> : null}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
