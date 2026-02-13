-- UPDATE BITACORA CATEGORIES
-- User requested: Reunion vecinal, Evento público, Recorrido, Otro.
-- Internal keys: 'reunion_vecinal', 'evento_publico', 'recorrido', 'otro'.

DO $$
DECLARE
    -- Optional: If we knew the constraint name, we could drop it specifically.
    -- Usually 'bitacoras_tipo_check'
BEGIN
    -- 1. DROP old constraint if exists
    -- We try the standard default name
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bitacoras_tipo_check'
    ) THEN
        ALTER TABLE public.bitacoras DROP CONSTRAINT bitacoras_tipo_check;
    END IF;

    -- 2. ADD NEW CONSTRAINT
    -- We include old values temporarily OR just the new ones if we don't care about old rows validation just yet (NOT VALID).
    -- User wants: Reunion vecinal, Evento público, Recorrido, Otro.
    -- We'll add the constraint as NOT VALID to avoid locking/erroring on existing rows,
    -- allowing the frontend to move forward immediately.
    
    ALTER TABLE public.bitacoras 
    ADD CONSTRAINT bitacoras_tipo_check 
    CHECK (tipo IN ('reunion_vecinal', 'evento_publico', 'recorrido', 'otro')) 
    NOT VALID;

    -- Note: To validate later, we would need to update all existing 'visita', 'llamada', etc rows to new types.
END $$;
