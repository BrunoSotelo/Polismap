-- ROBUST SCRIPT: Ensure Bitacoras Table Exists & Update Categories
-- Run this in Supabase SQL Editor.

BEGIN;

-- 1. Create Table if it does not exist
-- We define it with the NEW constraint directly to avoid issues.
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

-- 2. If the table ALREADY EXISTED, it might have the OLD constraint.
-- We need to check and update it if necessary.
DO $$
BEGIN
    -- Check if we need to update the constraint (i.e., if 'visita' is still allowed which means old constraint)
    -- Or simply try to drop the specific known old constraint name if we can guess it.
    
    -- Attempt to DROP the standard check constraint if it exists and doesn't match our new needs
    -- (It's safer to just drop and re-add if we want to be sure).
    
    -- Finding the constraint name typically generated for 'tipo'
    -- Usually 'bitacoras_tipo_check'.
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bitacoras_tipo_check'
    ) THEN
        ALTER TABLE public.bitacoras DROP CONSTRAINT bitacoras_tipo_check;
    END IF;

    -- Add the constraint again (or for the first time if we dropped it)
    -- We use NOT VALID to avoid failing on existing data (old types like 'visita')
    -- If the table was just created above, this is redundant but harmless (except for the duplicated name error if we don't check existence).
    
    -- Check if constraint exists now (it wouldn't if we dropped it, but it WOULD if we just created the table above with line 12)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bitacoras_tipo_check'
    ) THEN
        ALTER TABLE public.bitacoras 
        ADD CONSTRAINT bitacoras_tipo_check 
        CHECK (tipo IN ('reunion_vecinal', 'evento_publico', 'recorrido', 'otro')) 
        NOT VALID;
    END IF;
    
END $$;

-- 3. Ensure Columns Exist (Idempotent updates for potentially missing columns if table existed but was old)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bitacoras' AND column_name = 'aforo') THEN
        ALTER TABLE public.bitacoras ADD COLUMN aforo INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bitacoras' AND column_name = 'fecha') THEN
        ALTER TABLE public.bitacoras ADD COLUMN fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bitacoras' AND column_name = 'compromisos') THEN
        ALTER TABLE public.bitacoras ADD COLUMN compromisos TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bitacoras' AND column_name = 'comentarios') THEN
        ALTER TABLE public.bitacoras ADD COLUMN comentarios TEXT;
    END IF;
END $$;

-- 4. Enable RLS and Ensure Policies
ALTER TABLE public.bitacoras ENABLE ROW LEVEL SECURITY;

-- Re-apply helpful policies (idempotent-ish: drop then create)
DROP POLICY IF EXISTS "Users can insert their own logs" ON public.bitacoras;
CREATE POLICY "Users can insert their own logs" ON public.bitacoras FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view all logs" ON public.bitacoras;
CREATE POLICY "Users can view all logs" ON public.bitacoras FOR SELECT USING (true); -- Or limit by district if preferred later

DROP POLICY IF EXISTS "Users can update their own logs" ON public.bitacoras;
CREATE POLICY "Users can update their own logs" ON public.bitacoras FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own logs" ON public.bitacoras;
CREATE POLICY "Users can delete their own logs" ON public.bitacoras FOR DELETE USING (auth.uid() = user_id);

COMMIT;
