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
      evidencias: evidencias.filter((item) => ordenIds.includes(item.orden_id)),
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
    <div className="min-h-screen bg-neutral-50 px-4 py-8 text-neutral-950">
      <main className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="text-sm font-semibold text-neutral-500">MotoFlow</p>
          <h1 className="text-3xl font-bold">Consulta tu motocicleta</h1>
          <p className="mt-2 text-sm text-neutral-500">Ingresa tus placas, nombre o numero de serie para ver la bitacora publica.</p>
        </div>

        <Card className="mb-5">
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={search}>
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej. ABC123 o Ana Martinez" />
            <Button type="submit">Consultar</Button>
          </form>
        </Card>

        {loading ? <Card><p className="font-semibold">Buscando en Supabase...</p></Card> : null}
        {error ? <Card><p className="font-semibold text-red-700">{error}</p></Card> : null}

        {codigo && !loading && !data ? (
          <Card>
            <p className="font-semibold">No encontramos una moto con esas placas o nombre.</p>
          </Card>
        ) : null}

        {data ? (
          <div className="space-y-5">
            <Card className="space-y-5">
              <div>
                <p className="text-sm text-neutral-500">Ultimo avance: {ultimoMovimiento?.titulo ?? "Sin avances publicos"}</p>
                <h2 className="text-2xl font-bold">{data.moto.marca} {data.moto.modelo}</h2>
                <p className="text-sm text-neutral-500">{data.moto.anio} · Placas {data.moto.placas} · {data.moto.color}</p>
              </div>
              <div className="grid gap-3 rounded-lg bg-neutral-50 p-4 sm:grid-cols-3">
                <div><p className="text-xs font-semibold uppercase text-neutral-500">Fecha estimada</p><p className="font-semibold">{fechaEstimada ? shortDate(fechaEstimada) : "Por confirmar"}</p></div>
                <div><p className="text-xs font-semibold uppercase text-neutral-500">Cotizacion</p><p className="font-semibold">{currency(cotizacionActual)}</p></div>
                <div><p className="text-xs font-semibold uppercase text-neutral-500">Cliente</p><p className="font-semibold">{data.cliente?.nombre ?? "Registrado"}</p></div>
              </div>
            </Card>

            <Card>
              <h2 className="mb-3 text-lg font-bold">Bitacora y avances</h2>
              <div className="space-y-3">
                {data.movimientos.length === 0 ? <p className="text-sm text-neutral-500">Aun no hay avances visibles para el cliente.</p> : null}
                {data.movimientos.map((movimiento) => (
                  <div key={movimiento.id} className="rounded-lg border border-neutral-200 p-3">
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="font-bold">{movimiento.titulo}</p>
                      {movimiento.costo ? <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-bold">{currency(movimiento.costo)}</span> : null}
                    </div>
                    <p className="text-xs font-semibold uppercase text-neutral-500">{new Date(movimiento.created_at).toLocaleString("es-MX")} · {movimiento.tipo}</p>
                    {movimiento.nota ? <p className="mt-2 whitespace-pre-line text-sm text-neutral-700">{movimiento.nota}</p> : null}
                  </div>
                ))}
              </div>
            </Card>

            {data.evidencias.length ? (
              <Card>
                <h2 className="mb-3 text-lg font-bold">Evidencias</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {data.evidencias.map((evidencia) => (
                    <a key={evidencia.id} href={evidencia.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                      <img src={evidencia.url} alt={evidencia.nota || evidencia.tipo} className="h-32 w-full object-cover" />
                      <p className="p-2 text-xs font-semibold">{evidencia.nota || evidencia.tipo}</p>
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
