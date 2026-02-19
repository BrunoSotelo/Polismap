// Supabase Edge Function: google-auth
// Maneja el flujo OAuth 2.0 con Google Calendar
// Endpoints:
//   POST /google-auth/authorize  → Genera URL de consent screen
//   POST /google-auth/callback   → Intercambia code por tokens
//   POST /google-auth/revoke     → Revoca acceso y limpia tokens
//   GET  /google-auth/status     → Verifica si el usuario tiene calendar conectado

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

const SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

// Cifrado simple con AES-GCM usando Web Crypto API
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
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        keyMaterial,
        encoder.encode(text)
    )
    const combined = new Uint8Array(iv.byteLength + encrypted.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(encrypted), iv.byteLength)
    return btoa(String.fromCharCode(...combined))
}

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
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        keyMaterial,
        encrypted
    )
    return decoder.decode(decrypted)
}

Deno.serve(async (req: Request) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    }

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Configuración desde secrets de Supabase
        const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
        const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')
        const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY')
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        // Validar que secrets requeridos estén presentes
        if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !ENCRYPTION_KEY) {
            const missing = [
                !GOOGLE_CLIENT_ID && 'GOOGLE_CLIENT_ID',
                !GOOGLE_CLIENT_SECRET && 'GOOGLE_CLIENT_SECRET',
                !ENCRYPTION_KEY && 'ENCRYPTION_KEY',
            ].filter(Boolean).join(', ')
            console.error('Missing required secrets:', missing)
            return new Response(JSON.stringify({ error: `Secrets faltantes: ${missing}` }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Dominios permitidos para el redirect (validación de seguridad)
        const ALLOWED_REDIRECT_HOSTS = [
            'localhost:5173',
            'localhost:4173',
            'polismap.pages.dev',
        ]

        // Obtener usuario autenticado desde el JWT
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            console.error('Missing Authorization header')
            return new Response(JSON.stringify({ error: 'No autorizado' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Validar JWT: service role puede verificar tokens de usuarios
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        const { data: { user }, error: authError } = await supabase.auth.getUser(
            authHeader.replace('Bearer ', '')
        )

        if (authError || !user) {
            console.error('Auth error:', authError?.message)
            return new Response(JSON.stringify({ error: 'Token inválido' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Leer acción desde el body (supabase.functions.invoke usa POST con body JSON)
        const body = await req.json().catch(() => ({}))
        const action = body.action as string

        console.log('google-auth action:', action, 'user:', user.id)

        // ─── ENDPOINT: authorize ─────────────────────────────────────────────────
        if (action === 'authorize') {
            // redirectUri viene del frontend (se adapta automáticamente a localhost vs producción)
            const redirectUri = body.redirectUri as string
            if (!redirectUri) {
                return new Response(JSON.stringify({ error: 'redirectUri requerido' }), {
                    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }
            // Validar que el redirectUri sea de un dominio permitido
            const redirectHost = new URL(redirectUri).host
            if (!ALLOWED_REDIRECT_HOSTS.includes(redirectHost)) {
                console.error('Redirect URI no permitido:', redirectHost)
                return new Response(JSON.stringify({ error: 'Redirect URI no autorizado' }), {
                    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            const state = btoa(JSON.stringify({ userId: user.id, ts: Date.now() }))
            const authUrl = new URL(GOOGLE_AUTH_URL)
            authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
            authUrl.searchParams.set('redirect_uri', redirectUri)
            authUrl.searchParams.set('response_type', 'code')
            authUrl.searchParams.set('scope', SCOPES)
            authUrl.searchParams.set('access_type', 'offline')
            authUrl.searchParams.set('prompt', 'consent')
            authUrl.searchParams.set('state', state)

            return new Response(JSON.stringify({ url: authUrl.toString() }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // ─── ENDPOINT: callback ──────────────────────────────────────────────────
        if (action === 'callback') {
            const code = body.code as string
            const redirectUri = body.redirectUri as string

            if (!code || !redirectUri) {
                return new Response(JSON.stringify({ error: 'code y redirectUri son requeridos' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            // Intercambiar code por tokens
            const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    code,
                    client_id: GOOGLE_CLIENT_ID,
                    client_secret: GOOGLE_CLIENT_SECRET,
                    redirect_uri: redirectUri,
                    grant_type: 'authorization_code',
                }),
            })


            const tokens = await tokenResponse.json()

            if (tokens.error) {
                return new Response(JSON.stringify({ error: tokens.error_description || tokens.error }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            // Cifrar tokens antes de guardar
            const accessEncrypted = await encryptToken(tokens.access_token, ENCRYPTION_KEY)
            const refreshEncrypted = await encryptToken(tokens.refresh_token, ENCRYPTION_KEY)
            const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

            // Upsert en BD (actualiza si ya existe)
            const { error: dbError } = await supabase
                .from('google_tokens')
                .upsert({
                    user_id: user.id,
                    access_token_encrypted: accessEncrypted,
                    refresh_token_encrypted: refreshEncrypted,
                    expires_at: expiresAt,
                    calendar_id: 'primary',
                }, { onConflict: 'user_id' })

            if (dbError) {
                console.error('Error guardando tokens:', dbError)
                return new Response(JSON.stringify({ error: 'Error guardando tokens' }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            return new Response(JSON.stringify({ success: true, message: 'Google Calendar conectado' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // ─── ENDPOINT: revoke ────────────────────────────────────────────────────
        if (action === 'revoke') {
            const { data: tokenData } = await supabase
                .from('google_tokens')
                .select('access_token_encrypted')
                .eq('user_id', user.id)
                .single()

            if (tokenData) {
                try {
                    const accessToken = await decryptToken(tokenData.access_token_encrypted, ENCRYPTION_KEY)
                    // Revocar en Google
                    await fetch(`${GOOGLE_REVOKE_URL}?token=${accessToken}`, { method: 'POST' })
                } catch (e) {
                    console.warn('Error revocando token en Google:', e)
                }
            }

            // Eliminar de BD siempre
            await supabase.from('google_tokens').delete().eq('user_id', user.id)

            return new Response(JSON.stringify({ success: true, message: 'Acceso revocado' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // ─── ENDPOINT: status ────────────────────────────────────────────────────
        if (action === 'status') {
            const { data, error } = await supabase
                .from('google_tokens')
                .select('connected_at, calendar_id, expires_at')
                .eq('user_id', user.id)
                .single()

            const connected = !error && !!data
            return new Response(JSON.stringify({
                connected,
                connected_at: data?.connected_at ?? null,
                calendar_id: data?.calendar_id ?? null,
                expires_at: data?.expires_at ?? null,
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        return new Response(JSON.stringify({ error: 'Endpoint no encontrado' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (err) {
        console.error('Error en google-auth:', err)
        return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }
})
