// Supabase Edge Function: calendar-sync
// Sincroniza eventos de Google Calendar y genera bitácoras sugeridas
// Extrae eventos de los últimos 7 días, los clasifica con OpenAI,
// y solo guarda los profesionales/ambiguos. Los personales se descartan en memoria.
//
// POST /calendar-sync → Ejecuta sincronización para el usuario autenticado

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

// ─── Helpers de cifrado (mismo que google-auth) ───────────────────────────────
async function decryptToken(encryptedText: string, key: string): Promise<string> {
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const combined = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0))
    const iv = combined.slice(0, 12)
    const encrypted = combined.slice(12)
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(key.padEnd(32, '0').slice(0, 32)),
        { name: 'AES-GCM' },
        false,
        ['decrypt']
    )
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, keyMaterial, encrypted)
    return decoder.decode(decrypted)
}

async function encryptToken(text: string, key: string): Promise<string> {
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(key.padEnd(32, '0').slice(0, 32)),
        { name: 'AES-GCM' },
        false,
        ['encrypt']
    )
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, keyMaterial, encoder.encode(text))
    const combined = new Uint8Array(iv.byteLength + encrypted.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(encrypted), iv.byteLength)
    return btoa(String.fromCharCode(...combined))
}

// ─── Refrescar access token si expiró ────────────────────────────────────────
async function refreshAccessToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
): Promise<{ access_token: string; expires_in: number }> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'refresh_token',
        }),
    })
    const data = await response.json()
    if (data.error) throw new Error(`Error refrescando token: ${data.error}`)
    return data
}

// ─── Obtener token válido (refresca si necesario) ─────────────────────────────
async function getValidAccessToken(
    supabase: any,
    userId: string,
    encryptionKey: string,
    clientId: string,
    clientSecret: string
): Promise<string> {
    const { data: tokenRow, error } = await supabase
        .from('google_tokens')
        .select('*')
        .eq('user_id', userId)
        .single()

    if (error || !tokenRow) throw new Error('No hay token de Google Calendar para este usuario')

    const expiresAt = new Date(tokenRow.expires_at).getTime()
    const now = Date.now()
    const bufferMs = 5 * 60 * 1000 // 5 minutos de buffer

    let accessToken: string

    if (now + bufferMs >= expiresAt) {
        // Token expirado o por expirar → refrescar
        const refreshToken = await decryptToken(tokenRow.refresh_token_encrypted, encryptionKey)
        const newTokens = await refreshAccessToken(refreshToken, clientId, clientSecret)
        accessToken = newTokens.access_token

        // Actualizar en BD
        const newAccessEncrypted = await encryptToken(accessToken, encryptionKey)
        const newExpiresAt = new Date(now + newTokens.expires_in * 1000).toISOString()
        await supabase
            .from('google_tokens')
            .update({ access_token_encrypted: newAccessEncrypted, expires_at: newExpiresAt })
            .eq('user_id', userId)
    } else {
        accessToken = await decryptToken(tokenRow.access_token_encrypted, encryptionKey)
    }

    return accessToken
}

// Más preciso que Nominatim para México. Usa secreto GOOGLE_MAPS_API_KEY en Supabase.
async function geocodeLocation(locationText: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
    if (!locationText.trim() || !apiKey) return null
    try {
        // Truco: Forzar contexto de Querétaro si no es explícito
        let addressToSearch = locationText;
        if (!addressToSearch.toLowerCase().includes('querétaro')) {
            addressToSearch += ', Querétaro, México';
        }

        const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
        url.searchParams.set('address', addressToSearch)
        url.searchParams.set('key', apiKey)
        url.searchParams.set('region', 'mx')
        // Sesgar hacia Querétaro (bounds)
        url.searchParams.set('bounds', '20.2,-101.0|21.0,-99.5')

        const response = await fetch(url.toString())
        const data = await response.json()

        if (data.status !== 'OK' || !data.results?.length) {
            // Si falló con el sufijo, intentar limpiar y buscar solo el inicio
            if (locationText !== addressToSearch) {
                const simple = locationText.split(',')[0] + ', Querétaro';
                console.log(`[geocode] Reintentando simplificado: "${simple}"`);
                return geocodeLocation(simple, apiKey); // Recurso simple sin loop infinito (ojo con recursión, aquí safe pq ya tiene 'Querétaro')
            }
            console.log(`[geocode] Google sin resultados para: "${addressToSearch}" (status: ${data.status})`)
            return null
        }
        const loc = data.results[0].geometry.location
        console.log(`[geocode] "${locationText}" → ${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`)
        return { lat: loc.lat, lng: loc.lng }
    } catch (e) {
        console.error('[geocode] Error:', e)
        return null
    }
}

// ─── Llamar al clasificador interno ──────────────────────────────────────────
async function classifyEvent(
    supabaseUrl: string,
    serviceRoleKey: string,
    event: { title: string; description?: string; location?: string; attendees?: string[] }
): Promise<{ category: string; suggested_type: string; confidence: number; reasoning: string }> {
    const response = await fetch(`${supabaseUrl}/functions/v1/classify-event`, {
        method: 'POST',
        headers: {
            // Llamada server-to-server: usar service role key, no el JWT del usuario
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
    })
    if (!response.ok) {
        console.error('classify-event error:', response.status, await response.text())
        return { category: 'ambiguo', suggested_type: 'otro', confidence: 0, reasoning: 'Error al clasificar' }
    }
    return response.json()
}

Deno.serve(async (req: Request) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    }

    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
        const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
        const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY')!
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY') || ''

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // Autenticación
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(
            authHeader.replace('Bearer ', '')
        )
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Token inválido' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Obtener token de acceso válido
        let accessToken: string
        try {
            accessToken = await getValidAccessToken(supabase, user.id, ENCRYPTION_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
        } catch (e: any) {
            return new Response(JSON.stringify({ error: e.message }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Rango de fechas: hoy − 14 días hasta hoy + 1 día
        const now = new Date()
        const timeMin = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
        const timeMax = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()

        console.log('calendar-sync user:', user.id, 'range:', timeMin, 'to', timeMax)

        // Obtener token de Google Calendar del usuario
        const { data: tokenRow } = await supabase
            .from('google_tokens')
            .select('calendar_id')
            .eq('user_id', user.id)
            .single()

        const calendarId = tokenRow?.calendar_id || 'primary'

        // Llamar a Google Calendar API
        const calendarUrl = new URL(`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`)
        calendarUrl.searchParams.set('timeMin', timeMin)
        calendarUrl.searchParams.set('timeMax', timeMax)
        calendarUrl.searchParams.set('singleEvents', 'true')
        calendarUrl.searchParams.set('orderBy', 'startTime')
        calendarUrl.searchParams.set('maxResults', '50')

        const calendarResponse = await fetch(calendarUrl.toString(), {
            headers: { 'Authorization': `Bearer ${accessToken}` },
        })

        if (!calendarResponse.ok) {
            const errText = await calendarResponse.text()
            console.error('Error Google Calendar API:', errText)
            return new Response(JSON.stringify({ error: 'Error al obtener eventos de Google Calendar' }), {
                status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const calendarData = await calendarResponse.json()
        const events = calendarData.items || []

        // Obtener IDs de eventos ya procesados para este usuario
        const { data: existingIds } = await supabase
            .from('bitacoras_sugeridas')
            .select('google_event_id')
            .eq('user_id', user.id)

        const processedIds = new Set((existingIds || []).map((r: any) => r.google_event_id))

        // Procesar eventos nuevos
        const stats = { procesados: 0, profesionales: 0, personales: 0, ambiguos: 0, omitidos: 0 }
        const insertQueue: any[] = []

        for (const event of events) {
            // Saltar eventos sin fecha, cancelados o ya procesados
            if (!event.start || event.status === 'cancelled') { stats.omitidos++; continue }
            if (processedIds.has(event.id)) { stats.omitidos++; continue }

            stats.procesados++

            // Extraer datos del evento
            const title = event.summary || 'Sin título'
            const description = event.description || ''
            const location = event.location || ''
            const attendees = (event.attendees || [])
                .filter((a: any) => !a.self) // Excluir al propio diputado
                .map((a: any) => a.displayName || a.email)
            const fechaInicio = event.start.dateTime || event.start.date
            const fechaFin = event.end?.dateTime || event.end?.date

            // ⚠️ CLASIFICAR — eventos personales NUNCA llegan a la BD
            const classification = await classifyEvent(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
                title, description, location, attendees,
            })

            // REGLA DE PRIVACIDAD: si es personal, descartar completamente
            if (classification.category === 'personal') {
                stats.personales++
                continue // No se guarda nada, ni log
            }

            if (classification.category === 'profesional') stats.profesionales++
            else stats.ambiguos++

            // ─── Geocodificar la ubicación con Google Geocoding API ──────────────────────
            let lat: number | null = null
            let lng: number | null = null
            if (location) {
                const coords = await geocodeLocation(location, GOOGLE_MAPS_API_KEY)
                if (coords) {
                    lat = coords.lat
                    lng = coords.lng
                } else {
                    console.log(`[geocode] Sin resultados para: "${location}"`)
                }
            }

            // Preparar para inserción
            insertQueue.push({
                user_id: user.id,
                google_event_id: event.id,
                titulo: title,
                descripcion: description || null,
                ubicacion: location || null,
                lat: lat,
                lng: lng,
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin || null,
                invitados: attendees.length > 0 ? attendees : [],
                aforo_estimado: attendees.length,
                tipo_sugerido: classification.suggested_type,
                confidence_score: classification.confidence,
                clasificacion_razon: classification.reasoning,
                estado: 'pendiente',
            })
        }

        // Insertar en lote (solo profesionales y ambiguos)
        if (insertQueue.length > 0) {
            const { error: insertError } = await supabase
                .from('bitacoras_sugeridas')
                .insert(insertQueue)

            if (insertError) {
                console.error('Error insertando sugerencias:', insertError)
                return new Response(JSON.stringify({ error: 'Error guardando sugerencias' }), {
                    status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }
        }

        return new Response(JSON.stringify({
            success: true,
            stats: {
                eventos_encontrados: events.length,
                eventos_procesados: stats.procesados,
                sugerencias_creadas: insertQueue.length,
                descartados_personales: stats.personales, // Solo el conteo, nunca el contenido
                omitidos_duplicados: stats.omitidos,
            },
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (err) {
        console.error('Error en calendar-sync:', err)
        return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        })
    }
})
