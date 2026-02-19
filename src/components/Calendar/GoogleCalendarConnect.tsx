import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, supabaseAnonKey } from '../../lib/supabase';

interface ConnectionStatus {
    connected: boolean;
    connected_at: string | null;
    calendar_id: string | null;
    expires_at: string | null;
}

interface GoogleCalendarConnectProps {
    onConnectionChange?: (connected: boolean) => void;
}

export const GoogleCalendarConnect: React.FC<GoogleCalendarConnectProps> = ({ onConnectionChange }) => {
    const { session } = useAuth();
    const [status, setStatus] = useState<ConnectionStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Helper: invoca la Edge Function con auth explícita del contexto
    // Necesario porque supabase.functions.invoke() puede tener race condition
    // en la carga de sesión interna del cliente
    const invokeGoogleAuth = async (body: Record<string, unknown>) => {
        if (!session?.access_token) throw new Error('No hay sesión activa');
        return supabase.functions.invoke('google-auth', {
            body,
            headers: {
                Authorization: `Bearer ${session.access_token}`,
                apikey: supabaseAnonKey,
            },
        });
    };

    const fetchStatus = async () => {
        if (!session?.access_token) {
            setLoading(false);
            return;
        }
        try {
            const { data, error } = await invokeGoogleAuth({ action: 'status' });
            if (error) throw error;
            setStatus(data);
            onConnectionChange?.(data.connected);
        } catch (err) {
            console.error('Error verificando estado de Calendar:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session?.access_token) {
            fetchStatus();
        } else {
            setLoading(false);
        }
    }, [session?.access_token]);

    // Detectar callback OAuth en la URL
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        if (code && state && session?.access_token) {
            handleOAuthCallback(code);
        }
    }, [session?.access_token]);

    const handleOAuthCallback = async (code: string) => {
        setActionLoading(true);
        try {
            const redirectUri = `${window.location.origin}/suggested-bitacoras`;
            const { data, error } = await invokeGoogleAuth({ action: 'callback', code, redirectUri });
            if (error) throw error;
            if (data?.success) {
                window.history.replaceState({}, document.title, window.location.pathname);
                await fetchStatus();
            }
        } catch (err) {
            console.error('Error en callback OAuth:', err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleConnect = async () => {
        if (!session?.access_token) return;
        setActionLoading(true);
        try {
            const redirectUri = `${window.location.origin}/suggested-bitacoras`;
            const { data, error } = await invokeGoogleAuth({ action: 'authorize', redirectUri });
            if (error) throw error;
            if (data?.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            console.error('Error iniciando OAuth:', err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!session?.access_token) return;
        if (!window.confirm('¿Desconectar Google Calendar? Se eliminarán los tokens de acceso.')) return;
        setActionLoading(true);
        try {
            await invokeGoogleAuth({ action: 'revoke' });
            await fetchStatus();
        } catch (err) {
            console.error('Error desconectando:', err);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Loader2 size={14} className="animate-spin" />
                <span>Verificando conexión...</span>
            </div>
        );
    }

    if (status?.connected) {
        const connectedDate = status.connected_at
            ? new Date(status.connected_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
            : '';

        return (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                    <CheckCircle2 size={16} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-800">Google Calendar conectado</p>
                    {connectedDate && (
                        <p className="text-xs text-green-600">Desde {connectedDate}</p>
                    )}
                </div>
                <button
                    onClick={handleDisconnect}
                    disabled={actionLoading}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                    title="Desconectar"
                >
                    {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                    <span>Desconectar</span>
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={handleConnect}
            disabled={actionLoading}
            className="flex items-center gap-3 w-full p-3 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all group"
        >
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                {actionLoading
                    ? <Loader2 size={16} className="text-blue-600 animate-spin" />
                    : <Calendar size={16} className="text-blue-600" />
                }
            </div>
            <div className="flex-1 text-left">
                <p className="text-sm font-medium text-blue-800">Conectar Google Calendar</p>
                <p className="text-xs text-blue-500">Autoriza acceso de solo lectura</p>
            </div>
            <ExternalLink size={14} className="text-blue-400 group-hover:text-blue-600 transition-colors" />
        </button>
    );
};
