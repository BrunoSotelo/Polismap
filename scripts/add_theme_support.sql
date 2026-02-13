-- Add theme_id support

-- 1. Add column to underlying table
ALTER TABLE public."Perfiles" ADD COLUMN IF NOT EXISTS theme_id text DEFAULT 'neutral_authority';

-- 2. Update the View to include theme_id
DROP VIEW IF EXISTS public.profiles;

CREATE OR REPLACE VIEW public.profiles AS
SELECT 
    id,
    nombre_completo as email,
    (rol = 'admin') as is_admin,
    rol as role_name,
    theme_id,
    created_at
FROM public."Perfiles";

-- 3. Permissions
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, UPDATE ON public."Perfiles" TO authenticated;

-- 4. Notify
NOTIFY pgrst, 'reload schema';
