-- Enable PostGIS for geospatial queries
create extension if not exists postgis;

-- 1. Secciones Electorales (Geometría y Datos)
create table if not exists secciones_electorales (
  id integer primary key, -- Número de sección (ej. 135)
  distrito integer not null,
  municipio text,
  geom geometry(MultiPolygon, 4326), -- Polígono de la sección
  meta_data jsonb default '{}'::jsonb, -- Datos extra (población, etc)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index espacial para búsquedas rápidas
create index if not exists secciones_geom_idx on secciones_electorales using gist (geom);

-- 2. Líderes (Gestores de zona)
create table if not exists leaders (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  telefono text,
  email text,
  seccion_id integer references secciones_electorales(id),
  lat float not null,
  lng float not null,
  activo boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Afinidades (INEs procesados)
create table if not exists affinities (
  id uuid default gen_random_uuid() primary key,
  ine_clave text unique, -- Clave de elector para evitar duplicados
  nombre text,
  seccion_id integer references secciones_electorales(id),
  confidence_score float default 1.0, -- Nivel de confianza del OCR/Usuario
  source_image_url text, -- URL de la foto del INE (en Storage)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Bitacoras (Antes Eventos)
create table if not exists bitacoras (
  id uuid default gen_random_uuid() primary key,
  titulo text not null,
  descripcion text,
  tipo text not null, -- 'recorrido', 'mitin', 'reunion'
  fecha timestamp with time zone not null,
  asistentes_estimados integer default 0,
  lat float,
  lng float,
  evidencia_urls text[] default array[]::text[],
  seccion_id integer references secciones_electorales(id), -- Added for RLS filtering
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Políticas de Seguridad (RLS) - SISTEMA CERRADO
-- Regla de oro:
-- 1. 'admin': Ve TODO (role = 'admin' en app_metadata)
-- 2. 'operativo': Ve SOLO su distrito (distrito = N en app_metadata)

-- Habilitar RLS
alter table secciones_electorales enable row level security;
alter table leaders enable row level security;
alter table affinities enable row level security;
alter table bitacoras enable row level security;

-- Helper function para obtener el distrito del usuario actual
create or replace function get_user_distrito()
returns integer as $$
begin
  return (auth.jwt() -> 'app_metadata' ->> 'distrito')::integer;
end;
$$ language plpgsql security definer;

-- Helper function para saber si es admin
create or replace function is_admin()
returns boolean as $$
begin
  return (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin';
end;
$$ language plpgsql security definer;

-- 1. Políticas para SECCIONES (Lectura)
create policy "Admin ve todas las secciones"
  on secciones_electorales for select
  to authenticated
  using ( is_admin() );

create policy "Operativo ve solo su distrito"
  on secciones_electorales for select
  to authenticated
  using ( distrito = get_user_distrito() );

-- 2. Políticas para LÍDERES
create policy "Admin gestiona todos los líderes"
  on leaders for all
  to authenticated
  using ( is_admin() );

create policy "Operativo ve líderes de su distrito"
  on leaders for select
  to authenticated
  using ( 
    seccion_id in (
      select id from secciones_electorales where distrito = get_user_distrito()
    )
  );

create policy "Operativo crea líderes en su distrito"
  on leaders for insert
  to authenticated
  with check (
    seccion_id in (
      select id from secciones_electorales where distrito = get_user_distrito()
    )
  );
  
-- (Nota: Para update/delete, mismas reglas de filtro que select)
create policy "Operativo edita líderes de su distrito"
  on leaders for update
  to authenticated
  using (
    seccion_id in (
      select id from secciones_electorales where distrito = get_user_distrito()
    )
  );

-- 3. Políticas para AFINIDADES
create policy "Admin ve todas las afinidades"
  on affinities for all
  to authenticated
  using ( is_admin() );

create policy "Operativo ve afinidades de su distrito"
  on affinities for select
  to authenticated
  using (
    seccion_id in (
      select id from secciones_electorales where distrito = get_user_distrito()
    )
  );
  
create policy "Operativo crea afinidades en su distrito"
  on affinities for insert
  to authenticated
  with check (
    seccion_id in (
      select id from secciones_electorales where distrito = get_user_distrito()
    )
  );

-- 4. Políticas para BITACORAS
create policy "Admin ve todas las bitacoras"
  on bitacoras for all
  to authenticated
  using ( is_admin() );

-- Para bitacoras, filtramos por la columna seccion_id
create policy "Operativo ve y crea bitacoras"
  on bitacoras for all
  to authenticated
  using (
    -- Filtra bitacoras por la sección del usuario operativo
    seccion_id in (
      select id from secciones_electorales where distrito = get_user_distrito()
    )
  );
