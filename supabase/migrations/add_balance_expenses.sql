create extension if not exists pgcrypto;

create table if not exists public.balance_gastos (
  id uuid primary key default gen_random_uuid(),
  taller_id uuid not null references public.talleres(id) on delete cascade,
  concepto text not null,
  categoria text not null default 'otro',
  monto numeric(12,2) not null default 0,
  fecha date not null default current_date,
  nota text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_balance_gastos_taller_id on public.balance_gastos(taller_id);
create index if not exists idx_balance_gastos_categoria on public.balance_gastos(categoria);
create index if not exists idx_balance_gastos_fecha on public.balance_gastos(fecha);
create index if not exists idx_balance_gastos_created_at on public.balance_gastos(created_at);

do $$ begin
  alter table public.balance_gastos
  add constraint balance_gastos_categoria_check
  check (categoria in ('gasolina', 'luz', 'renta', 'comida', 'herramienta', 'refaccion', 'otro'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.balance_gastos
  add constraint balance_gastos_monto_check
  check (monto >= 0);
exception when duplicate_object then null;
end $$;

alter table public.balance_gastos enable row level security;

drop policy if exists "Balance gastos por taller" on public.balance_gastos;
create policy "Balance gastos por taller"
on public.balance_gastos
for all
using (taller_id = public.current_taller_id())
with check (taller_id = public.current_taller_id());

drop trigger if exists set_balance_gastos_updated_at on public.balance_gastos;
create trigger set_balance_gastos_updated_at
before update on public.balance_gastos
for each row
execute function public.set_updated_at();
