-- Create Bitacoras (Logs/Touches) Table
create table public.bitacoras (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  tipo text not null check (tipo in ('visita', 'llamada', 'evento', 'incidencia', 'otro')),
  descripcion text,
  lat double precision,
  lng double precision,
  seccion_id int references secciones_electorales(id),
  fotos text[], -- Array of photo URLs
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.bitacoras enable row level security;

-- Policies
create policy "Users can insert their own logs"
  on public.bitacoras for insert
  with check (auth.uid() = user_id);

create policy "Users can view all logs"
  on public.bitacoras for select
  using (true);

create policy "Users can update their own logs"
  on public.bitacoras for update
  using (auth.uid() = user_id);

create policy "Users can delete their own logs"
  on public.bitacoras for delete
  using (auth.uid() = user_id);
