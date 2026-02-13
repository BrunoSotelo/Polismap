
-- Migration: Add 'distrito_id' column to main tables to enable RLS filtering.

-- 1. Bitacoras
ALTER TABLE public.bitacoras ADD COLUMN IF NOT EXISTS distrito_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_bitacoras_distrito ON public.bitacoras(distrito_id);

-- 2. Colonias 
-- (Note: Colonias from GeoJSON usually imply district by geometry, but explicitly storing it allows faster RLS)
ALTER TABLE public.colonias ADD COLUMN IF NOT EXISTS distrito_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_colonias_distrito ON public.colonias(distrito_id);

-- 3. Affinities (Assuming table exists as 'affinities')
ALTER TABLE public.affinities ADD COLUMN IF NOT EXISTS distrito_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_affinities_distrito ON public.affinities(distrito_id);

-- 4. Lideres
ALTER TABLE public.lideres ADD COLUMN IF NOT EXISTS distrito_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_lideres_distrito ON public.lideres(distrito_id);

-- 5. Optional: Default value for existing rows?
-- If we knew the district, we could update it. 
-- For now, existing rows will have NULL distrito_id, meaning they won't be visible to "Manager" users (who only see specific districts), 
-- but will remain visible to Admin (who sees everything). This is a safe fallback.
