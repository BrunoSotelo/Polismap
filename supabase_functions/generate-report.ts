
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.28.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        // CRITICAL SECURITY FIX: Use ANON key, not Service Role.
        // This ensures RLS policies are applied based on the user's token.
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
        const openAiKey = Deno.env.get('OPENAI_API_KEY') ?? '';

        // Get the Authorization header from the request (The User's JWT)
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error("Missing Authorization header");
        }

        // Create client with the User's context
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        });

        // Verify the user is real
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user) {
            throw new Error("Usuario no autenticado o token inválido");
        }

        const openai = new OpenAI({ apiKey: openAiKey });

        // 1. Parse Input
        const { startDate, endDate } = await req.json();

        if (!startDate || !endDate) {
            throw new Error("Fechas requeridas");
        }

        // 2. Fetch Prompt from DB (Dynamic Control)
        console.log("2. Buscando Prompt personalizado en DB (app_config)...");
        let systemPrompt = "Eres un analista experto de datos de territorio. Genera un resumen ejecutivo en JSON.";

        try {
            const { data: configData, error: configError } = await supabaseClient
                .from('app_config')
                .select('value')
                .eq('key', 'ai_report_prompt')
                .maybeSingle();

            if (configError) {
                console.warn("Advertencia: No se pudo leer app_config (usando default):", configError.message);
            } else if (configData?.value) {
                systemPrompt = configData.value;
            }
        } catch (err) {
            console.warn("Excepción leyendo app_config (usando default):", err);
        }

        // 3. Fetch Data (Raw Bitacoras)
        // RLS IS NOW ACTIVE: This query will only return rows where user_id = user.id (or whatever policy is defined)
        console.log(`3. Consultando bitacoras (${startDate} a ${endDate}) para usuario ${user.id}...`);
        const { data: rawBitacoras, error: dbError } = await supabaseClient
            .from('bitacoras')
            .select('id, tipo, descripcion, aforo, created_at, seccion_id')
            .gte('created_at', `${startDate}T00:00:00`)
            .lte('created_at', `${endDate}T23:59:59`);

        if (dbError) throw dbError;

        // 4. Pre-Calculate Metrics (TypeScript Math is safer than AI Math)
        const totalActivities = rawBitacoras.length;
        const totalAforo = rawBitacoras.reduce((sum, b: any) => sum + (b.aforo || 0), 0);

        // Count by Type
        const byType: Record<string, number> = {};
        rawBitacoras.forEach((b: any) => {
            byType[b.tipo] = (byType[b.tipo] || 0) + 1;
        });

        const metricsSummary = {
            periodo: `${startDate} al ${endDate}`,
            total_actividades: totalActivities,
            personas_impactadas_aforo: totalAforo,
            desglose_tipo: byType,
            muestras_descripcion: rawBitacoras.slice(0, 50).map((b: any) => b.descripcion).filter(Boolean)
        };

        // 5. Call OpenAI Chat Completions (Standard API)
        console.log("5. Llamando a OpenAI (GPT-4o Mini + DB System Prompt)...");

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Analiza estos datos y genera el reporte JSON: ${JSON.stringify(metricsSummary)}` }
            ],
            response_format: { type: "json_object" }
        });

        const contentStr = completion.choices[0].message.content;
        console.log("Respuesta raw:", contentStr);

        let content;
        try {
            content = JSON.parse(contentStr || '{}');
        } catch (e) {
            console.error("Error parseando JSON:", e);
            content = { resumen_ejecutivo: contentStr, temas_recurrentes: ["Error de formato"] };
        }

        return new Response(JSON.stringify(content), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error("Error General:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: corsHeaders }
        );
    }
});
