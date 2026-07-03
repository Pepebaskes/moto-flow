import { jsPDF } from "jspdf";
import { Download, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Field, Input, Select, Textarea } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { useAuthStore } from "@/stores/authStore";
import { useWorkshopStore } from "@/stores/workshopStore";
import type { Cotizacion, CotizacionItem } from "@/types/motoflow";
import { currency, uid } from "@/utils/format";
import { addPdfFooter, addPdfHeader, ensurePdfSpace, pdfInfoBox } from "@/utils/pdf";
import { canManageWorkshop } from "@/utils/permissions";
import { includesSearch, isWithinDateFilter } from "@/utils/search";

const CLAUSULA_DEFAULT =
  "Este presupuesto es informativo y puede cambiar despues de la revision interna de la motocicleta. Si durante la inspeccion se detectan piezas danadas, refacciones adicionales, mano de obra extra o condiciones no visibles al momento de cotizar, el taller notificara al cliente para su autorizacion antes de continuar.";

function totalCotizacion(items: CotizacionItem[]) {
  return items.reduce((sum, item) => sum + item.cantidad * item.precio_unitario, 0);
}

function downloadCotizacionPdf(cotizacion: Cotizacion, cliente: string, moto?: string) {
  const doc = new jsPDF();
  const total = totalCotizacion(cotizacion.items);
  let y = addPdfHeader(doc, "Cotizacion de servicio", `Folio: ${cotizacion.folio} | Fecha: ${cotizacion.fecha}`);

  pdfInfoBox(doc, "Cliente", cliente, 14, y, 56);
  pdfInfoBox(doc, "Motocicleta", moto || "No especificada", 76, y, 56);
  pdfInfoBox(doc, "Total estimado", currency(total), 138, y, 58);
  y += 30;

  if (cotizacion.domicilio) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(`Domicilio: ${cotizacion.domicilio}`, 14, y);
    y += 8;
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(13);
  doc.text(cotizacion.titulo, 14, y);
  y += 8;

  doc.setFillColor(47, 42, 36);
  doc.roundedRect(14, y, 182, 8, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text("Concepto", 18, y + 5);
  doc.text("Cant.", 112, y + 5);
  doc.text("Precio", 132, y + 5);
  doc.text("Importe", 165, y + 5);
  y += 14;

  doc.setFont("helvetica", "normal");
  cotizacion.items.forEach((item) => {
    y = ensurePdfSpace(doc, y, 18);
    const conceptoLines = doc.splitTextToSize(item.concepto, 88);
    doc.setTextColor(30, 30, 30);
    doc.text(conceptoLines, 14, y);
    doc.text(String(item.cantidad), 114, y);
    doc.text(currency(item.precio_unitario), 132, y);
    doc.text(currency(item.cantidad * item.precio_unitario), 165, y);
    y += Math.max(8, conceptoLines.length * 5);
    if (item.proveedor) {
      doc.setTextColor(90);
      doc.text(`Proveedor/ref.: ${item.proveedor}`, 14, y);
      doc.setTextColor(0);
      y += 6;
    }
  });

  y += 4;
  doc.line(120, y, 196, y);
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(`Total estimado: ${currency(total)}`, 132, y);
  y += 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (cotizacion.notas) {
    doc.setFont("helvetica", "bold");
    doc.text("Notas:", 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(cotizacion.notas, 180), 14, y);
    y += 14;
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Clausula de variacion del presupuesto", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(doc.splitTextToSize(cotizacion.clausula, 180), 14, y);
  y += 20;

  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text("La autorizacion del cliente es necesaria para cualquier cambio de alcance o incremento de costo.", 14, y);
  addPdfFooter(doc);
  doc.save(`${cotizacion.folio}-${cliente.replaceAll(" ", "-")}.pdf`);
}

export function CotizacionesPage() {
  const { clientes, motocicletas, cotizaciones, addCotizacion, deleteCotizacion, getCliente, getMoto } = useWorkshopStore();
  const user = useAuthStore((state) => state.user);
  const canDelete = canManageWorkshop(user);
  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? "");
  const [items, setItems] = useState<CotizacionItem[]>([
    { id: uid("item"), concepto: "Servicio o refaccion", cantidad: 1, precio_unitario: 0, proveedor: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const motosCliente = motocicletas.filter((moto) => moto.cliente_id === clienteId);
  const total = useMemo(() => totalCotizacion(items), [items]);

  const filteredCotizaciones = useMemo(() => {
    return cotizaciones
      .filter((cotizacion) => {
        const cliente = getCliente(cotizacion.cliente_id);
        const moto = cotizacion.moto_id ? getMoto(cotizacion.moto_id) : undefined;
        const motoLabel = moto ? `${moto.marca} ${moto.modelo} ${moto.placas}` : "";
        return (
          (!statusFilter || cotizacion.estado === statusFilter) &&
          isWithinDateFilter(cotizacion.created_at, dateFilter) &&
          includesSearch(
            [
              cotizacion.folio,
              cotizacion.titulo,
              cotizacion.estado,
              cotizacion.fecha,
              cliente?.nombre,
              cliente?.telefono,
              motoLabel,
              ...cotizacion.items.flatMap((item) => [item.concepto, item.proveedor]),
            ],
            query,
          )
        );
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [cotizaciones, dateFilter, getCliente, getMoto, query, statusFilter]);

  function updateItem(id: string, patch: Partial<CotizacionItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);

    await addCotizacion({
      cliente_id: String(form.get("cliente_id")),
      moto_id: String(form.get("moto_id") || "") || undefined,
      titulo: String(form.get("titulo") || "Cotizacion de servicio"),
      domicilio: String(form.get("domicilio") || ""),
      valida_hasta: String(form.get("valida_hasta") || ""),
      notas: String(form.get("notas") || ""),
      clausula: String(form.get("clausula") || CLAUSULA_DEFAULT),
      items,
    });

    setSaving(false);
    setShowForm(false);
    event.currentTarget.reset();
    setItems([{ id: uid("item"), concepto: "Servicio o refaccion", cantidad: 1, precio_unitario: 0, proveedor: "" }]);
  }

  async function removeCotizacion(id: string, folio: string) {
    if (!window.confirm(`Eliminar cotizacion ${folio}?`)) return;
    const result = await deleteCotizacion(id);
    if (!result.ok) window.alert(result.message);
  }

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader
        title="Cotizaciones"
        subtitle="Presupuestos para servicios, refacciones o revisiones antes de autorizar el trabajo."
        actions={
          <Button type="button" onClick={() => setShowForm((value) => !value)}>
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cerrar" : "Nueva cotizacion"}
          </Button>
        }
      />

      {showForm ? (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Nueva cotizacion</h2>
          <form className="grid gap-4" onSubmit={save}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Cliente">
                <Select name="cliente_id" value={clienteId} onChange={(event) => setClienteId(event.target.value)}>
                  {clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>)}
                </Select>
              </Field>
              <Field label="Motocicleta">
                <Select name="moto_id">
                  <option value="">Sin moto especifica</option>
                  {motosCliente.map((moto) => <option key={moto.id} value={moto.id}>{moto.marca} {moto.modelo} - {moto.placas}</option>)}
                </Select>
              </Field>
            </div>

            <Field label="Titulo de cotizacion">
              <Input name="titulo" placeholder="Ej. Presupuesto de balatas delanteras" required />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Domicilio">
                <Input name="domicilio" placeholder="Domicilio del cliente o taller" />
              </Field>
              <Field label="Valida hasta">
                <Input name="valida_hasta" type="date" />
              </Field>
            </div>

            <div className="space-y-3">
              <div className="flex min-w-0 flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                <h3 className="font-semibold">Conceptos</h3>
                <Button type="button" variant="secondary" className="w-full min-[420px]:w-auto" onClick={() => setItems((current) => [...current, { id: uid("item"), concepto: "", cantidad: 1, precio_unitario: 0, proveedor: "" }])}>
                  Agregar concepto
                </Button>
              </div>

              {items.map((item, index) => (
                <div key={item.id} className="min-w-0 rounded-2xl border border-white/10 bg-[#151515] p-3">
                  <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
                    <p className="text-sm font-semibold">Partida {index + 1}</p>
                    {items.length > 1 ? (
                      <button type="button" className="shrink-0 text-xs font-semibold text-red-200" onClick={() => setItems((current) => current.filter((row) => row.id !== item.id))}>
                        Quitar
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1fr_90px_130px]">
                    <Field label="Concepto">
                      <Input value={item.concepto} onChange={(event) => updateItem(item.id, { concepto: event.target.value })} required />
                    </Field>
                    <Field label="Cantidad">
                      <Input type="number" min="1" value={item.cantidad} onChange={(event) => updateItem(item.id, { cantidad: Number(event.target.value) })} />
                    </Field>
                    <Field label="Precio">
                      <Input type="number" min="0" step="0.01" value={item.precio_unitario} onChange={(event) => updateItem(item.id, { precio_unitario: Number(event.target.value) })} />
                    </Field>
                  </div>
                  <Field label="Proveedor / referencia">
                    <Input value={item.proveedor ?? ""} onChange={(event) => updateItem(item.id, { proveedor: event.target.value })} placeholder="Ej. proveedor consultado, marca, numero de parte" />
                  </Field>
                </div>
              ))}
            </div>

            <div className="min-w-0 rounded-2xl bg-[#2F2A24] p-4">
              <p className="text-sm text-[#FFF2E1]/65">Total estimado</p>
              <p className="break-words text-2xl font-semibold text-white">{currency(total)}</p>
            </div>

            <Field label="Notas">
              <Textarea name="notas" placeholder="Tiempo estimado, disponibilidad de proveedor, recomendaciones..." />
            </Field>

            <Field label="Clausula">
              <Textarea name="clausula" defaultValue={CLAUSULA_DEFAULT} />
            </Field>

            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar cotizacion"}</Button>
          </form>
        </Card>
      ) : null}

      <Card>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_170px_170px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FFF2E1]/45" />
            <Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por folio, cliente, moto, concepto..." />
          </div>
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrar cotizaciones por estado">
            <option value="">Todos los estados</option>
            <option value="borrador">Borrador</option>
            <option value="enviada">Enviada</option>
            <option value="autorizada">Autorizada</option>
            <option value="rechazada">Rechazada</option>
          </Select>
          <Select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="Filtrar cotizaciones por fecha">
            <option value="">Todas las fechas</option>
            <option value="today">Hoy</option>
            <option value="week">Ultimos 7 dias</option>
            <option value="month">Ultimo mes</option>
          </Select>
        </div>
        <p className="mt-3 text-xs font-semibold text-[#FFF2E1]/58">
          {filteredCotizaciones.length} de {cotizaciones.length} cotizaciones
        </p>
      </Card>

      {cotizaciones.length === 0 ? <EmptyState title="Aun no hay cotizaciones" /> : null}

      {filteredCotizaciones.length > 0 ? (
        <Card className="p-0">
          <div className="hidden border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase text-[#FFF2E1]/50 lg:grid lg:grid-cols-[110px_minmax(0,1.2fr)_minmax(0,1fr)_130px_120px_210px] lg:gap-3">
            <span>Folio</span>
            <span>Cliente / moto</span>
            <span>Concepto</span>
            <span>Estado</span>
            <span>Total</span>
            <span className="text-right">Acciones</span>
          </div>

          <div className="divide-y divide-white/10">
            {filteredCotizaciones.map((cotizacion) => {
              const cliente = getCliente(cotizacion.cliente_id);
              const moto = cotizacion.moto_id ? getMoto(cotizacion.moto_id) : undefined;
              const motoLabel = moto ? `${moto.marca} ${moto.modelo} ${moto.placas}` : "Sin moto";
              const totalRow = totalCotizacion(cotizacion.items);

              return (
                <article key={cotizacion.id} className="grid gap-3 p-4 transition hover:bg-white/[0.04] lg:grid-cols-[110px_minmax(0,1.2fr)_minmax(0,1fr)_130px_120px_210px] lg:items-center">
                  <p className="break-words font-semibold text-white">{cotizacion.folio}</p>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#FFF2E1]">{cliente?.nombre ?? "Sin cliente"}</p>
                    <p className="truncate text-sm text-[#FFF2E1]/58">{motoLabel}</p>
                  </div>

                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-white">{cotizacion.titulo}</p>
                    <p className="truncate text-xs text-[#FFF2E1]/55">{cotizacion.fecha}</p>
                  </div>

                  <div>
                    <span className="inline-flex rounded-full bg-[#2F2A24] px-2.5 py-1 text-xs font-semibold text-[#FFF2E1]">
                      {cotizacion.estado}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-[#FFD08A]">{currency(totalRow)}</p>

                  <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:flex lg:justify-end">
                    <Button className="w-full lg:w-auto" variant="secondary" onClick={() => downloadCotizacionPdf(cotizacion, cliente?.nombre ?? "Cliente", motoLabel)}>
                      <Download className="h-4 w-4" /> PDF
                    </Button>
                    {canDelete ? (
                      <Button className="w-full lg:w-auto" variant="danger" onClick={() => void removeCotizacion(cotizacion.id, cotizacion.folio)}>
                        <Trash2 className="h-4 w-4" /> Eliminar
                      </Button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </Card>
      ) : null}

      {cotizaciones.length > 0 && filteredCotizaciones.length === 0 ? <EmptyState title="No encontramos cotizaciones con esos filtros" /> : null}
    </div>
  );
}
