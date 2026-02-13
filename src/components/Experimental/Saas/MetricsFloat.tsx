import { useEffect, useState } from 'react';
import { Users, UserCheck, Map as MapIcon, Activity, Moon, Sun } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface MetricsFloatProps {
    visibleDistricts?: number[];
    activeTheme: 'light' | 'dark';
    onToggleTheme: () => void;
}

const MetricsFloat = ({ visibleDistricts = [], activeTheme, onToggleTheme }: MetricsFloatProps) => {
    const [counts, setCounts] = useState({
        simpatizantes: 0,
        lideres: 0,
        cobertura: 0,
        toques: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                setLoading(true);

                // Helper to build query with optional district filter
                const buildQuery = (table: string, districtCol: string, countCol = 'exact') => {
                    let query = supabase.from(table).select('*', { count: countCol as any, head: true });

                    if (visibleDistricts.length > 0) {
                        query = query.in(districtCol, visibleDistricts);
                    }
                    return query;
                };

                const [resSimp, resLid, resBit, resSec] = await Promise.all([
                    buildQuery('affinities', 'distrito_id'),
                    buildQuery('lideres', 'distrito_id'),
                    buildQuery('bitacoras', 'distrito_id'),
                    buildQuery('secciones_electorales', 'distrito')
                ]);

                // Calculate metrics
                const countSimpatizantes = resSimp.count || 0;
                const countLideres = resLid.count || 0;
                const countBitacoras = resBit.count || 0;
                const countSecciones = resSec.count || 0;

                // Mock coverage calculation (density heuristic)
                const targetPerSection = 150;
                const estimatedCoverage = countSecciones ? Math.round((countSimpatizantes / (countSecciones * targetPerSection)) * 100) : 0;

                setCounts({
                    simpatizantes: countSimpatizantes,
                    lideres: countLideres,
                    toques: countBitacoras,
                    cobertura: Math.min(estimatedCoverage, 100)
                });
            } catch (error) {
                console.error("Error fetching metrics:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, [visibleDistricts]);

    const stats = [
        { label: 'Simpatizantes', value: loading ? '...' : counts.simpatizantes.toLocaleString(), sub: 'Total Registrado', icon: Users, color: 'primary' },
        { label: 'Líderes', value: loading ? '...' : counts.lideres.toLocaleString(), sub: 'Activos', icon: UserCheck, color: 'accent' },
        { label: 'Cobertura', value: loading ? '...' : `${counts.cobertura}%`, sub: 'Estimada', icon: MapIcon, color: 'emerald' },
        { label: 'Toques', value: loading ? '...' : counts.toques.toLocaleString(), sub: 'Bitácoras', icon: Activity, color: 'purple' },
    ];

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[1100] flex gap-4 pointer-events-none">
            <div className="bg-[var(--ds-color-surface)]/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-2 pl-4 pr-2 flex items-center gap-2 transition-all hover:bg-[var(--ds-color-surface)]/90 pointer-events-auto">

                <h1 className="text-white/50 font-bold text-sm tracking-widest mr-4 uppercase border-r border-white/10 pr-4 py-2 flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                    GIS Político
                </h1>

                <div className="flex gap-2">
                    {stats.map((stat, idx) => {
                        const Icon = stat.icon;
                        const colorMap: any = {
                            primary: 'text-primary bg-primary/10 hover:bg-primary/20',
                            accent: 'text-accent bg-accent/10 hover:bg-accent/20',
                            emerald: 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20',
                            purple: 'text-purple-400 bg-purple-500/10 hover:bg-purple-500/20',
                        };

                        return (
                            <button key={idx} className="group flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-white/5 active:scale-95">
                                <div className={`p-2 rounded-lg ${colorMap[stat.color]} transition-colors`}>
                                    <Icon size={16} />
                                </div>
                                <div className="text-left">
                                    <div className="text-lg font-bold text-white leading-none tracking-tight">
                                        {stat.value}
                                    </div>
                                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide group-hover:text-slate-300">
                                        {stat.label}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Functional Toolbar */}
            <div className="bg-[var(--ds-color-surface)]/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-2 flex items-center gap-1 pointer-events-auto">
                <button
                    onClick={onToggleTheme}
                    className="p-2 text-slate-400 hover:text-yellow-400 hover:bg-white/10 rounded-xl transition-all"
                    title={activeTheme === 'dark' ? "Modo Claro" : "Modo Oscuro"}
                >
                    {activeTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <div className="w-px h-6 bg-white/10 mx-1"></div>
                <button className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all" title="Descargar Reporte">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                </button>
            </div>
        </div>
    );
};

export default MetricsFloat;
