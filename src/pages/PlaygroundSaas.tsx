import { useState } from 'react';
import MapViewExperimental from '../components/Map/MapViewExperimental';
import SidebarFloating from '../components/Experimental/Saas/SidebarFloating';
import MetricsFloat from '../components/Experimental/Saas/MetricsFloat';
import AgendaPanel from '../components/Experimental/Saas/AgendaPanel';

const PlaygroundSaas = () => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'agenda' | 'bitacoras' | 'reportes'>('dashboard');

    return (
        <div className="w-screen h-screen bg-slate-950 relative overflow-hidden font-sans select-none">

            {/* 1. Background Layer: Full Screen Map */}
            {/* We use z-0 to keep it at the very bottom */}
            <div className="absolute inset-0 z-0">
                {/* 
                     We are reusing the existing experimental map. 
                     Ideally we would pass a prop to force 'dark' theme or specific config
                     but for now we rely on its internal state or default.
                     
                     NOTE: We might need to ensure the MapViewExperimental fills the container 100%.
                */}
                <div className="w-full h-full opacity-100 transition-opacity duration-700">
                    <MapViewExperimental />
                </div>

                {/* Gradient Overlay for better UI contrast - Reduced intensity */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-slate-950/20 pointer-events-none z-[5]" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/30 via-transparent to-transparent pointer-events-none z-[5]" />
            </div>

            {/* 2. UI Layer: Z-Index > 100 */}
            <div className="relative z-[100] w-full h-full pointer-events-none">

                {/* All interactive children must have pointer-events-auto */}
                <div className="pointer-events-auto">
                    <SidebarFloating activeTab={activeTab} onTabChange={setActiveTab} />
                </div>

                <div className="pointer-events-auto">
                    <MetricsFloat visibleDistricts={[]} activeTheme="dark" onToggleTheme={() => { }} />
                </div>

                {/* Contextual Panels based on Tab */}
                {activeTab === 'agenda' && (
                    <div className="pointer-events-auto">
                        <AgendaPanel />
                    </div>
                )}

                {/* Simulated Content for other tabs just to show change */}
                {activeTab === 'dashboard' && (
                    <div className="absolute bottom-12 right-12 max-w-sm pointer-events-auto animate-in slide-in-from-bottom-10 fade-in duration-700">
                        <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-2xl">
                            <h3 className="text-white font-bold text-lg mb-2">Resumen Territorial</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Se detecta una alta actividad en el <strong>Distrito 6</strong>.
                                La meta de cobertura ha alcanzado el <strong>65%</strong> en la zona norte.
                            </p>
                            <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 w-[65%] shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                            </div>
                        </div>
                    </div>
                )}

            </div>

        </div>
    );
};

export default PlaygroundSaas;
