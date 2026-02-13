-- FIX V3: Force Drop Function and Fix Permissions
-- Run this in Supabase SQL Editor

-- 1. FIX BITACORAS POLICIES
ALTER TABLE public.bitacoras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.bitacoras;
DROP POLICY IF EXISTS "Users can insert their own logs" ON public.bitacoras;
DROP POLICY IF EXISTS "Users can view all logs" ON public.bitacoras;

CREATE POLICY "Enable all access for authenticated users"
ON public.bitacoras FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- 2. FIX LIDERES POLICIES
ALTER TABLE public.lideres ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.lideres;
DROP POLICY IF EXISTS "Users can insert leaders" ON public.lideres;

CREATE POLICY "Enable all access for authenticated users"
ON public.lideres FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- 3. FIX FUNCTION RETURN TYPE ERROR
-- We must drop it explicitly to change return type
DROP FUNCTION IF EXISTS public.get_section_by_point(double precision, double precision);

CREATE OR REPLACE FUNCTION public.get_section_by_point(lat_param double precision, lng_param double precision)
RETURNS TABLE (seccion_id integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simple fallback if no PostGIS or logic needed yet
  -- (Replace this with actual PostGIS query if needed)
  RETURN QUERY SELECT 0; 
END;
$$;
