alter table public.notificaciones_cliente
alter column orden_id drop not null;

alter table public.notificaciones_cliente
add column if not exists moto_id uuid references public.motocicletas(id) on delete cascade;

alter table public.notificaciones_cliente
add column if not exists movimiento_id uuid references public.movimientos_orden(id) on delete cascade;

create index if not exists idx_notificaciones_cliente_moto_id on public.notificaciones_cliente(moto_id);
create index if not exists idx_notificaciones_cliente_movimiento_id on public.notificaciones_cliente(movimiento_id);
create unique index if not exists idx_notificaciones_cliente_movimiento_unique on public.notificaciones_cliente(movimiento_id) where movimiento_id is not null;

do $$ begin
  alter table public.notificaciones_cliente drop constraint if exists notificaciones_cliente_evento_check;
  alter table public.notificaciones_cliente
  add constraint notificaciones_cliente_evento_check
  check (evento in ('orden_recibida', 'diagnostico', 'esperando_autorizacion', 'autorizada', 'esperando_refacciones', 'en_reparacion', 'lista', 'entregada', 'cancelada', 'bitacora_actualizada', 'fecha_estimada_actualizada'));
exception when duplicate_object then null;
end $$;
