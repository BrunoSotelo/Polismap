-- Fix for Lideres Table
-- Adds the missing 'activo' column as required by the application types and seed data

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lideres' AND column_name = 'activo') THEN
        ALTER TABLE public.lideres ADD COLUMN activo BOOLEAN DEFAULT true;
    END IF;
END $$;
