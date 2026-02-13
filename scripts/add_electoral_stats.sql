-- 1. Add columns for Electoral Intelligence
ALTER TABLE secciones_electorales
ADD COLUMN IF NOT EXISTS votos_partido_anterior integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS meta_votos integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS ganador_anterior text, -- 'MORENA', 'PAN', etc.
ADD COLUMN IF NOT EXISTS competitividad integer DEFAULT 2; -- 1=Alta(Ganable), 2=Media, 3=Baja(Perdida)

-- 2. Add description/comments for clarity
COMMENT ON COLUMN secciones_electorales.votos_partido_anterior IS 'Votos obtenidos por nuestro partido en la elección anterior (2021)';
COMMENT ON COLUMN secciones_electorales.meta_votos IS 'Objetivo de votos para la próxima elección (2027)';
COMMENT ON COLUMN secciones_electorales.competitividad IS 'Nivel de prioridad: 1=Alta/Ganable, 2=Media/Reñida, 3=Baja/Perdida';

-- 3. (Optional) Create a helper to update stats by section ID
-- Usage: select update_section_stats(135, 150, 300, 'PAN', 1);
CREATE OR REPLACE FUNCTION update_section_stats(
    p_seccion_id integer,
    p_votos integer,
    p_meta integer,
    p_ganador text,
    p_competitividad integer
)
RETURNS void AS $$
BEGIN
    UPDATE secciones_electorales
    SET 
        votos_partido_anterior = p_votos,
        meta_votos = p_meta,
        ganador_anterior = p_ganador,
        competitividad = p_competitividad
    WHERE id = p_seccion_id;
END;
$$ LANGUAGE plpgsql;
