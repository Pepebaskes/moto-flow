import { CalendarDays, CircleDollarSign, Fuel, Lightbulb, ReceiptText, Search, Trash2, TrendingDown, TrendingUp, WalletCards, Wrench } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Field, Input, Select } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { useWorkshopStore } from "@/stores/workshopStore";
import type { GastoBalance } from "@/types/motoflow";
import { currency } from "@/utils/format";
import { includesSearch } from "@/utils/search";

type BalanceTab = "resumen" | "historial";
type GastoCategoria = GastoBalance["categoria"];

const categorias: Array<{ value: GastoCategoria; label: string }> = [
  { value: "gasolina", label: "Gasolina" },
  { value: "luz", label: "Luz" },
  { value: "renta", label: "Renta" },
  { value: "comida", label: "Comida" },
  { value: "herramienta", label: "Herramienta" },
  { value: "refaccion", label: "Refaccion" },
  { value: "otro", label: "Otro" },
];

function monthKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(value: string) {
  const [year, month] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function shortDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
  });
}

function categoryLabel(value: GastoCategoria) {
  return categorias.find((categoria) => categoria.value === value)?.label ?? "Otro";
}

export function BalancePage() {
  const { movimientos, gastosBalance, getMoto, getCliente, addGastoBalance, deleteGastoBalance } = useWorkshopStore();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<BalanceTab>("resumen");
  const [saving, setSaving] = useState(false);

  const availableMonths = useMemo(() => {
    const months = Array.from(new Set([...movimientos.map((movimiento) => monthKey(movimiento.created_at)), ...gastosBalance.map((gasto) => monthKey(gasto.fecha))].filter(Boolean)));
    return months.sort((a, b) => b.localeCompare(a));
  }, [gastosBalance, movimientos]);

  const [selectedMonth, setSelectedMonth] = useState("");
  const currentMonth = selectedMonth || availableMonths[0] || monthKey(new Date().toISOString());

  const incomeRows = useMemo(() => {
    return movimientos
      .filter((movimiento) => monthKey(movimiento.created_at) === currentMonth)
      .map((movimiento) => {
        const moto = movimiento.moto_id ? getMoto(movimiento.moto_id) : undefined;
        const cliente = moto ? getCliente(moto.cliente_id) : undefined;
        const refaccion = Number(movimiento.costo_refaccion || 0);
        const manoObra = Number(movimiento.costo_mano_obra || 0);
        const total = Number(movimiento.costo || 0);
        const utilidad = total - refaccion;
        return { movimiento, moto, cliente, refaccion, manoObra, total, utilidad };
      })
      .filter((row) => row.total > 0 || row.refaccion > 0 || row.manoObra > 0)
      .sort((a, b) => new Date(b.movimiento.created_at).getTime() - new Date(a.movimiento.created_at).getTime());
  }, [currentMonth, getCliente, getMoto, movimientos]);

  const expenseRows = useMemo(() => {
    return gastosBalance
      .filter((gasto) => monthKey(gasto.fecha) === currentMonth)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [currentMonth, gastosBalance]);

  const filteredIncomeRows = useMemo(() => {
    return incomeRows.filter((row) =>
      includesSearch(
        [
          row.movimiento.titulo,
          row.movimiento.refaccion,
          row.movimiento.tipo,
          row.moto?.marca,
          row.moto?.modelo,
          row.moto?.placas,
          row.cliente?.nombre,
          row.cliente?.telefono,
        ],
        query,
      ),
    );
  }, [incomeRows, query]);

  const filteredExpenseRows = useMemo(() => {
    return expenseRows.filter((gasto) => includesSearch([gasto.concepto, gasto.categoria, gasto.nota, gasto.fecha], query));
  }, [expenseRows, query]);

  const totals = useMemo(() => {
    const ingresos = incomeRows.reduce((sum, row) => sum + row.total, 0);
    const refacciones = incomeRows.reduce((sum, row) => sum + row.refaccion, 0);
    const manoObra = incomeRows.reduce((sum, row) => sum + row.manoObra, 0);
    const gastos = expenseRows.reduce((sum, row) => sum + Number(row.monto || 0), 0);
    const utilidadBruta = ingresos - refacciones;
    const utilidadNeta = utilidadBruta - gastos;
    return { ingresos, refacciones, manoObra, gastos, utilidadBruta, utilidadNeta, trabajos: incomeRows.length, gastosCount: expenseRows.length };
  }, [expenseRows, incomeRows]);

  const monthlyComparison = useMemo(() => {
    const monthSet = new Set([...movimientos.map((movimiento) => monthKey(movimiento.created_at)), ...gastosBalance.map((gasto) => monthKey(gasto.fecha)), currentMonth].filter(Boolean));
    const months = Array.from(monthSet).sort((a, b) => a.localeCompare(b)).slice(-6);
    return months.map((month) => {
      const monthMovements = movimientos.filter((movimiento) => monthKey(movimiento.created_at) === month);
      const monthExpenses = gastosBalance.filter((gasto) => monthKey(gasto.fecha) === month);
      const ingresos = monthMovements.reduce((sum, movimiento) => sum + Number(movimiento.costo || 0), 0);
      const refacciones = monthMovements.reduce((sum, movimiento) => sum + Number(movimiento.costo_refaccion || 0), 0);
      const gastos = monthExpenses.reduce((sum, gasto) => sum + Number(gasto.monto || 0), 0);
      return { month, ingresos, gastos, utilidad: ingresos - refacciones - gastos };
    });
  }, [currentMonth, gastosBalance, movimientos]);

  const maxMonthValue = Math.max(1, ...monthlyComparison.map((item) => Math.abs(item.utilidad)));
  const previousMonth = monthlyComparison.at(-2);
  const currentMonthStats = monthlyComparison.at(-1);
  const diff = currentMonthStats && previousMonth ? currentMonthStats.utilidad - previousMonth.utilidad : 0;

  const metrics = [
    { label: "Ingresos del mes", value: currency(totals.ingresos), icon: CircleDollarSign },
    { label: "Refacciones", value: currency(totals.refacciones), icon: Wrench },
    { label: "Gastos del taller", value: currency(totals.gastos), icon: WalletCards },
    { label: "Utilidad neta", value: currency(totals.utilidadNeta), icon: totals.utilidadNeta >= 0 ? TrendingUp : TrendingDown },
  ];

  async function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const concepto = String(form.get("concepto") || "").trim();
    const monto = Number(form.get("monto") || 0);
    if (!concepto || monto <= 0) return;

    setSaving(true);
    try {
      await addGastoBalance({
        concepto,
        categoria: String(form.get("categoria") || "otro") as GastoCategoria,
        monto,
        fecha: String(form.get("fecha") || new Date().toISOString().slice(0, 10)),
        nota: String(form.get("nota") || "").trim() || undefined,
      });
      event.currentTarget.reset();
    } finally {
      setSaving(false);
    }
  }

  async function removeExpense(id: string, concepto: string) {
    if (!window.confirm(`Eliminar gasto "${concepto}"?`)) return;
    await deleteGastoBalance(id);
  }

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader title="Balance" subtitle="Ingresos, refacciones y gastos manuales para saber como va el taller cada mes." />

      <Card>
        <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-center">
          <Select value={currentMonth} onChange={(event) => setSelectedMonth(event.target.value)} aria-label="Seleccionar mes">
            {availableMonths.length === 0 ? <option value={currentMonth}>{monthLabel(currentMonth)}</option> : null}
            {availableMonths.map((month) => <option key={month} value={month}>{monthLabel(month)}</option>)}
          </Select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FFF2E1]/45" />
            <Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar gasto, cliente, moto, placa o trabajo..." />
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-black/25 p-1">
            <button onClick={() => setTab("resumen")} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === "resumen" ? "bg-[#F2B705] text-[#0B0B0B]" : "text-[#FFF2E1]/70 hover:bg-white/8"}`}>
              Resumen
            </button>
            <button onClick={() => setTab("historial")} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === "historial" ? "bg-[#F2B705] text-[#0B0B0B]" : "text-[#FFF2E1]/70 hover:bg-white/8"}`}>
              Historial
            </button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-[#FFF2E1]/60">{metric.label}</p>
                  <p className="mt-2 break-words text-2xl font-semibold text-white">{metric.value}</p>
                </div>
                <div className="rounded-2xl bg-[#F2B705]/10 p-3 text-[#FFD08A]"><Icon className="h-5 w-5" /></div>
              </div>
            </Card>
          );
        })}
      </div>

      {tab === "resumen" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card>
            <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#FFF2E1]/55">Comparacion mensual</p>
                <h2 className="text-2xl font-semibold text-white">Utilidad neta</h2>
              </div>
              <p className={`text-sm font-semibold ${diff >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                {previousMonth ? `${diff >= 0 ? "Mejor" : "Peor"} que el mes anterior: ${currency(Math.abs(diff))}` : "Aun no hay mes anterior"}
              </p>
            </div>

            <div className="grid min-h-64 grid-cols-3 gap-3 sm:grid-cols-6">
              {monthlyComparison.map((item) => {
                const percent = Math.max(8, Math.round((Math.abs(item.utilidad) / maxMonthValue) * 100));
                const positive = item.utilidad >= 0;
                return (
                  <div key={item.month} className="flex min-w-0 flex-col items-center justify-end gap-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <p className={`text-center text-xs font-semibold ${positive ? "text-[#FFD08A]" : "text-red-300"}`}>{currency(item.utilidad)}</p>
                    <div className="flex h-36 w-full items-end justify-center">
                      <div className={`w-8 rounded-t-2xl transition ${positive ? "bg-[#F2B705]" : "bg-red-400"}`} style={{ height: `${percent}%` }} />
                    </div>
                    <p className="truncate text-xs text-[#FFF2E1]/60">{monthLabel(item.month).slice(0, 3)}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-[#F2B705]/12 p-3 text-[#FFD08A]"><ReceiptText className="h-5 w-5" /></div>
              <div>
                <h2 className="text-xl font-semibold text-white">Agregar gasto</h2>
                <p className="text-sm text-[#FFF2E1]/58">Gasolina, luz, renta, comida o cualquier gasto del taller.</p>
              </div>
            </div>

            <form onSubmit={(event) => void submitExpense(event)} className="space-y-3">
              <Field label="Concepto">
                <Input name="concepto" placeholder="Ej. gasolina para mandado" required />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Categoria">
                  <Select name="categoria" defaultValue="gasolina">
                    {categorias.map((categoria) => <option key={categoria.value} value={categoria.value}>{categoria.label}</option>)}
                  </Select>
                </Field>
                <Field label="Monto">
                  <Input name="monto" type="number" min="0" step="0.01" placeholder="0.00" required />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Fecha">
                  <Input name="fecha" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
                </Field>
                <Field label="Nota opcional">
                  <Input name="nota" placeholder="Detalle corto" />
                </Field>
              </div>
              <Button className="w-full" type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar gasto"}</Button>
            </form>
          </Card>

          <Card className="xl:col-span-2">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-[#FFF2E1]/58">Trabajos cobrados</p>
                <p className="mt-2 text-2xl font-semibold text-white">{totals.trabajos}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-[#FFF2E1]/58">Gastos capturados</p>
                <p className="mt-2 text-2xl font-semibold text-white">{totals.gastosCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-[#FFF2E1]/58">Utilidad bruta</p>
                <p className="mt-2 text-2xl font-semibold text-white">{currency(totals.utilidadBruta)}</p>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="p-0">
            <div className="border-b border-white/10 px-4 py-3">
              <h2 className="text-lg font-semibold text-white">Gastos manuales</h2>
              <p className="text-sm text-[#FFF2E1]/55">{filteredExpenseRows.length} registros</p>
            </div>
            <div className="divide-y divide-white/10">
              {filteredExpenseRows.map((gasto) => (
                <article key={gasto.id} className="grid gap-3 p-4 transition hover:bg-white/[0.04] sm:grid-cols-[minmax(0,1fr)_120px_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-white">{gasto.concepto}</p>
                    <p className="text-sm text-[#FFF2E1]/58">{shortDate(gasto.fecha)} | {categoryLabel(gasto.categoria)}{gasto.nota ? ` | ${gasto.nota}` : ""}</p>
                  </div>
                  <p className="font-semibold text-red-300">{currency(Number(gasto.monto || 0))}</p>
                  <Button variant="danger" className="w-full sm:w-auto" onClick={() => void removeExpense(gasto.id, gasto.concepto)}>
                    <Trash2 className="h-4 w-4" /> Eliminar
                  </Button>
                </article>
              ))}
            </div>
            {filteredExpenseRows.length === 0 ? <div className="p-4"><EmptyState title="No hay gastos con esos filtros" /></div> : null}
          </Card>

          <Card className="p-0">
            <div className="border-b border-white/10 px-4 py-3">
              <h2 className="text-lg font-semibold text-white">Ingresos desde trabajos</h2>
              <p className="text-sm text-[#FFF2E1]/55">{filteredIncomeRows.length} registros</p>
            </div>
            <div className="divide-y divide-white/10">
              {filteredIncomeRows.map((row) => (
                <article key={row.movimiento.id} className="grid gap-3 p-4 transition hover:bg-white/[0.04] sm:grid-cols-[96px_minmax(0,1fr)_120px] sm:items-center">
                  <p className="text-sm font-semibold text-[#FFF2E1]/72">{formatDate(row.movimiento.created_at)}</p>
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-white">{row.movimiento.titulo}</p>
                    <p className="truncate text-sm text-[#FFF2E1]/58">{row.cliente?.nombre ?? "Sin cliente"} | {row.moto ? `${row.moto.marca} ${row.moto.modelo} ${row.moto.placas}` : "Sin moto"}</p>
                    {row.movimiento.refaccion ? <p className="truncate text-xs text-[#FFD08A]">{row.movimiento.refaccion}</p> : null}
                  </div>
                  <p className="font-semibold text-[#FFD08A]">{currency(row.total)}</p>
                </article>
              ))}
            </div>
            {filteredIncomeRows.length === 0 ? <div className="p-4"><EmptyState title="No hay ingresos con esos filtros" /></div> : null}
          </Card>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <Fuel className="h-5 w-5 text-[#FFD08A]" />
            <p className="text-sm text-[#FFF2E1]/65">Gasolina: <span className="font-semibold text-white">{currency(expenseRows.filter((gasto) => gasto.categoria === "gasolina").reduce((sum, gasto) => sum + Number(gasto.monto || 0), 0))}</span></p>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <Lightbulb className="h-5 w-5 text-[#FFD08A]" />
            <p className="text-sm text-[#FFF2E1]/65">Luz/renta: <span className="font-semibold text-white">{currency(expenseRows.filter((gasto) => gasto.categoria === "luz" || gasto.categoria === "renta").reduce((sum, gasto) => sum + Number(gasto.monto || 0), 0))}</span></p>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-[#FFD08A]" />
            <p className="text-sm text-[#FFF2E1]/65">Periodo: <span className="font-semibold text-white">{monthLabel(currentMonth)}</span></p>
          </div>
        </Card>
      </div>
    </div>
  );
}
