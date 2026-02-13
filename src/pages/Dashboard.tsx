import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import MapView from '../components/Map/MapView';
import StatsCard from '../components/StatsCard';
import { ScanIneModal, ScanIneForm } from '../components/ScanIneModal';
import { NewEntryModal } from '../components/Registration/NewEntryModal';
import { LeaderForm } from '../components/Registration/LeaderForm';
import { LogForm } from '../components/Registration/LogForm';
import { BatchUpload } from '../components/Registration/BatchUpload';
import { Users, Map as MapIcon, Target, Activity, Plus, ClipboardList, Maximize2, Minimize2, Sun, Moon } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Dashboard: React.FC = () => {
    const [searchParams] = useSearchParams();
    const focusSectionId = searchParams.get('focus_section');
    // Modal Management
    const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
    const [isScanModalOpen, setIsScanModalOpen] = useState(false); // Kept for fallback or direct use
    const [isInlineScanOpen, setIsInlineScanOpen] = useState(false);
    // Placeholder states for future implementation
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [isLeaderModalOpen, setIsLeaderModalOpen] = useState(false);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);

    // UI States
    const [isVisualMode, setIsVisualMode] = useState(false);
    const [mapTheme, setMapTheme] = useState<'light' | 'dark'>('light');

    const [stats, setStats] = useState({
        simpatizantes: 0,
        lideres: 0,
        seccionesActivas: 0,
        cobertura: 0,
        interactions: 0, // New stat
        metaMensual: 75
    });

    const [mapFilters, setMapFilters] = useState<number[]>([]);

    const fetchStats = async (filters: number[] = mapFilters) => {
        // If no districts are selected (and we are driven by map), show 0.
        // But initially it might be empty before map loads.
        // Let's assume MapView fires initially with available districts.
        if (filters.length === 0) {
            setStats(prev => ({ ...prev, simpatizantes: 0, lideres: 0, interactions: 0, seccionesActivas: 0, cobertura: 0 }));
            return;
        }

        try {
            // 1. Simpatizantes (Affinities) - Filter by distrito_id
            const { count: simpatizantesCount } = await supabase
                .from('affinities')
                .select('*', { count: 'exact', head: true })
                .in('distrito_id', filters);

            // 2. Lideres (Leaders)
            const { count: lideresCount } = await supabase
                .from('lideres')
                .select('*', { count: 'exact', head: true })
                .in('distrito_id', filters);

            // 3. Bitacoras (Interactions)
            const { count: interactionsCount } = await supabase
                .from('bitacoras')
                .select('*', { count: 'exact', head: true })
                .in('distrito_id', filters);


            // 4. Active Sections (Distinct IDs from Affinities) - Filtered
            const { data: affinities } = await supabase
                .from('affinities')
                .select('seccion_id')
                .in('distrito_id', filters);

            const activeSections = new Set((affinities as any[])?.map(a => a.seccion_id).filter(Boolean)).size;

            // 5. Total Sections (for Coverage) - Filter by distrito
            const { count: totalSecciones } = await supabase
                .from('secciones_electorales')
                .select('*', { count: 'exact', head: true })
                .in('distrito', filters);

            const cobertura = totalSecciones ? Math.round((activeSections / totalSecciones) * 100) : 0;

            setStats(prev => ({
                ...prev,
                simpatizantes: simpatizantesCount || 0,
                lideres: lideresCount || 0,
                interactions: interactionsCount || 0,
                seccionesActivas: activeSections,
                cobertura
            }));

        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    // Re-fetch when map filters change
    useEffect(() => {
        // We only fetch if we have filters (or explicit empty array from map meaning 'none')
        // To avoid double fetch on mount, we rely on MapView triggering the initial change.
        fetchStats(mapFilters);
    }, [mapFilters]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: isVisualMode ? '0' : '1.5rem', position: 'relative' }}>

            {/* --- MODALS --- */}
            <NewEntryModal
                isOpen={isSelectionModalOpen}
                onClose={() => setIsSelectionModalOpen(false)}
                onSelectOption={(option) => {
                    setIsSelectionModalOpen(false);
                    if (option === 'scan') setIsInlineScanOpen(true);
                    if (option === 'batch') setIsBatchModalOpen(true);
                    if (option === 'leader') setIsLeaderModalOpen(true);
                    if (option === 'log') setIsLogModalOpen(true);
                }}
            />

            <ScanIneModal
                isOpen={isScanModalOpen}
                onClose={() => setIsScanModalOpen(false)}
                onSuccess={() => {
                    fetchStats();
                    console.log("Simpatizante guardado con éxito");
                }}
            />

            {/* Log Modal Wrapper */}
            {isLogModalOpen && (
                <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <LogForm
                        onClose={() => setIsLogModalOpen(false)}
                        onSuccess={() => {
                            setIsLogModalOpen(false);
                            fetchStats();
                            console.log("Bitácora guardada con éxito");
                        }}
                        className="max-h-[90vh]"
                    />
                </div>
            )}

            {/* Leader Modal Wrapper */}
            {isLeaderModalOpen && (
                <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <LeaderForm
                        onClose={() => setIsLeaderModalOpen(false)}
                        onSuccess={() => {
                            setIsLeaderModalOpen(false);
                            fetchStats();
                            console.log("Líder guardado con éxito");
                        }}
                        className="max-h-[90vh]"
                    />
                </div>
            )}

            <BatchUpload
                isOpen={isBatchModalOpen}
                onClose={() => setIsBatchModalOpen(false)}
                onSuccess={() => {
                    fetchStats();
                    console.log("Carga masiva completada");
                }}
            />

            {/* Top Stats Row (Compact) - Hidden in Visual Mode */}
            {!isVisualMode && (
                <div className="flex gap-4 overflow-x-auto pb-2 shrink-0 animate-in fade-in slide-in-from-top-4 duration-500">
                    <StatsCard
                        title="Simpatizantes"
                        value={stats.simpatizantes.toLocaleString()}
                        icon={Users}
                        trend="12%"
                        trendUp={true}
                        color="blue"
                        size="compact"
                    />
                    <StatsCard
                        title="Toques"
                        value={stats.interactions.toLocaleString()}
                        icon={ClipboardList} // Reuse or import correct icon
                        trend="Activo"
                        trendUp={true}
                        color="pink"
                        size="compact"
                    />
                    <StatsCard
                        title="Líderes"
                        value={stats.lideres.toLocaleString()}
                        icon={Activity}
                        trend="New"
                        trendUp={true}
                        color="orange"
                        size="compact"
                    />
                    <StatsCard
                        title="Cobertura"
                        value={`${stats.cobertura}%`}
                        icon={MapIcon}
                        trend="5%"
                        trendUp={true}
                        color="green"
                        size="compact"
                    />
                    <StatsCard
                        title="Secciones Activas"
                        value={stats.seccionesActivas.toString()}
                        icon={Target}
                        color="purple"
                        size="compact"
                    />
                </div>
            )}

            {/* Main Map Content */}
            <div className={`map-section transition-all duration-500 ease-in-out animate-in fade-in ${isVisualMode
                ? 'fixed inset-0 z-[2000] w-screen h-screen bg-white'
                : ''
                }`}>
                <div className={`map-header transition-all duration-300 ${isVisualMode
                    ? 'absolute bottom-20 right-4 z-[4000] flex flex-col gap-2' // Moved to Bottom Right FAB style
                    : ''
                    }`}>

                    {!isVisualMode && <h3 className="text-lg font-bold text-slate-800">Mapa de Cobertura</h3>}

                    <div className="flex gap-2 items-center">
                        {/* Theme Toggle - Only noticeable in Visual Mode usually, but good to have always accessible? 
                            Let's keep it next to Viz Mode toggler for now. 
                        */}
                        {/* Theme Toggle */}
                        {isVisualMode && (
                            <button
                                onClick={() => setMapTheme(prev => prev === 'light' ? 'dark' : 'light')}
                                className={`transition-all flex items-center justify-center shadow-lg ${isVisualMode ? 'w-12 h-12 rounded-full bg-white text-slate-700 border border-slate-200' : 'p-2 rounded-md bg-orange-50 text-orange-500'}`}
                                title="Cambiar Tema"
                            >
                                {mapTheme === 'light' ? <Sun size={24} /> : <Moon size={24} />}
                            </button>
                        )}

                        {/* New Entry FAB (Visual Mode) */}
                        <button
                            onClick={() => setIsSelectionModalOpen(true)}
                            className={`transition-all flex items-center justify-center shadow-lg w-14 h-14 rounded-full bg-blue-600 text-white border-4 border-blue-50/50 hover:scale-105 active:scale-95 mb-2`}
                            title="Nuevo Registro"
                        >
                            <Plus size={32} />
                        </button>

                        {/* Visualization Toggle (Exit) */}
                        <button
                            onClick={() => setIsVisualMode(!isVisualMode)}
                            className={`transition-all flex items-center justify-center gap-2 shadow-lg ${isVisualMode
                                ? 'w-14 h-14 rounded-full bg-slate-800 text-white border-4 border-slate-700 hover:scale-105 active:scale-95'
                                : 'p-2 rounded-md text-slate-500 hover:bg-slate-100'}`}
                            title={isVisualMode ? "Salir de Modo Visualización" : "Modo Visualización"}
                        >
                            {isVisualMode ? <Minimize2 size={28} /> : <Maximize2 size={20} />}
                            {/* {isVisualMode && <span className="text-xs font-bold ml-1">Salir</span>}  -- Icon only for FAB */}
                        </button>

                        {!isVisualMode && (
                            <button
                                onClick={() => setIsSelectionModalOpen(true)}
                                className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-1 shadow-sm"
                            >
                                <Plus className="w-3 h-3" />
                                Nuevo Registro
                            </button>
                        )}
                    </div>
                </div>

                {/* Inline Scanning Form - Only show in normal mode */}
                {isInlineScanOpen && !isVisualMode && (
                    <div className="animate-in slide-in-from-top duration-300">
                        <ScanIneForm
                            onClose={() => setIsInlineScanOpen(false)}
                            onSuccess={() => {
                                setIsInlineScanOpen(false);
                                fetchStats();
                            }}
                            className="border border-blue-200 shadow-xl mb-2"
                        />
                    </div>
                )}

                <div className={`map-wrapper transition-all duration-500 ${isVisualMode ? 'h-full rounded-none border-0' : ''}`}>
                    <MapView theme={mapTheme} onDistrictsChange={setMapFilters} focusSectionId={focusSectionId ? parseInt(focusSectionId) : undefined} />
                </div>
            </div>


        </div>
    );
};

export default Dashboard;
