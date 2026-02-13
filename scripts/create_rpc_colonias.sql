-- Enable PostGIS to ensure geometry type exists
create extension if not exists postgis;

-- Function to get stats per colony
-- Returns GeoJSON features with embedded statistics (affinities, interactions)
-- STRICTLY FILTERED BY USER'S DISTRICT
create or replace function public.get_colony_stats()
returns table (
  id int,
  nombre text,
  municipio text,
  geom public.geometry, 
  affinity_count bigint,
  interaction_count bigint
)
language plpgsql
security definer
-- Ensure we can find PostGIS functions (usually in public or extensions)
SET search_path = public, extensions
as $$
declare
  v_is_admin boolean;
begin
  -- 1. Check if user is admin
  -- Use alias 'p' to avoid ambiguity with output parameter 'id'
  select p.is_admin into v_is_admin
  from public.profiles p
  where p.id = auth.uid();

  -- Default to false if null
  if v_is_admin is null then
    v_is_admin := false;
  end if;

  return query
  with user_sections as (
    -- Get geometry of sections relevant to the user
    select s.geom 
    from public.secciones_electorales s
    where 
      -- Admin sees ALL sections
      v_is_admin = true
      OR
      -- Regular users see sections from their assigned districts
      s.distrito IN (
        select distrito_id 
        from public.user_districts 
        where user_id = auth.uid()
      )
  ),
  colony_stats as (
    select 
      c.id,
      c.nombre,
      c.municipio,
      c.geom,
      (
        select count(*) 
        from public.bitacoras b
        where b.lat is not null 
          and b.lng is not null
          -- Use st_makepoint and st_setsrid (correct names)
          and st_intersects(st_setsrid(st_makepoint(b.lng, b.lat), 4326), c.geom)
      ) as interactions,
      
       (
         select count(*)
         from public.lideres l
         where l.lat is not null 
         and l.lng is not null 
         and st_within(st_setsrid(st_makepoint(l.lng, l.lat), 4326), c.geom)
       ) as affinities
      
    from public.colonias c
    where exists (
      -- ONLY return colonies that intersect with visible sections
      select 1 from user_sections us
      where st_intersects(us.geom, c.geom)
    )
  )
  select 
    cs.id,
    cs.nombre,
    cs.municipio,
    cs.geom,
    cs.affinities,
    cs.interactions
  from colony_stats cs;
end;
$$;
