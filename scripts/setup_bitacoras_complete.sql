-- Complete Setup for Bitacoras Table
-- This script creates the table if it doesn't exist AND adds new fields
-- Run this in Supabase SQL Editor

-- 1. Create table if not exists (Basic Structure)
CREATE TABLE IF NOT EXISTS public.bitacoras (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  tipo text not null check (tipo in ('visita', 'llamada', 'evento', 'incidencia', 'otro')),
  descripcion text,
  lat double precision,
  lng double precision,
  seccion_id int references secciones_electorales(id),
  fotos text[], 
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Add New Columns (Idempotent)
DO $$
BEGIN
    -- Add 'aforo' column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bitacoras' AND column_name = 'aforo') THEN
        ALTER TABLE public.bitacoras ADD COLUMN aforo INTEGER;
    END IF;

    -- Add 'fecha' column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bitacoras' AND column_name = 'fecha') THEN
        ALTER TABLE public.bitacoras ADD COLUMN fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;

    -- Add 'compromisos' column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bitacoras' AND column_name = 'compromisos') THEN
        ALTER TABLE public.bitacoras ADD COLUMN compromisos TEXT;
    END IF;

    -- Add 'comentarios' column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bitacoras' AND column_name = 'comentarios') THEN
        ALTER TABLE public.bitacoras ADD COLUMN comentarios TEXT;
    END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE public.bitacoras ENABLE ROW LEVEL SECURITY;

-- 4. Policies (Drop first to avoid errors if they exist, or use DO block)
-- Simpler approach: Drop if exists then create
DROP POLICY IF EXISTS "Users can insert their own logs" ON public.bitacoras;
CREATE POLICY "Users can insert their own logs" ON public.bitacoras FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view all logs" ON public.bitacoras;
CREATE POLICY "Users can view all logs" ON public.bitacoras FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own logs" ON public.bitacoras;
CREATE POLICY "Users can update their own logs" ON public.bitacoras FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own logs" ON public.bitacoras;
CREATE POLICY "Users can delete their own logs" ON public.bitacoras FOR DELETE USING (auth.uid() = user_id);
