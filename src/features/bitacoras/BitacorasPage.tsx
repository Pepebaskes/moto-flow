import { ArrowLeft, CalendarDays, CheckCircle2, FileClock, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Field, Input, Select, Textarea } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { useWorkshopStore } from "@/stores/workshopStore";
import type { MovimientoOrden } from "@/types/motoflow";
import { currency, shortDate } from "@/utils/format";
import { includesSearch, isWithinDateFilter, normalizeSearch } from "@/utils/search";
import { estadoOperativoLabels, estadosOperativos, isTrabajoActivo, prioridadTrabajoLabels, prioridadesTrabajo, priorityTone, tamanoTrabajoLabels, tamanosTrabajo, tipoTrabajoLabels, tiposTrabajo } from "@/utils/workflow";

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
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  const bitacoras = useMemo(() => {
    return store.motocicletas
      .map((moto) => {
        const cliente = store.getCliente(moto.cliente_id);
        const ordenIds = store.ordenes.filter((orden) => orden.moto_id === moto.id).map((orden) => orden.id);
        const historial = store.movimientos
          .filter((movimiento) => movimiento.moto_id === moto.id || Boolean(movimiento.orden_id && ordenIds.includes(movimiento.orden_id)))
          .filter((movimiento) => !moto.ciclo_trabajo_id || !movimiento.ciclo_trabajo_id || movimiento.ciclo_trabajo_id === moto.ciclo_trabajo_id)
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
  const evidenciasMoto = useMemo(() => {
    if (!moto) return [];
    const ordenIds = store.ordenes.filter((orden) => orden.moto_id === moto.id).map((orden) => orden.id);
    const movimientoIds = historial.map((movimiento) => movimiento.id);
    return store.evidencias.filter(
      (evidencia) =>
        evidencia.moto_id === moto.id ||
        Boolean(evidencia.movimiento_id && movimientoIds.includes(evidencia.movimiento_id)) ||
        Boolean(evidencia.orden_id && ordenIds.includes(evidencia.orden_id)),
    );
  }, [historial, moto, store.evidencias, store.ordenes]);

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  }

  const marcas = useMemo(() => {
    return Array.from(new Set(store.motocicletas.map((moto) => moto.marca).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [store.motocicletas]);

  const filteredBitacoras = useMemo(() => {
    return bitacoras.filter((item) => {
      const matchesBrand = !brandFilter || normalizeSearch(item.moto.marca) === normalizeSearch(brandFilter);
      return (
        isTrabajoActivo(item.moto, item.historial) &&
        matchesBrand &&
        isWithinDateFilter(item.moto.created_at, dateFilter) &&
        includesSearch(
          [
            item.moto.marca,
            item.moto.modelo,
            item.moto.anio,
            item.moto.placas,
            item.moto.color,
            item.moto.numero_serie,
            item.cliente?.nombre,
            item.cliente?.telefono,
            item.ultima?.titulo,
            item.ultima?.nota,
          ],
          query,
        )
      );
    });
  }, [bitacoras, brandFilter, dateFilter, query]);

  useEffect(() => {
    const state = location.state as { notice?: string } | null;
    if (!state?.notice) return;
    showNotice(state.notice);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

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
    if (!window.confirm(`Eliminar movimiento "${titulo}"?`)) return;
    const result = await store.deleteMovimiento(id);
    if (!result.ok) window.alert(result.message);
  }

  async function saveBitacora(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!moto) return;

    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    const tipo = form.get("tipo") as MovimientoOrden["tipo"];
    const publico = form.get("publico") === "on";
    const estado_operativo = String(form.get("estado_operativo") || moto.estado_operativo || "en_trabajo") as NonNullable<typeof moto.estado_operativo>;
    const prioridad_trabajo = String(form.get("prioridad_trabajo") || moto.prioridad_trabajo || "media") as NonNullable<typeof moto.prioridad_trabajo>;
    const tipo_trabajo = String(form.get("tipo_trabajo") || moto.tipo_trabajo || "diagnostico") as NonNullable<typeof moto.tipo_trabajo>;
    const tamano_trabajo = String(form.get("tamano_trabajo") || moto.tamano_trabajo || "medio") as NonNullable<typeof moto.tamano_trabajo>;
    const fotos = form
      .getAll("fotos")
      .filter((file): file is File => file instanceof File && file.size > 0);

    setSaving(true);
    try {
      await store.updateMotoTrabajo(moto.id, {
        estado_operativo: tipo === "salida" ? "entregada" : estado_operativo,
        prioridad_trabajo,
        tipo_trabajo,
        tamano_trabajo,
      });

      const movimiento = await store.addMovimiento({
        moto_id: moto.id,
        tipo,
        titulo: String(form.get("titulo") || "Actualizacion de taller"),
        nota: String(form.get("nota") || ""),
        publico,
        refaccion: String(form.get("refaccion") || ""),
        costo_refaccion: Number(form.get("costo_refaccion") || 0),
        costo_mano_obra: Number(form.get("costo_mano_obra") || 0),
        kilometraje: Number(form.get("kilometraje") || moto.kilometraje || 0),
      });

      if (movimiento && fotos.length > 0) {
        await Promise.all(
          fotos.map((file) =>
            store.addEvidence({
              moto_id: moto.id,
              movimiento_id: movimiento.id,
              tipo: tipo === "salida" ? "salida" : tipo === "entrada" ? "entrada" : "proceso",
              nota: String(form.get("titulo") || "Foto de trabajo"),
              publico,
              file,
            }),
          ),
        );
      }

      formElement.reset();
      showNotice(fotos.length > 0 ? `Trabajo actualizado correctamente con ${fotos.length} foto(s).` : "Trabajo actualizado correctamente.");
      setTab("historial");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "No se pudo guardar el trabajo.");
    } finally {
      setSaving(false);
    }
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
          title="Trabajos activos"
          subtitle="Solo aparecen motos activas. Aqui se agrega diagnostico, prioridad, avances, fotos, costos y salida."
          actions={
            <>
              <Link to="/historial"><Button variant="secondary">Ver historial</Button></Link>
              <Link to="/motocicletas/nueva">
                <Button>Registrar moto</Button>
              </Link>
            </>
          }
        />

        {bitacoras.length === 0 ? (
          <Card>
            <p className="font-semibold text-white">Todavia no hay trabajos activos.</p>
            <p className="mt-1 text-sm text-[#FFF2E1]/70">Registra una moto y el sistema creara su ingreso automaticamente.</p>
          </Card>
        ) : null}

        {bitacoras.length > 0 ? (
          <Card>
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_180px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FFF2E1]/45" />
                <Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por placas, cliente, moto o avance..." />
              </div>
              <Select value={brandFilter} onChange={(event) => setBrandFilter(event.target.value)} aria-label="Filtrar trabajos por marca">
                <option value="">Todas las marcas</option>
                {marcas.map((marca) => <option key={marca} value={marca}>{marca}</option>)}
              </Select>
              <Select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="Filtrar trabajos por fecha">
                <option value="">Todas las fechas</option>
                <option value="today">Registradas hoy</option>
                <option value="week">Ultimos 7 dias</option>
                <option value="month">Ultimo mes</option>
              </Select>
            </div>
            <p className="mt-3 text-xs font-semibold text-[#FFF2E1]/58">
              {filteredBitacoras.length} trabajos activos de {bitacoras.length} expedientes
            </p>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredBitacoras.map((item) => (
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
                  {prioridadTrabajoLabels[item.moto.prioridad_trabajo ?? "media"]}
                </span>
              </div>

              <div className="mt-4 rounded-2xl bg-[#2F2A24] p-3">
                <p className="truncate text-sm font-semibold text-white">{item.cliente?.nombre ?? "Sin cliente"}</p>
                <p className="mt-1 text-xs text-[#FFF2E1]/68">
                  {estadoOperativoLabels[item.moto.estado_operativo ?? "recibida"]} | {item.moto.kilometraje.toLocaleString()} km
                </p>
              </div>

              <div className="mt-3 rounded-2xl border border-white/10 bg-[#0B0B0B] p-3">
                <p className="truncate text-sm font-semibold text-[#FFD08A]">{item.ultima?.titulo ?? "Sin movimientos"}</p>
                <p className="mt-1 text-xs text-[#FFF2E1]/65">{item.ultima ? formatDate(item.ultima.created_at) : "Esperando primera entrada"}</p>
              </div>
            </button>
          ))}
        </div>
        {bitacoras.length > 0 && filteredBitacoras.length === 0 ? <EmptyState title="No encontramos trabajos activos con esos filtros" /> : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {notice ? (
        <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[#F2B705]/30 bg-[#151515] px-4 py-3 text-sm font-semibold text-[#FFF2E1] shadow-2xl shadow-black/45 sm:left-auto sm:right-6">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[#F2B705]" />
          <span className="min-w-0 break-words">{notice}</span>
        </div>
      ) : null}

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
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityTone(moto.prioridad_trabajo ?? "media")}`}>
                {prioridadTrabajoLabels[moto.prioridad_trabajo ?? "media"]}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#FFF2E1]/78">
                {estadoOperativoLabels[moto.estado_operativo ?? "recibida"]}
              </span>
              <span className="rounded-full bg-[#2F2A24] px-3 py-1 text-xs font-semibold text-[#FFD08A]">
                {tipoTrabajoLabels[moto.tipo_trabajo ?? "diagnostico"]}
              </span>
            </div>
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
          <h2 className="mb-4 text-xl font-semibold text-white">Actualizar trabajo</h2>
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Prioridad">
                <Select name="prioridad_trabajo" defaultValue={moto.prioridad_trabajo ?? "media"}>
                  {prioridadesTrabajo.map((item) => <option key={item} value={item}>{prioridadTrabajoLabels[item]}</option>)}
                </Select>
              </Field>
              <Field label="Estado">
                <Select name="estado_operativo" defaultValue={moto.estado_operativo ?? "en_trabajo"}>
                  {estadosOperativos.map((item) => <option key={item} value={item}>{estadoOperativoLabels[item]}</option>)}
                </Select>
              </Field>
              <Field label="Tipo de trabajo">
                <Select name="tipo_trabajo" defaultValue={moto.tipo_trabajo ?? "diagnostico"}>
                  {tiposTrabajo.map((item) => <option key={item} value={item}>{tipoTrabajoLabels[item]}</option>)}
                </Select>
              </Field>
              <Field label="Tamano">
                <Select name="tamano_trabajo" defaultValue={moto.tamano_trabajo ?? "medio"}>
                  {tamanosTrabajo.map((item) => <option key={item} value={item}>{tamanoTrabajoLabels[item]}</option>)}
                </Select>
              </Field>
            </div>

            <Field label="Titulo">
              <Input name="titulo" placeholder="Ej. Diagnostico inicial, cambio de balatas, prueba final..." required />
            </Field>

            <div className="rounded-2xl border border-white/10 bg-[#2F2A24] p-3 text-xs leading-5 text-[#FFF2E1]/75">
              <p><strong className="text-[#FFD08A]">Entrada:</strong> {tipoBitacoraDescripcion.entrada}</p>
              <p><strong className="text-[#FFD08A]">Proceso:</strong> {tipoBitacoraDescripcion.proceso}</p>
              <p><strong className="text-[#FFD08A]">Salida:</strong> {tipoBitacoraDescripcion.salida}</p>
            </div>

            <Field label="Notas">
              <Textarea name="nota" placeholder="Describe que se hizo hoy, que se encontro, que falta o que se cotizo." />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Refaccion">
                <Input name="refaccion" placeholder="Ej. Balatas delanteras, camara, bujia..." />
              </Field>
              <Field label="Costo de refaccion">
                <Input name="costo_refaccion" type="number" min="0" step="0.01" defaultValue="0" />
              </Field>
              <Field label="Mano de obra">
                <Input name="costo_mano_obra" type="number" min="0" step="0.01" defaultValue="0" />
              </Field>
            </div>

            <Field label="Fotos opcionales">
              <Input name="fotos" type="file" accept="image/*" multiple />
            </Field>
            <p className="-mt-2 text-xs text-[#FFF2E1]/58">
              Si la entrada esta marcada como visible, estas fotos tambien apareceran en la consulta del cliente.
            </p>

            <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-white/10 bg-[#151515] px-3 text-sm font-semibold text-[#FFF2E1]">
              <input name="publico" type="checkbox" className="h-4 w-4 accent-[#F2B705]" defaultChecked />
              Visible para el cliente
            </label>

            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar trabajo"}</Button>
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
          <h2 className="mb-4 text-xl font-semibold text-white">Historial del trabajo</h2>
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
                      aria-label="Eliminar movimiento"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                {movimiento.nota ? <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#FFF2E1]/82">{movimiento.nota}</p> : null}

                {evidenciasMoto.filter((evidencia) => evidencia.movimiento_id === movimiento.id).length ? (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {evidenciasMoto
                      .filter((evidencia) => evidencia.movimiento_id === movimiento.id)
                      .map((evidencia) => (
                        <a key={evidencia.id} href={evidencia.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B0B0B]">
                          <img src={evidencia.url} alt={evidencia.nota || evidencia.tipo} className="h-28 w-full object-cover" />
                          <p className="truncate px-2 py-1.5 text-xs font-semibold text-[#FFF2E1]/75">{evidencia.publico ? "Visible" : "Interna"}</p>
                        </a>
                      ))}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {movimiento.refaccion ? <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#FFF2E1]">Refaccion: {movimiento.refaccion}</span> : null}
                  {movimiento.costo_refaccion ? <span className="rounded-full bg-[#2F2A24] px-3 py-1 text-xs font-semibold text-[#FFD08A]">Refaccion {currency(movimiento.costo_refaccion)}</span> : null}
                  {movimiento.costo_mano_obra ? <span className="rounded-full bg-[#2F2A24] px-3 py-1 text-xs font-semibold text-[#FFD08A]">Mano de obra {currency(movimiento.costo_mano_obra)}</span> : null}
                  {movimiento.costo ? <span className="rounded-full bg-[#F2B705] px-3 py-1 text-xs font-semibold text-[#0B0B0B]">Total {currency(movimiento.costo)}</span> : null}
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
