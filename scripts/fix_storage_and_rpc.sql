-- 1. FIX RPC FUNCTION (Column Name Mismatch)
-- Drop old one to be safe
DROP FUNCTION IF EXISTS get_section_by_point(double precision, double precision);

-- Re-create with correct column 's.distrito'
CREATE OR REPLACE FUNCTION get_section_by_point(lat double precision, lng double precision)
RETURNS TABLE (seccion_id int, distrito_id int) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as seccion_id,
        s.distrito as distrito_id -- Corrected from s.distrito_id to s.distrito
    FROM 
        public.secciones_electorales s
    WHERE 
        ST_Contains(
            s.geom,
            ST_SetSRID(ST_Point(lng, lat), 4326)
        )
    LIMIT 1;
END;
$$;

-- 2. FIX STORAGE PERMISSIONS (RLS)
-- Ensure bucket exists and is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ines', 'ines', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing restrictive policies if any
DROP POLICY IF EXISTS "Allow public uploads to ines" ON storage.objects;
DROP POLICY IF EXISTS "Allow public select from ines" ON storage.objects;

-- Create permissive policies for uploads (inserts) and reads (selects)
CREATE POLICY "Allow public uploads to ines" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'ines');

CREATE POLICY "Allow public select from ines" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'ines');

NOTIFY pgrst, 'reload schema';
