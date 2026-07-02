import { Bike, Lock, Search, User } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
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

  async function submitStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const result = await login(username, password);
    if (!result.ok) setError(result.message);
  }

  function submitClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (clientQuery.trim()) navigate(`/consulta/${encodeURIComponent(clientQuery.trim())}`);
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0B0B0B] px-4 py-6 text-white">
      <main className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center">
        <section className="grid overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/60 backdrop-blur xl:grid-cols-[420px_1fr]">
          <div className="bg-[#0B0B0B]/80 p-5 sm:p-8">
            <div className="mb-8 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#F2B705] text-[#0B0B0B] shadow-lg shadow-black/30">
                <Bike className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xl font-semibold tracking-wide">MOTO-FLOW</p>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FFF2E1]/60">Taller de Motos Villa</p>
              </div>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Acceso del taller</h1>
            <p className="mt-2 text-sm font-medium text-[#FFF2E1]/60">Gestiona motos, clientes, bitacoras y cotizaciones desde un panel privado.</p>

            <form className="mt-8 grid gap-4" onSubmit={submitStaff}>
              <Field label="Telefono, correo o usuario">
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#2F2A24]/70" />
                  <Input className="pl-10" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="3411674336" autoComplete="username" />
                </div>
              </Field>
              <Field label="Contraseña">
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#2F2A24]/70" />
                  <Input className="pl-10" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
                </div>
              </Field>
              {error ? <p className="rounded-2xl bg-red-500/10 p-3 text-sm font-semibold text-red-200">{error}</p> : null}
              <Button type="submit" className="w-full">Entrar al panel</Button>
            </form>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm font-semibold">Consulta del cliente</p>
              <form className="mt-3 grid gap-3" onSubmit={submitClient}>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FFF2E1]/45" />
                  <Input className="pl-10" value={clientQuery} onChange={(event) => setClientQuery(event.target.value)} placeholder="Placas, nombre o serie" />
                </div>
                <Button type="submit" variant="secondary">Ver avance</Button>
              </form>
            </div>
          </div>

          <div className="relative hidden min-h-[620px] overflow-hidden xl:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(103,232,249,0.35),transparent_24rem),radial-gradient(circle_at_80%_40%,rgba(59,130,246,0.35),transparent_26rem),linear-gradient(135deg,#0f172a,#020617)]" />
            <div className="absolute left-10 top-10 rounded-full border border-[#F2B705]/20 px-4 py-2 text-sm font-semibold text-[#FFF2E1]">Taller conectado</div>
            <div className="absolute inset-x-10 bottom-10 rounded-[2rem] border border-white/10 bg-[#0B0B0B]/35 p-8 backdrop-blur">
              <Bike className="h-16 w-16 text-[#FFD08A]" />
              <h2 className="mt-5 text-5xl font-semibold tracking-tight">Servicio claro, avance visible.</h2>
              <p className="mt-4 max-w-lg text-sm leading-6 text-[#FFF2E1]/75">
                El mecanico registra avances y el cliente consulta sin interrumpir el flujo del taller.
              </p>
              <a
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl bg-green-500 px-5 text-sm font-semibold text-white transition hover:bg-green-400 active:scale-[0.98]"
                href={`https://wa.me/${workshopWhatsApp}?text=${workshopWhatsAppMessage}`}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp del taller
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
