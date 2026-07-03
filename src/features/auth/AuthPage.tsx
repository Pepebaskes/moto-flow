import { MessageCircle, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { Field, Input } from "@/components/Field";
import { useAuthStore } from "@/stores/authStore";

const workshopWhatsApp = "523411674336";
const workshopWhatsAppMessage = encodeURIComponent(
  "Hola, quiero consultar informacion sobre mi motocicleta en el taller.",
);

const workshopImage =
  "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1500&q=82";

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
    <div className="min-h-screen overflow-x-hidden bg-[#0B0B0B] px-4 py-5 text-white sm:px-6">
      <main className="mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-6xl items-center">
        <section className="grid overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#151515] shadow-2xl shadow-black/60 lg:grid-cols-[430px_1fr]">
          <div className="order-2 p-5 sm:p-8 lg:order-1 lg:p-10">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#F2B705]">Taller Villa</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Acceso del taller</h1>
              <p className="mt-3 max-w-sm text-sm leading-6 text-[#FFF2E1]/62">
                Gestion de clientes, motos y trabajos activos con seguimiento claro para cada entrega.
              </p>
            </div>

            <form className="grid gap-4" onSubmit={submitStaff}>
              <Field label="Telefono, correo o usuario">
                <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="3411674336" autoComplete="username" />
              </Field>
              <Field label="Contrasena">
                <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
              </Field>
              {error ? <p className="rounded-2xl bg-red-500/10 p-3 text-sm font-semibold text-red-200">{error}</p> : null}
              <Button type="submit" className="mt-1 w-full">Entrar al panel</Button>
            </form>

            <div className="my-7 h-px bg-white/10" />

            <div>
              <p className="text-sm font-semibold text-white">Consulta del cliente</p>
              <p className="mt-1 text-xs leading-5 text-[#FFF2E1]/55">Busca el avance publico con placas, nombre o telefono.</p>
              <form className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] lg:grid-cols-1" onSubmit={submitClient}>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FFF2E1]/42" />
                  <Input className="pl-10" value={clientQuery} onChange={(event) => setClientQuery(event.target.value)} placeholder="Placas, nombre o telefono" />
                </div>
                <Button type="submit" variant="secondary">Consultar</Button>
              </form>
            </div>

            <a
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-green-400/20 bg-green-500/12 px-5 text-sm font-semibold text-green-100 transition hover:bg-green-500 hover:text-white active:scale-[0.98]"
              href={`https://wa.me/${workshopWhatsApp}?text=${workshopWhatsAppMessage}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp del taller
            </a>
          </div>

          <div className="relative order-1 min-h-[260px] overflow-hidden lg:order-2 lg:min-h-[680px]">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${workshopImage})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#0B0B0B]/72 via-[#0B0B0B]/38 to-[#2F2A24]/72" />
            <div className="absolute inset-x-5 bottom-5 rounded-[1.5rem] border border-white/10 bg-[#0B0B0B]/45 p-5 backdrop-blur sm:inset-x-8 sm:bottom-8 sm:p-7 lg:max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#FFD08A]">Taller de Motos Villa</p>
              <h2 className="mt-3 max-w-lg text-3xl font-semibold tracking-tight text-white sm:text-5xl">Servicio claro para cada moto.</h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-[#FFF2E1]/74">
                Registro, seguimiento, evidencias y consulta para clientes sin llamadas innecesarias.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
