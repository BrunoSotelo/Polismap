-- Enable RLS on the table (good practice, though likely already enabled)
alter table "secciones_electorales" enable row level security;

-- Create a policy that allows anyone (anon key) to SELECT (read) all rows
create policy "Public Read Access" 
on "secciones_electorales" 
for select 
using (true);

-- Optional: Verify
-- select count(*) from secciones_electorales;
