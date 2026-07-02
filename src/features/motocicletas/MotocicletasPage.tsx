import { Eye, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Input, Select } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { useWorkshopStore } from "@/stores/workshopStore";
import { includesSearch, isWithinDateFilter, normalizeSearch } from "@/utils/search";

export function MotocicletasPage() {
  const { motocicletas, getCliente, deleteMoto } = useWorkshopStore();
  const [query, setQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  async function removeMoto(id: string, nombre: string) {
    if (!window.confirm(`Eliminar moto ${nombre}?`)) return;
    const result = await deleteMoto(id);
    if (!result.ok) window.alert(result.message);
  }

  const marcas = useMemo(() => {
    return Array.from(new Set(motocicletas.map((moto) => moto.marca).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [motocicletas]);

  const filteredMotos = useMemo(() => {
    return motocicletas
      .filter((moto) => {
        const cliente = getCliente(moto.cliente_id);
        const matchesBrand = !brandFilter || normalizeSearch(moto.marca) === normalizeSearch(brandFilter);
        return (
          matchesBrand &&
          isWithinDateFilter(moto.created_at, dateFilter) &&
          includesSearch(
            [moto.marca, moto.modelo, moto.anio, moto.placas, moto.color, moto.kilometraje, moto.numero_serie, moto.notas, cliente?.nombre, cliente?.telefono],
            query,
          )
        );
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [brandFilter, dateFilter, getCliente, motocicletas, query]);

  return (
    <div className="min-w-0">
      <PageHeader title="Motocicletas" subtitle="Unidades registradas en el taller." actions={<Link to="/motocicletas/nueva"><Button>Nueva moto</Button></Link>} />
      {motocicletas.length === 0 ? <EmptyState title="Aun no hay motocicletas" /> : null}
      {motocicletas.length > 0 ? (
        <Card className="mb-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FFF2E1]/45" />
              <Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por placas, marca, modelo, cliente, serie..." />
            </div>
            <Select value={brandFilter} onChange={(event) => setBrandFilter(event.target.value)} aria-label="Filtrar por marca">
              <option value="">Todas las marcas</option>
              {marcas.map((marca) => <option key={marca} value={marca}>{marca}</option>)}
            </Select>
            <Select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="Filtrar motos por fecha">
              <option value="">Todas las fechas</option>
              <option value="today">Registradas hoy</option>
              <option value="week">Ultimos 7 dias</option>
              <option value="month">Ultimo mes</option>
            </Select>
          </div>
          <p className="mt-3 text-xs font-semibold text-[#FFF2E1]/58">
            {filteredMotos.length} de {motocicletas.length} motocicletas
          </p>
        </Card>
      ) : null}

      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredMotos.map((moto) => (
          <Card key={moto.id} className="h-full transition hover:border-[#F2B705]/30 hover:bg-white/[0.09]">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-lg font-semibold">{moto.marca} {moto.modelo}</p>
                <p className="mt-1 break-words text-sm text-[#FFF2E1]/60">{moto.anio} | {moto.color}</p>
              </div>
              <span className="max-w-[42%] shrink-0 truncate rounded-full bg-[#F2B705]/10 px-2.5 py-1 text-xs font-semibold text-[#FFF2E1]">{moto.placas}</span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 rounded-2xl bg-[#0B0B0B]/45 p-3 text-sm min-[420px]:grid-cols-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-[#FFF2E1]/45">Kilometraje</p>
                <p className="break-words font-semibold">{moto.kilometraje.toLocaleString()} km</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-[#FFF2E1]/45">Serie</p>
                <p className="truncate font-semibold">{moto.numero_serie || "Sin serie"}</p>
              </div>
            </div>

            {moto.notas ? <p className="mt-3 line-clamp-2 break-words text-sm text-[#FFF2E1]/60">{moto.notas}</p> : null}

            <div className="mt-4 border-t border-white/10 pt-3">
              <p className="text-xs font-semibold uppercase text-[#FFF2E1]/45">Cliente</p>
              <p className="truncate text-sm font-semibold">{getCliente(moto.cliente_id)?.nombre}</p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
              <Link to={`/motocicletas/${moto.id}`} className="inline-flex min-h-11 min-w-0 max-w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-3 text-sm font-semibold text-[#FFF2E1] transition hover:border-[#F2B705]/35 hover:bg-white/12 active:scale-[0.98]">
                <Eye className="h-4 w-4 shrink-0" /> Ver
              </Link>
              <Button type="button" variant="danger" className="w-full" onClick={() => void removeMoto(moto.id, `${moto.marca} ${moto.modelo}`)}>
                <Trash2 className="h-4 w-4 shrink-0" /> Eliminar
              </Button>
            </div>
          </Card>
        ))}
      </div>
      {motocicletas.length > 0 && filteredMotos.length === 0 ? <EmptyState title="No encontramos motos con esos filtros" /> : null}
    </div>
  );
}
