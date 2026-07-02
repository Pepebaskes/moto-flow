import { jsPDF } from "jspdf";
import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field, Input, Select, Textarea } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { useWorkshopStore } from "@/stores/workshopStore";
import type { Cotizacion, CotizacionItem } from "@/types/motoflow";
import { currency, uid } from "@/utils/format";

const CLAUSULA_DEFAULT =
  "Este presupuesto es informativo y puede cambiar despues de la revision interna de la motocicleta. Si durante la inspeccion se detectan piezas dañadas, refacciones adicionales, mano de obra extra o condiciones no visibles al momento de cotizar, el taller notificara al cliente para su autorizacion antes de continuar.";

function totalCotizacion(items: CotizacionItem[]) {
  return items.reduce((sum, item) => sum + item.cantidad * item.precio_unitario, 0);
}

function downloadCotizacionPdf(cotizacion: Cotizacion, cliente: string, moto?: string) {
  const doc = new jsPDF();
  const total = totalCotizacion(cotizacion.items);
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("MotoFlow - Cotizacion", 14, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Folio: ${cotizacion.folio}`, 14, y);
  doc.text(`Fecha: ${cotizacion.fecha}`, 145, y);
  y += 7;
  doc.text(`Cliente: ${cliente}`, 14, y);
  y += 7;
  doc.text(`Moto: ${moto || "No especificada"}`, 14, y);
  y += 7;
  doc.text(`Domicilio: ${cotizacion.domicilio || "No especificado"}`, 14, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text(cotizacion.titulo, 14, y);
  y += 8;

  doc.setFontSize(9);
  doc.text("Concepto", 14, y);
  doc.text("Cant.", 112, y);
  doc.text("Precio", 132, y);
  doc.text("Importe", 165, y);
  y += 5;
  doc.line(14, y, 196, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  cotizacion.items.forEach((item) => {
    const conceptoLines = doc.splitTextToSize(item.concepto, 88);
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
  doc.text("Clausula de variacion del presupuesto", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(doc.splitTextToSize(cotizacion.clausula, 180), 14, y);
  y += 20;

  doc.setFontSize(8);
  doc.text("La autorizacion del cliente es necesaria para cualquier cambio de alcance o incremento de costo.", 14, y);
  doc.save(`${cotizacion.folio}-${cliente.replaceAll(" ", "-")}.pdf`);
}

export function CotizacionesPage() {
  const { clientes, motocicletas, cotizaciones, addCotizacion, deleteCotizacion, getCliente, getMoto } = useWorkshopStore();
  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? "");
  const [items, setItems] = useState<CotizacionItem[]>([
    { id: uid("item"), concepto: "Servicio o refaccion", cantidad: 1, precio_unitario: 0, proveedor: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const motosCliente = motocicletas.filter((moto) => moto.cliente_id === clienteId);
  const total = useMemo(() => totalCotizacion(items), [items]);

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
    event.currentTarget.reset();
    setItems([{ id: uid("item"), concepto: "Servicio o refaccion", cantidad: 1, precio_unitario: 0, proveedor: "" }]);
  }

  async function removeCotizacion(id: string, folio: string) {
    if (!window.confirm(`¿Eliminar cotizacion ${folio}?`)) return;
    const result = await deleteCotizacion(id);
    if (!result.ok) window.alert(result.message);
  }

  return (
    <div>
      <PageHeader title="Cotizaciones" subtitle="Presupuestos para servicios, refacciones o revisiones antes de autorizar el trabajo." />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
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
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Conceptos</h3>
                <Button type="button" variant="secondary" onClick={() => setItems((current) => [...current, { id: uid("item"), concepto: "", cantidad: 1, precio_unitario: 0, proveedor: "" }])}>
                  Agregar concepto
                </Button>
              </div>

              {items.map((item, index) => (
                <div key={item.id} className="rounded-lg border border-neutral-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold">Partida {index + 1}</p>
                    {items.length > 1 ? (
                      <button type="button" className="text-xs font-semibold text-red-600" onClick={() => setItems((current) => current.filter((row) => row.id !== item.id))}>
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

            <div className="rounded-lg bg-neutral-50 p-4">
              <p className="text-sm text-neutral-500">Total estimado</p>
              <p className="text-2xl font-semibold">{currency(total)}</p>
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

        <aside className="space-y-3">
          <h2 className="text-sm font-semibold uppercase text-neutral-500">Cotizaciones recientes</h2>
          {cotizaciones.length === 0 ? <Card><p className="text-sm text-neutral-500">Aun no hay cotizaciones guardadas.</p></Card> : null}
          {cotizaciones.map((cotizacion) => {
            const cliente = getCliente(cotizacion.cliente_id);
            const moto = cotizacion.moto_id ? getMoto(cotizacion.moto_id) : undefined;
            const motoLabel = moto ? `${moto.marca} ${moto.modelo} ${moto.placas}` : "Sin moto";
            return (
              <Card key={cotizacion.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{cotizacion.folio}</p>
                    <p className="text-sm text-neutral-500">{cliente?.nombre}</p>
                    <p className="text-sm text-neutral-500">{motoLabel}</p>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold">{cotizacion.estado}</span>
                </div>
                <p className="mt-3 text-sm font-semibold">{cotizacion.titulo}</p>
                <p className="text-lg font-semibold">{currency(totalCotizacion(cotizacion.items))}</p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button variant="secondary" onClick={() => downloadCotizacionPdf(cotizacion, cliente?.nombre ?? "Cliente", motoLabel)}>
                    Descargar PDF
                  </Button>
                  <Button variant="danger" onClick={() => void removeCotizacion(cotizacion.id, cotizacion.folio)}>
                    <Trash2 className="h-4 w-4" /> Eliminar
                  </Button>
                </div>
              </Card>
            );
          })}
        </aside>
      </div>
    </div>
  );
}
