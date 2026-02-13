-- Enable PostGIS if not already enabled
create extension if not exists postgis;

-- 1. Table for Colonias (GeoJSON optimization)
create table if not exists public.colonias (
    id serial primary key,
    nombre text,
    municipio text,
    geom geometry(MultiPolygon, 4326), -- Standard WGS84
    created_at timestamp with time zone default now()
);

-- Index for spatial queries (Critical for the "Intersect" query)
create index if not exists idx_colonias_geom on public.colonias using gist(geom);

-- 2. Table for AI Reports
create table if not exists public.reportes_ia (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  
  -- Metadata
  fecha_inicio date not null,
  fecha_fin date not null,
  tipo text check (tipo in ('semanal', 'mensual')),
  
  -- Scope (Optional, can be null if it's a general report)
  distrito_id int, -- We don't enforce foreign key strictly if likely to change, but good practice.
                   -- Assuming 'distritos' table exists with 'id' column.
  
  -- The Content
  contenido jsonb not null, 
  
  -- Audit
  tokens_usados int, 
  modelo_usado text default 'gpt-4o-mini'
);

create index if not exists idx_reportes_periodo on public.reportes_ia(fecha_inicio, fecha_fin);

-- RLS Policies (Basic)
alter table public.colonias enable row level security;
alter table public.reportes_ia enable row level security;

-- Allow read access to authenticated users
create policy "Enable read access for authenticated users"
on public.colonias for select
to authenticated
using (true);

create policy "Enable read access for authenticated users"
on public.reportes_ia for select
to authenticated
using (true);

-- Allow insert access only to service_role (for seed scripts) usually, 
-- but for dev simplicity we might verify later. 
-- For now, authenticated read is key.
