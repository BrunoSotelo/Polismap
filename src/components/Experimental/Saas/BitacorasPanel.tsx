import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Home, Users, CheckCircle2, Phone, Filter } from 'lucide-react';

interface Activity {
    id: string;
    tipo: 'reunion_vecinal' | 'evento_publico' | 'recorrido' | 'otro';
    titulo?: string;
    descripcion: string;
    fecha: string;
    created_at: string;
    status: 'completada' | 'pendiente';
    user_id: string;
    seccion_id?: number | null;
    aforo?: number;
}

const BitacorasPanel = () => {

    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'todos' | 'reunion_vecinal' | 'evento_publico' | 'recorrido'>('todos');

    useEffect(() => {
        fetchActivities();
    }, []);

    const fetchActivities = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('bitacoras')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20); // Limit for the floating panel to avoid performance hit

            if (error) throw error;
            setActivities(data as Activity[]);
        } catch (err) {
            console.error('Error fetching activities:', err);
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const filtered = activities.filter(a => filter === 'todos' || a.tipo === filter);

    const getIcon = (type: string) => {
        switch (type) {
            case 'reunion_vecinal': return <Home className="w-4 h-4 text-green-400" />;
            case 'evento_publico': return <Users className="w-4 h-4 text-purple-400" />;
            case 'recorrido': return <Phone className="w-4 h-4 text-blue-400" />;
            default: return <CheckCircle2 className="w-4 h-4 text-gray-400" />;
        }
    };

    return (
        <div className="fixed right-6 top-20 bottom-12 w-96 z-[1050] flex flex-col pointer-events-none">
            {/* The Container is pointer-events-none to not block map, but children are auto */}

            <div className="pointer-events-auto flex flex-col h-full bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-right-10 fade-in duration-500">

                {/* Header */}
                <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center shrink-0">
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Bitácora en Vivo
                    </h2>
                    <div className="flex gap-1">
                        <button
                            onClick={fetchActivities}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                            title="Recargar"
                        >
                            <Filter size={14} />
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="p-2 border-b border-white/5 flex gap-1 shrink-0 overflow-x-auto custom-scrollbar">
                    {['todos', 'reunion_vecinal', 'evento_publico'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`
                                px-3 py-1 text-[10px] uppercase font-bold rounded-lg border transition-all whitespace-nowrap
                                ${filter === f
                                    ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                                    : 'border-transparent text-slate-500 hover:bg-white/5 hover:text-slate-300'}
                            `}
                        >
                            {f.replace('_', ' ')}
                        </button>
                    ))}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500 text-xs">Sincronizando...</div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {filtered.map(act => (
                                <div key={act.id} className="p-4 hover:bg-white/5 transition-colors group cursor-pointer">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-md bg-slate-900 border border-slate-800 group-hover:border-slate-700 transition-colors">
                                                {getIcon(act.tipo)}
                                            </div>
                                            <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">
                                                {act.tipo.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-500">
                                            {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed pl-9 group-hover:text-slate-300">
                                        {act.descripcion}
                                    </p>

                                    {act.aforo && (
                                        <div className="mt-2 pl-9 flex items-center gap-2">
                                            <span className="text-[10px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                                                👥 {act.aforo} Pax
                                            </span>
                                            {act.seccion_id && (
                                                <span className="text-[10px] text-blue-500">
                                                    Sección {act.seccion_id}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Input Placeholder */}
                <div className="p-3 border-t border-white/10 shrink-0 bg-slate-900/50">
                    <button className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98]">
                        + Registrar Actividad
                    </button>
                </div>

            </div>
        </div>
    );
};

export default BitacorasPanel;
