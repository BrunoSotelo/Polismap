-- 1. Create Storage Bucket for INEs
insert into storage.buckets (id, name, public)
values ('ines', 'ines', true)
on conflict (id) do nothing;

-- 2. Storage Policies (RLS)

-- Allow public read access (or restricted to authenticated if preferred, but public is easier for <img> tags)
create policy "Public Read INEs"
on storage.objects for select
using ( bucket_id = 'ines' );

-- Allow authenticated users to upload files
create policy "Auth Upload INEs"
on storage.objects for insert
with check (
  bucket_id = 'ines' 
  and auth.role() = 'authenticated'
);

-- Allow users to update/delete their own files (Optional)
create policy "Owner Update INEs"
on storage.objects for update
using ( bucket_id = 'ines' and auth.uid() = owner );

-- 3. Update 'affinities' table to store image path
alter table public.affinities 
add column if not exists image_path text;

-- 4. Ensure 'user_id' is being tracked (it should already be there, but good to double check)
-- This column links the record to the user who uploaded it.
-- alter table public.affinities 
-- add column if not exists user_id uuid references auth.users(id);
