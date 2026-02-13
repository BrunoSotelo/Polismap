import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, GeoJSON, useMap, LayersControl, Marker, Popup, CircleMarker, LayerGroup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';
import type { FeatureCollection, Feature } from 'geojson';
import { supabase } from '../../lib/supabase';
import { Layers, RefreshCw, AlertCircle, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/DesignSystem/ThemeContext';


// Fix for default Leaflet icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

// --- THEME STYLES ---
const getThemeStyles = (mode: 'light' | 'dark') => {
    if (mode === 'dark') {
        return `
            .leaflet-container { background: #0f172a !important; font-family: 'Inter', sans-serif; }
            .theme-popup .leaflet-popup-content-wrapper {
                background: rgba(15, 23, 42, 0.95) !important;
                border: 1px solid rgba(56, 189, 248, 0.3);
                color: white;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                border-radius: 12px;
                padding: 0;
            }
            .theme-popup .leaflet-popup-tip { background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(56, 189, 248, 0.3); }
            .theme-popup .leaflet-popup-close-button { color: rgba(255,255,255,0.7) !important; top: 8px !important; right: 8px !important; }
            .leaflet-tile-pane { filter: none; }
        `;
    } else {
        return `
            .leaflet-container { background: #f8fafc !important; font-family: 'Inter', sans-serif; }
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

L.Marker.prototype.options.icon = DefaultIcon;

// --- Custom Icons ---
const createLeaderIcon = (color: string) => L.divIcon({
    className: 'bg-transparent', // Reset default leaflet div styling
    html: `
    <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
    ">
        <div style="transform: rotate(45deg); color: white;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        </div>
    </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

// --- Heatmap Component ---
// --- Heatmap Component ---
// --- CONSTANTS ---
const HEATMAP_CONFIG = {
    light: {
        gradient: { 0.2: '#0ea5e9', 0.5: '#eab308', 1.0: '#ef4444' }, // Sky -> Yellow -> Red
        cssGradient: 'linear-gradient(90deg, #0ea5e9 0%, #eab308 50%, #ef4444 100%)',
        labels: ['Baja', 'Media', 'Alta']
    },
    dark: {
        // Cyan -> Violet -> Rose (High contrast neon for dark mode)
        gradient: { 0.2: '#06b6d4', 0.5: '#8b5cf6', 1.0: '#f43f5e' },
        cssGradient: 'linear-gradient(90deg, #06b6d4 0%, #8b5cf6 50%, #f43f5e 100%)',
        labels: ['Baja', 'Media', 'Alta']
    }
};

// --- Heatmap Component ---
interface HeatmapProps {
    points: [number, number, number][]; // lat, lng, intensity
    theme?: 'light' | 'dark';
}

const HeatmapLayer = ({ points, theme = 'light' }: HeatmapProps) => {
    const map = useMap();

    useEffect(() => {
        if (!points || points.length === 0) return;

        // @ts-ignore
        const heat = L.heatLayer(points, {
            radius: 35,
            blur: 35,
            maxZoom: 12,
            minOpacity: 0.4,
            max: 1.0,
            gradient: HEATMAP_CONFIG[theme].gradient
        });

        // Loop to safely add layer only when map has dimensions
        let isMounted = true;

        const safeAdd = () => {
            if (!isMounted) return;

            // Check if map has valid dimensions to avoid IndexSizeError
            const size = map.getSize();
            if (size.x > 0 && size.y > 0) {
                try {
                    heat.addTo(map);
                } catch (e) {
                    console.error("Heatmap add error:", e);
                }
            } else {
                // Retry in a bit
                setTimeout(safeAdd, 200);
            }
        };

        safeAdd();

        return () => {
            isMounted = false;
            try {
                if (map.hasLayer(heat)) {
                    map.removeLayer(heat);
                }
            } catch (e) { }
        };
    }, [points, map, theme]);

    return null;
};

// --- Bounds Helper ---
const MapBounds = ({ data }: { data: FeatureCollection }) => {
    const map = useMap();

    useEffect(() => {
        if (data && data.features.length > 0) {
            try {
                const geoJsonLayer = L.geoJSON(data);
                const bounds = geoJsonLayer.getBounds();

                if (bounds.isValid()) {
                    map.invalidateSize();
                    map.fitBounds(bounds, { padding: [50, 50] });
                }
            } catch (e) {
                console.error("Error setting map bounds:", e);
            }
        }
    }, [data, map]);

    return null;
};

// Component to handle map resize events ensuring layout is correct
const MapController = ({ isGuest }: { isGuest?: boolean }) => {
    const map = useMap();
    const { assignedDistricts } = useAuth();

    useEffect(() => {
        // Aggressively invalidate size to ensure map fills container when switching modes
        const timer1 = setTimeout(() => map.invalidateSize(), 100);
        const timer2 = setTimeout(() => map.invalidateSize(), 300);
        const timer3 = setTimeout(() => map.invalidateSize(), 1000);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
        };
    }, [map, isGuest]);

    // Zoom Logic for Login Transition
    useEffect(() => {
        const safeFlyTo = (coords: [number, number], zoom: number) => {
            // Wait for map container to have size
            if (!map || !map.getSize().x) {
                setTimeout(() => safeFlyTo(coords, zoom), 100);
                return;
            }
            try {
                map.flyTo(coords, zoom, {
                    animate: true,
                    duration: 2.5
                });
            } catch (e) {
                console.error("FlyTo Safety Catch:", e);
            }
        };

        if (isGuest) {
            safeFlyTo([20.85, -99.85], 9);
        } else {
            // User Logged In - Zoom to District 6 (or assigned)
            // User Logged In - Zoom to District 6
            if (assignedDistricts && assignedDistricts.length > 0) {
                safeFlyTo([20.61, -100.41], 13);
            }
        }
    }, [isGuest, map, assignedDistricts]);

    return null;
};

// Component to handle focusing on specific sections
const FocusController = ({ focusSectionId, features }: { focusSectionId?: number, features: Feature[] }) => {
    const map = useMap();
    useEffect(() => {
        if (focusSectionId && features && features.length > 0) {
            // Use loose equality (==) to match string "554" with number 554
            // Check 'id' first (standard), then 'seccion' (legacy/geojson)
            const feature = features.find(f => (f.properties?.id == focusSectionId) || (f.properties?.seccion == focusSectionId));
            if (feature) {
                const layer = L.geoJSON(feature);
                const bounds = layer.getBounds();
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [100, 100], maxZoom: 15 });
                    // Visual feedback could be added here (popup, highlight)
                    L.popup()
                        .setLatLng(bounds.getCenter())
                        .setContent(`<b>Sección ${focusSectionId}</b><br>Distrito ${feature.properties?.distrito || '?'}`)
                        .openOn(map);
                }
            } else {
                console.warn(`Sección ${focusSectionId} no encontrada en los datos del mapa.`);
            }
        }
    }, [focusSectionId, features, map]);
    return null;
};

interface MapViewProps {
    theme: 'light' | 'dark';
    isGuest?: boolean;
    onDistrictsChange?: (districts: number[]) => void;
    controlsClass?: string;
    focusSectionId?: number;
}

const MapView = ({ theme, isGuest = false, onDistrictsChange, controlsClass, focusSectionId }: MapViewProps) => {
    const navigate = useNavigate();
    const { profile, assignedDistricts, loading: authLoading } = useAuth();
    const { currentTheme } = useTheme();

    // --- STATE ---
    const [mapMode, setMapMode] = useState<'coverage' | 'electoral' | 'interactions'>('coverage');
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth > 768);

    // Data
    const [allFeatures, setAllFeatures] = useState<any[]>([]);
    // displayData is derived via useMemo
    const [heatmapPoints, setHeatmapPoints] = useState<any[]>([]);

    // Filters
    const [availableDistricts, setAvailableDistricts] = useState<number[]>([]);
    const [visibleDistricts, setVisibleDistricts] = useState<number[]>([]);

    // Loading & Errors
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Business Data
    const [lideres, setLideres] = useState<any[]>([]);
    const [bitacoras, setBitacoras] = useState<any[]>([]);
    const [affinitiesCountMap, setAffinitiesCountMap] = useState<Record<number, number>>({});
    const [userMap, setUserMap] = useState<Record<string, string>>({});


    // Fetch Base Geometry (Secciones OR Colonias)
    useEffect(() => {
        async function fetchData() {
            // Skip data fetching for guest map (Performance & Security)
            // But we DO need the base geometry (Secciones) to show the map lines? 
            // Or maybe just tiles for guest? 
            // The prompt said "Map of Queretaro". 
            // Loading 5k polygons for background might be heavy. 
            // Let's load the GEOMETRY (static) but NOT the data (Supabase) if guest.

            try {
                setIsLoading(true);
                setErrorMsg(null);
                setAllFeatures([]);

                let fetchedFeatures: Feature[] = [];
                let districtSet = new Set<number>();

                // Load Static Geometry
                const staticResponse = await fetch('/maps/secciones.json');
                if (!staticResponse.ok) throw new Error("Error cargando mapa base (CDN)");
                const staticData = await staticResponse.json();

                let dbData: any[] | null = null;

                // ONLY Fetch Live Data if NOT Guest
                if (!isGuest) {
                    const { data, error } = await supabase.from('secciones_electorales').select('id, meta_data, ganador_anterior, competitividad, votos_partido_anterior, distrito');
                    if (error) throw error;
                    dbData = data;
                }

                // Index DB data (Map for O(1) lookup)
                const dbMap = new Map();
                if (dbData) {
                    dbData.forEach((row: any) => {
                        dbMap.set(row.id, row);
                    });
                }

                // MERGE Geometry + Data
                if (staticData && staticData.features) {
                    staticData.features.forEach((feature: any) => {
                        // If Guest, we just render raw geometry (maybe darker)
                        // If User, we inject data
                        const id = feature.properties.id;
                        const dbProps = dbMap.get(id);

                        if (dbProps) {
                            feature.properties = { ...feature.properties, ...dbProps, type: 'section' };
                        } else {
                            feature.properties.type = 'section';
                        }

                        fetchedFeatures.push(feature);
                        districtSet.add(feature.properties.distrito);
                    });
                }

                if (fetchedFeatures.length > 0) {
                    let finalFeatures = fetchedFeatures;

                    // Guest Mode: Show ALL features but styled neutrally
                    // User Mode: Filter by District
                    if (!isGuest && !profile?.is_admin && assignedDistricts && assignedDistricts.length > 0) {
                        finalFeatures = fetchedFeatures.filter(f =>
                            f.properties && assignedDistricts.includes(f.properties.distrito)
                        );
                        districtSet = new Set(Array.from(districtSet).filter(d => assignedDistricts.includes(d)));
                    }

                    setAllFeatures(finalFeatures);

                    if (!isGuest) {
                        const sortedDistricts = Array.from(districtSet).sort((a, b) => a - b);
                        setAvailableDistricts(sortedDistricts);
                        setVisibleDistricts(prev => prev.length === 0 ? sortedDistricts : prev);
                    } else {
                        // Guest: Show all districts invisible or just as background lines
                        // We set them as 'visible' so they render, but style will handle appearance
                        setVisibleDistricts(Array.from(districtSet));
                    }
                }

            } catch (err: any) {
                console.error("Error loading map data:", err);
            } finally {
                setIsLoading(false);
            }
        }

        // ... (Other fetches)

        async function fetchLideres() {
            const { data } = await supabase.from('lideres').select('*');
            if (data) setLideres(data);
        }

        async function fetchBitacoras() {
            const { data } = await supabase.from('bitacoras').select('*');
            if (data) setBitacoras(data);
        }

        async function fetchProfiles() {
            if (profile?.is_admin) {
                const { data } = await supabase.from('profiles').select('id, email');
                if (data) {
                    const map: Record<string, string> = {};
                    data.forEach((p: any) => {
                        map[p.id] = p.email;
                    });
                    setUserMap(map);
                }
            }
        }

        if (authLoading) return;

        fetchData();

        if (!isGuest) {
            if (lideres.length === 0) fetchLideres();
            if (bitacoras.length === 0) fetchBitacoras();
            if (Object.keys(userMap).length === 0) fetchProfiles();
        }

    }, [assignedDistricts, profile, authLoading, isGuest]);


    // Validating and syncing visible districts if needed (logic moved to handlers)


    // Derived State for Display
    const displayData = useMemo(() => {
        if (allFeatures.length === 0) return null;

        // Only apply district filter in Sections mode
        const filtered = allFeatures.filter((f: any) =>

            visibleDistricts.includes(parseInt(f.properties.distrito))
        );

        return {
            type: "FeatureCollection",
            features: filtered
        } as FeatureCollection;
    }, [allFeatures, visibleDistricts]);

    const toggleDistrict = (distId: number) => {
        const newVisible = visibleDistricts.includes(distId)
            ? visibleDistricts.filter(d => d !== distId)
            : [...visibleDistricts, distId].sort((a, b) => a - b);

        setVisibleDistricts(newVisible);
        if (onDistrictsChange) onDistrictsChange(newVisible);
    };

    const toggleAll = () => {
        if (visibleDistricts.length === availableDistricts.length) {
            setVisibleDistricts([]);
            if (onDistrictsChange) onDistrictsChange([]);
        } else {
            setVisibleDistricts(availableDistricts);
            if (onDistrictsChange) onDistrictsChange(availableDistricts);
        }
    };

    // Heatmap Effect
    useEffect(() => {
        async function calculateHeatmap() {
            if (!displayData) return;

            // Logic fork:
            // SECTIONS: Original logic (fetch affinities seccion_id counts)
            // COLONIAS: Use the 'affinity_count' returned by RPC directly? 
            //           OR replicate the heatmap visually?
            //           HeatmapLayer takes Points [lat, lng, intensity].
            //           So we need centroids of features + count.

            const points: [number, number, number][] = [];

            // ... Original Sections Heatmap Logic ...
            // We re-fetch or use cache? Let's assume we re-fetch to be safe or optimize later.
            // For brevity reusing existing pattern but inside effect
            const { data: affinities, error } = await supabase.from('affinities').select('seccion_id');
            if (error || !affinities) return;


            const counts: Record<number, number> = {};
            (affinities as any[]).forEach(a => {
                if (a.seccion_id) counts[a.seccion_id] = (counts[a.seccion_id] || 0) + 1;
            });
            setAffinitiesCountMap(counts);

            displayData.features.forEach((feature: any) => {
                const seccionId = feature.properties.id;
                const count = counts[seccionId] || 0;
                if (count > 0 && feature.geometry && feature.geometry.coordinates && feature.geometry.coordinates.length > 0) {
                    try {
                        // @ts-ignore
                        const layer = L.geoJSON(feature);
                        const bounds = layer.getBounds();

                        // Safety check: Ensure bounds are valid to avoid NaN entries
                        if (bounds.isValid()) {
                            const center = bounds.getCenter();

                            // Double check center is not NaN
                            if (!isNaN(center.lat) && !isNaN(center.lng)) {
                                const intensity = Math.min(Math.max(count * 0.5, 0.5), 1.0);
                                points.push([center.lat, center.lng, intensity]);
                            }
                        }
                    } catch (e) {
                        console.error("Error processing feature for heatmap:", feature.properties.id, e);
                    }
                }
            });

            setHeatmapPoints(points);

        }

        calculateHeatmap();
    }, [displayData]);


    // Navigate declared at top


    // Helper to get stats for a section OR COLONY
    const getStats = (feature: any) => {
        const props = feature.properties;

        if (props.type === 'colony') {
            return {
                isColony: true,
                nombre: props.nombre,
                municipio: props.municipio,
                affinitiesCount: props.affinity_count || 0,
                interactionsCount: props.interaction_count || 0,
                // Add leader logic if we link leaders to colonies? For now generic.
            };
        }

        // --- SECTION LOGIC ---
        const sectionId = props.id;
        const affinitiesCount = affinitiesCountMap[sectionId] || 0;
        const leader = lideres.find(l => l.seccion_id === sectionId);
        const sectionBitacoras = bitacoras.filter(b => b.seccion_id === sectionId);
        const lastBitacora = sectionBitacoras.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        // Electoral Stats Logic ... (Original Code) ...
        let electoralStats;
        if (props.meta_data?.electoral_2024?.calculated) {
            const calc = props.meta_data.electoral_2024.calculated;
            const raw = props.meta_data.electoral_2024.raw;
            const votosPan = calc.votes_pan_alliance;
            const votosMorena = calc.votes_morena_alliance;
            const totalVotos = raw.total_votos;
            const diff = votosPan - votosMorena;
            electoralStats = {
                votosPan,
                votosMorena,
                votosPanPercent: ((votosPan / totalVotos) * 100).toFixed(1),
                votosMorenaPercent: ((votosMorena / totalVotos) * 100).toFixed(1),
                diff,
                diffPercent: ((Math.abs(diff) / totalVotos) * 100).toFixed(1),
                isWon: calc.winner === 'PAN',
                listaNominal: raw.lista_nominal,
                distritoFederal: 4
            };
        } else {
            // Mock Fallback
            const seed = sectionId * 123;
            const totalVotos = 1000 + (seed % 2000);
            const votosPan = Math.floor(totalVotos * (0.3 + (seed % 30) / 100));
            const votosMorena = Math.floor(totalVotos * (0.25 + ((seed * 2) % 30) / 100));
            electoralStats = {
                votosPan,
                votosMorena,
                votosPanPercent: ((votosPan / totalVotos) * 100).toFixed(1),
                votosMorenaPercent: ((votosMorena / totalVotos) * 100).toFixed(1),
                diff: votosPan - votosMorena,
                diffPercent: (((votosPan - votosMorena) / totalVotos) * 100).toFixed(1),
                isWon: votosPan > votosMorena,
                listaNominal: Math.floor(totalVotos * 1.8),
                distritoFederal: 4
            };
        }

        return {
            isColony: false,
            affinitiesCount,
            leader,
            interactionsCount: sectionBitacoras.length,
            lastInteraction: lastBitacora,
            electoral: electoralStats
        };
    };

    const getFeatureStyle = (feature: any) => {
        if (mapMode === 'electoral') {
            // Prefer 2024 Real Data
            let winner = (feature.properties as any).meta_data?.electoral_2024?.calculated?.winner;
            if (!winner) {
                // Fallback to legacy column
                winner = feature.properties.ganador_anterior;
            }

            let color = theme === 'dark' ? '#64748b' : '#94a3b8'; // Default grey

            if (winner) {
                const w = winner.toUpperCase();
                // Real data uses 'PAN' or 'MORENA' strings
                if (w === 'PAN' || w.includes('PAN')) color = '#0047AB';
                else if (w === 'MORENA' || w.includes('MORENA')) color = '#B31942';
                else if (w.includes('PRI')) color = '#00953A';
                else if (w.includes('MC')) color = '#FF8300';
                else if (w.includes('VERDE')) color = '#50B747';
            }

            return {
                fillColor: color,
                weight: 1,
                opacity: 1,
                color: theme === 'dark' ? '#1e293b' : 'white',
                dashArray: '',
                fillOpacity: 0.6
            };
        }

        // Coverage Mode (Default)
        const isDark = theme === 'dark';
        return {
            fillColor: currentTheme.colors.primary, // Dynamic App Theme
            weight: isDark ? 1 : 1.5,
            opacity: 0.8,
            color: currentTheme.colors.primary,
            dashArray: '',
            fillOpacity: isDark ? 0.2 : 0.1
        };
    };

    const onEachFeature = (feature: any, layer: L.Layer) => {
        if (feature.properties) {
            const isDark = theme === 'dark';
            // Determine if Section or Colony
            const isColony = feature.properties.type === 'colony';

            const stats = getStats(feature);

            // Styling constants
            // Styling constants
            const textColor = isDark ? 'text-white' : 'text-gray-900';
            const subTextColor = isDark ? 'text-slate-400' : 'text-gray-500';
            // Use slightly transparent version of primary for card bg if possible, or keep neutral
            const cardBg = isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200';
            const borderB = isDark ? 'border-slate-700' : 'border-gray-100';
            const dotColor = 'bg-[var(--ds-color-primary)]';
            const titleColor = 'text-[var(--ds-color-primary)]';

            // --- POPUP CONTENT GENERATION ---
            let popupContent = '';

            if (isColony) {
                // --- COLONY POPUP ---
                popupContent = `
                    <div class="p-3 min-w-[200px] font-sans">
                        <div class="flex items-center gap-2 mb-2 pb-2 border-b ${borderB}">
                             <div class="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></div>
                            <div>
                                <h3 class="text-xs font-bold ${titleColor} uppercase tracking-wider">${stats.nombre}</h3>
                                <span class="text-[9px] ${subTextColor}">${stats.municipio}</span>
                            </div>
                        </div>
                        <div class="space-y-2">
                             <div class="p-2 rounded border ${cardBg}">
                                <span class="block ${subTextColor} text-[10px] uppercase">Simpatizantes</span>
                                <strong class="${textColor} text-lg">${stats.affinitiesCount}</strong>
                            </div>
                            <div class="p-2 rounded border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50'} flex justify-between items-center">
                                <span class="block ${subTextColor} text-[10px] uppercase">Toques (Bitácoras)</span>
                                <strong class="${textColor} text-sm">${stats.interactionsCount}</strong>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // --- SECTION POPUP (Original Logic) ---
                const realSectionId = feature.properties.id;

                // 1. COVERAGE MODE
                if (mapMode === 'coverage') {
                    popupContent = `
                        <div class="p-3 min-w-[200px] font-sans">
                            <div class="flex items-center gap-2 mb-2 pb-2 border-b ${borderB}">
                                <div class="w-2 h-2 rounded-full ${dotColor} animate-pulse"></div>
                                <h3 class="text-xs font-bold ${titleColor} uppercase tracking-wider">Sección ${realSectionId}</h3>
                            </div>
                            <div class="space-y-2">
                                <div class="p-2 rounded border ${cardBg}">
                                    <span class="block ${subTextColor} text-[10px] uppercase">Simpatizantes</span>
                                    <strong class="${textColor} text-lg">${stats.affinitiesCount}</strong>
                                </div>
                                ${stats.leader ? `
                                        <strong class="${textColor} text-sm truncate block">${stats.leader.nombre}</strong>
                                        <span class="text-[10px] text-orange-500">Activo</span>
                                        ${profile?.is_admin && stats.leader.user_id && userMap[stats.leader.user_id] ? `
                                            <div class="mt-1 flex items-center gap-1 text-[9px] bg-slate-50 text-slate-500 px-1 rounded border border-slate-100">
                                                <span>👤</span> ${userMap[stats.leader.user_id].split('@')[0]}
                                            </div>
                                        ` : ''}
                                    </div>
                                ` : `
                                    <div class="p-2 rounded border border-dashed ${isDark ? 'border-slate-700' : 'border-gray-300'} text-center">
                                        <span class="text-[10px] ${subTextColor} italic">Sin Líder Asignado</span>
                                    </div>
                                `}
                                <div class="mt-2 text-[10px] text-center text-blue-500 cursor-pointer hover:underline">
                                    (Doble click para ver Agenda)
                                </div>
                            </div>
                        </div>
                    `;
                }

                // 2. ELECTORAL MODE
                else if (mapMode === 'electoral') {
                    const { electoral } = stats;
                    const winColor = electoral?.isWon ? 'text-blue-500' : 'text-red-500';
                    const winLabel = electoral?.isWon ? 'GANADO' : 'PERDIDO';

                    popupContent = `
                        <div class="p-3 min-w-[240px] font-sans">
                            <div class="flex items-center justify-between mb-2 pb-2 border-b ${borderB}">
                                <h3 class="text-xs font-bold ${titleColor} uppercase tracking-wider">Sección ${realSectionId}</h3>
                                <span class="text-[10px] font-black ${winColor} border border-current px-1 rounded">${winLabel}</span>
                            </div>
                            
                            <div class="space-y-2 text-xs">
                                <div class="flex justify-between items-center">
                                    <span class="font-bold text-blue-600">PAN</span>
                                    <div class="text-right">
                                        <span class="block font-bold ${textColor}">${electoral?.votosPanPercent}%</span>
                                        <span class="text-[10px] ${subTextColor}">${electoral?.votosPan} votos</span>
                                    </div>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                                    <div class="bg-blue-600 h-1.5 rounded-full" style="width: ${electoral?.votosPanPercent}%"></div>
                                </div>

                                <div className="pt-1"></div>

                                <div class="flex justify-between items-center">
                                    <span class="font-bold text-red-700">MORENA</span>
                                    <div class="text-right">
                                        <span class="block font-bold ${textColor}">${electoral?.votosMorenaPercent}%</span>
                                        <span class="text-[10px] ${subTextColor}">${electoral?.votosMorena} votos</span>
                                    </div>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                                    <div class="bg-red-700 h-1.5 rounded-full" style="width: ${electoral?.votosMorenaPercent}%"></div>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-2 mt-3 pt-2 border-t ${borderB}">
                                <div class="text-center">
                                    <span class="block ${subTextColor} text-[10px] uppercase">Diferencia</span>
                                    <strong class="${winColor} text-xs">${electoral?.isWon ? '+' : ''}${electoral?.diff} (${electoral?.diffPercent}%)</strong>
                                </div>
                                <div class="text-center">
                                    <span class="block ${subTextColor} text-[10px] uppercase">Lista Nominal</span>
                                    <strong class="${textColor} text-xs">${electoral?.listaNominal}</strong>
                                </div>
                            </div>
                            <div class="text-[10px] text-center mt-2 ${subTextColor}">
                                Distrito Federal: <strong>${electoral?.distritoFederal}</strong>
                            </div>
                        </div>
                    `;
                }

                // 3. INTERACTIONS (TOQUES) MODE
                else if (mapMode === 'interactions') {
                    popupContent = `
                        <div class="p-3 min-w-[200px] font-sans">
                            <div class="flex items-center gap-2 mb-2 pb-2 border-b ${borderB}">
                                <div class="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                                <h3 class="text-xs font-bold ${titleColor} uppercase tracking-wider">Sección ${realSectionId}</h3>
                            </div>
                            <div class="space-y-2">
                                <div class="p-2 rounded border ${cardBg}">
                                    <span class="block ${subTextColor} text-[10px] uppercase">Total Toques</span>
                                    <strong class="${textColor} text-lg">${stats.interactionsCount}</strong>
                                </div>
                                
                                ${stats.lastInteraction ? `
                                        <strong class="${textColor} text-xs block mb-0.5">${new Date(stats.lastInteraction.created_at).toLocaleDateString()}</strong>
                                        <p class="text-[10px] ${subTextColor} italic truncate">"${stats.lastInteraction.descripcion || 'Sin descripción'}"</p>
                                        ${profile?.is_admin && stats.lastInteraction.user_id && userMap[stats.lastInteraction.user_id] ? `
                                            <div class="mt-1 flex items-center gap-1 text-[9px] bg-slate-50 text-slate-500 px-1 rounded border border-slate-100 w-fit">
                                                <span>👤</span> ${userMap[stats.lastInteraction.user_id].split('@')[0]}
                                            </div>
                                        ` : ''}
                                    </div>
                                ` : `
                                    <div class="p-2 rounded border border-dashed ${isDark ? 'border-slate-700' : 'border-gray-300'} text-center">
                                        <span class="text-[10px] ${subTextColor} italic">Sin interacciones</span>
                                    </div>
                                `}

                                <div class="mt-2 text-[10px] text-center text-purple-500 cursor-pointer hover:underline">
                                    (Doble click para ver Bitácoras)
                                </div>
                            </div>
                        </div>
                    `;
                }
            }


            layer.bindPopup(popupContent, { className: 'theme-popup', closeButton: true });

            // EVENTS
            layer.off('mouseover mouseout dblclick'); // Clear previous to avoid stacking

            layer.on({
                mouseover: (e) => {
                    const l = e.target;
                    l.setStyle({ fillOpacity: isColony ? 0.6 : (mapMode === 'electoral' ? 0.8 : 0.4), weight: 2 });
                    l.bringToFront();
                },
                mouseout: (e) => {
                    const l = e.target;
                    const baseStyle = getFeatureStyle(feature);
                    l.setStyle(baseStyle);
                },
                dblclick: (e) => {
                    L.DomEvent.stopPropagation(e); // Stop map zoom

                    if (isColony) {
                        // For now no navigation for Colonies, maybe later
                        return;
                    }

                    // Section Navigation
                    const realSectionId = feature.properties.id;
                    if (mapMode === 'coverage') {
                        navigate(`/agenda?section=${realSectionId}`);
                    } else if (mapMode === 'interactions') {
                        navigate(`/activities?section=${realSectionId}`);
                    }
                }
            });
        }
    };

    return (
        <div className={`w-full h-full rounded-xl overflow-hidden shadow-2xl border transition-colors duration-500 relative ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-100'}`}>
            <style>{getThemeStyles(theme)}</style>

            {/* --- GLASSMORPHIC SIDEBAR --- */}
            {!isGuest && (
                <>
                    <div
                        className={`absolute ${controlsClass || 'left-4'} top-28 md:top-4 bottom-4 z-500 transition-all duration-300 flex flex-col pointer-events-none ${isSidebarOpen ? 'w-72' : 'w-0'}`}
                    >
                        {/* Content Container */}
                        <div
                            className={`h-full flex flex-col shadow-xl rounded-2xl overflow-hidden pointer-events-auto transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'} ${theme === 'dark' ? 'bg-slate-900/95 border border-slate-700' : 'bg-white/95 border border-white/50'}`}
                        >

                            {/* Header */}
                            <div className={`p-4 flex justify-between items-center shadow-sm ${theme === 'dark' ? 'bg-indigo-900/80 text-white' : 'bg-blue-600 text-white'}`}>
                                <div className="flex items-center gap-2">
                                    <Layers size={18} />
                                    <h3 className="font-bold text-sm">Filtros de Mapa</h3>
                                </div>
                                <button onClick={() => setIsSidebarOpen(false)} className="text-white opacity-80 hover:opacity-100">
                                    <EyeOff size={16} />
                                </button>
                            </div>

                            {/* Stats Summary */}
                            <div className={`px-4 py-3 border-b flex justify-between text-xs font-medium ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-blue-300' : 'bg-blue-50 border-blue-600 text-blue-800'}`}>
                                <span>Total Secciones: {allFeatures.length}</span>
                                <span>Visibles: {displayData?.features.length || 0}</span>
                            </div>




                            {/* VIEW MODE TOGGLE */}
                            <div className={`p-4 border-b space-y-2 ${theme === 'dark' ? 'border-slate-700 bg-transparent' : 'border-gray-200 bg-transparent'}`}>
                                <h4 className={`text-xs font-bold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Indicadores</h4>
                                <div className={`flex p-1 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'}`}>
                                    {['coverage', 'electoral', 'interactions'].map(mode => (
                                        <button
                                            key={mode}
                                            onClick={() => setMapMode(mode as any)}
                                            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all capitalize ${mapMode === mode
                                                ? (theme === 'dark' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white shadow-sm text-blue-600')
                                                : (theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-700')}`}
                                        >
                                            {mode === 'interactions' ? 'Toques' : mode}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* LEGEND: Heatmap Symbology */}
                            {mapMode === 'coverage' && (
                                <div className={`px-4 py-3 border-b ${theme === 'dark' ? 'border-slate-700 bg-transparent' : 'border-gray-200 bg-white'}`}>
                                    <h4 className={`text-xs font-bold mb-2 uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Intensidad (Simpatizantes)</h4>
                                    <div className="flex flex-col gap-1">
                                        <div
                                            className="h-2 w-full rounded-full transition-all duration-500"
                                            style={{ background: HEATMAP_CONFIG[theme].cssGradient }} // Uses config gradient
                                        />
                                        <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                                            <span>{HEATMAP_CONFIG[theme].labels[0]}</span>
                                            <span>{HEATMAP_CONFIG[theme].labels[1]}</span>
                                            <span>{HEATMAP_CONFIG[theme].labels[2]}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* LEGEND: Interactions */}
                            {mapMode === 'interactions' && (
                                <div className={`px-4 py-3 border-b ${theme === 'dark' ? 'border-slate-700 bg-transparent' : 'border-gray-200 bg-white'}`}>
                                    <h4 className={`text-xs font-bold mb-2 uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Tipos de Interacción</h4>
                                    <div className={`grid grid-cols-2 gap-2 text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                                        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> Reunión</div>
                                        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Evento</div>
                                        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Recorrido</div>
                                        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-gray-500"></span> Otro</div>
                                    </div>
                                </div>
                            )}

                            {/* Checkbox List */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                                <div
                                    onClick={toggleAll}
                                    className={`flex items-center p-2 rounded-lg cursor-pointer transition-all ${visibleDistricts.length === availableDistricts.length
                                        ? (theme === 'dark' ? 'bg-indigo-900/40 text-blue-300' : 'bg-blue-50')
                                        : (theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-gray-50')
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center mr-3 ${visibleDistricts.length === availableDistricts.length
                                        ? 'bg-blue-600 border-blue-600'
                                        : (theme === 'dark' ? 'border-slate-600' : 'border-gray-300')
                                        }`}>
                                        {visibleDistricts.length === availableDistricts.length && <div className="w-2 h-2 bg-white rounded-sm" />}
                                    </div>
                                    <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>Todos los Distritos</span>
                                </div>

                                <div className={`h-px my-2 mx-1 ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'}`} />

                                {availableDistricts.map(d => {
                                    const isSelected = visibleDistricts.includes(d);
                                    return (
                                        <div
                                            key={d}
                                            onClick={() => toggleDistrict(d)}
                                            className={`flex items-center p-2 rounded-lg cursor-pointer transition-all ${isSelected
                                                ? (theme === 'dark' ? 'bg-indigo-900/40' : 'bg-blue-50')
                                                : (theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-gray-50')
                                                }`}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center mr-3 ${isSelected
                                                ? 'bg-blue-600 border-blue-600'
                                                : (theme === 'dark' ? 'border-slate-600' : 'border-gray-300')
                                                }`}>
                                                {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                                            </div>
                                            <label className={`text-sm cursor-pointer select-none flex-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Distrito {d}</label>
                                        </div>
                                    );
                                })}
                                {availableDistricts.length === 0 && !isLoading && (
                                    <div className={`p-4 text-center text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>No se encontraron distritos</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* --- TOGGLE BUTTON (When Sidebar Closed) --- */}
                    {
                        !isSidebarOpen && (
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className={`absolute ${controlsClass || 'left-4'} top-4 z-500 backdrop-blur shadow-lg p-2 rounded-xl border transition-all ${theme === 'dark' ? 'bg-slate-900/80 text-blue-400 border-slate-700' : 'bg-white/80 text-blue-600 border-gray-200'}`}
                                title="Mostrar Filtros"
                            >
                                <Layers size={20} />
                            </button>
                        )
                    }

                    {/* --- TOP RIGHT CONTROLS --- */}
                    <div className="absolute right-4 top-4 flex flex-col gap-2 z-500">
                        <div className={`backdrop-blur shadow-lg rounded-xl overflow-hidden border flex flex-col ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700' : 'bg-white/80 border-gray-200'}`}>
                            <button
                                onClick={() => {
                                    setIsLoading(true);
                                    setTimeout(() => setIsLoading(false), 500);
                                }}
                                className={`p-2 border-b transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-white border-slate-700' : 'text-gray-600 hover:bg-gray-50 border-gray-200'}`}
                                title="Recargar Capa"
                            >
                                <RefreshCw size={20} />
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* --- LOADING / ERROR STATES --- */}
            {
                isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-1000 bg-black/10 backdrop-blur-sm">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                        <span className={`font-semibold shadow-sm px-3 py-1 rounded-full ${theme === 'dark' ? 'bg-slate-800 text-blue-400' : 'bg-white text-blue-800'}`}>Cargando mapa...</span>
                    </div>
                )
            }

            {
                errorMsg && (
                    <div className="absolute inset-0 flex items-center justify-center z-1000 pointer-events-none">
                        <div className={`border px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 pointer-events-auto max-w-md ${theme === 'dark' ? 'bg-slate-900 border-red-900 text-red-400' : 'bg-white border-red-200 text-red-700'}`}>
                            <AlertCircle size={24} className="shrink-0" />
                            <div>
                                <h4 className="font-bold">Error de Carga</h4>
                                <p className="text-sm">{errorMsg}</p>
                            </div>
                        </div>
                    </div>
                )
            }


            {/* --- MAP --- */}
            <div className="w-full h-full z-0">
                <MapContainer
                    // key={theme} // REMOVED: Prevent remounting on theme change to avoid LatLng errors
                    center={[20.5888, -100.3899]}
                    zoom={10}
                    style={{ height: '100%', width: '100%', outline: 'none', background: 'transparent' }}
                    zoomControl={false}
                    className="isolate"
                >
                    <MapController isGuest={isGuest} />
                    <FocusController focusSectionId={focusSectionId} features={allFeatures} />
                    {/* 
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    */}

                    <TileLayer
                        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                        url={theme === 'dark'
                            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        }
                    />

                    <LayersControl position="bottomright">
                        <LayersControl.BaseLayer checked name="Mapa Base">
                            <TileLayer
                                url={theme === 'dark'
                                    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                                }
                            />
                        </LayersControl.BaseLayer>
                        <LayersControl.BaseLayer name="Satélite">
                            <TileLayer
                                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            />
                        </LayersControl.BaseLayer>

                        {displayData && !isLoading && (
                            <LayersControl.Overlay checked name="Distritos">
                                <GeoJSON
                                    key={`${JSON.stringify(visibleDistricts)}-${mapMode}-${theme}`}
                                    data={displayData}
                                    style={getFeatureStyle}
                                    onEachFeature={onEachFeature}
                                />
                            </LayersControl.Overlay>
                        )}

                        <LayersControl.Overlay checked={mapMode === 'coverage'} name="Mapa de Calor">
                            <HeatmapLayer points={heatmapPoints} theme={theme} />
                        </LayersControl.Overlay>

                        {/* Interactions Layers Split by Type for Filtering */}
                        <LayersControl.Overlay checked={mapMode === 'interactions'} name="Reuniones">
                            <LayerGroup>
                                {bitacoras.filter(b => b.tipo === 'reunion_vecinal').map((log) => log.lat && log.lng && (
                                    <CircleMarker
                                        key={log.id}
                                        center={[log.lat, log.lng]}
                                        pathOptions={{ fillColor: '#22c55e', color: 'white', weight: 1, opacity: 1, fillOpacity: 0.8 }}
                                        radius={6}
                                    >
                                        <Popup>
                                            <div className="p-2 min-w-[150px]">
                                                <b className="text-green-600 block mb-1">Reunión Vecinal</b>
                                                <span className="text-xs text-gray-500 block mb-2">{new Date(log.created_at).toLocaleDateString()}</span>
                                                <p className="text-xs">{log.descripcion}</p>
                                                {log.aforo && <span className="text-xs font-bold mt-1 block">👥 {log.aforo} pax</span>}
                                            </div>
                                        </Popup>
                                    </CircleMarker>
                                ))}
                            </LayerGroup>
                        </LayersControl.Overlay>

                        <LayersControl.Overlay checked={mapMode === 'interactions'} name="Eventos">
                            <LayerGroup>
                                {bitacoras.filter(b => b.tipo === 'evento_publico').map((log) => log.lat && log.lng && (
                                    <CircleMarker
                                        key={log.id}
                                        center={[log.lat, log.lng]}
                                        pathOptions={{ fillColor: '#a855f7', color: 'white', weight: 1, opacity: 1, fillOpacity: 0.8 }}
                                        radius={6}
                                    >
                                        <Popup>
                                            <div className="p-2 min-w-[150px]">
                                                <b className="text-purple-600 block mb-1">Evento Público</b>
                                                <span className="text-xs text-gray-500 block mb-2">{new Date(log.created_at).toLocaleDateString()}</span>
                                                <p className="text-xs">{log.descripcion}</p>
                                                {log.aforo && <span className="text-xs font-bold mt-1 block">👥 {log.aforo} pax</span>}
                                            </div>
                                        </Popup>
                                    </CircleMarker>
                                ))}
                            </LayerGroup>
                        </LayersControl.Overlay>

                        <LayersControl.Overlay checked={mapMode === 'interactions'} name="Recorridos">
                            <LayerGroup>
                                {bitacoras.filter(b => b.tipo === 'recorrido').map((log) => log.lat && log.lng && (
                                    <CircleMarker
                                        key={log.id}
                                        center={[log.lat, log.lng]}
                                        pathOptions={{ fillColor: '#3b82f6', color: 'white', weight: 1, opacity: 1, fillOpacity: 0.8 }}
                                        radius={6}
                                    >
                                        <Popup>
                                            <div className="p-2 min-w-[150px]">
                                                <b className="text-blue-600 block mb-1">Recorrido</b>
                                                <span className="text-xs text-gray-500 block mb-2">{new Date(log.created_at).toLocaleDateString()}</span>
                                                <p className="text-xs">{log.descripcion}</p>
                                            </div>
                                        </Popup>
                                    </CircleMarker>
                                ))}
                            </LayerGroup>
                        </LayersControl.Overlay>

                        <LayersControl.Overlay checked={mapMode === 'interactions'} name="Otros">
                            <LayerGroup>
                                {bitacoras.filter(b => b.tipo === 'otro').map((log) => log.lat && log.lng && (
                                    <CircleMarker
                                        key={log.id}
                                        center={[log.lat, log.lng]}
                                        pathOptions={{ fillColor: '#6b7280', color: 'white', weight: 1, opacity: 1, fillOpacity: 0.8 }}
                                        radius={6}
                                    >
                                        <Popup>
                                            <div className="p-2 min-w-[150px]">
                                                <b className="text-gray-600 block mb-1">Otro</b>
                                                <span className="text-xs text-gray-500 block mb-2">{new Date(log.created_at).toLocaleDateString()}</span>
                                                <p className="text-xs">{log.descripcion}</p>
                                            </div>
                                        </Popup>
                                    </CircleMarker>
                                ))}
                            </LayerGroup>
                        </LayersControl.Overlay>
                        <LayersControl.Overlay checked name="Líderes">
                            <LayerGroup>
                                {lideres.map((lider) => (
                                    lider.lat && lider.lng && (
                                        <Marker
                                            key={lider.id}
                                            position={[lider.lat, lider.lng]}
                                            icon={createLeaderIcon(currentTheme.colors.primary)}
                                        >
                                            <Popup>
                                                <b>{lider.nombre}</b><br />
                                                {lider.telefono && <span>📞 {lider.telefono}<br /></span>}
                                            </Popup>
                                        </Marker>
                                    )
                                ))}
                            </LayerGroup>
                        </LayersControl.Overlay>
                    </LayersControl >

                    {displayData && <MapBounds data={displayData} />}
                </MapContainer >
            </div >
        </div >
    );
};

export default MapView;
