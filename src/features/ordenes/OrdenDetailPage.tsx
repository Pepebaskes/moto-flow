import { Link, useNavigate, useParams } from "react-router-dom";
import type { FormEvent } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field, Input, Select, Textarea } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadge";
import { OrdenForm, type OrdenFormData } from "@/features/ordenes/OrdenForm";
import { useWorkshopStore } from "@/stores/workshopStore";
import type { MovimientoOrden, TipoEvidencia } from "@/types/motoflow";
import { currency, estadoLabels, estadosOrden, shortDate } from "@/utils/format";

export function OrdenCreatePage() {
  const addOrden = useWorkshopStore((state) => state.addOrden);
  const navigate = useNavigate();
  return (
    <>
      <PageHeader title="Nueva orden" />
      <Card><OrdenForm onSubmit={async (data) => { await addOrden(data); navigate("/ordenes"); }} /></Card>
    </>
  );
}

export function OrdenDetailPage() {
  const { id = "" } = useParams();
  const store = useWorkshopStore();
  const orden = store.getOrden(id);
  const navigate = useNavigate();

  if (!orden) return <Card>Orden no encontrada.</Card>;

  const cliente = store.getCliente(orden.cliente_id);
  const moto = store.getMoto(orden.moto_id);
  const evidencias = store.evidencias.filter((evidencia) => evidencia.orden_id === orden.id);
  const movimientos = store.movimientos
    .filter((movimiento) => movimiento.orden_id === orden.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const cotizacionActual = movimientos.reduce((sum, movimiento) => sum + (Number(movimiento.costo) || 0), Number(orden.total_estimado) || 0);

  async function uploadEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("file") as File;
    if (!file || file.size === 0) return;
    await store.addEvidence({
      orden_id: orden!.id,
      tipo: form.get("tipo") as TipoEvidencia,
      nota: String(form.get("nota") ?? ""),
      file,
    });
    event.currentTarget.reset();
  }

  async function addTimelineEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await store.addMovimiento({
      orden_id: orden!.id,
      tipo: form.get("tipo") as MovimientoOrden["tipo"],
      titulo: String(form.get("titulo") ?? "Actualizacion"),
      nota: String(form.get("nota") ?? ""),
      publico: form.get("publico") === "on",
      costo: Number(form.get("costo") || 0),
      kilometraje: Number(form.get("kilometraje") || 0),
    });
    event.currentTarget.reset();
  }

  return (
    <div>
      <PageHeader
        title={orden.titulo}
        subtitle={`${cliente?.nombre ?? "Sin cliente"} · ${moto?.marca ?? ""} ${moto?.modelo ?? ""}`}
        actions={
          <>
            <Link to={`/consulta/${orden.codigo_publico}`}><Button variant="secondary">Portal por codigo</Button></Link>
            {moto ? <Link to={`/consulta/${moto.placas}`}><Button variant="secondary">Portal por placas</Button></Link> : null}
          </>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Card><p className="text-sm text-neutral-500">Estado</p><div className="mt-2"><StatusBadge value={orden.estado} /></div></Card>
        <Card><p className="text-sm text-neutral-500">Prioridad</p><div className="mt-2"><PriorityBadge value={orden.prioridad} /></div></Card>
        <Card><p className="text-sm text-neutral-500">Cotizacion base</p><p className="mt-2 text-xl font-semibold">{currency(orden.total_estimado)}</p></Card>
        <Card><p className="text-sm text-neutral-500">Hasta el momento</p><p className="mt-2 text-xl font-semibold">{currency(cotizacionActual)}</p></Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <Card>
            <h2 className="mb-3 text-lg font-semibold">Datos de la orden</h2>
            <OrdenForm initial={orden} onSubmit={async (data: OrdenFormData) => { await store.updateOrden(orden.id, data); navigate("/ordenes"); }} />
          </Card>

          <Card>
            <h2 className="mb-3 text-lg font-semibold">Historial y bitacora</h2>
            <div className="space-y-3">
              {movimientos.length === 0 ? <p className="text-sm text-neutral-500">Aun no hay movimientos para esta moto.</p> : null}
              {movimientos.map((movimiento) => (
                <div key={movimiento.id} className="rounded-lg border border-neutral-200 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{movimiento.titulo}</p>
                      <p className="text-xs font-semibold uppercase text-neutral-500">
                        {new Date(movimiento.created_at).toLocaleString("es-MX")} · {movimiento.tipo}
                        {movimiento.publico ? " · visible para cliente" : " · interno"}
                      </p>
                    </div>
                    {movimiento.costo ? <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold">{currency(movimiento.costo)}</span> : null}
                  </div>
                  {movimiento.nota ? <p className="mt-2 text-sm text-neutral-700">{movimiento.nota}</p> : null}
                  {movimiento.kilometraje ? <p className="mt-2 text-xs font-semibold text-neutral-500">{movimiento.kilometraje.toLocaleString()} km</p> : null}
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="space-y-5">
          <Card>
            <h2 className="mb-3 text-lg font-semibold">Cambiar estado</h2>
            <Select value={orden.estado} onChange={(event) => void store.changeOrderStatus(orden.id, event.target.value as typeof orden.estado)}>
              {estadosOrden.map((estado) => <option key={estado} value={estado}>{estadoLabels[estado]}</option>)}
            </Select>
            <p className="mt-3 text-sm text-neutral-500">Codigo publico: <strong>{orden.codigo_publico}</strong></p>
            <p className="text-sm text-neutral-500">Fecha estimada: {shortDate(orden.fecha_estimada)}</p>
          </Card>

          <Card>
            <h2 className="mb-3 text-lg font-semibold">Bitacora del dia</h2>
            <form className="grid gap-3" onSubmit={addTimelineEntry}>
              <Field label="Tipo">
                <Select name="tipo" defaultValue="proceso">
                  <option value="entrada">Entrada</option>
                  <option value="proceso">Proceso</option>
                  <option value="salida">Salida</option>
                  <option value="cotizacion">Cotizacion</option>
                  <option value="nota">Nota</option>
                </Select>
              </Field>
              <Field label="Titulo"><Input name="titulo" placeholder="Entrada, avance de reparacion, prueba final..." required /></Field>
              <Field label="Nota"><Textarea name="nota" placeholder="Que se hizo, que falta, que se encontro..." /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Costo adicional"><Input name="costo" type="number" step="0.01" min="0" defaultValue="0" /></Field>
                <Field label="Kilometraje"><Input name="kilometraje" type="number" min="0" defaultValue={moto?.kilometraje ?? 0} /></Field>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                <input name="publico" type="checkbox" className="h-4 w-4" defaultChecked />
                Visible para el cliente
              </label>
              <Button type="submit">Agregar a historial</Button>
            </form>
          </Card>

          <Card>
            <h2 className="mb-3 text-lg font-semibold">Evidencias</h2>
            <form className="grid gap-3" onSubmit={uploadEvidence}>
              <Field label="Tipo"><Select name="tipo" defaultValue="entrada"><option value="entrada">Entrada</option><option value="proceso">Proceso</option><option value="salida">Salida</option></Select></Field>
              <Field label="Foto"><Input name="file" type="file" accept="image/*" /></Field>
              <Field label="Nota"><Input name="nota" /></Field>
              <Button type="submit" variant="secondary">Subir evidencia</Button>
            </form>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {evidencias.map((evidencia) => (
                <a key={evidencia.id} href={evidencia.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border border-neutral-200">
                  <img src={evidencia.url} alt={evidencia.nota || evidencia.tipo} className="h-28 w-full object-cover" />
                  <p className="p-2 text-xs font-semibold">{evidencia.tipo}</p>
                </a>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
