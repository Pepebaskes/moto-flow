alter table public.movimientos_orden
  add column if not exists pagado boolean not null default false,
  add column if not exists pagado_at timestamptz,
  add column if not exists metodo_pago text;

create index if not exists idx_movimientos_orden_pagado on public.movimientos_orden(pagado);
create index if not exists idx_movimientos_orden_pagado_at on public.movimientos_orden(pagado_at);
create index if not exists idx_movimientos_orden_metodo_pago on public.movimientos_orden(metodo_pago);

do $$ begin
  alter table public.movimientos_orden
  add constraint movimientos_orden_metodo_pago_check
  check (metodo_pago is null or metodo_pago in ('efectivo', 'transferencia', 'tarjeta', 'otro'));
exception when duplicate_object then null;
end $$;
