import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/Button";
import { Field, Input, Select, Textarea } from "@/components/Field";
import { useWorkshopStore } from "@/stores/workshopStore";
import type { Motocicleta } from "@/types/motoflow";

const schema = z.object({
  cliente_id: z.string({ required_error: "Selecciona un cliente." }).min(1, "Selecciona un cliente."),
  marca: z.string({ required_error: "Escribe la marca." }).trim().min(2, "Escribe la marca."),
  modelo: z.string({ required_error: "Escribe el modelo." }).trim().min(1, "Escribe el modelo."),
  anio: z.coerce.number({ required_error: "Escribe el año." }).min(1950).max(2100),
  placas: z.string({ required_error: "Escribe las placas." }).trim().min(1, "Escribe las placas."),
  color: z.string({ required_error: "Escribe el color." }).trim().min(2, "Escribe el color."),
  kilometraje: z.coerce.number({ required_error: "Escribe el kilometraje." }).min(0),
  fecha_estimada_salida: z.string().optional(),
  numero_serie: z.string().optional(),
  notas: z.string().optional(),
});

export type MotoFormData = z.infer<typeof schema>;

export function MotoForm({ initial, onSubmit }: { initial?: Motocicleta; onSubmit: (data: MotoFormData) => void | Promise<void> }) {
  const clientes = useWorkshopStore((state) => state.clientes);
  const { register, handleSubmit, formState: { errors } } = useForm<MotoFormData>({
    resolver: zodResolver(schema),
    defaultValues: initial ?? {
      cliente_id: clientes[0]?.id ?? "",
      marca: "",
      modelo: "",
      anio: new Date().getFullYear(),
      placas: "",
      color: "",
      kilometraje: 0,
      fecha_estimada_salida: "",
      numero_serie: "",
      notas: "",
    },
  });

  return (
    <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
      <Field label="Cliente" error={errors.cliente_id?.message}>
        <Select {...register("cliente_id")}>{clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>)}</Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Marca" error={errors.marca?.message}><Input {...register("marca")} /></Field>
        <Field label="Modelo" error={errors.modelo?.message}><Input {...register("modelo")} /></Field>
        <Field label="Año" error={errors.anio?.message}><Input type="number" {...register("anio")} /></Field>
        <Field label="Placas" error={errors.placas?.message}><Input {...register("placas")} /></Field>
        <Field label="Color" error={errors.color?.message}><Input {...register("color")} /></Field>
        <Field label="Kilometraje" error={errors.kilometraje?.message}><Input type="number" {...register("kilometraje")} /></Field>
      </div>
      <Field label="Fecha estimada de salida">
        <Input type="date" {...register("fecha_estimada_salida")} />
      </Field>
      <Field label="Numero de serie opcional"><Input {...register("numero_serie")} /></Field>
      <Field label="Notas"><Textarea {...register("notas")} /></Field>
      <Button type="submit">Guardar motocicleta</Button>
    </form>
  );
}
