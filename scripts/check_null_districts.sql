-- DIAGNOSTIC SCRIPT
-- Check if 'distrito_id' is populated in key tables.

SELECT 
    'affinities' as table_name,
    COUNT(*) as total_rows,
    COUNT(*) FILTER (WHERE distrito_id IS NULL) as null_distrito_rows
FROM affinities
UNION ALL
SELECT 
    'lideres' as table_name,
    COUNT(*) as total_rows,
    COUNT(*) FILTER (WHERE distrito_id IS NULL) as null_distrito_rows
FROM lideres
UNION ALL
SELECT 
    'bitacoras' as table_name,
    COUNT(*) as total_rows,
    COUNT(*) FILTER (WHERE distrito_id IS NULL) as null_distrito_rows
FROM bitacoras;

-- Check sample data distribution
SELECT 'affinities_sample' as type, distrito_id, count(*) FROM affinities GROUP BY distrito_id LIMIT 10;
