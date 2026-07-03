import { jsPDF } from "jspdf";
import { Download, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Input, Select } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { useWorkshopStore } from "@/stores/workshopStore";
import type { Motocicleta, MovimientoOrden } from "@/types/motoflow";
import { currency, shortDate } from "@/utils/format";
import { includesSearch, isWithinDateFilter, normalizeSearch } from "@/utils/search";

const PAGE_SIZE = 10;

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
  let y = 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Taller Villa - Historial de trabajo", 14, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Moto: ${moto.marca} ${moto.modelo} ${moto.anio}`, 14, y);
  y += 6;
  doc.text(`Placas: ${moto.placas} | Color: ${moto.color} | Km: ${moto.kilometraje.toLocaleString()}`, 14, y);
  y += 6;
  doc.text(`Cliente: ${cliente?.nombre ?? "Sin cliente"} | Tel: ${cliente?.telefono ?? "Sin telefono"}`, 14, y);
  y += 6;
  doc.text(`Salida estimada: ${moto.fecha_estimada_salida ? shortDate(moto.fecha_estimada_salida) : "Pendiente"} | Total registrado: ${currency(total)}`, 14, y);
  y += 10;

  doc.setDrawColor(180);
  doc.line(14, y, 196, y);
  y += 8;

  historial.forEach((movimiento, index) => {
    if (y > 260) {
      doc.addPage();
      y = 16;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${index + 1}. ${movimiento.titulo}`, 14, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`${formatDate(movimiento.created_at)} | ${movimiento.tipo} | ${movimiento.publico ? "visible para cliente" : "interno"}`, 14, y);
    y += 5;

    if (movimiento.costo) {
      doc.text(`Total registrado: ${currency(movimiento.costo)}`, 14, y);
      y += 5;
    }

    if (movimiento.refaccion) {
      doc.text(`Refaccion: ${movimiento.refaccion}`, 14, y);
      y += 5;
    }

    if (movimiento.costo_refaccion || movimiento.costo_mano_obra) {
      doc.text(`Refaccion: ${currency(movimiento.costo_refaccion || 0)} | Mano de obra: ${currency(movimiento.costo_mano_obra || 0)}`, 14, y);
      y += 5;
    }

    if (movimiento.kilometraje) {
      doc.text(`Kilometraje: ${movimiento.kilometraje.toLocaleString()} km`, 14, y);
      y += 5;
    }

    if (movimiento.nota) {
      const lines = doc.splitTextToSize(movimiento.nota, 178);
      doc.text(lines, 14, y);
      y += Math.max(7, lines.length * 5);
    }

    y += 4;
  });

  doc.save(`trabajo-${moto.placas}-${moto.marca}-${moto.modelo}.pdf`.replaceAll(" ", "-"));
}

export function HistorialPage() {
  const store = useWorkshopStore();
  const [query, setQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);

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
        const finalizada = store.movimientos.some((movimiento) => movimiento.moto_id === moto.id && movimiento.tipo === "salida");
        return { moto, cliente, historial, ultima, total, finalizada };
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
  }, [brandFilter, dateFilter, query, typeFilter]);

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
          <div className="hidden border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase text-[#FFF2E1]/50 lg:grid lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_120px_120px_130px_100px] lg:gap-3">
            <span>Moto</span>
            <span>Cliente</span>
            <span>Estado</span>
            <span>Entradas</span>
            <span>Ultimo avance</span>
            <span className="text-right">Archivo</span>
          </div>

          <div className="divide-y divide-white/10">
            {paginatedHistoriales.map((item) => (
              <article key={item.moto.id} className="grid gap-3 p-4 transition hover:bg-white/[0.04] lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_120px_120px_130px_100px] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words text-lg font-semibold text-white lg:text-base">{item.moto.marca} {item.moto.modelo}</p>
                    <span className="rounded-full bg-[#2F2A24] px-2.5 py-1 text-xs font-semibold text-[#FFF2E1] lg:hidden">{item.historial.length} entradas</span>
                  </div>
                  <p className="mt-1 text-sm text-[#FFF2E1]/65">{item.moto.anio} | {item.moto.color} | placas {item.moto.placas}</p>
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#FFF2E1]">{item.cliente?.nombre ?? "Sin cliente"}</p>
                  <p className="truncate text-sm text-[#FFF2E1]/58">{item.cliente?.telefono ?? "Sin telefono"}</p>
                </div>

                <div>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.finalizada ? "bg-white/10 text-[#FFF2E1]/75" : "bg-[#F2B705] text-[#0B0B0B]"}`}>
                    {item.finalizada ? "Finalizada" : "Activa"}
                  </span>
                </div>

                <div className="text-sm text-[#FFF2E1]/72">
                  <p className="font-semibold text-white">{item.historial.length}</p>
                  <p>{currency(item.total)}</p>
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{item.ultima?.titulo ?? "Sin avances"}</p>
                  <p className="text-xs text-[#FFF2E1]/55">{item.ultima ? formatDate(item.ultima.created_at) : "Sin fecha"}</p>
                </div>

                <div className="flex justify-end">
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
              </article>
            ))}
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
