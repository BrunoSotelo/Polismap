import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';
import type { FeatureCollection, Feature } from 'geojson';
import { supabase } from '../../lib/supabase';
import { Sun, Moon } from 'lucide-react';

// --- THEME STYLES ---
const getThemeStyles = (mode: 'light' | 'dark') => {
    if (mode === 'dark') {
        return `
            .leaflet-container { background: #0f172a !important; font-family: 'Inter', sans-serif; }
            .map-3d-wrapper { background: #020617; }
            .map-3d-container {
                width: 100%; height: 100%;
                /* 3D TRANSFORM DISABLED to prevent canvas 'height is 0' crash */
                /* transform: rotateX(5deg) scale(1.02); */
                /* transition: transform 0.5s ease; */
            }
            .theme-popup .leaflet-popup-content-wrapper {
                background: rgba(15, 23, 42, 0.9) !important;
                backdrop-filter: blur(12px);
                border: 1px solid rgba(56, 189, 248, 0.3);
                color: white;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                border-radius: 12px;
                padding: 0;
            }
            .theme-popup .leaflet-popup-tip { background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(56, 189, 248, 0.3); }
            .theme-popup .leaflet-popup-close-button { color: rgba(255,255,255,0.7) !important; top: 8px !important; right: 8px !important; }
            .leaflet-tile-pane { filter: sepia(10%) hue-rotate(190deg) saturate(150%) brightness(0.8) contrast(1.2); }
        `;
    } else {
        return `
            .leaflet-container { background: #f8fafc !important; font-family: 'Inter', sans-serif; }
            .map-3d-wrapper { background: #f1f5f9; }
            .map-3d-container {
                width: 100%; height: 100%;
                /* transform: rotateX(5deg) scale(1.02); */
            }
            .theme-popup .leaflet-popup-content-wrapper {
                background: #ffffff !important;
                border: 1px solid #e2e8f0;
                color: #1e293b;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                border-radius: 8px;
                padding: 0;
            }
            .theme-popup .leaflet-popup-tip { background: #ffffff; border: 1px solid #e2e8f0; }
            .theme-popup .leaflet-popup-close-button { color: #64748b !important; top: 8px !important; right: 8px !important; }
            .leaflet-tile-pane { filter: none; }
        `;
    }
};

// Fix for default icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- UTILS ---
// Component to handle map resize events ensuring layout is correct
const MapController = () => {
    const map = useMap();
    useEffect(() => {
        // Aggressively invalidate size to ensure map fills container
        const timer1 = setTimeout(() => map.invalidateSize(), 100);
        const timer2 = setTimeout(() => map.invalidateSize(), 500);
        const timer3 = setTimeout(() => map.invalidateSize(), 1000);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
        };
    }, [map]);
    return null;
};

// --- HEATMAP COMPONENT ---
interface HeatmapProps {
    points: [number, number, number][]; // lat, lng, intensity
    theme: 'light' | 'dark';
}

const HeatmapLayer = ({ points, theme }: HeatmapProps) => {
    const map = useMap();
    const [layer, setLayer] = useState<any>(null);

    useEffect(() => {
        if (!map) return;
        if (!points || points.length === 0) return;

        // Cleanup function to remove existing layer safely
        const cleanupLayer = () => {
            if (layer) {
                try {
                    map.removeLayer(layer);
                } catch (e) { }
            }
        };

        cleanupLayer();
        setLayer(null);

        const gradients: any = {
            light: { 0.2: '#bae6fd', 0.5: '#3b82f6', 0.8: '#2563eb', 1.0: '#1e3a8a' },
            dark: { 0.2: '#3b82f6', 0.5: '#8b5cf6', 0.8: '#ec4899', 1.0: '#22d3ee' }
        };

        let attempts = 0;
        const maxAttempts = 10;
        let timer: any = null;

        const tryAddLayer = () => {
            const size = map.getSize();
            if (size.x > 0 && size.y > 0) {
                try {
                    // @ts-ignore
                    const newLayer = L.heatLayer(points, {
                        radius: theme === 'dark' ? 45 : 35,
                        blur: theme === 'dark' ? 30 : 25,
                        maxZoom: 12,
                        minOpacity: 0.2,
                        max: 1.0,
                        gradient: gradients[theme]
                    });
                    newLayer.addTo(map);
                    setLayer(newLayer);
                } catch (e) {
                    console.warn("Could not create heatmap", e);
                }
            } else {
                attempts++;
                if (attempts < maxAttempts) {
                    map.invalidateSize(); // Force check
                    timer = setTimeout(tryAddLayer, 200); // Retry in 200ms
                } else {
                    console.warn("Map never became ready for heatmap");
                }
            }
        };

        // Start trying after a short delay
        timer = setTimeout(tryAddLayer, 100);

        return () => {
            if (timer) clearTimeout(timer);
            cleanupLayer();
        };
    }, [points, theme, map]); // Dependencies

    return null;
};



// --- Components ---
const MapBounds = ({ data }: { data: FeatureCollection }) => {
    const map = useMap();
    useEffect(() => {
        if (data && data.features.length > 0) {
            try {
                const geoJsonLayer = L.geoJSON(data);
                const bounds = geoJsonLayer.getBounds();
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 2 });
                }
            } catch (e) {
                console.error("Error setting map bounds:", e);
            }
        }
    }, [data, map]);
    return null;
};

const MapViewExperimental = () => {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [allFeatures, setAllFeatures] = useState<Feature[]>([]);
    const [heatmapPoints, setHeatmapPoints] = useState<[number, number, number][]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeFeature, setActiveFeature] = useState<any | null>(null);

    // Fetch Data
    useEffect(() => {
        async function fetchData() {
            try {
                setIsLoading(true);

                const { data: sections, error: secError } = await supabase
                    .from('secciones_electorales')
                    .select('id, distrito, geom, meta_data, ganador_anterior, competitividad, votos_partido_anterior');

                if (secError) throw secError;

                const { data: affinities } = await supabase.from('affinities').select('seccion_id');

                if (sections && sections.length > 0) {
                    const loadedFeatures: Feature[] = [];
                    sections.forEach((row: any) => {
                        if (row.geom) {
                            loadedFeatures.push({
                                type: "Feature",
                                geometry: row.geom,
                                properties: {
                                    ...(row.meta_data || {}),
                                    id: row.id,
                                    distrito: row.distrito,
                                    ganador_anterior: row.ganador_anterior,
                                    competitividad: row.competitividad,
                                    votos_partido_anterior: row.votos_partido_anterior
                                }
                            });
                        }
                    });
                    setAllFeatures(loadedFeatures);

                    if (affinities) {
                        const counts: Record<number, number> = {};
                        (affinities as any[]).forEach(a => counts[a.seccion_id] = (counts[a.seccion_id] || 0) + 1);
                        const pts: [number, number, number][] = [];
                        loadedFeatures.forEach((feature: any) => {
                            const count = counts[feature.properties.id] || 0;
                            if (count > 0 && feature.geometry) {
                                try {
                                    const layer = L.geoJSON(feature);
                                    const center = layer.getBounds().getCenter();
                                    pts.push([center.lat, center.lng, Math.min(Math.max(count * 0.3, 0.2), 1.0)]);
                                } catch (e) { }
                            }
                        });
                        setHeatmapPoints(pts);
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, []);

    const displayData = useMemo(() => {
        return {
            type: "FeatureCollection",
            features: allFeatures
        } as FeatureCollection;
    }, [allFeatures]);

    // --- STYLING LOGIC ---
    const getFeatureStyle = (feature: any) => {
        const isHovered = activeFeature?.properties?.id === feature.properties.id;
        if (theme === 'dark') {
            return {
                fillColor: isHovered ? '#6366f1' : '#1e3a8a',
                weight: isHovered ? 2 : 1,
                opacity: 1,
                color: isHovered ? '#818cf8' : '#3b82f6',
                dashArray: '',
                fillOpacity: isHovered ? 0.4 : 0.15,
                className: 'transition-all duration-300'
            };
        } else {
            return {
                fillColor: isHovered ? '#3b82f6' : '#94a3b8',
                weight: isHovered ? 2 : 1,
                opacity: 1,
                color: isHovered ? '#2563eb' : '#64748b',
                dashArray: '',
                fillOpacity: isHovered ? 0.3 : 0.05,
                className: 'transition-all duration-200'
            };
        }
    };

    const onEachFeature = (feature: any, layer: L.Layer) => {
        layer.on({
            mouseover: (e) => {
                const l = e.target;
                l.setStyle({
                    fillOpacity: 0.4,
                    weight: 2,
                    color: theme === 'dark' ? '#c084fc' : '#2563eb',
                    fillColor: theme === 'dark' ? null : '#3b82f6'
                });
                l.bringToFront();
            },
            mouseout: (e) => {
                const l = e.target;
                l.setStyle(getFeatureStyle(feature));
            },
            click: () => setActiveFeature(feature)
        });

        if (feature.properties) {
            const isDark = theme === 'dark';
            const textColor = isDark ? 'text-white' : 'text-gray-900';
            const subTextColor = isDark ? 'text-slate-400' : 'text-gray-500';
            const cardBg = isDark ? 'bg-indigo-900/40 border-indigo-500/20' : 'bg-blue-50/50 border-blue-100';
            const borderB = isDark ? 'border-slate-700' : 'border-gray-100';
            const dotColor = isDark ? 'bg-emerald-400' : 'bg-blue-600';
            const titleColor = isDark ? 'text-sky-400' : 'text-gray-700';

            layer.bindPopup(`
                <div class="p-3 min-w-[220px] font-sans">
                    <div class="flex items-center gap-2 mb-2 pb-2 border-b ${borderB}">
                        <div class="w-2 h-2 rounded-full ${dotColor} animate-pulse"></div>
                        <h3 class="text-xs font-bold ${titleColor} uppercase tracking-wider">Distrito ${feature.properties.distrito}</h3>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-xs">
                        <div class="p-1.5 rounded border ${cardBg}">
                            <span class="block ${subTextColor} text-[10px] uppercase">Votos</span>
                            <strong class="${textColor} text-sm">${feature.properties.votos_partido_anterior || 0}</strong>
                        </div>
                         <div class="p-1.5 rounded border ${cardBg}">
                            <span class="block ${subTextColor} text-[10px] uppercase">Comp.</span>
                            <strong class="${textColor} text-sm">${feature.properties.competitividad || 0}</strong>
                        </div>
                    </div>
                </div>
            `, { className: 'theme-popup', closeButton: true });
        }
    };

    return (
        <>
            <style>{getThemeStyles(theme)}</style>
            <div className={`map-3d-wrapper relative transition-colors duration-500 w-full h-full`}>

                {/* --- TOGGLE SWITCH --- */}
                <div className="absolute top-6 right-6 z-[1000]">
                    <button
                        onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-full shadow-lg backdrop-blur-md border transition-all
                            ${theme === 'light'
                                ? 'bg-white/90 border-slate-200 text-slate-700 hover:bg-slate-50'
                                : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800'}
                        `}
                    >
                        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                        <span className="text-xs font-bold uppercase tracking-wider">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                    </button>
                </div>

                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-[500] pointer-events-none">
                        <div className={`px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 border ${theme === 'dark' ? 'bg-slate-900 border-sky-900 text-sky-400' : 'bg-white border-gray-100 text-blue-600'}`}>
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            <span className="font-medium text-sm">Cargando...</span>
                        </div>
                    </div>
                )}

                <div className="map-3d-container">
                    <MapContainer
                        key={theme} // Force re-mount on theme change looks cleaner
                        center={[20.5888, -100.3899]}
                        zoom={11}
                        style={{ height: '100%', width: '100%', background: 'transparent' }}
                        zoomControl={false}
                        attributionControl={false}
                    >
                        <MapController />
                        <LayersControl position="bottomright">
                            {/* Conditionally render layers based on theme to avoid key-based remounting issues of base layers */}
                            {theme === 'light' ? (
                                <LayersControl.BaseLayer checked name="Light (Positron)">
                                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://carto.com/">CARTO</a>' />
                                </LayersControl.BaseLayer>
                            ) : (
                                <LayersControl.BaseLayer checked name="Dark (Matter)">
                                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://carto.com/">CARTO</a>' />
                                </LayersControl.BaseLayer>
                            )}

                            <LayersControl.BaseLayer name="Grayscale">
                                <TileLayer url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png" />
                            </LayersControl.BaseLayer>

                            <LayersControl.Overlay checked name="Distritos">
                                {displayData && !isLoading && (
                                    <GeoJSON data={displayData} style={getFeatureStyle} onEachFeature={onEachFeature} />
                                )}
                            </LayersControl.Overlay>

                            <LayersControl.Overlay checked name="Mapa de Calor">
                                <HeatmapLayer points={heatmapPoints} theme={theme} />
                            </LayersControl.Overlay>
                        </LayersControl>

                        {displayData && <MapBounds data={displayData} />}
                    </MapContainer>
                </div>

                {/* Floating Stats Card */}
                <div className="absolute bottom-6 left-6 z-[400] w-72">
                    <div className={`
                        backdrop-blur border p-4 rounded-xl shadow-lg transition-colors
                        ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-white/90 border-gray-200'}
                     `}>
                        <h4 className={`text-xs font-bold uppercase tracking-widest mb-3 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`}>Estadísticas Generales</h4>
                        <div className="flex justify-between items-center mb-2">
                            <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>Total Secciones</span>
                            <span className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{allFeatures.length}</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default MapViewExperimental;
