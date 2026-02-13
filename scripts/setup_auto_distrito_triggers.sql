-- AUTOMATION: Triggers to auto-fill distrito_id
-- This script ensures valid distrito_id on every insert/update.

-- 1. Create the Function
CREATE OR REPLACE FUNCTION public.populate_distrito_from_section()
RETURNS TRIGGER AS $$
BEGIN
    -- If seccion_id is present, look up the district
    IF NEW.seccion_id IS NOT NULL THEN
        SELECT distrito INTO NEW.distrito_id
        FROM public.secciones_electorales
        WHERE id = NEW.seccion_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Apply Trigger to 'affinities'
DROP TRIGGER IF EXISTS trg_affinities_distrito ON public.affinities;
CREATE TRIGGER trg_affinities_distrito
BEFORE INSERT OR UPDATE OF seccion_id ON public.affinities
FOR EACH ROW EXECUTE FUNCTION public.populate_distrito_from_section();

-- 3. Apply Trigger to 'lideres'
DROP TRIGGER IF EXISTS trg_lideres_distrito ON public.lideres;
CREATE TRIGGER trg_lideres_distrito
BEFORE INSERT OR UPDATE OF seccion_id ON public.lideres
FOR EACH ROW EXECUTE FUNCTION public.populate_distrito_from_section();

-- 4. Apply Trigger to 'bitacoras'
DROP TRIGGER IF EXISTS trg_bitacoras_distrito ON public.bitacoras;
CREATE TRIGGER trg_bitacoras_distrito
BEFORE INSERT OR UPDATE OF seccion_id ON public.bitacoras
FOR EACH ROW EXECUTE FUNCTION public.populate_distrito_from_section();
