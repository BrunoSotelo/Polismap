-- Eliminar función previa para evitar conflictos de tipo de retorno
drop function if exists public.get_section_by_point(double precision, double precision);

-- Asegurar que la función existe, tiene permisos correctos y BYPASSEA RLS (security definer)
create or replace function public.get_section_by_point(lat double precision, lng double precision)
returns integer
language sql
security definer -- ⚠️ CRÍTICO: Ejecutar con permisos de admin para ignorar RLS y encontrar cualquier sección
as $$
  select id 
  from secciones_electorales 
  where st_contains(geom, st_setsrid(st_point(lng, lat), 4326))
  limit 1;
$$;

-- Otorgar permisos de ejecución a los roles de API
grant execute on function public.get_section_by_point(double precision, double precision) to anon, authenticated, service_role;

-- Comentario para verificar
comment on function public.get_section_by_point is 'Busca la sección electoral dado un punto (lat, lng). Ignora RLS para devolver siempre la sección correcta.';
