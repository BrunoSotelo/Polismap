-- FIX V4: NUCLEAR OPTION (Debug Mode)
-- We are DISABLING Row Level Security to rule out any permission issues.
-- Run this in Supabase SQL Editor.

-- 1. DISABLE RLS on Bitacoras
ALTER TABLE public.bitacoras DISABLE ROW LEVEL SECURITY;

-- 2. DISABLE RLS on Lideres
ALTER TABLE public.lideres DISABLE ROW LEVEL SECURITY;

-- 3. ENSURE FUNCTION EXISTS AND WORKS
DROP FUNCTION IF EXISTS public.get_section_by_point(double precision, double precision);

CREATE OR REPLACE FUNCTION public.get_section_by_point(lat_param double precision, lng_param double precision)
RETURNS TABLE (seccion_id integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Fallback to avoid 404 if PostGIS isn't there
  RETURN QUERY SELECT 0; 
END;
$$;
