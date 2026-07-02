import { Eye, Power, PowerOff, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Input, Select } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { useWorkshopStore } from "@/stores/workshopStore";
import { includesSearch, isWithinDateFilter, normalizeSearch } from "@/utils/search";
import { estadoOperativoLabels } from "@/utils/workflow";

export function MotocicletasPage() {
  const { motocicletas, getCliente, deleteMoto, activateMoto, deactivateMoto } = useWorkshopStore();
  const [query, setQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  async function removeMoto(id: string, nombre: string) {
    if (!window.confirm(`Eliminar moto ${nombre}?`)) return;
    const result = await deleteMoto(id);
    if (!result.ok) window.alert(result.message);
  }

  async function toggleActive(id: string, active: boolean) {
    if (active) {
      if (!window.confirm("Marcar esta moto como inactiva? Se quitara de Trabajos activos, pero quedara en historial.")) return;
      await deactivateMoto(id);
      return;
    }

    if (!window.confirm("Activar esta moto y abrir un nuevo trabajo limpio?")) return;
    await activateMoto(id);
  }

  const marcas = useMemo(() => {
    return Array.from(new Set(motocicletas.map((moto) => moto.marca).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [motocicletas]);

  const filteredMotos = useMemo(() => {
    return motocicletas
      .filter((moto) => {
        const cliente = getCliente(moto.cliente_id);
        const active = moto.activa !== false;
        const matchesBrand = !brandFilter || normalizeSearch(moto.marca) === normalizeSearch(brandFilter);
        const matchesStatus = !statusFilter || (statusFilter === "activas" ? active : !active);
        return (
          matchesBrand &&
          matchesStatus &&
          isWithinDateFilter(moto.created_at, dateFilter) &&
          includesSearch(
            [moto.marca, moto.modelo, moto.anio, moto.placas, moto.color, moto.kilometraje, moto.numero_serie, moto.notas, cliente?.nombre, cliente?.telefono],
            query,
          )
        );
      })
      .sort((a, b) => {
        const activeDiff = Number(b.activa !== false) - Number(a.activa !== false);
        if (activeDiff) return activeDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [brandFilter, dateFilter, getCliente, motocicletas, query, statusFilter]);

  return (
    <div className="min-w-0">
      <PageHeader title="Motocicletas" subtitle="Expediente de unidades. Activa una moto solo cuando tenga trabajo en el taller." actions={<Link to="/motocicletas/nueva"><Button>Nueva moto</Button></Link>} />
      {motocicletas.length === 0 ? <EmptyState title="Aun no hay motocicletas" /> : null}

      {motocicletas.length > 0 ? (
        <Card className="mb-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_160px_160px_160px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FFF2E1]/45" />
              <Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por placas, marca, modelo, cliente, serie..." />
            </div>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrar por estado">
              <option value="">Todas</option>
              <option value="activas">Activas</option>
              <option value="inactivas">Inactivas</option>
            </Select>
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

      {filteredMotos.length > 0 ? (
        <Card className="p-0">
          <div className="hidden border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase text-[#FFF2E1]/50 lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_120px_130px_130px_250px] lg:gap-3">
            <span>Moto</span>
            <span>Cliente</span>
            <span>Placas</span>
            <span>Estado</span>
            <span>Kilometraje</span>
            <span className="text-right">Acciones</span>
          </div>

          <div className="divide-y divide-white/10">
            {filteredMotos.map((moto) => {
              const cliente = getCliente(moto.cliente_id);
              const active = moto.activa !== false;

              return (
                <article key={moto.id} className="grid gap-3 p-4 transition hover:bg-white/[0.04] lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_120px_130px_130px_250px] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words text-lg font-semibold text-white lg:text-base">{moto.marca} {moto.modelo}</p>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold lg:hidden ${active ? "bg-[#F2B705] text-[#0B0B0B]" : "bg-white/10 text-[#FFF2E1]/72"}`}>
                        {active ? "Activa" : "Inactiva"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#FFF2E1]/65">{moto.anio} | {moto.color} | {moto.numero_serie || "Sin serie"}</p>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#FFF2E1]">{cliente?.nombre ?? "Sin cliente"}</p>
                    <p className="truncate text-sm text-[#FFF2E1]/58">{cliente?.telefono ?? "Sin telefono"}</p>
                  </div>

                  <p className="truncate text-sm font-semibold text-white">{moto.placas}</p>

                  <div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${active ? "bg-[#F2B705] text-[#0B0B0B]" : "bg-white/10 text-[#FFF2E1]/72"}`}>
                      {active ? estadoOperativoLabels[moto.estado_operativo ?? "recibida"] : "Inactiva"}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-[#FFF2E1]/72">{moto.kilometraje.toLocaleString()} km</p>

                  <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3 lg:flex lg:justify-end">
                    <Link to={`/motocicletas/${moto.id}`} className="inline-flex min-h-11 min-w-0 max-w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-3 text-sm font-semibold text-[#FFF2E1] transition hover:border-[#F2B705]/35 hover:bg-white/12 active:scale-[0.98]">
                      <Eye className="h-4 w-4 shrink-0" /> Ver
                    </Link>
                    <Button type="button" variant={active ? "secondary" : "primary"} className="w-full lg:w-auto" onClick={() => void toggleActive(moto.id, active)}>
                      {active ? <PowerOff className="h-4 w-4 shrink-0" /> : <Power className="h-4 w-4 shrink-0" />}
                      {active ? "Inactivar" : "Activar"}
                    </Button>
                    <Button type="button" variant="danger" className="w-full lg:w-auto" onClick={() => void removeMoto(moto.id, `${moto.marca} ${moto.modelo}`)}>
                      <Trash2 className="h-4 w-4 shrink-0" /> Eliminar
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </Card>
      ) : null}

      {motocicletas.length > 0 && filteredMotos.length === 0 ? <EmptyState title="No encontramos motos con esos filtros" /> : null}
    </div>
  );
}
