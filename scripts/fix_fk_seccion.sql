-- Drop the Foreign Key constraint on seccion_id
-- This allows saving records with sections that don't (yet) exist in the secciones_electorales table
ALTER TABLE public.affinities 
DROP CONSTRAINT IF EXISTS affinities_seccion_id_fkey;

NOTIFY pgrst, 'reload schema';
