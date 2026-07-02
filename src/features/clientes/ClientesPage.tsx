import { CheckCircle2, Eye, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Input, Select } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { useWorkshopStore } from "@/stores/workshopStore";
import { includesSearch, isWithinDateFilter } from "@/utils/search";

export function ClientesPage() {
  const clientes = useWorkshopStore((state) => state.clientes);
  const motocicletas = useWorkshopStore((state) => state.motocicletas);
  const deleteCliente = useWorkshopStore((state) => state.deleteCliente);
  const location = useLocation();
  const navigate = useNavigate();
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    const state = location.state as { notice?: string } | null;
    if (!state?.notice) return;
    setNotice(state.notice);
    navigate(location.pathname, { replace: true, state: null });
    const timer = window.setTimeout(() => setNotice(""), 2800);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.state, navigate]);

  async function removeCliente(id: string, nombre: string) {
    if (!window.confirm(`Eliminar cliente ${nombre}?`)) return;
    const result = await deleteCliente(id);
    if (!result.ok) window.alert(result.message);
  }

  const filteredClientes = useMemo(() => {
    return clientes
      .filter((cliente) => {
        const motosCliente = motocicletas.filter((moto) => moto.cliente_id === cliente.id);
        return (
          isWithinDateFilter(cliente.created_at, dateFilter) &&
          includesSearch(
            [
              cliente.nombre,
              cliente.telefono,
              cliente.localidad,
              cliente.notas,
              ...motosCliente.flatMap((moto) => [moto.marca, moto.modelo, moto.placas, moto.color, moto.numero_serie]),
            ],
            query,
          )
        );
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [clientes, dateFilter, motocicletas, query]);

  return (
    <div className="min-w-0">
      {notice ? (
        <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[#F2B705]/30 bg-[#151515] px-4 py-3 text-sm font-semibold text-[#FFF2E1] shadow-2xl shadow-black/45 sm:left-auto sm:right-6">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[#F2B705]" />
          <span className="min-w-0 break-words">{notice}</span>
        </div>
      ) : null}
      <PageHeader title="Clientes" subtitle="Directorio del taller." actions={<Link to="/clientes/nuevo"><Button>Nuevo cliente</Button></Link>} />
      {clientes.length === 0 ? <EmptyState title="Aun no hay clientes" /> : null}
      {clientes.length > 0 ? (
        <Card className="mb-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FFF2E1]/45" />
              <Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por cliente, telefono, localidad, placas, moto..." />
            </div>
            <Select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="Filtrar clientes por fecha">
              <option value="">Todas las fechas</option>
              <option value="today">Registrados hoy</option>
              <option value="week">Ultimos 7 dias</option>
              <option value="month">Ultimo mes</option>
            </Select>
          </div>
          <p className="mt-3 text-xs font-semibold text-[#FFF2E1]/58">
            {filteredClientes.length} de {clientes.length} clientes
          </p>
        </Card>
      ) : null}
      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredClientes.map((cliente) => {
          const motosCliente = motocicletas.filter((moto) => moto.cliente_id === cliente.id).length;
          return (
            <Card key={cliente.id} className="h-full transition hover:border-[#F2B705]/30 hover:bg-white/[0.09]">
              <p className="break-words text-lg font-semibold">{cliente.nombre}</p>
              <p className="mt-1 break-words text-sm text-[#FFF2E1]/60">{cliente.telefono}</p>
              <p className="break-words text-sm text-[#FFF2E1]/60">{cliente.localidad || "Sin localidad"}</p>
              <p className="mt-4 text-sm font-semibold">{motosCliente} motos</p>
              <div className="mt-4 grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
                <Link to={`/clientes/${cliente.id}`} className="inline-flex min-h-11 min-w-0 max-w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-3 text-sm font-semibold text-[#FFF2E1] transition hover:border-[#F2B705]/35 hover:bg-white/12 active:scale-[0.98]">
                  <Eye className="h-4 w-4 shrink-0" /> Ver
                </Link>
                <Button type="button" variant="danger" className="w-full" onClick={() => void removeCliente(cliente.id, cliente.nombre)}>
                  <Trash2 className="h-4 w-4 shrink-0" /> Eliminar
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      {clientes.length > 0 && filteredClientes.length === 0 ? <EmptyState title="No encontramos clientes con esos filtros" /> : null}
    </div>
  );
}
