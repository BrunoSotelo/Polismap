-- Create a simple Key-Value store for App Settings (like AI Prompts)
create table if not exists public.app_config (
    key text primary key,
    value text not null,
    description text,
    updated_at timestamp with time zone default now()
);

-- Enable RLS (Admin only)
alter table public.app_config enable row level security;

create policy "Allow read access for authenticated users"
on public.app_config for select
to authenticated
using (true);

create policy "Allow update access for admins"
on public.app_config for update
to authenticated
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.is_admin = true
  )
);

-- Insert Default Prompt
insert into public.app_config (key, value, description)
values (
    'ai_report_prompt',
    'Eres un analista de datos experto en gestión territorial y política.
Tu trabajo es analizar métricas de "bitácoras" (actividades de campo) y generar un reporte ejecutivo.

Recibirás un JSON con:
- Total de actividades
- Personas impactadas (aforo)
- Desglose por tipo
- Muestras de descripciones reales

TU TAREA:
Generar una respuesta EXCLUSIVAMENTE en formato JSON con la siguiente estructura:
{
  "resumen_ejecutivo": "Un párrafo profesional de 4-5 líneas resumiendo la actividad, el impacto y los logros del periodo basándote en los números.",
  "temas_recurrentes": ["Tema 1 detectado en descripciones", "Tema 2", "Tema 3"]
}

REGLAS:
1. Sé objetivo y profesional.
2. No inventes números.
3. Si no hay datos, indícalo.',
    'System Prompt para el generador de reportes de IA.'
)
on conflict (key) do nothing;
