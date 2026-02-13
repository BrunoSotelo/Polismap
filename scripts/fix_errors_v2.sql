-- FIX: Enable RLS and add permissive policies for 'authenticated' users
-- Run this in Supabase SQL Editor

-- 1. FIX BITACORAS POLICIES
ALTER TABLE public.bitacoras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.bitacoras;
DROP POLICY IF EXISTS "Users can insert their own logs" ON public.bitacoras;
DROP POLICY IF EXISTS "Users can view all logs" ON public.bitacoras;

CREATE POLICY "Enable all access for authenticated users"
ON public.bitacoras
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 2. FIX LIDERES POLICIES
ALTER TABLE public.lideres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.lideres;
DROP POLICY IF EXISTS "Users can insert leaders" ON public.lideres;

CREATE POLICY "Enable all access for authenticated users"
ON public.lideres
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. FIX MISSING RPC FUNCTION (get_section_by_point)
-- This assumes you have PostGIS installed. If not, enable the extension:
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE OR REPLACE FUNCTION public.get_section_by_point(lat_param double precision, lng_param double precision)
RETURNS TABLE (seccion_id integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Attempt to find section containing point. 
  -- IF you don't have a geometry column 'geom' in secciones_electorales, this will fail.
  -- Assuming 'geom' exists and generic logic:
  RETURN QUERY
  SELECT id 
  FROM secciones_electorales 
  WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(lng_param, lat_param), 4326))
  LIMIT 1;
END;
$$;

-- Fallback if geometry column is named differently or doesn't exist, strictly for avoiding 404
-- (Comment out the above and use this if you don't have PostGIS set up yet)
/*
CREATE OR REPLACE FUNCTION public.get_section_by_point(lat_param double precision, lng_param double precision)
RETURNS TABLE (seccion_id integer)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY SELECT 0; -- Returns 0 as fallback
END;
$$;
*/
