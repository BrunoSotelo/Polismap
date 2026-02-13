import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    Phone,
    Home,
    Users,
    AlertTriangle,
    CheckCircle2,
    Filter,
    X,
    User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { BitacoraDetailModal } from '../components/BitacoraDetailModal';

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

const ActivityFeed: React.FC = () => {
    const { profile } = useAuth();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'todos' | 'reunion_vecinal' | 'evento_publico' | 'recorrido' | 'otro'>('todos');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [userMap, setUserMap] = useState<Record<string, string>>({});
    const [userFilter, setUserFilter] = useState<string>('all');
    const [selectedSection, setSelectedSection] = useState<number | null>(null);

    // ... (useEffect remains same) ...

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const sectionParam = params.get('section');
        if (sectionParam) {
            setSelectedSection(parseInt(sectionParam));
            setFilter('todos');
        }
        fetchActivities();
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        if (profile?.is_admin) {
            const { data } = await supabase.from('profiles').select('id, email');
            if (data) {
                const map: Record<string, string> = {};
                data.forEach((p: any) => map[p.id] = p.email);
                setUserMap(map);
            }
        }
    };

    const fetchActivities = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('bitacoras')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setActivities(data as Activity[]);
        } catch (err) {
            console.error('Error fetching activities:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredActivities = activities.filter(act => {
        const typeMatch = filter === 'todos' ? true : act.tipo === filter;
        const sectionMatch = selectedSection ? act.seccion_id === selectedSection : true;
        const userMatch = userFilter === 'all' || act.user_id === userFilter;
        return typeMatch && sectionMatch && userMatch;
    });

    const getIcon = (type: string) => {
        switch (type) {
            case 'reunion_vecinal': return <Home className="w-5 h-5 text-green-600" />;
            case 'evento_publico': return <Users className="w-5 h-5 text-purple-600" />;
            case 'recorrido': return <Phone className="w-5 h-5 text-blue-600" />; // Or Walk icon if available
            case 'otro': return <CheckCircle2 className="w-5 h-5 text-gray-600" />;
            default: return <AlertTriangle className="w-5 h-5 text-gray-400" />;
        }
    };

    const getColorClass = (type: string) => {
        switch (type) {
            case 'reunion_vecinal': return 'bg-green-100 border-green-200';
            case 'evento_publico': return 'bg-purple-100 border-purple-200';
            case 'recorrido': return 'bg-blue-100 border-blue-200';
            case 'otro': return 'bg-gray-100 border-gray-200';
            default: return 'bg-gray-50 border-gray-200';
        }
    };

    const getTitle = (act: Activity) => {
        switch (act.tipo) {
            case 'reunion_vecinal': return 'Reunión Vecinal';
            case 'evento_publico': return 'Evento Público';
            case 'recorrido': return 'Recorrido';
            case 'otro': return 'Otro';
            default: return 'Actividad General';
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto h-full overflow-hidden flex flex-col">
            {/* ... Modal ... */}
            {selectedId && (
                <BitacoraDetailModal
                    bitacoraId={selectedId}
                    onClose={() => setSelectedId(null)}
                    onUpdate={() => { fetchActivities(); }}
                />
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Bitácora de Actividades</h1>
                    <p className="text-slate-500 text-sm">Registro cronológico de interacciones</p>
                    {selectedSection && (
                        <div className="mt-2 inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100 animate-in fade-in">
                            Filtrando por Sección: {selectedSection}
                            <button onClick={() => { setSelectedSection(null); window.history.replaceState({}, '', '/activities'); }} className="hover:text-blue-900">
                                <X size={14} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Filter Bar */}
                <div className="flex flex-col gap-2">
                    <div className="flex gap-2 bg-white p-1 rounded-full border border-gray-200 shadow-sm overflow-x-auto">
                        <button
                            onClick={() => setFilter('todos')}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${filter === 'todos' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600 hover:bg-gray-100'}`}
                        >
                            Todas
                        </button>
                        <button
                            onClick={() => setFilter('reunion_vecinal')}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${filter === 'reunion_vecinal' ? 'bg-green-100 text-green-700 shadow-sm border border-green-200' : 'text-slate-600 hover:bg-gray-50'}`}
                        >
                            <span className={`w-2 h-2 rounded-full ${filter === 'reunion_vecinal' ? 'bg-green-500' : 'bg-green-400'}`}></span>
                            Reuniones
                        </button>
                        <button
                            onClick={() => setFilter('evento_publico')}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${filter === 'evento_publico' ? 'bg-purple-100 text-purple-700 shadow-sm border border-purple-200' : 'text-slate-600 hover:bg-gray-50'}`}
                        >
                            <span className={`w-2 h-2 rounded-full ${filter === 'evento_publico' ? 'bg-purple-500' : 'bg-purple-400'}`}></span>
                            Eventos
                        </button>
                        <button
                            onClick={() => setFilter('recorrido')}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${filter === 'recorrido' ? 'bg-blue-100 text-blue-700 shadow-sm border border-blue-200' : 'text-slate-600 hover:bg-gray-50'}`}
                        >
                            <span className={`w-2 h-2 rounded-full ${filter === 'recorrido' ? 'bg-blue-500' : 'bg-blue-400'}`}></span>
                            Recorridos
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Manual Section Filter */}
                        <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Sección:</span>
                            <input
                                type="number"
                                placeholder="#"
                                className="w-14 text-xs border-slate-200 rounded focus:ring-blue-500 focus:border-blue-500 py-0.5"
                                value={selectedSection || ''}
                                onChange={(e) => setSelectedSection(e.target.value ? parseInt(e.target.value) : null)}
                            />
                            {selectedSection && (
                                <button onClick={() => setSelectedSection(null)} className="text-slate-400 hover:text-slate-600">
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        {/* Admin User Filter */}
                        {profile?.is_admin && Object.keys(userMap).length > 0 && (
                            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Usuario:</span>
                                <select
                                    value={userFilter}
                                    onChange={(e) => setUserFilter(e.target.value)}
                                    className="text-xs border-slate-200 rounded focus:ring-blue-500 focus:border-blue-500 py-0.5 max-w-[120px]"
                                >
                                    <option value="all">Todos</option>
                                    {Object.entries(userMap).map(([uid, email]) => (
                                        <option key={uid} value={uid}>
                                            {email.split('@')[0]}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Timeline Content */}
            <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar relative">

                {loading ? (
                    <div className="flex items-center justify-center h-64 text-slate-400">
                        Cargando actividad...
                    </div>
                ) : filteredActivities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                        <Filter className="w-10 h-10 mb-2 opacity-20" />
                        <p>No hay actividades registradas con este filtro.</p>
                    </div>
                ) : (
                    <div className="relative pl-8 border-l-2 border-gray-100 space-y-8 py-2">
                        {filteredActivities.map((act) => (
                            <div key={act.id} className="relative group animate-in slide-in-from-bottom-2 duration-500">
                                {/* Timeline Dot */}
                                <div className={`absolute -left-[41px] top-4 w-5 h-5 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 ${(act.tipo as string) === 'incidencia' ? 'bg-red-500' :
                                    act.tipo === 'reunion_vecinal' ? 'bg-green-500' :
                                        act.tipo === 'evento_publico' ? 'bg-purple-500' :
                                            act.tipo === 'recorrido' ? 'bg-blue-500' : 'bg-slate-400'
                                    }`}>
                                </div>

                                {/* Card */}
                                <div
                                    onClick={() => setSelectedId(act.id)}
                                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow relative cursor-pointer active:scale-[0.99] transition-transform"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${getColorClass(act.tipo)}`}>
                                                {getIcon(act.tipo)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                    {getTitle(act)}
                                                    {/* AFORE BADGE */}
                                                    {act.aforo && act.aforo > 0 && (
                                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border border-slate-200">
                                                            <Users size={10} />
                                                            {act.aforo}
                                                        </span>
                                                    )}
                                                </h3>
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <span>{act.seccion_id ? `Sección ${act.seccion_id}` : 'Sin sección asignada'}</span>
                                                    <span>•</span>
                                                    <span>{new Date(act.fecha || act.created_at).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded flex items-center gap-2">
                                            {/* ADMIN ATTRIBUTION */}
                                            {profile?.is_admin && act.user_id && userMap[act.user_id] && (
                                                <span className="flex items-center gap-1 text-[10px] text-blue-600 font-bold border-r border-slate-200 pr-2 mr-1" title={userMap[act.user_id]}>
                                                    <User size={10} />
                                                    {userMap[act.user_id].split('@')[0]}
                                                </span>
                                            )}
                                            {new Date(act.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    {/* Description */}
                                    <p className="text-slate-600 text-sm leading-relaxed mb-3 pl-[52px] line-clamp-2">
                                        {act.descripcion}
                                    </p>

                                    {/* Hint */}
                                    <div className="pl-[52px] text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        Clic para ver detalles y editar
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Fade at bottom */}
                <div className="sticky bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none"></div>
            </div>
        </div>
    );
};

export default ActivityFeed;
