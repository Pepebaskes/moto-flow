import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/Button";
import { Field, Input, Select, Textarea } from "@/components/Field";
import { useWorkshopStore } from "@/stores/workshopStore";
import type { OrdenTrabajo } from "@/types/motoflow";
import { estadoLabels, estadosOrden, prioridadLabels, prioridadesOrden } from "@/utils/format";

const schema = z.object({
  cliente_id: z.string({ required_error: "Selecciona un cliente." }).min(1, "Selecciona un cliente."),
  moto_id: z.string({ required_error: "Selecciona una motocicleta." }).min(1, "Selecciona una motocicleta."),
  titulo: z.string({ required_error: "Escribe un titulo." }).trim().min(3, "Escribe un titulo."),
  descripcion_problema: z.string({ required_error: "Describe el problema." }).trim().min(5, "Describe el problema."),
  diagnostico: z.string().optional(),
  prioridad: z.enum(["baja", "media", "alta", "urgente"]),
  estado: z.enum(["recibida", "diagnostico", "esperando_autorizacion", "autorizada", "esperando_refacciones", "en_reparacion", "lista", "entregada", "cancelada"]),
  fecha_entrada: z.string().min(1),
  fecha_estimada: z.string().optional(),
  total_estimado: z.coerce.number().optional(),
  total_final: z.coerce.number().optional(),
  notas_internas: z.string().optional(),
  notas_publicas: z.string().optional(),
  codigo_publico: z.string().optional(),
});

export type OrdenFormData = z.infer<typeof schema>;

export function OrdenForm({ initial, onSubmit }: { initial?: OrdenTrabajo; onSubmit: (data: OrdenFormData) => void | Promise<void> }) {
  const { clientes, motocicletas } = useWorkshopStore();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<OrdenFormData>({
    resolver: zodResolver(schema),
    defaultValues: initial ?? {
      cliente_id: clientes[0]?.id ?? "",
      moto_id: motocicletas[0]?.id ?? "",
      titulo: "",
      descripcion_problema: "",
      diagnostico: "",
      prioridad: "media",
      estado: "recibida",
      fecha_entrada: new Date().toISOString().slice(0, 10),
      fecha_estimada: "",
      total_estimado: 0,
      total_final: 0,
      notas_internas: "",
      notas_publicas: "",
      codigo_publico: "",
    },
  });
  const selectedClient = watch("cliente_id");
  const motos = motocicletas.filter((moto) => moto.cliente_id === selectedClient);

  return (
    <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cliente"><Select {...register("cliente_id")}>{clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>)}</Select></Field>
        <Field label="Motocicleta"><Select {...register("moto_id")}>{(motos.length ? motos : motocicletas).map((moto) => <option key={moto.id} value={moto.id}>{moto.marca} {moto.modelo}</option>)}</Select></Field>
      </div>
      <Field label="Titulo" error={errors.titulo?.message}><Input {...register("titulo")} /></Field>
      <Field label="Descripcion del problema" error={errors.descripcion_problema?.message}><Textarea {...register("descripcion_problema")} /></Field>
      <Field label="Diagnostico"><Textarea {...register("diagnostico")} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prioridad"><Select {...register("prioridad")}>{prioridadesOrden.map((item) => <option key={item} value={item}>{prioridadLabels[item]}</option>)}</Select></Field>
        <Field label="Estado"><Select {...register("estado")}>{estadosOrden.map((item) => <option key={item} value={item}>{estadoLabels[item]}</option>)}</Select></Field>
        <Field label="Fecha entrada"><Input type="date" {...register("fecha_entrada")} /></Field>
        <Field label="Fecha estimada"><Input type="date" {...register("fecha_estimada")} /></Field>
        <Field label="Total estimado"><Input type="number" step="0.01" {...register("total_estimado")} /></Field>
        <Field label="Total final"><Input type="number" step="0.01" {...register("total_final")} /></Field>
      </div>
      <Field label="Notas publicas"><Textarea {...register("notas_publicas")} /></Field>
      <Field label="Notas internas"><Textarea {...register("notas_internas")} /></Field>
      <Field label="Codigo publico"><Input placeholder="Se genera automaticamente si lo dejas vacio" {...register("codigo_publico")} /></Field>
      <Button type="submit">Guardar orden</Button>
    </form>
  );
}
