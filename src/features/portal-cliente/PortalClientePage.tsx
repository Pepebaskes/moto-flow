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

const lightCard = "border-[#2F2A24]/10 bg-white text-[#0B0B0B] shadow-xl shadow-[#2F2A24]/15";
const lightInput =
  "border-[#2F2A24]/20 bg-white text-[#0B0B0B] placeholder:text-[#2F2A24]/45 hover:border-[#F2B705] focus:border-[#F2B705] focus:bg-white focus:ring-[#F2B705]/30";

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
    const normalized = codigo.replaceAll(" ", "").toLowerCase();
    const text = codigo.toLowerCase();

    const moto = motocicletas.find((item) => {
      const cliente = clientes.find((client) => client.id === item.cliente_id);
      const ordenLegacy = ordenes.find((orden) => orden.moto_id === item.id && orden.codigo_publico.toLowerCase() === text);

      return (
        item.placas.replaceAll(" ", "").toLowerCase() === normalized ||
        item.numero_serie?.replaceAll(" ", "").toLowerCase() === normalized ||
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
  const cotizacionActual = data ? data.movimientos.reduce((sum, movimiento) => sum + (Number(movimiento.costo) || 0), 0) : 0;
  const fechaEstimada = data?.moto.fecha_estimada_salida ?? "";
  const ultimoMovimiento = data?.movimientos[0];

  function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim()) navigate(`/consulta/${encodeURIComponent(query.trim())}`);
  }

  return (
    <div className="min-h-screen bg-[#FFF2E1] px-4 py-8 text-[#0B0B0B]">
      <main className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="text-sm font-semibold text-[#8A6400]">MotoFlow</p>
          <h1 className="text-3xl font-semibold text-[#0B0B0B]">Consulta tu motocicleta</h1>
          <p className="mt-2 text-sm text-[#2F2A24]/75">Ingresa tus placas, nombre o numero de serie para ver la bitacora publica.</p>
        </div>

        <Card className={`mb-5 ${lightCard}`}>
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={search}>
            <Input className={lightInput} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej. ABC123 o Ana Martinez" />
            <Button type="submit">Consultar</Button>
          </form>
        </Card>

        {loading ? <Card className={lightCard}><p className="font-semibold">Buscando en Supabase...</p></Card> : null}
        {error ? <Card className="border-red-200 bg-white text-[#0B0B0B]"><p className="font-semibold text-red-700">{error}</p></Card> : null}

        {codigo && !loading && !data ? (
          <Card className={lightCard}>
            <p className="font-semibold">No encontramos una moto con esas placas o nombre.</p>
          </Card>
        ) : null}

        {data ? (
          <div className="space-y-5">
            <Card className={`space-y-5 ${lightCard}`}>
              <div>
                <p className="text-sm text-[#2F2A24]/70">Ultimo avance: {ultimoMovimiento?.titulo ?? "Sin avances publicos"}</p>
                <h2 className="text-2xl font-semibold text-[#0B0B0B]">{data.moto.marca} {data.moto.modelo}</h2>
                <p className="text-sm text-[#2F2A24]/75">{data.moto.anio} · Placas {data.moto.placas} · {data.moto.color}</p>
              </div>
              <div className="grid gap-3 rounded-2xl bg-[#FFF2E1] p-4 sm:grid-cols-3">
                <div><p className="text-xs font-semibold uppercase text-[#2F2A24]/70">Fecha estimada</p><p className="font-semibold text-[#0B0B0B]">{fechaEstimada ? shortDate(fechaEstimada) : "Por confirmar"}</p></div>
                <div><p className="text-xs font-semibold uppercase text-[#2F2A24]/70">Cotizacion</p><p className="font-semibold text-[#0B0B0B]">{currency(cotizacionActual)}</p></div>
                <div><p className="text-xs font-semibold uppercase text-[#2F2A24]/70">Cliente</p><p className="font-semibold text-[#0B0B0B]">{data.cliente?.nombre ?? "Registrado"}</p></div>
              </div>
            </Card>

            <Card className={lightCard}>
              <h2 className="mb-3 text-lg font-semibold text-[#0B0B0B]">Bitacora y avances</h2>
              <div className="space-y-3">
                {data.movimientos.length === 0 ? <p className="text-sm text-[#2F2A24]/70">Aun no hay avances visibles para el cliente.</p> : null}
                {data.movimientos.map((movimiento) => (
                  <div key={movimiento.id} className="rounded-2xl border border-[#2F2A24]/12 bg-white p-3">
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="font-semibold text-[#0B0B0B]">{movimiento.titulo}</p>
                      {movimiento.costo ? <span className="rounded-full bg-[#F2B705] px-2.5 py-1 text-xs font-semibold text-[#0B0B0B]">{currency(movimiento.costo)}</span> : null}
                    </div>
                    <p className="text-xs font-semibold uppercase text-[#2F2A24]/70">{new Date(movimiento.created_at).toLocaleString("es-MX")} · {movimiento.tipo}</p>
                    {movimiento.nota ? <p className="mt-2 whitespace-pre-line text-sm text-[#2F2A24]">{movimiento.nota}</p> : null}
                  </div>
                ))}
              </div>
            </Card>

            {data.evidencias.length ? (
              <Card className={lightCard}>
                <h2 className="mb-3 text-lg font-semibold text-[#0B0B0B]">Evidencias</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {data.evidencias.map((evidencia) => (
                    <a key={evidencia.id} href={evidencia.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-2xl border border-[#2F2A24]/12 bg-white">
                      <img src={evidencia.url} alt={evidencia.nota || evidencia.tipo} className="h-32 w-full object-cover" />
                      <p className="p-2 text-xs font-semibold text-[#0B0B0B]">{evidencia.nota || evidencia.tipo}</p>
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
