-- Create Lideres Table
create table public.lideres (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  email text,
  direccion text,
  lat double precision,
  lng double precision,
  seccion_id integer references public.secciones_electorales(id),
  user_id uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.lideres enable row level security;

-- Policies
-- 1. Read: Public/Anon can read (for Map markers)
create policy "Public Read Lideres" 
on public.lideres for select 
using (true);

-- 2. Insert: Authenticated users can insert
create policy "Auth Insert Lideres" 
on public.lideres for insert 
with check (auth.role() = 'authenticated');

-- 3. Update/Delete: Only owner (optional, or simplified to authenticated for now)
create policy "Auth Update Lideres" 
on public.lideres for update
using (auth.uid() = user_id);

-- Optional: Create a spatial index if we had PostGIS point type, 
-- but lat/lng columns are fine for simple markers.
