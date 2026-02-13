import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Check, Loader2, Trash2, Edit2, Calendar, Users, FileText } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Reuse Leaflet fix locally if needed, or better, reuse form logic
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Reuse MapPicker for edit mode
const MapPicker = ({ onLocationSelect, initialPos }: { onLocationSelect: (lat: number, lng: number) => void, initialPos?: [number, number] }) => {
    const [position, setPosition] = useState<[number, number] | null>(initialPos || null);
    const MapEvents = () => {
        useMapEvents({
            click(e) {
                setPosition([e.latlng.lat, e.latlng.lng]);
                onLocationSelect(e.latlng.lat, e.latlng.lng);
            },
        });
        return null;
    };
    const center = initialPos || [20.5888, -100.3899];
    return (
        <MapContainer center={center as any} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {position && <Marker position={position} />}
            <MapEvents />
        </MapContainer>
    );
};

interface BitacoraDetailModalProps {
    bitacoraId: string;
    onClose: () => void;
    onUpdate: () => void; // Refresh parent list
}

export function BitacoraDetailModal({ bitacoraId, onClose, onUpdate }: BitacoraDetailModalProps) {
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Combined State for Form
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        fetchDetails();
    }, [bitacoraId]);

    const fetchDetails = async () => {
        setLoading(true);
        const { data: record, error: _error } = await supabase
            .from('bitacoras')
            .select('*')
            .eq('id', bitacoraId)
            .single();

        if (record) setData(record);
        setLoading(false);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Recalculate section if lat/lng changed (optional, keeping it simple for now)
            // Just update fields
            const { error } = await (supabase as any)
                .from('bitacoras')
                .update({
                    tipo: data.tipo,
                    descripcion: data.descripcion,
                    aforo: data.aforo,
                    fecha: data.fecha,
                    compromisos: data.compromisos,
                    comentarios: data.comentarios,
                    lat: data.lat,
                    lng: data.lng
                } as any)
                .eq('id', bitacoraId);

            if (error) throw error;
            setIsEditing(false);
            onUpdate();
        } catch (e) {
            console.error(e);
            alert("Error al guardar cambios");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('¿Estás seguro de eliminar este registro?')) return;
        const { error } = await supabase.from('bitacoras').delete().eq('id', bitacoraId);
        if (!error) {
            onUpdate();
            onClose();
        }
    };

    if (loading) return (
        <div className="fixed inset-0 z-[2100] bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white p-6 rounded-xl animate-pulse">Cargando detalles...</div>
        </div>
    );

    if (!data) return null;

    return (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className={`p-6 border-b border-gray-100 flex justify-between items-center ${isEditing ? 'bg-orange-50' : 'bg-gray-50'}`}>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            {isEditing ? 'Editando Bitácora' : 'Detalle de Actividad'}
                            {!isEditing && (
                                <span className={`text-xs px-2 py-1 rounded-full uppercase tracking-wide ${data.tipo === 'incidencia' ? 'bg-red-100 text-red-700' :
                                    data.tipo === 'reunion_vecinal' ? 'bg-green-100 text-green-700' :
                                        data.tipo === 'evento_publico' ? 'bg-purple-100 text-purple-700' :
                                            data.tipo === 'recorrido' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                    }`}>
                                    {data.tipo === 'reunion_vecinal' ? 'Reunión Vecinal' :
                                        data.tipo === 'evento_publico' ? 'Evento Público' :
                                            data.tipo === 'recorrido' ? 'Recorrido' :
                                                data.tipo === 'otro' ? 'Otro' : data.tipo}
                                </span>
                            )}
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">ID: {bitacoraId.slice(0, 8)}...</p>
                    </div>

                    <div className="flex gap-2">
                        {!isEditing && (
                            <>
                                <button onClick={() => setIsEditing(true)} className="p-2 hover:bg-white rounded-full text-gray-500 hover:text-blue-600 transition-colors" title="Editar">
                                    <Edit2 size={18} />
                                </button>
                                <button onClick={handleDelete} className="p-2 hover:bg-white rounded-full text-gray-500 hover:text-red-600 transition-colors" title="Eliminar">
                                    <Trash2 size={18} />
                                </button>
                            </>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">

                    {/* --- READ MODE --- */}
                    {!isEditing && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1 mb-1"><Calendar size={12} /> Fecha</span>
                                    <div className="font-medium text-gray-800">
                                        {new Date(data.fecha || data.created_at).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                    </div>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1 mb-1"><Users size={12} /> Aforo</span>
                                    <div className="font-medium text-gray-800">
                                        {data.aforo ? `${data.aforo} asistentes` : 'No registrado'}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1"><FileText size={14} /> Descripción</h3>
                                <p className="text-gray-600 leading-relaxed bg-white p-4 border border-gray-100 rounded-lg shadow-sm">
                                    {data.descripcion}
                                </p>
                            </div>

                            {(data.compromisos || data.comentarios) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {data.compromisos && (
                                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                            <h4 className="text-xs font-bold text-blue-700 uppercase mb-2">Compromisos</h4>
                                            <p className="text-sm text-blue-900">{data.compromisos}</p>
                                        </div>
                                    )}
                                    {data.comentarios && (
                                        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                                            <h4 className="text-xs font-bold text-yellow-700 uppercase mb-2">Notas Internas</h4>
                                            <p className="text-sm text-yellow-900">{data.comentarios}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {data.lat && data.lng && (
                                <div className="h-48 rounded-lg overflow-hidden border border-gray-200 relative group">
                                    <MapContainer
                                        center={[data.lat, data.lng]}
                                        zoom={14}
                                        style={{ height: '100%', width: '100%' }}
                                        zoomControl={false}
                                        dragging={false}
                                    >
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        <Marker position={[data.lat, data.lng]} />
                                    </MapContainer>
                                    <div className="absolute bottom-2 right-2 bg-white/90 px-2 py-1 text-xs rounded shadow font-mono text-gray-600 pointer-events-none">
                                        {data.lat.toFixed(5)}, {data.lng.toFixed(5)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- EDIT MODE --- */}
                    {isEditing && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">Tipo</label>
                                    <select
                                        value={data.tipo}
                                        onChange={e => setData({ ...data, tipo: e.target.value })}
                                        className="w-full p-2 border rounded-md"
                                    >
                                        <option value="reunion_vecinal">Reunión Vecinal</option>
                                        <option value="evento_publico">Evento Público</option>
                                        <option value="recorrido">Recorrido</option>
                                        <option value="otro">Otro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">Fecha</label>
                                    <input
                                        type="date"
                                        value={data.fecha ? data.fecha.split('T')[0] : ''}
                                        onChange={e => setData({ ...data, fecha: e.target.value })}
                                        className="w-full p-2 border rounded-md"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">Descripción</label>
                                <textarea
                                    value={data.descripcion}
                                    onChange={e => setData({ ...data, descripcion: e.target.value })}
                                    className="w-full p-3 border rounded-md h-24 resize-none focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">Aforo</label>
                                    <input
                                        type="number"
                                        value={data.aforo || ''}
                                        onChange={e => setData({ ...data, aforo: e.target.value })}
                                        className="w-full p-2 border rounded-md"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">Compromisos</label>
                                <input
                                    type="text"
                                    value={data.compromisos || ''}
                                    onChange={e => setData({ ...data, compromisos: e.target.value })}
                                    className="w-full p-2 border rounded-md"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">Ubicación</label>
                                <div className="h-48 border rounded-md overflow-hidden">
                                    <MapPicker
                                        initialPos={data.lat ? [data.lat, data.lng] : undefined}
                                        onLocationSelect={(lat, lng) => setData({ ...data, lat, lng })}
                                    />
                                </div>
                                <p className="text-xs text-center text-gray-400 mt-1">Haz clic en el mapa para mover el punto</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer (Actions) */}
                {isEditing && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 transition-all">
                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-600 font-medium">Cancelar</button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-6 py-2 bg-zinc-900 text-white rounded-lg flex items-center gap-2 hover:bg-zinc-800 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            Guardar Cambios
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
