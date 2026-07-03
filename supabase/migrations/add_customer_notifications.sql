create extension if not exists pgcrypto;

alter table public.clientes
add column if not exists acepta_notificaciones boolean not null default true;

alter table public.ordenes_trabajo
add column if not exists ultima_notificacion_estado text;

create table if not exists public.notificaciones_cliente (
  id uuid primary key default gen_random_uuid(),
  taller_id uuid not null references public.talleres(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  orden_id uuid not null references public.ordenes_trabajo(id) on delete cascade,
  canal text not null default 'whatsapp',
  telefono text not null,
  mensaje text not null,
  estado text not null default 'pendiente',
  evento text not null,
  proveedor text,
  proveedor_message_id text,
  error text,
  enviado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notificaciones_cliente_taller_id on public.notificaciones_cliente(taller_id);
create index if not exists idx_notificaciones_cliente_cliente_id on public.notificaciones_cliente(cliente_id);
create index if not exists idx_notificaciones_cliente_orden_id on public.notificaciones_cliente(orden_id);
create index if not exists idx_notificaciones_cliente_estado on public.notificaciones_cliente(estado);
create index if not exists idx_notificaciones_cliente_evento on public.notificaciones_cliente(evento);
create index if not exists idx_notificaciones_cliente_created_at on public.notificaciones_cliente(created_at);
create unique index if not exists idx_notificaciones_cliente_orden_evento_unique on public.notificaciones_cliente(orden_id, evento);

do $$ begin
  alter table public.notificaciones_cliente
  add constraint notificaciones_cliente_estado_check
  check (estado in ('pendiente', 'enviado', 'error', 'omitido'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.notificaciones_cliente
  add constraint notificaciones_cliente_evento_check
  check (evento in ('orden_recibida', 'diagnostico', 'esperando_autorizacion', 'autorizada', 'esperando_refacciones', 'en_reparacion', 'lista', 'entregada', 'cancelada'));
exception when duplicate_object then null;
end $$;

alter table public.notificaciones_cliente enable row level security;

drop policy if exists "Notificaciones por taller" on public.notificaciones_cliente;
create policy "Notificaciones por taller"
on public.notificaciones_cliente
for all
using (taller_id = public.current_taller_id())
with check (taller_id = public.current_taller_id());

drop trigger if exists set_notificaciones_updated_at on public.notificaciones_cliente;
create trigger set_notificaciones_updated_at
before update on public.notificaciones_cliente
for each row
execute function public.set_updated_at();
