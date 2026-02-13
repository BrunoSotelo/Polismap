import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Search, Filter, Phone, Calendar, Download, Edit2, Home, User } from 'lucide-react';
import { EditAgendaModal } from '../components/EditAgendaModal';

export interface AgendaItem {
    id: string;
    type: 'lider' | 'simpatizante';
    nombre: string;
    apellido_paterno?: string;
    apellido_materno?: string;

    // Address
    direccion?: string; // Legacy/Full string
    calle?: string;
    numero_exterior?: string;
    colonia?: string;
    cp?: string;
    municipio?: string;

    // Electoral / Personal
    seccion_id: number;
    curp?: string;
    clave_elector?: string;
    fecha_nacimiento?: string;
    edad?: number;
    genero?: string;
    vigencia?: string;

    // Contact
    telefono?: string;
    email?: string;

    fecha_registro?: string;
    meta_data?: any;
    user_id?: string; // For Admin Attribution
}

const Agenda = () => {
    const { profile } = useAuth();
    const [items, setItems] = useState<AgendaItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [tab, setTab] = useState<'all' | 'lideres' | 'simpatizantes'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [userMap, setUserMap] = useState<Record<string, string>>({});

    // Enhanced Filters
    const [sortOrder, setSortOrder] = useState<'date_desc' | 'date_asc' | 'alpha_asc'>('date_desc');
    const [userFilter, setUserFilter] = useState<string>('all');

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<AgendaItem | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch Lideres
            const { data: lideres, error: errL } = await supabase
                .from('lideres')
                .select('*');

            if (errL) console.error("Error fetching lideres:", errL);

            // Fetch Affinities (Simpatizantes)
            const { data: affinities, error: errA } = await supabase
                .from('affinities')
                .select('*');

            if (errA) console.error("Error fetching affinities:", errA);

            // Fetch Profiles if Admin (Attribution)
            let userEmailMap: Record<string, string> = {};
            if (profile?.is_admin) {
                const { data: profiles } = await supabase.from('profiles').select('id, email');
                if (profiles) {
                    (profiles as any[]).forEach(p => {
                        userEmailMap[p.id] = p.email;
                    });
                    setUserMap(userEmailMap);
                }
            }

            const normalized: AgendaItem[] = [];

            if (lideres) {
                lideres.forEach((l: any) => {
                    normalized.push({
                        id: l.id,
                        type: 'lider',
                        nombre: l.nombre || 'Sin Nombre',
                        seccion_id: l.seccion_id || 0,
                        direccion: l.direccion || '',
                        telefono: l.telefono || '',
                        email: l.email || '',
                        fecha_registro: l.created_at,
                        user_id: l.user_id
                    });
                });
            }

            if (affinities) {
                affinities.forEach((a: any) => {
                    normalized.push({
                        id: a.id,
                        type: 'simpatizante',
                        nombre: a.nombre || 'Sin Nombre',
                        apellido_paterno: a.apellido_paterno,
                        apellido_materno: a.apellido_materno,

                        seccion_id: a.seccion_id || 0,

                        // Address
                        direccion: a.direccion,
                        calle: a.calle,
                        numero_exterior: a.numero_exterior,
                        colonia: a.colonia,
                        cp: a.cp,
                        municipio: a.municipio,

                        // Personal
                        curp: a.curp,
                        clave_elector: a.clave_elector,
                        edad: a.edad,
                        genero: a.genero,
                        fecha_nacimiento: a.fecha_nacimiento,
                        vigencia: a.vigencia,

                        telefono: a.telefono,
                        fecha_registro: a.created_at,
                        meta_data: { in_url: a.ine_url },
                        user_id: a.user_id
                    });
                });
            }

            setItems(normalized);

        } catch (e) {
            console.error("Error loading agenda:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (item: AgendaItem) => {
        setSelectedItem(item);
        setIsEditModalOpen(true);
    };

    const [sectionFilter, setSectionFilter] = useState<string | null>(null);

    useEffect(() => {
        // Parse Query Params for automatic filtering
        const params = new URLSearchParams(window.location.search);
        const sectionParam = params.get('section');
        if (sectionParam) {
            setSectionFilter(sectionParam);
        }
    }, []);

    const getFullName = (item: AgendaItem) => {
        return [item.nombre, item.apellido_paterno, item.apellido_materno].filter(Boolean).join(' ');
    };

    const filteredItems = useMemo(() => {
        const lowerTerm = searchTerm.toLowerCase();

        const result = items.filter(item => {
            const matchesTab = tab === 'all' ||
                (tab === 'lideres' && item.type === 'lider') ||
                (tab === 'simpatizantes' && item.type === 'simpatizante');

            const fullName = `${item.nombre} ${item.apellido_paterno || ''} ${item.apellido_materno || ''}`.toLowerCase();
            const address = `${item.calle || ''} ${item.colonia || ''} ${item.direccion || ''}`.toLowerCase();
            const ids = `${item.curp || ''} ${item.clave_elector || ''} ${item.seccion_id}`.toLowerCase();

            const matchesSearch = fullName.includes(lowerTerm) ||
                address.includes(lowerTerm) ||
                ids.includes(lowerTerm) ||
                (item.telefono || '').includes(lowerTerm);

            const matchesSection = sectionFilter ? item.seccion_id.toString() === sectionFilter : true;

            // User Filter
            const matchesUser = userFilter === 'all' || item.user_id === userFilter;

            return matchesTab && matchesSearch && matchesSection && matchesUser;
        });

        // Apply Sorting
        return result.sort((a, b) => {
            if (sortOrder === 'alpha_asc') {
                const nameA = getFullName(a).toLowerCase();
                const nameB = getFullName(b).toLowerCase();
                return nameA.localeCompare(nameB);
            } else if (sortOrder === 'date_asc') {
                const dateA = new Date(a.fecha_registro || 0).getTime();
                const dateB = new Date(b.fecha_registro || 0).getTime();
                return dateA - dateB;
            } else {
                // date_desc (default)
                const dateA = new Date(a.fecha_registro || 0).getTime();
                const dateB = new Date(b.fecha_registro || 0).getTime();
                return dateB - dateA;
            }
        });
    }, [items, tab, searchTerm, sectionFilter, userFilter, sortOrder]);



    const getAddressDisplay = (item: AgendaItem) => {
        if (item.calle) {
            return (
                <div className="flex flex-col text-xs text-slate-600">
                    <span className="font-medium text-slate-700">{item.calle} {item.numero_exterior} {item.numero_exterior ? `#${item.numero_exterior}` : ''}</span>
                    {item.colonia && <span>Col. {item.colonia}</span>}
                    {item.municipio && <span className="text-[10px] text-slate-400">{item.municipio}, {item.cp}</span>}
                </div>
            );
        }
        return <span className="text-xs text-slate-600">{item.direccion || 'Sin dirección'}</span>;
    };

    const handleExport = () => {
        if (!filteredItems.length) return;

        // Flatten data for CSV
        const csvRows = [];

        // Headers
        const headers = [
            'ID', 'Tipo', 'Nombre', 'Paterno', 'Materno',
            'Teléfono', 'Email',
            'Calle', 'Num Ext', 'Colonia', 'CP', 'Municipio', 'Dirección Completa',
            'Sección', 'Clave Elector', 'CURP', 'Edad', 'Género', 'Fecha Nacimiento',
            'Fecha Registro'
        ];
        csvRows.push(headers.join(','));

        // Rows
        filteredItems.forEach(item => {
            const row = [
                item.id,
                item.type,
                `"${item.nombre || ''}"`,
                `"${item.apellido_paterno || ''}"`,
                `"${item.apellido_materno || ''}"`,
                `"${item.telefono || ''}"`,
                `"${item.email || ''}"`,
                `"${item.calle || ''}"`,
                `"${item.numero_exterior || ''}"`,
                `"${item.colonia || ''}"`,
                `"${item.cp || ''}"`,
                `"${item.municipio || ''}"`,
                `"${item.direccion || ''}"`,
                item.seccion_id,
                `"${item.clave_elector || ''}"`,
                `"${item.curp || ''}"`,
                item.edad || '',
                item.genero || '',
                item.fecha_nacimiento || '',
                item.fecha_registro || ''
            ];
            csvRows.push(row.join(','));
        });

        // Create blob and download
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `agenda_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col h-full gap-6">

            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Agenda Electoral</h1>
                    <p className="text-slate-500 text-sm">Directorio de líderes y nuevos simpatizantes</p>
                    {sectionFilter && (
                        <div className="mt-2 flex items-center gap-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold border border-blue-200 flex items-center gap-1">
                                Sección {sectionFilter}
                                <button onClick={() => setSectionFilter(null)} className="hover:bg-blue-200 rounded p-0.5"><div className="w-3 h-3 text-current">x</div></button>
                            </span>
                            <button onClick={() => setSectionFilter(null)} className="text-xs text-slate-400 hover:text-slate-600 underline">Borrar filtro</button>
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, calle, CURP..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 shadow-sm"
                        />
                    </div>
                    <button
                        onClick={fetchData}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 shadow-sm"
                        title="Recargar"
                    >
                        <Filter className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleExport}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 shadow-sm"
                        title="Exportar CSV"
                    >
                        <Download className="w-5 h-5" />
                    </button>
                </div>
            </div>



            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">Orden:</span>
                    <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as any)}
                        className="text-sm border-slate-200 rounded-md focus:ring-blue-500 focus:border-blue-500 py-1"
                    >
                        <option value="date_desc">Más Recientes</option>
                        <option value="date_asc">Más Antiguos</option>
                        <option value="alpha_asc">Alfabético (A-Z)</option>
                    </select>
                </div>

                <div className="h-6 w-px bg-slate-200 mx-2"></div>

                {/* Section Filter Manual Input */}
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">Sección:</span>
                    <input
                        type="number"
                        placeholder="#"
                        className="w-16 text-sm border-slate-200 rounded-md focus:ring-blue-500 focus:border-blue-500 py-1"
                        value={sectionFilter || ''}
                        onChange={(e) => setSectionFilter(e.target.value || null)}
                    />
                </div>

                {/* Admin User Filter */}
                {profile?.is_admin && Object.keys(userMap).length > 0 && (
                    <>
                        <div className="h-6 w-px bg-slate-200 mx-2"></div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">Subido por:</span>
                            <select
                                value={userFilter}
                                onChange={(e) => setUserFilter(e.target.value)}
                                className="text-sm border-slate-200 rounded-md focus:ring-blue-500 focus:border-blue-500 py-1 max-w-[150px]"
                            >
                                <option value="all">Todos</option>
                                {Object.entries(userMap).map(([uid, email]) => (
                                    <option key={uid} value={uid}>
                                        {email.split('@')[0]}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setTab('all')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${tab === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Todos
                </button>
                <button
                    onClick={() => setTab('lideres')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${tab === 'lideres' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    Líderes
                </button>
                <button
                    onClick={() => setTab('simpatizantes')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${tab === 'simpatizantes' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Simpatizantes
                </button>
            </div>

            {/* Table */}
            <div className="glass-panel rounded-xl shadow-lg border border-slate-200 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <th className="px-6 py-4">Persona</th>
                                <th className="px-6 py-4">Edad / Género</th>
                                <th className="px-6 py-4">Ubicación</th>
                                <th className="px-6 py-4">Datos INE</th>
                                <th className="px-6 py-4 text-center">Registro</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        Cargando agenda...
                                    </td>
                                </tr>
                            ) : filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        No se encontraron registros.
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => (
                                    <tr key={`${item.type}-${item.id}`} className="hover:bg-slate-50 transition-colors group">

                                        {/* NAME & TYPE */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm shrink-0 ${item.type === 'lider' ? 'bg-gradient-to-br from-orange-400 to-red-500' : 'bg-gradient-to-br from-blue-400 to-indigo-500'}`}>
                                                    {item.nombre ? item.nombre.charAt(0).toUpperCase() : '?'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{getFullName(item)}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${item.type === 'lider' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                                            {item.type}
                                                        </span>
                                                        {item.telefono && (
                                                            <div className="flex items-center gap-1 text-xs text-slate-500">
                                                                <Phone className="w-3 h-3" />
                                                                {item.telefono}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* AGE & GENDER */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-600">
                                                {item.edad ? (
                                                    <span className="font-semibold">{item.edad} años</span>
                                                ) : <span className="text-slate-400">-</span>}

                                                {item.genero && (
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${item.genero === 'H' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                                                        {item.genero}
                                                    </span>
                                                )}
                                            </div>
                                            {item.fecha_nacimiento && (
                                                <div className="text-[10px] text-slate-400 mt-1">
                                                    {new Date(item.fecha_nacimiento).toLocaleDateString()}
                                                </div>
                                            )}
                                        </td>

                                        {/* LOCATION */}
                                        <td className="px-6 py-4 max-w-[200px]">
                                            <div className="flex items-start gap-2">
                                                <Home className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                                {getAddressDisplay(item)}
                                            </div>
                                        </td>

                                        {/* INE DATA */}
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-xs">
                                                    <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono font-bold">
                                                        SEC {item.seccion_id}
                                                    </span>
                                                </div>
                                                {item.curp && (
                                                    <div className="text-[10px] font-mono text-slate-500" title="CURP">
                                                        {item.curp}
                                                    </div>
                                                )}
                                                {item.clave_elector && (
                                                    <div className="text-[10px] font-mono text-slate-500 truncate max-w-[120px]" title="Clave Elector">
                                                        INE: {item.clave_elector}
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* REGISTRATION DATE */}
                                        <td className="px-6 py-4 text-center text-slate-500 text-xs">
                                            <div className="flex flex-col items-center justify-center gap-1">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(item.fecha_registro || Date.now()).toLocaleDateString()}
                                                </div>
                                                {/* ADMIN ATTRIBUTION */}
                                                {profile?.is_admin && item.user_id && userMap[item.user_id] && (
                                                    <span className="flex items-center gap-1 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200 mt-1" title={`Subido por: ${userMap[item.user_id]}`}>
                                                        <User className="w-2.5 h-2.5" />
                                                        {userMap[item.user_id].split('@')[0]}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* ACTIONS */}
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="text-slate-400 hover:text-blue-600 transition-colors p-2 hover:bg-blue-50 rounded-full"
                                                title="Editar"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <EditAgendaModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={() => {
                    fetchData(); // Refresh list after edit
                }}
                item={selectedItem}
            />

        </div >
    );
};

export default Agenda;
