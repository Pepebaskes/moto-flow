import { CalendarDays, Camera, CircleDollarSign, Clock3, Search, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Input } from "@/components/Field";
import { supabase } from "@/lib/supabase";
import { useWorkshopStore } from "@/stores/workshopStore";
import type { Cliente, Evidencia, Motocicleta, MovimientoOrden } from "@/types/motoflow";
import { currency, shortDate } from "@/utils/format";

type PortalData = {
  moto: Motocicleta;
  cliente?: Pick<Cliente, "nombre">;
  movimientos: MovimientoOrden[];
  evidencias: Evidencia[];
};

const lightCard = "border-[#2F2A24]/10 bg-white text-[#0B0B0B] shadow-xl shadow-[#2F2A24]/12";
const lightInput =
  "border-[#2F2A24]/20 !bg-white !text-[#0B0B0B] placeholder:!text-[#2F2A24]/45 hover:border-[#F2B705] focus:border-[#F2B705] focus:!bg-white focus:ring-[#F2B705]/30";

function normalizeRemoteData(data: unknown): PortalData | null {
  if (!data || typeof data !== "object") return null;
  const value = data as { moto?: Motocicleta; cliente?: Pick<Cliente, "nombre">; movimientos?: MovimientoOrden[]; evidencias?: Evidencia[] };
  if (!value.moto) return null;
  return {
    moto: value.moto,
    cliente: value.cliente,
    movimientos: value.movimientos ?? [],
    evidencias: value.evidencias ?? [],
  };
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeLookup(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

export function PortalClientePage() {
  const { codigo = "" } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(codigo);
  const [remoteData, setRemoteData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { clientes, ordenes, motocicletas, evidencias, movimientos } = useWorkshopStore();

  useEffect(() => {
    setQuery(codigo);
  }, [codigo]);

  useEffect(() => {
    async function loadRemote() {
      if (!supabase || !codigo) return;
      setLoading(true);
      setError("");
      const { data, error } = await supabase.rpc("consulta_cliente", { p_busqueda: codigo });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      setRemoteData(normalizeRemoteData(data));
    }

    void loadRemote();
  }, [codigo]);

  const localData = useMemo<PortalData | null>(() => {
    if (!codigo) return null;
    const normalized = normalizeLookup(codigo);
    const text = codigo.toLowerCase();

    const moto = motocicletas.find((item) => {
      const cliente = clientes.find((client) => client.id === item.cliente_id);
      const ordenLegacy = ordenes.find((orden) => orden.moto_id === item.id && orden.codigo_publico.toLowerCase() === text);

      return (
        normalizeLookup(item.placas) === normalized ||
        normalizeLookup(cliente?.telefono ?? "") === normalized ||
        cliente?.nombre.toLowerCase().includes(text) ||
        Boolean(ordenLegacy)
      );
    });

    if (!moto) return null;
    const cliente = clientes.find((item) => item.id === moto.cliente_id);
    const ordenIds = ordenes.filter((orden) => orden.moto_id === moto.id).map((orden) => orden.id);

    return {
      moto,
      cliente,
      movimientos: movimientos
        .filter((item) => item.publico && (item.moto_id === moto.id || Boolean(item.orden_id && ordenIds.includes(item.orden_id))))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      evidencias: evidencias.filter(
        (item) =>
          item.publico !== false &&
          (item.moto_id === moto.id ||
            Boolean(item.movimiento_id && movimientos.some((movimiento) => movimiento.id === item.movimiento_id && movimiento.moto_id === moto.id && movimiento.publico)) ||
            Boolean(item.orden_id && ordenIds.includes(item.orden_id))),
      ),
    };
  }, [clientes, codigo, evidencias, motocicletas, movimientos, ordenes]);

  const data = remoteData ?? localData;
  const movimientosPublicos = data?.movimientos ?? [];
  const cotizacionActual = movimientosPublicos.reduce((sum, movimiento) => sum + (Number(movimiento.costo) || 0), 0);
  const fechaEstimada = data?.moto.fecha_estimada_salida ?? "";
  const ultimoMovimiento = movimientosPublicos[0];

  function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim()) navigate(`/consulta/${encodeURIComponent(query.trim())}`);
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#FFF2E1] px-3 py-4 text-[#0B0B0B] sm:px-5 sm:py-8">
      <main className="mx-auto w-full max-w-2xl min-w-0">
        <div className="mb-4 min-w-0 rounded-3xl bg-[#0B0B0B] p-5 text-white shadow-xl shadow-[#2F2A24]/25">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F2B705]">Taller Villa</p>
          <h1 className="mt-2 break-words text-2xl font-semibold sm:text-3xl">Consulta tu motocicleta</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#FFF2E1]/72">Ingresa placas, nombre o telefono para ver avances publicos.</p>
        </div>

        <Card className={`mb-4 rounded-3xl p-3 ${lightCard}`}>
          <form className="grid min-w-0 gap-2" onSubmit={search}>
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2F2A24]/45" />
              <Input className={`${lightInput} pl-10`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej. ABC123, Ana Martinez o 3211022913" />
            </div>
            <Button type="submit" className="w-full">Consultar</Button>
          </form>
        </Card>

        {loading ? <Card className={lightCard}><p className="font-semibold">Buscando en Supabase...</p></Card> : null}
        {error ? <Card className="border-red-200 bg-white text-[#0B0B0B]"><p className="break-words font-semibold text-red-700">{error}</p></Card> : null}

        {codigo && !loading && !data ? (
          <Card className={lightCard}>
            <p className="font-semibold">No encontramos una moto con esas placas, nombre o telefono.</p>
          </Card>
        ) : null}

        {data ? (
          <div className="min-w-0 space-y-4">
            <Card className={`min-w-0 rounded-3xl p-4 ${lightCard}`}>
              <div className="min-w-0">
                <p className="break-words text-xs font-semibold uppercase text-[#8A6400]">Ultimo avance</p>
                <p className="mt-1 break-words text-sm font-semibold text-[#2F2A24]">{ultimoMovimiento?.titulo ?? "Sin avances publicos"}</p>
                <h2 className="mt-1 break-words text-2xl font-semibold text-[#0B0B0B]">{data.moto.marca} {data.moto.modelo}</h2>
                <p className="mt-1 break-words text-sm text-[#2F2A24]/75">
                  {data.moto.anio} | Placas {data.moto.placas} | {data.moto.color}
                </p>
              </div>

              <div className="mt-4 grid min-w-0 grid-cols-1 gap-2">
                <div className="min-w-0 rounded-2xl bg-[#FFF2E1] p-3">
                  <CalendarDays className="mb-2 h-4 w-4 text-[#8A6400]" />
                  <p className="text-xs font-semibold uppercase text-[#2F2A24]/65">Fecha estimada</p>
                  <p className="mt-1 break-words font-semibold text-[#0B0B0B]">{fechaEstimada ? shortDate(fechaEstimada) : "Por confirmar"}</p>
                </div>
                <div className="min-w-0 rounded-2xl bg-[#FFF2E1] p-3">
                  <CircleDollarSign className="mb-2 h-4 w-4 text-[#8A6400]" />
                  <p className="text-xs font-semibold uppercase text-[#2F2A24]/65">Cotizacion</p>
                  <p className="mt-1 break-words font-semibold text-[#0B0B0B]">{currency(cotizacionActual)}</p>
                </div>
                <div className="min-w-0 rounded-2xl bg-[#FFF2E1] p-3">
                  <UserRound className="mb-2 h-4 w-4 text-[#8A6400]" />
                  <p className="text-xs font-semibold uppercase text-[#2F2A24]/65">Cliente</p>
                  <p className="mt-1 break-words font-semibold text-[#0B0B0B]">{data.cliente?.nombre ?? "Registrado"}</p>
                </div>
              </div>
            </Card>

            <Card className={`min-w-0 rounded-3xl p-4 ${lightCard}`}>
              <div className="mb-3 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8A6400]">Historial publico</p>
                <h2 className="mt-1 text-xl font-semibold text-[#0B0B0B]">Avances del trabajo</h2>
              </div>
              <div className="min-w-0 space-y-3">
                {movimientosPublicos.length === 0 ? (
                  <div className="rounded-2xl bg-[#FFF2E1] p-4 text-sm text-[#2F2A24]/75">
                    Aun no hay avances visibles para el cliente.
                  </div>
                ) : null}
                {movimientosPublicos.map((movimiento, index) => (
                  <article key={movimiento.id} className="relative min-w-0 rounded-2xl border border-[#2F2A24]/12 bg-[#FFFDF9] p-3 pl-4">
                    <div className="absolute left-0 top-4 h-8 w-1 rounded-r-full bg-[#F2B705]" />
                    <div className="flex min-w-0 flex-col gap-2">
                      <div className="min-w-0">
                        <div className="mb-1 flex min-w-0 items-center gap-2">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#0B0B0B] text-xs font-semibold text-[#F2B705]">{index + 1}</span>
                          <p className="min-w-0 break-words font-semibold text-[#0B0B0B]">{movimiento.titulo}</p>
                        </div>
                        <p className="mt-1 flex flex-wrap items-center gap-1 break-words text-xs font-semibold uppercase text-[#2F2A24]/66">
                          <Clock3 className="h-3.5 w-3.5" />
                          <span>{formatDate(movimiento.created_at)}</span>
                          <span>|</span>
                          <span>{movimiento.tipo}</span>
                        </p>
                      </div>
                      {movimiento.costo ? (
                        <span className="w-fit shrink-0 rounded-full bg-[#F2B705] px-2.5 py-1 text-xs font-semibold text-[#0B0B0B]">
                          {currency(movimiento.costo)}
                        </span>
                      ) : null}
                    </div>
                    {movimiento.nota ? <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-[#2F2A24]">{movimiento.nota}</p> : null}
                    {movimiento.refaccion ? <p className="mt-2 break-words text-xs font-semibold text-[#8A6400]">Refaccion: {movimiento.refaccion}</p> : null}
                  </article>
                ))}
              </div>
            </Card>

            {data.evidencias.length ? (
              <Card className={`min-w-0 rounded-3xl p-4 ${lightCard}`}>
                <div className="mb-3 flex min-w-0 items-center gap-2">
                  <Camera className="h-5 w-5 text-[#8A6400]" />
                  <h2 className="text-lg font-semibold text-[#0B0B0B]">Evidencias</h2>
                </div>
                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                  {data.evidencias.map((evidencia) => (
                    <a key={evidencia.id} href={evidencia.url} target="_blank" rel="noreferrer" className="min-w-0 overflow-hidden rounded-2xl border border-[#2F2A24]/12 bg-white">
                      <img src={evidencia.url} alt={evidencia.nota || evidencia.tipo} className="h-44 w-full object-cover sm:h-32" />
                      <p className="break-words p-2 text-xs font-semibold text-[#0B0B0B]">{evidencia.nota || evidencia.tipo}</p>
                    </a>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}
