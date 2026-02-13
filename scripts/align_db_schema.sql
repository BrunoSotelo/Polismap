-- ALIGN DATABASE SCHEMA SCRIPT
-- This script bridges the gap between your existing tables (Perfiles, eventos) 
-- and the application code (profiles, bitacoras, secciones_electorales).

BEGIN;

-- 1. Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. CREATE `secciones_electorales`
-- The app depends on this for maps and assigning logs to territories.
CREATE TABLE IF NOT EXISTS public.secciones_electorales (
  id integer primary key, 
  distrito integer not null,
  municipio text,
  geom geometry(MultiPolygon, 4326),
  meta_data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
CREATE INDEX IF NOT EXISTS secciones_geom_idx ON public.secciones_electorales USING GIST (geom);
ALTER TABLE public.secciones_electorales ENABLE ROW LEVEL SECURITY;
-- Policy: Allow reading sections
DROP POLICY IF EXISTS "Enable read access for all users" ON public.secciones_electorales;
CREATE POLICY "Enable read access for all users" ON public.secciones_electorales FOR SELECT USING (auth.role() = 'authenticated');


-- 3. CREATE `bitacoras`
-- Your `eventos` table lacks critical fields (tipo, fotos, seccion_id). 
-- This creates the correct table for the new "Bitacora" forms.
CREATE TABLE IF NOT EXISTS public.bitacoras (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
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

-- Policies for bitacoras
DROP POLICY IF EXISTS "Users can insert their own logs" ON public.bitacoras;
CREATE POLICY "Users can insert their own logs" ON public.bitacoras FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view all logs" ON public.bitacoras;
CREATE POLICY "Users can view all logs" ON public.bitacoras FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own logs" ON public.bitacoras;
CREATE POLICY "Users can update their own logs" ON public.bitacoras FOR UPDATE USING (auth.uid() = user_id);


-- 4. FIX AUTH: Adapter for `Perfiles` -> `profiles`
-- The code expects a table `profiles` with `is_admin`. You have `Perfiles` with `rol`.
-- We create a VIEW to make them compatible without losing data.

-- First, ensure keys exist in Perfiles if needed? 
-- Actually, a View is safer.
CREATE OR REPLACE VIEW public.profiles AS
SELECT 
    id,
    nombre_completo as email, -- Fallback or just use what we have
    (rol = 'admin') as is_admin,
    rol as role_name
FROM public."Perfiles";
-- Note: You might need to grant permissions on the view/table to authenticated users
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public."Perfiles" TO authenticated;


-- 5. CREATE `user_districts`
-- New requirement for District Selector logic
CREATE TABLE IF NOT EXISTS public.user_districts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    distrito_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.user_districts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view their own districts" ON public.user_districts;
CREATE POLICY "Users view their own districts" ON public.user_districts 
FOR SELECT USING (auth.uid() = user_id);

COMMIT;
