import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { findSection, fetchAllSections } from '../../lib/geoUtils';
import { UserPlus, X, Check, Loader2, MapPin } from 'lucide-react';
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

interface LeaderFormProps {
    onClose: () => void;
    onSuccess: () => void;
    className?: string;
}

// Subcomponent for picking location
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

    // Initialize with center on Querétaro if no pos
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

export function LeaderForm({ onClose, onSuccess, className = '' }: LeaderFormProps) {
    const { user } = useAuth();
    const { selectedDistrict } = useDistrict();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        nombre: '',
        telefono: '',
        email: '',
        direccion: '',
        seccion: '',
        lat: 0,
        lng: 0
    });

    const [showMap, setShowMap] = useState(false);

    const handleSave = async () => {
        if (!formData.nombre || !formData.seccion || !formData.telefono) {
            setError('Nombre, Teléfono y Sección son obligatorios.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            if (!user) throw new Error("No hay sesión de usuario activa.");
            if (!selectedDistrict) throw new Error("No hay distrito seleccionado.");

            // 1. Resolve Section ID (Auto-detect from Lat/Lng if available, else Manual/Fallback)
            let seccion_id = parseInt(formData.seccion); // Default to manual input

            // ... (inside handleSave)

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
            } else {
                // Fallback to address/manual logic if needed, but for now we trust the manual input or the map
                // If the user typed a section, we use it. If they pinned a map, we OVERWRITE it with the real one.
            }

            // 2. Insert into Lideres
            const { error: insertErr } = await supabase
                .from('lideres')
                .insert({
                    user_id: user.id, // Current User
                    distrito_id: selectedDistrict, // Current District
                    nombre: formData.nombre,
                    telefono: formData.telefono,
                    email: formData.email,
                    direccion: formData.direccion, // Check schemas if this column exists, otherwise may need to remove
                    seccion_id: seccion_id,
                    lat: formData.lat || null,
                    lng: formData.lng || null,
                    activo: true
                } as any); // Safe any cast for now as schema might vary slightly

            if (insertErr) throw insertErr;

            onSuccess();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error al guardar líder.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`bg - white rounded - xl shadow - 2xl w - full max - w - 2xl overflow - hidden flex flex - col ${className} `}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-orange-50">
                <h2 className="text-xl font-bold text-orange-800 flex items-center gap-2">
                    <UserPlus className="w-6 h-6" />
                    Registrar Líder
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-orange-100 rounded-full transition-colors text-orange-400 hover:text-orange-600">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2 md:col-span-1">
                        <label className="text-sm font-medium text-gray-700">Nombre Completo *</label>
                        <input
                            type="text"
                            value={formData.nombre}
                            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2 col-span-2 md:col-span-1">
                        <label className="text-sm font-medium text-gray-700">Sección *</label>
                        <input
                            type="number"
                            value={formData.seccion}
                            onChange={e => setFormData({ ...formData, seccion: e.target.value })}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            placeholder="Ej. 540"
                        />
                    </div>

                    <div className="space-y-2 col-span-2 md:col-span-1">
                        <label className="text-sm font-medium text-gray-700">Teléfono *</label>
                        <input
                            type="tel"
                            value={formData.telefono}
                            onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                    </div>

                    <div className="space-y-2 col-span-2 md:col-span-1">
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                    </div>

                    <div className="space-y-2 col-span-2">
                        <label className="text-sm font-medium text-gray-700 flex justify-between">
                            Dirección
                            <button
                                onClick={() => setShowMap(!showMap)}
                                className="text-orange-600 text-xs hover:underline flex items-center gap-1"
                            >
                                <MapPin size={12} /> {showMap ? 'Ocultar Mapa' : 'Ubicar en Mapa'}
                            </button>
                        </label>
                        <textarea
                            value={formData.direccion}
                            onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none h-20 resize-none"
                            placeholder="Calle, número, colonia..."
                        />
                    </div>

                    {showMap && (
                        <div className="col-span-2 h-64 rounded-lg overflow-hidden border border-gray-200">
                            <MapPicker
                                onLocationSelect={(lat, lng) => setFormData({ ...formData, lat, lng })}
                                initialPos={formData.lat ? [formData.lat, formData.lng] : undefined}
                            />
                        </div>
                    )}

                    {formData.lat !== 0 && (
                        <div className="col-span-2 text-xs text-green-600 flex items-center gap-1">
                            <MapPin size={12} /> Ubicación seleccionada: {formData.lat.toFixed(5)}, {formData.lng.toFixed(5)}
                        </div>
                    )}

                </div>

                {error && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}
            </div>

            {/* Footer - Polished & Visible */}
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-white shrink-0 relative z-50">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium hover:bg-gray-50 rounded-lg transition-colors"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleSave}
                    disabled={isSubmitting}
                    className="px-6 py-2 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                    style={{ backgroundColor: '#18181b' }} // Force Zinc-900 hex directly
                >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Guardar Líder
                </button>
            </div>
        </div>
    );
}
