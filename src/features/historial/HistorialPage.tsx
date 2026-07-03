import { jsPDF } from "jspdf";
import { ChevronDown, ChevronUp, Download, GitCompareArrows, RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Input, Select } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { useWorkshopStore } from "@/stores/workshopStore";
import type { Motocicleta, MovimientoOrden } from "@/types/motoflow";
import { currency, shortDate } from "@/utils/format";
import { addPdfFooter, addPdfHeader, ensurePdfSpace, pdfInfoBox } from "@/utils/pdf";
import { includesSearch, isWithinDateFilter, normalizeSearch } from "@/utils/search";

const PAGE_SIZE = 10;

type VisitaResumen = {
  cicloId: string;
  movimientos: MovimientoOrden[];
  inicio: string;
  cierre?: string;
  total: number;
  refacciones: number;
  manoObra: number;
  entradas: number;
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

function downloadBitacoraPdf({
  moto,
  cliente,
  historial,
  total,
}: {
  moto: Motocicleta;
  cliente?: { nombre: string; telefono: string };
  historial: MovimientoOrden[];
  total: number;
}) {
  const doc = new jsPDF();
  let y = addPdfHeader(doc, "Historial de trabajo", `${moto.marca} ${moto.modelo} ${moto.anio} | Placas ${moto.placas}`);

  pdfInfoBox(doc, "Cliente", cliente?.nombre ?? "Sin cliente", 14, y, 56);
  pdfInfoBox(doc, "Telefono", cliente?.telefono ?? "Sin telefono", 76, y, 40);
  pdfInfoBox(doc, "Kilometraje", `${moto.kilometraje.toLocaleString()} km`, 122, y, 35);
  pdfInfoBox(doc, "Total registrado", currency(total), 163, y, 33);
  y += 30;

  pdfInfoBox(doc, "Color", moto.color, 14, y, 42);
  pdfInfoBox(doc, "Salida estimada", moto.fecha_estimada_salida ? shortDate(moto.fecha_estimada_salida) : "Pendiente", 62, y, 48);
  pdfInfoBox(doc, "Numero de serie", moto.numero_serie || "No registrado", 116, y, 80);
  y += 32;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.text("Bitacora y avances", 14, y);
  y += 8;

  historial.forEach((movimiento, index) => {
    y = ensurePdfSpace(doc, y, 34);

    doc.setFillColor(248, 248, 248);
    doc.setDrawColor(230, 230, 230);
    doc.roundedRect(14, y - 5, 182, 11, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(`${index + 1}. ${movimiento.titulo}`, 14, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(95, 95, 95);
    doc.text(`${formatDate(movimiento.created_at)} | ${movimiento.tipo} | ${movimiento.publico ? "visible para cliente" : "interno"}`, 14, y);
    y += 5;

    if (movimiento.costo) {
      doc.setTextColor(30, 30, 30);
      doc.text(`Total registrado: ${currency(movimiento.costo)}`, 14, y);
      y += 5;
    }

    if (movimiento.refaccion) {
      doc.setTextColor(30, 30, 30);
      doc.text(`Refaccion: ${movimiento.refaccion}`, 14, y);
      y += 5;
    }

    if (movimiento.costo_refaccion || movimiento.costo_mano_obra) {
      doc.setTextColor(30, 30, 30);
      doc.text(`Refaccion: ${currency(movimiento.costo_refaccion || 0)} | Mano de obra: ${currency(movimiento.costo_mano_obra || 0)}`, 14, y);
      y += 5;
    }

    if (movimiento.kilometraje) {
      doc.setTextColor(30, 30, 30);
      doc.text(`Kilometraje: ${movimiento.kilometraje.toLocaleString()} km`, 14, y);
      y += 5;
    }

    if (movimiento.nota) {
      const lines = doc.splitTextToSize(movimiento.nota, 178);
      doc.setTextColor(70, 70, 70);
      doc.text(lines, 14, y);
      y += Math.max(7, lines.length * 5);
    }

    y += 4;
  });

  addPdfFooter(doc);
  doc.save(`trabajo-${moto.placas}-${moto.marca}-${moto.modelo}.pdf`.replaceAll(" ", "-"));
}

function buildVisitas(historial: MovimientoOrden[]) {
  const groups = new Map<string, MovimientoOrden[]>();

  historial.forEach((movimiento) => {
    const key = movimiento.ciclo_trabajo_id || movimiento.orden_id || `mov-${movimiento.id}`;
    groups.set(key, [...(groups.get(key) ?? []), movimiento]);
  });

  return Array.from(groups.entries())
    .map(([cicloId, movimientos]): VisitaResumen => {
      const sorted = [...movimientos].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const salida = [...sorted].reverse().find((movimiento) => movimiento.tipo === "salida");
      return {
        cicloId,
        movimientos: sorted,
        inicio: sorted[0]?.created_at ?? new Date().toISOString(),
        cierre: salida?.created_at,
        total: sorted.reduce((sum, movimiento) => sum + Number(movimiento.costo || 0), 0),
        refacciones: sorted.reduce((sum, movimiento) => sum + Number(movimiento.costo_refaccion || 0), 0),
        manoObra: sorted.reduce((sum, movimiento) => sum + Number(movimiento.costo_mano_obra || 0), 0),
        entradas: sorted.length,
      };
    })
    .sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());
}

export function HistorialPage() {
  const store = useWorkshopStore();
  const [query, setQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [expandedMotoId, setExpandedMotoId] = useState<string | null>(null);

  const historiales = useMemo(() => {
    return store.motocicletas
      .map((moto) => {
        const cliente = store.getCliente(moto.cliente_id);
        const ordenIds = store.ordenes.filter((orden) => orden.moto_id === moto.id).map((orden) => orden.id);
        const historial = store.movimientos
          .filter((movimiento) => movimiento.moto_id === moto.id || Boolean(movimiento.orden_id && ordenIds.includes(movimiento.orden_id)))
          .filter((movimiento) => !typeFilter || movimiento.tipo === typeFilter)
          .filter((movimiento) => isWithinDateFilter(movimiento.created_at, dateFilter))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const ultima = historial[0];
        const total = historial.reduce((sum, movimiento) => sum + (Number(movimiento.costo) || 0), 0);
        const visitas = buildVisitas(historial);
        const finalizada = moto.activa === false;
        return { moto, cliente, historial, visitas, ultima, total, finalizada };
      })
      .filter((item) => {
        const matchesBrand = !brandFilter || normalizeSearch(item.moto.marca) === normalizeSearch(brandFilter);
        return (
          item.historial.length > 0 &&
          matchesBrand &&
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
      })
      .sort((a, b) => new Date(b.ultima?.created_at ?? b.moto.created_at).getTime() - new Date(a.ultima?.created_at ?? a.moto.created_at).getTime());
  }, [brandFilter, dateFilter, query, store, typeFilter]);

  const marcas = useMemo(() => {
    return Array.from(new Set(store.motocicletas.map((moto) => moto.marca).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [store.motocicletas]);

  const pageCount = Math.max(1, Math.ceil(historiales.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, historiales.length);
  const paginatedHistoriales = historiales.slice(startIndex, endIndex);

  useEffect(() => {
    setPage(1);
    setExpandedMotoId(null);
  }, [brandFilter, dateFilter, query, typeFilter]);

  async function reactivateMoto(id: string, label: string) {
    if (!window.confirm(`Reactivar ${label} y abrir una visita nueva en Trabajos?`)) return;
    await store.activateMoto(id);
  }

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Historial"
        subtitle="Archivo completo de trabajos y movimientos. Consulta, filtra y descarga expedientes en PDF."
      />

      <Card>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_170px_170px_170px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FFF2E1]/45" />
            <Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por cliente, placas, moto, avance..." />
          </div>
          <Select value={brandFilter} onChange={(event) => setBrandFilter(event.target.value)} aria-label="Filtrar por marca">
            <option value="">Todas las marcas</option>
            {marcas.map((marca) => <option key={marca} value={marca}>{marca}</option>)}
          </Select>
          <Select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="Filtrar por fecha">
            <option value="">Todas las fechas</option>
            <option value="today">Hoy</option>
            <option value="week">Ultimos 7 dias</option>
            <option value="month">Ultimo mes</option>
          </Select>
          <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filtrar por tipo">
            <option value="">Todos los tipos</option>
            <option value="entrada">Entrada</option>
            <option value="proceso">Proceso</option>
            <option value="salida">Salida</option>
            <option value="cotizacion">Cotizacion</option>
            <option value="nota">Nota</option>
          </Select>
        </div>
        <div className="mt-3 flex flex-col gap-2 text-xs font-semibold text-[#FFF2E1]/58 sm:flex-row sm:items-center sm:justify-between">
          <p>{historiales.length} expedientes encontrados</p>
          {historiales.length > 0 ? <p>Mostrando {startIndex + 1}-{endIndex} de {historiales.length}</p> : null}
        </div>
      </Card>

      {historiales.length === 0 ? <EmptyState title="No hay trabajos con esos filtros" /> : null}

      {historiales.length > 0 ? (
        <Card className="p-0">
          <div className="hidden border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase text-[#FFF2E1]/50 lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_110px_110px_130px_220px] lg:gap-3">
            <span>Moto</span>
            <span>Cliente</span>
            <span>Estado</span>
            <span>Visitas</span>
            <span>Ultimo avance</span>
            <span className="text-right">Acciones</span>
          </div>

          <div className="divide-y divide-white/10">
            {paginatedHistoriales.map((item) => {
              const expanded = expandedMotoId === item.moto.id;
              const currentVisit = item.visitas[0];
              const previousVisit = item.visitas[1];
              const totalDiff = currentVisit && previousVisit ? currentVisit.total - previousVisit.total : 0;
              const refaccionesDiff = currentVisit && previousVisit ? currentVisit.refacciones - previousVisit.refacciones : 0;

              return (
                <article key={item.moto.id} className="grid gap-3 p-4 transition hover:bg-white/[0.04] lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_110px_110px_130px_220px] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words text-lg font-semibold text-white lg:text-base">{item.moto.marca} {item.moto.modelo}</p>
                      <span className="rounded-full bg-[#2F2A24] px-2.5 py-1 text-xs font-semibold text-[#FFF2E1] lg:hidden">{item.visitas.length} visitas</span>
                    </div>
                    <p className="mt-1 text-sm text-[#FFF2E1]/65">{item.moto.anio} | {item.moto.color} | placas {item.moto.placas}</p>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#FFF2E1]">{item.cliente?.nombre ?? "Sin cliente"}</p>
                    <p className="truncate text-sm text-[#FFF2E1]/58">{item.cliente?.telefono ?? "Sin telefono"}</p>
                  </div>

                  <div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.finalizada ? "bg-white/10 text-[#FFF2E1]/75" : "bg-[#F2B705] text-[#0B0B0B]"}`}>
                      {item.finalizada ? "Inactiva" : "Activa"}
                    </span>
                  </div>

                  <div className="text-sm text-[#FFF2E1]/72">
                    <p className="font-semibold text-white">{item.visitas.length}</p>
                    <p>{item.historial.length} entradas</p>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{item.ultima?.titulo ?? "Sin avances"}</p>
                    <p className="text-xs text-[#FFF2E1]/55">{item.ultima ? formatDate(item.ultima.created_at) : "Sin fecha"}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3 lg:flex lg:justify-end">
                    <Button type="button" variant="secondary" className="w-full lg:w-auto" onClick={() => setExpandedMotoId(expanded ? null : item.moto.id)}>
                      {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />} Visitas
                    </Button>
                    {item.finalizada ? (
                      <Button type="button" className="w-full lg:w-auto" onClick={() => void reactivateMoto(item.moto.id, `${item.moto.marca} ${item.moto.modelo}`)}>
                        <RotateCcw className="h-4 w-4" /> Reactivar
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full lg:w-auto"
                      onClick={() => downloadBitacoraPdf({
                        moto: item.moto,
                        cliente: item.cliente ? { nombre: item.cliente.nombre, telefono: item.cliente.telefono } : undefined,
                        historial: item.historial,
                        total: item.total,
                      })}
                    >
                      <Download className="h-4 w-4" /> PDF
                    </Button>
                  </div>

                  {expanded ? (
                    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-3 lg:col-span-6">
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-wide text-[#FFF2E1]/50">Visitas anteriores</p>
                          <p className="text-sm text-[#FFF2E1]/65">Cada reactivacion abre una visita nueva y conserva lo anterior.</p>
                        </div>
                        {currentVisit && previousVisit ? (
                          <div className="rounded-2xl border border-[#F2B705]/25 bg-[#F2B705]/10 px-3 py-2 text-sm text-[#FFF2E1]">
                            <p className="flex items-center gap-2 font-semibold text-[#FFD08A]"><GitCompareArrows className="h-4 w-4" /> Comparacion</p>
                            <p>Total: {totalDiff >= 0 ? "+" : "-"}{currency(Math.abs(totalDiff))} | Refacciones: {refaccionesDiff >= 0 ? "+" : "-"}{currency(Math.abs(refaccionesDiff))}</p>
                          </div>
                        ) : null}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {item.visitas.map((visita, index) => (
                          <div key={visita.cicloId} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-semibold text-white">Visita {item.visitas.length - index}</p>
                                <p className="text-xs text-[#FFF2E1]/55">Ingreso: {formatDate(visita.inicio)}</p>
                                <p className="text-xs text-[#FFF2E1]/55">Salida: {visita.cierre ? formatDate(visita.cierre) : "Sin salida"}</p>
                              </div>
                              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${visita.cierre ? "bg-white/10 text-[#FFF2E1]/70" : "bg-[#F2B705] text-[#0B0B0B]"}`}>
                                {visita.cierre ? "Cerrada" : "Actual"}
                              </span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                              <p className="rounded-xl bg-black/20 p-2 text-[#FFF2E1]/65">Entradas<br /><span className="font-semibold text-white">{visita.entradas}</span></p>
                              <p className="rounded-xl bg-black/20 p-2 text-[#FFF2E1]/65">Total<br /><span className="font-semibold text-white">{currency(visita.total)}</span></p>
                              <p className="rounded-xl bg-black/20 p-2 text-[#FFF2E1]/65">Refacciones<br /><span className="font-semibold text-white">{currency(visita.refacciones)}</span></p>
                              <p className="rounded-xl bg-black/20 p-2 text-[#FFF2E1]/65">Mano de obra<br /><span className="font-semibold text-white">{currency(visita.manoObra)}</span></p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </Card>
      ) : null}

      {historiales.length > PAGE_SIZE ? (
        <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[#FFF2E1]/70">Pagina {currentPage} de {pageCount}</p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button type="button" variant="secondary" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              Anterior
            </Button>
            <Button type="button" variant="secondary" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
              Siguiente
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
