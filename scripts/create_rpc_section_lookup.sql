-- Function to find section by lat/lng
-- Requires PostGIS
CREATE OR REPLACE FUNCTION get_section_by_point(lat double precision, lng double precision)
RETURNS TABLE (seccion_id int, distrito_id int) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as seccion_id,
        s.distrito_id
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

NOTIFY pgrst, 'reload schema';
