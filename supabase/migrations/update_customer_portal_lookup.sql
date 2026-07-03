create or replace function public.consulta_cliente(p_busqueda text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  resultado jsonb;
  busqueda_limpia text;
begin
  busqueda_limpia := lower(regexp_replace(coalesce(p_busqueda, ''), '[^a-zA-Z0-9]', '', 'g'));

  with moto_encontrada as (
    select m.*, c.nombre as cliente_nombre
    from public.motocicletas m
    join public.clientes c on c.id = m.cliente_id
    where lower(regexp_replace(coalesce(m.placas, ''), '[^a-zA-Z0-9]', '', 'g')) = busqueda_limpia
       or lower(regexp_replace(coalesce(c.telefono, ''), '[^a-zA-Z0-9]', '', 'g')) = busqueda_limpia
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
