# Security Fix Instructions

I have automatically applied the following changes to this repository:
1.  **`public/_headers`**: Added strict security headers for Cloudflare Pages.
2.  **`supabase_schema.sql`**: Updated `bitacoras` table definition and RLS policies.

## 🚨 IMMEDIATE ACTION REQUIRED 🚨

The files in this repo are now correct, but your **LIVE DATABASE** needs to be updated manually.

### 1. Update Supabase Database
Run this exact SQL in your Supabase SQL Editor:

```sql
-- 1. Add column to bitacoras (formerly events)
ALTER TABLE bitacoras ADD COLUMN IF NOT EXISTS seccion_id integer references secciones_electorales(id);

-- 2. Drop old policy if it exists
DROP POLICY IF EXISTS "Operativo ve y crea bitacoras" ON bitacoras;
DROP POLICY IF EXISTS "Operativo ve y crea eventos" ON bitacoras; 

-- 3. Create new secure policy
CREATE POLICY "Operativo ve y crea bitacoras"
  ON bitacoras FOR ALL
  TO authenticated
  USING (
    seccion_id IN (
      SELECT id FROM secciones_electorales WHERE distrito = get_user_distrito()
    )
  );
```

### 2. Deploy to Cloudflare
Commit and push the changes in this folder:
- `git add .`
- `git commit -m "security: fix RLS for bitacoras and add headers"`
- `git push`

Cloudflare will automatically deploy the site with the new security headers.
