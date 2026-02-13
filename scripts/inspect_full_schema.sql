-- FULL SCHEMA INSPECTION SCRIPT
-- Run this in Supabase SQL Editor to see ALL tables and columns in your project.

SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
ORDER BY 
    table_name, 
    ordinal_position;
