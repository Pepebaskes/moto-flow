import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field, Input } from "@/components/Field";
import { useAuthStore } from "@/stores/authStore";

const workshopWhatsApp = "523411674336";
const workshopWhatsAppMessage = encodeURIComponent(
  "Hola, quiero consultar informacion sobre mi motocicleta en el taller.",
);

export function AuthPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [error, setError] = useState("");
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  function submitStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const result = login(username, password);
    if (!result.ok) setError(result.message);
  }

  function submitClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (clientQuery.trim()) navigate(`/consulta/${encodeURIComponent(clientQuery.trim())}`);
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-6 text-neutral-950">
      <main className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-5 lg:grid-cols-[1fr_420px]">
        <section className="py-6">
          <p className="text-sm font-semibold text-neutral-500">MotoFlow</p>
          <h1 className="mt-2 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">Control interno y consulta del cliente en un solo flujo.</h1>
          <p className="mt-4 max-w-xl text-base text-neutral-600">
            El personal del taller entra con usuario asignado. Los clientes solo consultan el avance con placas, nombre o numero de serie.
          </p>
          <div className="mt-6 grid max-w-xl gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <p className="text-sm font-bold">Admin prueba</p>
              <p className="text-sm text-neutral-500">Usuario: admin · Contraseña: 123</p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <p className="text-sm font-bold">Mecanico prueba</p>
              <p className="text-sm text-neutral-500">Usuario: mecanico · Contraseña: 123</p>
            </div>
          </div>
        </section>

        <aside className="grid gap-4">
          <Card>
            <h2 className="text-xl font-bold">Acceso del taller</h2>
            <p className="mt-1 text-sm text-neutral-500">Sólo usuarios creados por el administrador.</p>
            <form className="mt-5 grid gap-4" onSubmit={submitStaff}>
              <Field label="Usuario">
                <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="admin o mecanico" autoComplete="username" />
              </Field>
              <Field label="Contraseña">
                <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
              </Field>
              {error ? <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
              <Button type="submit">Entrar al panel</Button>
            </form>
          </Card>

          <Card>
            <h2 className="text-xl font-bold">Consulta del cliente</h2>
            <p className="mt-1 text-sm text-neutral-500">Ingresa placas, nombre del cliente o numero de serie.</p>
            <form className="mt-5 grid gap-3" onSubmit={submitClient}>
              <Input value={clientQuery} onChange={(event) => setClientQuery(event.target.value)} placeholder="Ej. ABC123 o Ana Martinez" />
              <Button type="submit" variant="secondary">Ver avance</Button>
            </form>
            <div className="mt-4 rounded-lg bg-neutral-50 p-3">
              <p className="text-sm font-semibold text-neutral-700">Contacto del taller</p>
              <p className="mt-1 text-sm text-neutral-500">Para dudas o autorizaciones, escribe al WhatsApp de la empresa.</p>
              <a
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                href={`https://wa.me/${workshopWhatsApp}?text=${workshopWhatsAppMessage}`}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp del taller
              </a>
            </div>
          </Card>
        </aside>
      </main>
    </div>
  );
}
