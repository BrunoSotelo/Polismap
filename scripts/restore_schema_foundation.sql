-- MASTER SCHEMA RESTORATION SCRIPT
-- This script ensures the foundational tables exist.
-- It handles: secciones_electorales, leaders, affinities, and bitacoras.

BEGIN;

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. SECCIONES ELECTORALES (The Foundation)
CREATE TABLE IF NOT EXISTS public.secciones_electorales (
  id integer primary key, -- Número de sección (ej. 135)
  distrito integer not null,
  municipio text,
  geom geometry(MultiPolygon, 4326), -- Polígono de la sección
  meta_data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
CREATE INDEX IF NOT EXISTS secciones_geom_idx ON public.secciones_electorales USING GIST (geom);
ALTER TABLE public.secciones_electorales ENABLE ROW LEVEL SECURITY;

-- 3. BITACORAS (The Active Logging Table)
-- We skip the old 'events' table as 'bitacoras' is the modern replacement.
CREATE TABLE IF NOT EXISTS public.bitacoras (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    -- New Categories directly here
    tipo text NOT NULL CHECK (tipo IN ('reunion_vecinal', 'evento_publico', 'recorrido', 'otro')),
    descripcion text,
    aforo integer,
    fecha timestamp with time zone DEFAULT timezone('utc'::text, now()),
    compromisos text,
    comentarios text,
    lat double precision,
    lng double precision,
    seccion_id integer REFERENCES public.secciones_electorales(id),
    fotos text[],
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.bitacoras ENABLE ROW LEVEL SECURITY;

-- 4. LEADERS (Gestores)
CREATE TABLE IF NOT EXISTS public.leaders (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  telefono text,
  email text,
  seccion_id integer references public.secciones_electorales(id),
  lat float not null,
  lng float not null,
  activo boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
ALTER TABLE public.leaders ENABLE ROW LEVEL SECURITY;

-- 5. UPDATING CONSTRAINTS (If table already existed with old types)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bitacoras_tipo_check') THEN
        ALTER TABLE public.bitacoras DROP CONSTRAINT bitacoras_tipo_check;
    END IF;

    -- Re-add with desired types
    ALTER TABLE public.bitacoras
    ADD CONSTRAINT bitacoras_tipo_check
    CHECK (tipo IN ('reunion_vecinal', 'evento_publico', 'recorrido', 'otro'))
    NOT VALID;
END $$;

-- 6. POLICIES (Simplified for Restoration)

-- Secciones Policy: Allow read to authenticated for now (refine later if needed)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.secciones_electorales;
CREATE POLICY "Enable read access for all users" ON public.secciones_electorales FOR SELECT USING (auth.role() = 'authenticated');

-- Bitacoras Policies
DROP POLICY IF EXISTS "Users can insert their own logs" ON public.bitacoras;
CREATE POLICY "Users can insert their own logs" ON public.bitacoras FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view all logs" ON public.bitacoras;
CREATE POLICY "Users can view all logs" ON public.bitacoras FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own logs" ON public.bitacoras;
CREATE POLICY "Users can update their own logs" ON public.bitacoras FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own logs" ON public.bitacoras;
CREATE POLICY "Users can delete their own logs" ON public.bitacoras FOR DELETE USING (auth.uid() = user_id);

COMMIT;
