import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { findSection, fetchAllSections } from '../../lib/geoUtils';
import { ClipboardList, X, Check, Loader2, MapPin } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../context/AuthContext';
import { useDistrict } from '../../context/DistrictContext';

// Fix for default Leaflet icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LogFormProps {
    onClose: () => void;
    onSuccess: () => void;
    className?: string;
}

// Subcomponent for picking location (Same as LeaderForm)
const MapPicker = ({ onLocationSelect, initialPos }: { onLocationSelect: (lat: number, lng: number) => void, initialPos?: [number, number] }) => {
    const [position, setPosition] = useState<[number, number] | null>(initialPos || null);

    const MapEvents = () => {
        useMapEvents({
            click(e: L.LeafletMouseEvent) {
                setPosition([e.latlng.lat, e.latlng.lng]);
                onLocationSelect(e.latlng.lat, e.latlng.lng);
            },
        });
        return null;
    };

    const center = initialPos || [20.5888, -100.3899] as [number, number];

    return (
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {position && <Marker position={position} />}
            <MapEvents />
        </MapContainer>
    );
};

export function LogForm({ onClose, onSuccess, className = '' }: LogFormProps) {
    const { user } = useAuth();
    const { selectedDistrict } = useDistrict();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);

    const [formData, setFormData] = useState({
        tipo: 'reunion_vecinal' as 'reunion_vecinal' | 'evento_publico' | 'recorrido' | 'otro',
        descripcion: '',
        aforo: '',
        fecha: new Date().toISOString().split('T')[0],
        compromisos: '',
        comentarios: '',
        lat: 0,
        lng: 0
    });

    const [showMap, setShowMap] = useState(false);

    const handleSave = async () => {
        setIsSubmitting(true);
        setError(null);

        try {
            if (!user) throw new Error("No hay sesión de usuario activa.");
            if (!selectedDistrict) throw new Error("No hay distrito seleccionado.");

            let seccion_id = null;
            if (formData.lat && formData.lng) {
                try {
                    const sections = await fetchAllSections(supabase);
                    const foundId = findSection(formData.lat, formData.lng, sections);
                    if (foundId) {
                        seccion_id = foundId;
                    }
                } catch (e) {
                    console.error("Error detecting section:", e);
                }
            }

            const { error: insertErr } = await supabase
                .from('bitacoras')
                .insert({
                    user_id: user.id, // Actual User ID
                    distrito_id: selectedDistrict, // Actual Selected District
                    tipo: formData.tipo,
                    descripcion: formData.descripcion,
                    aforo: formData.aforo ? parseInt(formData.aforo) : null,
                    fecha: formData.fecha ? new Date(formData.fecha).toISOString() : null,
                    compromisos: formData.compromisos,
                    comentarios: formData.comentarios,
                    lat: formData.lat || null,
                    lng: formData.lng || null,
                    seccion_id: seccion_id || null,
                    fotos: []
                } as any);

            if (insertErr) throw insertErr;

            if (insertErr) throw insertErr;

            setShowSuccess(true);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 2000);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error al guardar bitácora.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col relative ${className}`}>
            {/* Success Overlay */}
            {showSuccess && (
                <div className="absolute inset-0 z-50 bg-white/90 flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="bg-green-100 text-green-700 p-4 rounded-full mb-4">
                        <Check className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-green-800">¡Bitácora guardada con éxito!</h3>
                    <p className="text-green-600">Cerrando ventana...</p>
                </div>
            )}
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-purple-50">
                <h2 className="text-xl font-bold text-purple-800 flex items-center gap-2">
                    <ClipboardList className="w-6 h-6" />
                    Nueva Bitácora
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-purple-100 rounded-full transition-colors text-purple-400 hover:text-purple-600">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">

                <div className="grid grid-cols-1 gap-4">

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Tipo de Interacción</label>
                        <select
                            value={formData.tipo}
                            onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                        >
                            <option value="reunion_vecinal">Reunión Vecinal</option>
                            <option value="evento_publico">Evento Público</option>
                            <option value="recorrido">Recorrido</option>
                            <option value="otro">Otro</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Fecha</label>
                        <input
                            type="date"
                            value={formData.fecha}
                            onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Aforo (Opcional)</label>
                        <input
                            type="number"
                            value={formData.aforo}
                            onChange={e => setFormData({ ...formData, aforo: e.target.value })}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="Número de personas"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Descripción</label>
                        <textarea
                            value={formData.descripcion}
                            onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none h-24 resize-none"
                            placeholder="Detalles de la interacción..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Compromisos</label>
                        <textarea
                            value={formData.compromisos}
                            onChange={e => setFormData({ ...formData, compromisos: e.target.value })}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none h-20 resize-none"
                            placeholder="Compromisos adquiridos..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Comentarios Adicionales</label>
                        <textarea
                            value={formData.comentarios}
                            onChange={e => setFormData({ ...formData, comentarios: e.target.value })}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none h-20 resize-none"
                            placeholder="Observaciones..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex justify-between">
                            Ubicación (Opcional)
                            <button
                                onClick={() => setShowMap(!showMap)}
                                className="text-purple-600 text-xs hover:underline flex items-center gap-1"
                            >
                                <MapPin size={12} /> {showMap ? 'Ocultar Mapa' : 'Seleccionar en Mapa'}
                            </button>
                        </label>

                        {/* Logic: If no map, maybe show a hint. If map, show picker */}
                        {!showMap && formData.lat === 0 && (
                            <div
                                onClick={() => setShowMap(true)}
                                className="border border-dashed border-gray-300 rounded-lg p-4 text-center text-sm text-gray-500 cursor-pointer hover:bg-gray-50"
                            >
                                Haz clic aquí para agregar ubicación
                            </div>
                        )}

                        {showMap && (
                            <div className="h-64 rounded-lg overflow-hidden border border-gray-200">
                                <MapPicker
                                    onLocationSelect={(lat, lng) => setFormData({ ...formData, lat, lng })}
                                    initialPos={formData.lat ? [formData.lat, formData.lng] : undefined}
                                />
                            </div>
                        )}

                        {formData.lat !== 0 && (
                            <div className="text-xs text-green-600 flex items-center gap-1">
                                <MapPin size={12} /> Ubicación seleccionada: {formData.lat.toFixed(5)}, {formData.lng.toFixed(5)}
                            </div>
                        )}
                    </div>

                    {/* Photo Upload Placeholder */}
                    {/* 
                   <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Camera size={16}/> Evidencia (Fotos)
                        </label>
                        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-xs text-gray-400 text-center">
                            Funcionalidad de fotos próximamente
                        </div>
                   </div> 
                   */}

                </div>

                {error && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleSave}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2 disabled:opacity-50"
                >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Guardar
                </button>
            </div>
        </div>
    );
}
