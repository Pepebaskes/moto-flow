import { Eye, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { useWorkshopStore } from "@/stores/workshopStore";

export function MotocicletasPage() {
  const { motocicletas, getCliente, deleteMoto } = useWorkshopStore();

  async function removeMoto(id: string, nombre: string) {
    if (!window.confirm(`¿Eliminar moto ${nombre}?`)) return;
    const result = await deleteMoto(id);
    if (!result.ok) window.alert(result.message);
  }

  return (
    <div>
      <PageHeader title="Motocicletas" subtitle="Unidades registradas en el taller." actions={<Link to="/motocicletas/nueva"><Button>Nueva moto</Button></Link>} />
      {motocicletas.length === 0 ? <EmptyState title="Aun no hay motocicletas" /> : null}

      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {motocicletas.map((moto) => (
          <Card key={moto.id} className="h-full transition hover:border-[#F2B705]/30 hover:bg-white/[0.09]">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{moto.marca} {moto.modelo}</p>
                <p className="mt-1 text-sm text-[#FFF2E1]/60">{moto.anio} · {moto.color}</p>
              </div>
              <span className="shrink-0 rounded-full bg-[#F2B705]/10 px-2.5 py-1 text-xs font-semibold text-[#FFF2E1]">{moto.placas}</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-[#0B0B0B]/45 p-3 text-sm">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-[#FFF2E1]/45">Kilometraje</p>
                <p className="font-semibold">{moto.kilometraje.toLocaleString()} km</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-[#FFF2E1]/45">Serie</p>
                <p className="truncate font-semibold">{moto.numero_serie || "Sin serie"}</p>
              </div>
            </div>

            {moto.notas ? <p className="mt-3 line-clamp-2 text-sm text-[#FFF2E1]/60">{moto.notas}</p> : null}

            <div className="mt-4 border-t border-white/10 pt-3">
              <p className="text-xs font-semibold uppercase text-[#FFF2E1]/45">Cliente</p>
              <p className="truncate text-sm font-semibold">{getCliente(moto.cliente_id)?.nombre}</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link to={`/motocicletas/${moto.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-3 text-sm font-semibold text-[#FFF2E1] transition hover:border-[#F2B705]/35 hover:bg-white/12 active:scale-[0.98]">
                <Eye className="h-4 w-4" /> Ver
              </Link>
              <Button type="button" variant="danger" onClick={() => void removeMoto(moto.id, `${moto.marca} ${moto.modelo}`)}>
                <Trash2 className="h-4 w-4" /> Eliminar
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
