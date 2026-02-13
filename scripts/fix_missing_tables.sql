
-- 1. Create BITACORAS table (Activity Logs)
CREATE TABLE IF NOT EXISTS public.bitacoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ownership
  user_id UUID REFERENCES auth.users(id),
  distrito_id INTEGER, -- Used for RLS filtering
  seccion_id TEXT,     -- Used for granular filtering
  
  -- Content
  titulo TEXT,
  descripcion TEXT,
  fecha_actividad DATE,
  
  -- Evidence
  evidencia_url TEXT, -- URL to storage
  ubicacion_geom GEOMETRY(Point, 4326)
);

-- 2. Create AFINIDADES table (Political Affinities)
CREATE TABLE IF NOT EXISTS public.afinidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ownership
  user_id UUID REFERENCES auth.users(id),
  distrito_id INTEGER,
  seccion_id TEXT,
  
  -- Person Data
  nombre_ciudadano TEXT,
  direccion TEXT,
  telefono TEXT,
  
  -- Political Data
  nivel_afinidad INTEGER CHECK (nivel_afinidad BETWEEN 1 AND 5), -- 1=Contra, 5=A favor
  notas TEXT,
  
  -- Geo
  ubicacion_geom GEOMETRY(Point, 4326)
);

-- 3. Create RESULTADOS_ELECTORALES (optional but good to have)
CREATE TABLE IF NOT EXISTS public.resultados_electorales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seccion_id TEXT,
  distrito_id INTEGER,
  partido TEXT,
  votos INTEGER,
  anio INTEGER
);


-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_bitacoras_distrito ON public.bitacoras(distrito_id);
CREATE INDEX IF NOT EXISTS idx_bitacoras_user ON public.bitacoras(user_id);
CREATE INDEX IF NOT EXISTS idx_afinidades_distrito ON public.afinidades(distrito_id);
CREATE INDEX IF NOT EXISTS idx_afinidades_user ON public.afinidades(user_id);

-- Enable RLS (Preparation for the Auth Script)
ALTER TABLE public.bitacoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.afinidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resultados_electorales ENABLE ROW LEVEL SECURITY;
