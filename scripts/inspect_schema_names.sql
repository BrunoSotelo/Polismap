-- INSPECT SCHEMA SCRIPT
-- Run this to understand the ACTUAL standing schema structure.

SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name IN ('eventos', 'lideres', 'mapas', 'Perfiles', 'secciones_electorales', 'bitacoras')
ORDER BY 
    table_name, 
    ordinal_position;
