-- FINAL BITACORA UPDATE SCRIPT
-- Based on confirmed schema: 'bitacoras' table EXISTS.
-- Goal: Allow 'reunion_vecinal', 'evento_publico', 'recorrido', 'otro'.

BEGIN;

-- 1. Drop the old check constraint if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bitacoras_tipo_check') THEN
        ALTER TABLE public.bitacoras DROP CONSTRAINT bitacoras_tipo_check;
    END IF;
END $$;

-- 2. Add the NEW constraint
-- We use NOT VALID to avoid locking or errors with existing data (e.g. 'visita')
ALTER TABLE public.bitacoras 
ADD CONSTRAINT bitacoras_tipo_check 
CHECK (tipo IN ('reunion_vecinal', 'evento_publico', 'recorrido', 'otro', 'visita', 'llamada', 'evento', 'incidencia')) 
NOT VALID;

-- Note: I included the OLD types ('visita', etc) in the list above temporarily 
-- so you don't break historic data validity if you ever validate.
-- The Frontend will only send the NEW types from now on.

COMMIT;
