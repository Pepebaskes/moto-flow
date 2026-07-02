create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public)
values ('evidencias', 'evidencias', true)
on conflict (id) do update set public = true;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.talleres (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.perfiles (
  id uuid primary key default gen_random_uuid(),
  taller_id uuid not null references public.talleres(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  rol text not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  taller_id uuid not null references public.talleres(id) on delete cascade,
  nombre text not null,
  telefono text not null,
  email text,
  localidad text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.motocicletas (
  id uuid primary key default gen_random_uuid(),
  taller_id uuid not null references public.talleres(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  marca text not null,
  modelo text not null,
  anio int not null,
  placas text not null,
  color text not null,
  kilometraje int not null default 0,
  fecha_estimada_salida date,
  activa boolean not null default true,
  ciclo_trabajo_id text,
  prioridad_trabajo text not null default 'media',
  tipo_trabajo text not null default 'diagnostico',
  estado_operativo text not null default 'recibida',
  tamano_trabajo text not null default 'medio',
  numero_serie text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  create type public.prioridad_orden as enum ('baja', 'media', 'alta', 'urgente');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.estado_orden as enum ('recibida', 'diagnostico', 'esperando_autorizacion', 'autorizada', 'esperando_refacciones', 'en_reparacion', 'lista', 'entregada', 'cancelada');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.tipo_evidencia as enum ('entrada', 'proceso', 'salida');
exception when duplicate_object then null;
end $$;

create table if not exists public.ordenes_trabajo (
  id uuid primary key default gen_random_uuid(),
  taller_id uuid not null references public.talleres(id) on delete cascade,
  moto_id uuid not null references public.motocicletas(id) on delete restrict,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  titulo text not null,
  descripcion_problema text not null,
  diagnostico text,
  prioridad public.prioridad_orden not null default 'media',
  estado public.estado_orden not null default 'recibida',
  fecha_entrada date not null default current_date,
  fecha_estimada date,
  total_estimado numeric(12,2),
  total_final numeric(12,2),
  notas_internas text,
  notas_publicas text,
  codigo_publico text not null unique default upper('MF-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.evidencias (
  id uuid primary key default gen_random_uuid(),
  taller_id uuid not null references public.talleres(id) on delete cascade,
  orden_id uuid references public.ordenes_trabajo(id) on delete cascade,
  moto_id uuid references public.motocicletas(id) on delete cascade,
  movimiento_id uuid,
  url text not null,
  tipo public.tipo_evidencia not null,
  nota text,
  publico boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.movimientos_orden (
  id uuid primary key default gen_random_uuid(),
  taller_id uuid not null references public.talleres(id) on delete cascade,
  orden_id uuid references public.ordenes_trabajo(id) on delete cascade,
  moto_id uuid references public.motocicletas(id) on delete cascade,
  estado_anterior public.estado_orden,
  estado_nuevo public.estado_orden,
  ciclo_trabajo_id text,
  tipo text not null default 'avance',
  titulo text not null default 'Actualizacion',
  nota text,
  publico boolean not null default false,
  costo numeric(12,2),
  kilometraje int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cotizaciones (
  id uuid primary key default gen_random_uuid(),
  taller_id uuid not null references public.talleres(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  moto_id uuid references public.motocicletas(id) on delete set null,
  folio text not null,
  titulo text not null,
  domicilio text,
  fecha date not null default current_date,
  valida_hasta date,
  estado text not null default 'borrador',
  items jsonb not null default '[]'::jsonb,
  notas text,
  clausula text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.movimientos_orden add column if not exists tipo text not null default 'avance';
alter table public.movimientos_orden alter column orden_id drop not null;
alter table public.movimientos_orden add column if not exists moto_id uuid references public.motocicletas(id) on delete cascade;
alter table public.movimientos_orden add column if not exists titulo text not null default 'Actualizacion';
alter table public.movimientos_orden alter column estado_nuevo drop not null;
alter table public.movimientos_orden add column if not exists ciclo_trabajo_id text;
alter table public.movimientos_orden add column if not exists publico boolean not null default false;
alter table public.movimientos_orden add column if not exists costo numeric(12,2);
alter table public.movimientos_orden add column if not exists kilometraje int;
alter table public.motocicletas add column if not exists fecha_estimada_salida date;
alter table public.motocicletas add column if not exists activa boolean not null default true;
alter table public.motocicletas add column if not exists ciclo_trabajo_id text;
alter table public.motocicletas add column if not exists prioridad_trabajo text not null default 'media';
alter table public.motocicletas add column if not exists tipo_trabajo text not null default 'diagnostico';
alter table public.motocicletas add column if not exists estado_operativo text not null default 'recibida';
alter table public.motocicletas add column if not exists tamano_trabajo text not null default 'medio';
update public.motocicletas
set ciclo_trabajo_id = coalesce(ciclo_trabajo_id, id::text),
    activa = coalesce(activa, true);
update public.movimientos_orden mo
set ciclo_trabajo_id = coalesce(mo.ciclo_trabajo_id, m.ciclo_trabajo_id)
from public.motocicletas m
where mo.moto_id = m.id;
alter table public.evidencias alter column orden_id drop not null;
alter table public.evidencias add column if not exists moto_id uuid references public.motocicletas(id) on delete cascade;
alter table public.evidencias add column if not exists movimiento_id uuid references public.movimientos_orden(id) on delete cascade;
alter table public.evidencias add column if not exists publico boolean not null default true;

create or replace function public.current_taller_id()
returns uuid language sql stable security definer as $$
  select taller_id from public.perfiles where user_id = auth.uid() limit 1;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['talleres', 'perfiles', 'clientes', 'motocicletas', 'ordenes_trabajo', 'evidencias', 'movimientos_orden', 'cotizaciones']
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

drop policy if exists "Usuarios ven su taller" on public.talleres;
drop policy if exists "Usuarios actualizan su taller" on public.talleres;
drop policy if exists "Usuarios ven su propio perfil" on public.perfiles;
drop policy if exists "Perfiles del mismo taller" on public.perfiles;
drop policy if exists "Clientes por taller" on public.clientes;
drop policy if exists "Motocicletas por taller" on public.motocicletas;
drop policy if exists "Ordenes por taller" on public.ordenes_trabajo;
drop policy if exists "Evidencias por taller" on public.evidencias;
drop policy if exists "Movimientos por taller" on public.movimientos_orden;
drop policy if exists "Cotizaciones por taller" on public.cotizaciones;
drop policy if exists "Consulta publica de orden" on public.ordenes_trabajo;
drop policy if exists "Demo taller visible" on public.talleres;
drop policy if exists "Demo clientes" on public.clientes;
drop policy if exists "Demo motocicletas" on public.motocicletas;
drop policy if exists "Demo ordenes" on public.ordenes_trabajo;
drop policy if exists "Demo evidencias" on public.evidencias;
drop policy if exists "Demo movimientos" on public.movimientos_orden;
drop policy if exists "Demo cotizaciones" on public.cotizaciones;

create policy "Usuarios ven su taller" on public.talleres for select using (id = public.current_taller_id());
create policy "Usuarios actualizan su taller" on public.talleres for update using (id = public.current_taller_id()) with check (id = public.current_taller_id());
create policy "Usuarios ven su propio perfil" on public.perfiles for select using (user_id = auth.uid());
create policy "Perfiles del mismo taller" on public.perfiles for all using (taller_id = public.current_taller_id()) with check (taller_id = public.current_taller_id());
create policy "Clientes por taller" on public.clientes for all using (taller_id = public.current_taller_id()) with check (taller_id = public.current_taller_id());
create policy "Motocicletas por taller" on public.motocicletas for all using (taller_id = public.current_taller_id()) with check (taller_id = public.current_taller_id());
create policy "Ordenes por taller" on public.ordenes_trabajo for all using (taller_id = public.current_taller_id()) with check (taller_id = public.current_taller_id());
create policy "Evidencias por taller" on public.evidencias for all using (taller_id = public.current_taller_id()) with check (taller_id = public.current_taller_id());
create policy "Movimientos por taller" on public.movimientos_orden for all using (taller_id = public.current_taller_id()) with check (taller_id = public.current_taller_id());
create policy "Cotizaciones por taller" on public.cotizaciones for all using (taller_id = public.current_taller_id()) with check (taller_id = public.current_taller_id());
create policy "Consulta publica de orden" on public.ordenes_trabajo for select using (codigo_publico is not null);
create or replace function public.consulta_cliente(p_busqueda text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  resultado jsonb;
begin
  with moto_encontrada as (
    select m.*, c.nombre as cliente_nombre
    from public.motocicletas m
    join public.clientes c on c.id = m.cliente_id
    where lower(replace(m.placas, ' ', '')) = lower(replace(p_busqueda, ' ', ''))
       or lower(coalesce(m.numero_serie, '')) = lower(replace(p_busqueda, ' ', ''))
       or lower(c.nombre) like '%' || lower(p_busqueda) || '%'
       or exists (
        select 1
        from public.ordenes_trabajo o
        where o.moto_id = m.id and lower(o.codigo_publico) = lower(p_busqueda)
       )
    order by m.created_at desc
    limit 1
  ),
  ordenes_moto as (
    select o.id
    from public.ordenes_trabajo o
    join moto_encontrada m on m.id = o.moto_id
  )
  select jsonb_build_object(
    'moto', to_jsonb(m) - 'cliente_nombre',
    'cliente', jsonb_build_object('nombre', m.cliente_nombre),
    'movimientos', coalesce((
      select jsonb_agg(to_jsonb(mo) order by mo.created_at desc)
      from public.movimientos_orden mo
      where mo.publico = true
        and (
          mo.moto_id = m.id
          or mo.orden_id in (select id from ordenes_moto)
        )
    ), '[]'::jsonb),
    'evidencias', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.created_at desc)
      from public.evidencias e
      where e.publico = true
        and (
          e.moto_id = m.id
          or e.movimiento_id in (
            select mo.id
            from public.movimientos_orden mo
            where mo.publico = true
              and (
                mo.moto_id = m.id
                or mo.orden_id in (select id from ordenes_moto)
              )
          )
          or e.orden_id in (select id from ordenes_moto)
        )
    ), '[]'::jsonb)
  )
  into resultado
  from moto_encontrada m;

  return resultado;
end;
$$;

create or replace function public.bootstrap_taller(p_nombre text default 'Taller de Motos Villa')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_taller uuid;
  new_taller uuid;
begin
  if auth.uid() is null then
    raise exception 'Usuario no autenticado';
  end if;

  select taller_id into existing_taller
  from public.perfiles
  where user_id = auth.uid()
  limit 1;

  if existing_taller is not null then
    return existing_taller;
  end if;

  insert into public.talleres (nombre)
  values (coalesce(nullif(p_nombre, ''), 'MotoFlow Taller'))
  returning id into new_taller;

  insert into public.perfiles (taller_id, user_id, nombre, rol)
  values (new_taller, auth.uid(), coalesce(auth.email(), 'Usuario'), 'admin');

  return new_taller;
end;
$$;

drop trigger if exists set_talleres_updated_at on public.talleres;
drop trigger if exists set_perfiles_updated_at on public.perfiles;
drop trigger if exists set_clientes_updated_at on public.clientes;
drop trigger if exists set_motocicletas_updated_at on public.motocicletas;
drop trigger if exists set_ordenes_updated_at on public.ordenes_trabajo;
drop trigger if exists set_evidencias_updated_at on public.evidencias;
drop trigger if exists set_movimientos_updated_at on public.movimientos_orden;
drop trigger if exists set_cotizaciones_updated_at on public.cotizaciones;

create trigger set_talleres_updated_at before update on public.talleres for each row execute function public.set_updated_at();
create trigger set_perfiles_updated_at before update on public.perfiles for each row execute function public.set_updated_at();
create trigger set_clientes_updated_at before update on public.clientes for each row execute function public.set_updated_at();
create trigger set_motocicletas_updated_at before update on public.motocicletas for each row execute function public.set_updated_at();
create trigger set_ordenes_updated_at before update on public.ordenes_trabajo for each row execute function public.set_updated_at();
create trigger set_evidencias_updated_at before update on public.evidencias for each row execute function public.set_updated_at();
create trigger set_movimientos_updated_at before update on public.movimientos_orden for each row execute function public.set_updated_at();
create trigger set_cotizaciones_updated_at before update on public.cotizaciones for each row execute function public.set_updated_at();

drop policy if exists "Evidencias storage lectura publica" on storage.objects;
drop policy if exists "Evidencias storage carga publica" on storage.objects;
drop policy if exists "Evidencias storage actualizacion publica" on storage.objects;
drop policy if exists "Evidencias storage borrado publico" on storage.objects;

create policy "Evidencias storage lectura publica"
on storage.objects for select
using (bucket_id = 'evidencias');

create policy "Evidencias storage carga publica"
on storage.objects for insert
with check (bucket_id = 'evidencias');

create policy "Evidencias storage actualizacion publica"
on storage.objects for update
using (bucket_id = 'evidencias')
with check (bucket_id = 'evidencias');

create policy "Evidencias storage borrado publico"
on storage.objects for delete
using (bucket_id = 'evidencias');
