-- Migration to expand Bitacoras table with new fields
ALTER TABLE public.bitacoras
ADD COLUMN IF NOT EXISTS aforo INTEGER,
ADD COLUMN IF NOT EXISTS fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
ADD COLUMN IF NOT EXISTS compromisos TEXT,
ADD COLUMN IF NOT EXISTS comentarios TEXT;
