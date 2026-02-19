import React from 'react';
import {
    Calendar, MapPin, Users, CheckCircle2, XCircle, Edit2,
    Sparkles, AlertCircle
} from 'lucide-react';

type TipoSugerido = 'reunion_vecinal' | 'evento_publico' | 'recorrido' | 'otro';

export type BitacoraSugerida = {
    id: string;
    titulo: string;
    descripcion: string | null;
    ubicacion: string | null;
    lat: number | null;
    lng: number | null;
    fecha_inicio: string;
    fecha_fin: string | null;
    aforo_estimado: number;
    tipo_sugerido: TipoSugerido | null;
    confidence_score: number;
    clasificacion_razon: string | null;
    estado: 'pendiente' | 'aprobada' | 'rechazada';
};

interface SuggestedBitacoraCardProps {
    sugerencia: BitacoraSugerida;
    onApprove: (id: string) => void;
    onEdit: (sugerencia: BitacoraSugerida) => void;
    onReject: (id: string) => void;
    isLoading?: boolean;
}

const TIPO_LABELS: Record<string, string> = {
    reunion_vecinal: 'Reunión Vecinal',
    evento_publico: 'Evento Público',
    recorrido: 'Recorrido Territorial',
    otro: 'Otro',
};

const TIPO_COLORS: Record<string, string> = {
    reunion_vecinal: 'bg-blue-100 text-blue-700',
    evento_publico: 'bg-purple-100 text-purple-700',
    recorrido: 'bg-green-100 text-green-700',
    otro: 'bg-slate-100 text-slate-600',
};

function ConfidenceBadge({ score }: { score: number }) {
    const pct = Math.round(score * 100);
    const color =
        pct >= 80
            ? 'text-green-600 bg-green-50'
            : pct >= 50
                ? 'text-yellow-600 bg-yellow-50'
                : 'text-orange-600 bg-orange-50';
    const label = pct >= 80 ? 'Alta confianza' : pct >= 50 ? 'Confianza media' : 'Revisar';
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
            <Sparkles size={10} />
            {label} ({pct}%)
        </span>
    );
}

export const SuggestedBitacoraCard: React.FC<SuggestedBitacoraCardProps> = ({
    sugerencia,
    onApprove,
    onEdit,
    onReject,
    isLoading = false,
}) => {
    const fechaInicio = new Date(sugerencia.fecha_inicio);
    const fechaStr = fechaInicio.toLocaleDateString('es-MX', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
    const horaStr = sugerencia.fecha_inicio.includes('T')
        ? fechaInicio.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
        : 'Todo el día';

    const tipoKey = sugerencia.tipo_sugerido || 'otro';
    const tipoLabel = TIPO_LABELS[tipoKey] ?? 'Otro';
    const tipoColor = TIPO_COLORS[tipoKey] ?? 'bg-slate-100 text-slate-600';

    const isLowConfidence = sugerencia.confidence_score < 0.5;

    return (
        <div
            className={`card relative overflow-hidden transition-all hover:shadow-lg ${isLowConfidence ? 'border-l-4 border-l-orange-400' : 'border-l-4 border-l-blue-500'
                }`}
        >
            {/* Indicador de baja confianza */}
            {isLowConfidence && (
                <div className="flex items-center gap-1.5 mb-3 p-2 bg-orange-50 rounded-lg text-xs text-orange-700">
                    <AlertCircle size={12} />
                    <span>Clasificación incierta — revisa antes de aprobar</span>
                </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 text-sm leading-tight line-clamp-2">
                        {sugerencia.titulo}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tipoColor}`}>
                            {tipoLabel}
                        </span>
                        <ConfidenceBadge score={sugerencia.confidence_score} />
                    </div>
                </div>
            </div>

            {/* Metadata */}
            <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar size={12} className="text-slate-400 shrink-0" />
                    <span>
                        {fechaStr} · {horaStr}
                    </span>
                </div>
                {sugerencia.ubicacion && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{sugerencia.ubicacion}</span>
                    </div>
                )}
                {sugerencia.aforo_estimado > 0 && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Users size={12} className="text-slate-400 shrink-0" />
                        <span>
                            {sugerencia.aforo_estimado} invitado{sugerencia.aforo_estimado !== 1 ? 's' : ''}
                        </span>
                    </div>
                )}
                {sugerencia.descripcion && (
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1 pl-5">{sugerencia.descripcion}</p>
                )}
            </div>

            {/* Razón del clasificador */}
            {sugerencia.clasificacion_razon && (
                <div className="flex items-start gap-1.5 mb-3 text-xs text-slate-400 italic">
                    <Sparkles size={10} className="mt-0.5 shrink-0" />
                    <span>{sugerencia.clasificacion_razon}</span>
                </div>
            )}

            {/* Acciones */}
            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                    onClick={() => onApprove(sugerencia.id)}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-all disabled:opacity-50"
                >
                    <CheckCircle2 size={13} />
                    Aprobar
                </button>
                <button
                    onClick={() => onEdit(sugerencia)}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-all disabled:opacity-50"
                >
                    <Edit2 size={13} />
                    Editar
                </button>
                <button
                    onClick={() => onReject(sugerencia.id)}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-1 py-2 px-3 border border-slate-200 hover:bg-red-50 hover:border-red-200 text-slate-400 hover:text-red-500 text-xs rounded-lg transition-all disabled:opacity-50"
                    title="Rechazar sugerencia"
                >
                    <XCircle size={13} />
                </button>
            </div>
        </div>
    );
};
