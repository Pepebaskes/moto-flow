import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/Button";
import { Field, Input, Textarea } from "@/components/Field";
import type { Cliente } from "@/types/motoflow";

const schema = z.object({
  nombre: z.string({ required_error: "Escribe el nombre del cliente." }).trim().min(2, "Escribe el nombre del cliente."),
  telefono: z.string({ required_error: "Escribe un telefono valido." }).trim().min(7, "Escribe un telefono valido."),
  email: z.string().email("Email invalido.").optional().or(z.literal("")),
  notas: z.string().optional(),
});

export type ClienteFormData = z.infer<typeof schema>;

export function ClienteForm({ initial, onSubmit }: { initial?: Cliente; onSubmit: (data: ClienteFormData) => void | Promise<void> }) {
  const { register, handleSubmit, formState: { errors } } = useForm<ClienteFormData>({
    resolver: zodResolver(schema),
    defaultValues: initial ?? { nombre: "", telefono: "", email: "", notas: "" },
  });

  return (
    <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
      <Field label="Nombre" error={errors.nombre?.message}><Input {...register("nombre")} /></Field>
      <Field label="Telefono" error={errors.telefono?.message}><Input {...register("telefono")} /></Field>
      <Field label="Email opcional" error={errors.email?.message}><Input type="email" {...register("email")} /></Field>
      <Field label="Notas"><Textarea {...register("notas")} /></Field>
      <Button type="submit">Guardar cliente</Button>
    </form>
  );
}
