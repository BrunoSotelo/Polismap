import React, { useState, useEffect, useCallback } from 'react';
import {
    RefreshCw, Calendar, Loader2, CheckCircle2, Clock, XCircle,
    Sparkles, Filter, X, Save
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { GoogleCalendarConnect } from '../components/Calendar/GoogleCalendarConnect';
import { SuggestedBitacoraCard, type BitacoraSugerida } from '../components/Calendar/SuggestedBitacoraCard';

type EstadoFiltro = 'pendiente' | 'aprobada' | 'rechazada' | 'todas';
type TipoSugerido = 'reunion_vecinal' | 'evento_publico' | 'recorrido' | 'otro';

// ─── Modal de Edición ─────────────────────────────────────────────────────────
interface EditModalProps {
    sugerencia: BitacoraSugerida;
    onClose: () => void;
    onSave: (id: string, extra: { compromisos: string; comentarios: string; tipo: TipoSugerido; aforo: number }) => void;
    isSaving: boolean;
}

const TIPO_OPTIONS = [
    { value: 'reunion_vecinal', label: 'Reunión Vecinal' },
    { value: 'evento_publico', label: 'Evento Público' },
    { value: 'recorrido', label: 'Recorrido Territorial' },
    { value: 'otro', label: 'Otro' },
];

const EditModal: React.FC<EditModalProps> = ({ sugerencia, onClose, onSave, isSaving }) => {
    const [compromisos, setCompromisos] = useState('');
    const [comentarios, setComentarios] = useState('');
    const [tipo, setTipo] = useState<TipoSugerido>(sugerencia.tipo_sugerido || 'otro');
    const [aforo, setAforo] = useState(sugerencia.aforo_estimado);

    const fechaStr = new Date(sugerencia.fecha_inicio).toLocaleDateString('es-MX', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    });

    return (
        <div className="fixed inset-0 z-1000 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div>
                        <h2 className="font-semibold text-slate-800">Editar Bitácora Sugerida</h2>
                        <p className="text-xs text-slate-400 mt-0.5">{fechaStr}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                        <X size={18} className="text-slate-500" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Datos pre-llenados (solo lectura) */}
                    <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Datos del evento</p>
                        <p className="text-sm font-semibold text-slate-800">{sugerencia.titulo}</p>
                        {sugerencia.ubicacion && (
                            <p className="text-xs text-slate-500">📍 {sugerencia.ubicacion}</p>
                        )}
                        {sugerencia.descripcion && (
                            <p className="text-xs text-slate-400 line-clamp-3">{sugerencia.descripcion}</p>
                        )}
                    </div>

                    {/* Tipo de bitácora */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Tipo de actividad</label>
                        <select
                            value={tipo}
                            onChange={e => setTipo(e.target.value as TipoSugerido)}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            {TIPO_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Aforo */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Aforo / Asistentes estimados</label>
                        <input
                            type="number"
                            min={0}
                            value={aforo}
                            onChange={e => setAforo(parseInt(e.target.value) || 0)}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Compromisos */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">
                            Compromisos adquiridos
                            <span className="text-slate-400 font-normal ml-1">(opcional)</span>
                        </label>
                        <textarea
                            value={compromisos}
                            onChange={e => setCompromisos(e.target.value)}
                            placeholder="Describe los compromisos adquiridos durante la actividad..."
                            rows={3}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>

                    {/* Comentarios */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">
                            Comentarios adicionales
                            <span className="text-slate-400 font-normal ml-1">(opcional)</span>
                        </label>
                        <textarea
                            value={comentarios}
                            onChange={e => setComentarios(e.target.value)}
                            placeholder="Observaciones, notas adicionales..."
                            rows={2}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-5 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="flex-1 py-2.5 px-4 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onSave(sugerencia.id, { compromisos, comentarios, tipo, aforo })}
                        disabled={isSaving}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Aprobar y Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Página Principal ─────────────────────────────────────────────────────────
const ESTADO_TABS: { value: EstadoFiltro; label: string; icon: React.ReactNode }[] = [
    { value: 'pendiente', label: 'Pendientes', icon: <Clock size={13} /> },
    { value: 'aprobada', label: 'Aprobadas', icon: <CheckCircle2 size={13} /> },
    { value: 'rechazada', label: 'Rechazadas', icon: <XCircle size={13} /> },
    { value: 'todas', label: 'Todas', icon: <Filter size={13} /> },
];

const SuggestedBitacoras: React.FC = () => {
    const { session, user } = useAuth();
    const [sugerencias, setSugerencias] = useState<BitacoraSugerida[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [editTarget, setEditTarget] = useState<BitacoraSugerida | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [filtroEstado, setFiltroEstado] = useState<EstadoFiltro>('pendiente');
    const [calendarConnected, setCalendarConnected] = useState(false);
    const [syncResult, setSyncResult] = useState<{ created: number; personal: number } | null>(null);

    const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
    const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    const fetchSugerencias = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let query = (supabase as any)
                .from('bitacoras_sugeridas')
                .select('*')
                .eq('user_id', user.id)
                .order('fecha_inicio', { ascending: false });

            if (filtroEstado !== 'todas') {
                query = query.eq('estado', filtroEstado);
            }

            const { data, error } = await query;
            if (error) throw error;
            setSugerencias((data as BitacoraSugerida[]) || []);
        } catch (err) {
            console.error('Error cargando sugerencias:', err);
        } finally {
            setLoading(false);
        }
    }, [user, filtroEstado]);

    useEffect(() => { fetchSugerencias(); }, [fetchSugerencias]);

    const handleSync = async () => {
        if (!session?.access_token || !calendarConnected) return;
        setSyncing(true);
        setSyncResult(null);
        try {
            const res = await fetch(`${FUNCTIONS_URL}/calendar-sync`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    apikey: ANON_KEY,
                },
            });
            const data = await res.json();
            if (data.success) {
                setSyncResult({
                    created: data.stats.sugerencias_creadas,
                    personal: data.stats.descartados_personales,
                });
                await fetchSugerencias();
            }
        } catch (err) {
            console.error('Error sincronizando:', err);
        } finally {
            setSyncing(false);
        }
    };

    const handleApprove = async (id: string) => {
        const sugerencia = sugerencias.find(s => s.id === id);
        if (!sugerencia || !user) return;
        setActionLoading(id);
        try {
            // Resolver sección electoral con PostGIS (RPC server-side, más preciso)
            let seccion_id = null;
            if (sugerencia.lat && sugerencia.lng) {
                try {
                    const { data: secData, error: secError } = await (supabase as any)
                        .rpc('get_section_by_point', { lat: sugerencia.lat, lng: sugerencia.lng });
                    if (secError) console.error('Error RPC sección:', secError);
                    else seccion_id = secData || null;
                    console.log('[section] RPC resultado:', seccion_id, 'para', sugerencia.lat, sugerencia.lng);
                } catch (e) { console.error('Error detectando sección:', e); }
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: bitacora, error: bitacoraError } = await (supabase as any)
                .from('bitacoras')
                .insert({
                    user_id: user.id,
                    titulo: sugerencia.titulo,
                    tipo: sugerencia.tipo_sugerido || 'otro',
                    descripcion: sugerencia.descripcion,
                    ubicacion: sugerencia.ubicacion || null,
                    lat: sugerencia.lat || null,
                    lng: sugerencia.lng || null,
                    seccion_id: seccion_id,
                    aforo: sugerencia.aforo_estimado,
                    fecha: sugerencia.fecha_inicio,
                })
                .select('id')
                .single();

            if (bitacoraError) throw bitacoraError;

            // Marcar sugerencia como aprobada y enlazar
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
                .from('bitacoras_sugeridas')
                .update({ estado: 'aprobada', bitacora_id: bitacora.id })
                .eq('id', id);

            await fetchSugerencias();
        } catch (err) {
            console.error('Error aprobando:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (id: string) => {
        setActionLoading(id);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
                .from('bitacoras_sugeridas')
                .update({ estado: 'rechazada' })
                .eq('id', id);
            await fetchSugerencias();
        } catch (err) {
            console.error('Error rechazando:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleSaveEdit = async (
        id: string,
        extra: { compromisos: string; comentarios: string; tipo: TipoSugerido; aforo: number }
    ) => {
        const sugerencia = sugerencias.find(s => s.id === id);
        if (!sugerencia || !user) return;
        setIsSaving(true);
        try {
            // Resolver sección electoral con PostGIS (RPC server-side, más preciso)
            let seccion_id = null;
            if (sugerencia.lat && sugerencia.lng) {
                try {
                    const { data: secData, error: secError } = await (supabase as any)
                        .rpc('get_section_by_point', { lat: sugerencia.lat, lng: sugerencia.lng });
                    if (secError) console.error('Error RPC sección:', secError);
                    else seccion_id = secData || null;
                    console.log('[section] RPC resultado:', seccion_id, 'para', sugerencia.lat, sugerencia.lng);
                } catch (e) { console.error('Error detectando sección:', e); }
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: bitacora, error: bitacoraError } = await (supabase as any)
                .from('bitacoras')
                .insert({
                    user_id: user.id,
                    titulo: sugerencia.titulo,
                    tipo: extra.tipo,
                    descripcion: sugerencia.descripcion,
                    ubicacion: sugerencia.ubicacion || null,
                    lat: sugerencia.lat || null,
                    lng: sugerencia.lng || null,
                    seccion_id: seccion_id,
                    aforo: extra.aforo,
                    fecha: sugerencia.fecha_inicio,
                    compromisos: extra.compromisos || null,
                    comentarios: extra.comentarios || null,
                })
                .select('id')
                .single();

            if (bitacoraError) throw bitacoraError;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
                .from('bitacoras_sugeridas')
                .update({ estado: 'aprobada', bitacora_id: bitacora.id })
                .eq('id', id);

            setEditTarget(null);
            await fetchSugerencias();
        } catch (err) {
            console.error('Error guardando edición:', err);
        } finally {
            setIsSaving(false);
        }
    };

    // Conteos por estado
    const pendienteCount = sugerencias.filter(s => s.estado === 'pendiente').length;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Sparkles size={20} className="text-blue-500" />
                        Bitácoras Sugeridas
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Actividades detectadas en tu Google Calendar pendientes de aprobación
                    </p>
                </div>
                <button
                    onClick={handleSync}
                    disabled={syncing || !calendarConnected}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    title={!calendarConnected ? 'Conecta tu Google Calendar primero' : 'Sincronizar ahora'}
                >
                    <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'Sincronizando...' : 'Sincronizar'}
                </button>
            </div>

            {/* Google Calendar Connect Widget */}
            <div className="mb-5">
                <GoogleCalendarConnect onConnectionChange={setCalendarConnected} />
            </div>

            {/* Resultado de sincronización */}
            {syncResult && (
                <div className="flex items-center gap-3 p-3 mb-5 bg-blue-50 border border-blue-200 rounded-xl text-sm">
                    <CheckCircle2 size={16} className="text-blue-600 shrink-0" />
                    <span className="text-blue-800">
                        Sincronización completada: <strong>{syncResult.created} sugerencias nuevas</strong>
                        {syncResult.personal > 0 && (
                            <span className="text-blue-500"> · {syncResult.personal} eventos personales descartados</span>
                        )}
                    </span>
                    <button onClick={() => setSyncResult(null)} className="ml-auto text-blue-400 hover:text-blue-600">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Tabs de filtro */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-5">
                {ESTADO_TABS.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setFiltroEstado(tab.value)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-lg transition-all ${filtroEstado === tab.value
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.value === 'pendiente' && pendienteCount > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full leading-none">
                                {pendienteCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Contenido */}
            {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-400">
                    <Loader2 size={24} className="animate-spin mr-2" />
                    <span>Cargando sugerencias...</span>
                </div>
            ) : sugerencias.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                        <Calendar size={24} className="text-slate-400" />
                    </div>
                    <p className="font-medium text-slate-600 mb-1">
                        {filtroEstado === 'pendiente'
                            ? 'No hay bitácoras pendientes'
                            : `No hay bitácoras ${filtroEstado === 'todas' ? '' : filtroEstado + 's'}`}
                    </p>
                    <p className="text-sm text-slate-400">
                        {calendarConnected
                            ? 'Sincroniza tu calendario para generar sugerencias'
                            : 'Conecta tu Google Calendar para comenzar'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sugerencias.map(s => (
                        <SuggestedBitacoraCard
                            key={s.id}
                            sugerencia={s}
                            onApprove={handleApprove}
                            onEdit={setEditTarget}
                            onReject={handleReject}
                            isLoading={actionLoading === s.id}
                        />
                    ))}
                </div>
            )}

            {/* Modal de edición */}
            {editTarget && (
                <EditModal
                    sugerencia={editTarget}
                    onClose={() => setEditTarget(null)}
                    onSave={handleSaveEdit}
                    isSaving={isSaving}
                />
            )}
        </div>
    );
};

export default SuggestedBitacoras;
