-- Migration: Add detailed INE fields to affinities table
ALTER TABLE affinities
ADD COLUMN IF NOT EXISTS apellido_paterno text,
ADD COLUMN IF NOT EXISTS apellido_materno text,
ADD COLUMN IF NOT EXISTS calle text,
ADD COLUMN IF NOT EXISTS numero_exterior text,
ADD COLUMN IF NOT EXISTS numero_interior text,
ADD COLUMN IF NOT EXISTS colonia text,
ADD COLUMN IF NOT EXISTS cp text,
ADD COLUMN IF NOT EXISTS municipio text,
ADD COLUMN IF NOT EXISTS estado text,
ADD COLUMN IF NOT EXISTS clave_elector text,
ADD COLUMN IF NOT EXISTS vigencia text,
ADD COLUMN IF NOT EXISTS genero text,
ADD COLUMN IF NOT EXISTS telefono text,
ADD COLUMN IF NOT EXISTS ine_url text;

-- Add comments for clarity
COMMENT ON COLUMN affinities.apellido_paterno IS 'Apellido Paterno del INE';
COMMENT ON COLUMN affinities.apellido_materno IS 'Apellido Materno del INE';
COMMENT ON COLUMN affinities.calle IS 'Calle del domicilio';
COMMENT ON COLUMN affinities.numero_exterior IS 'Número exterior';
COMMENT ON COLUMN affinities.numero_interior IS 'Número interior (opcional)';
COMMENT ON COLUMN affinities.colonia IS 'Colonia';
COMMENT ON COLUMN affinities.cp IS 'Código Postal';
COMMENT ON COLUMN affinities.clave_elector IS 'Clave de Elector única';
COMMENT ON COLUMN affinities.vigencia IS 'Año de vigencia del INE';
COMMENT ON COLUMN affinities.genero IS 'H o M';
COMMENT ON COLUMN affinities.ine_url IS 'URL de la imagen del INE en Storage';
