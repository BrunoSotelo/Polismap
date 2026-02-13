-- REPAIR SCRIPT: Synchonize distrito_id
-- This script fills in missing 'distrito_id' values using the reliable 'seccion_id'.

BEGIN;

-- 1. Update Affinities
UPDATE public.affinities a
SET distrito_id = s.distrito
FROM public.secciones_electorales s
WHERE a.seccion_id = s.id
  AND (a.distrito_id IS NULL OR a.distrito_id != s.distrito);

-- 2. Update Lideres
UPDATE public.lideres l
SET distrito_id = s.distrito
FROM public.secciones_electorales s
WHERE l.seccion_id = s.id
  AND (l.distrito_id IS NULL OR l.distrito_id != s.distrito);

-- 3. Update Bitacoras
UPDATE public.bitacoras b
SET distrito_id = s.distrito
FROM public.secciones_electorales s
WHERE b.seccion_id = s.id
  AND (b.distrito_id IS NULL OR b.distrito_id != s.distrito);

COMMIT;

-- Verify results
SELECT 'affinities' as table_name, count(*) as updated_rows FROM affinities WHERE distrito_id IS NOT NULL;
