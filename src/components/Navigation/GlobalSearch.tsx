import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, User, Loader2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export const GlobalSearch = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Debounce Logic
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim().length > 1) {
                performSearch(query);
            } else {
                setResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: any) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const performSearch = async (searchTerm: string) => {
        setLoading(true);
        setIsOpen(true);
        try {
            // Search Leaders
            const { data: leaders } = await supabase
                .from('lideres')
                .select('id, nombre, distrito_id')
                .ilike('nombre', `%${searchTerm}%`)
                .limit(3);

            // Search Sections
            // Check if search term is a number
            let sections: any[] = [];
            if (!isNaN(Number(searchTerm))) {
                const { data: sec } = await supabase
                    .from('secciones_electorales')
                    .select('id, distrito, municipio')
                    .eq('id', parseInt(searchTerm))
                    .limit(1);
                if (sec) sections = sec;
            } else {
                // Optional: Search by municipality?
            }

            const sectionsList = (sections || []).map(s => ({ type: 'section', ...(s as any) }));
            const leadersList = (leaders || []).map(l => ({ type: 'leader', ...(l as any) }));
            const combined = [...sectionsList, ...leadersList];
            setResults(combined);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (item: any) => {
        if (item.type === 'section') {
            navigate(`/dashboard?focus_section=${item.id}`);
        } else {
            navigate(`/directorio?search=${encodeURIComponent(item.nombre)}`);
        }
        setIsOpen(false);
        setQuery('');
    };

    return (
        <div ref={wrapperRef} className="relative block z-50 w-full md:w-auto">
            <div className="flex items-center bg-slate-100/80 backdrop-blur-sm rounded-full px-4 py-2 w-full md:w-64 border border-transparent focus-within:border-blue-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all shadow-sm">
                {loading ? <Loader2 size={16} className="text-blue-500 mr-2 animate-spin" /> : <Search size={16} className="text-slate-400 mr-2" />}
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => { if (results.length > 0) setIsOpen(true); }}
                    placeholder="Buscar líder o sección..."
                    className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder:text-slate-400"
                />
                {query && (
                    <button onClick={() => { setQuery(''); setResults([]); }} className="text-slate-400 hover:text-slate-600">
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Dropdown Results */}
            {isOpen && results.length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden">
                    <div className="py-2">
                        {results.map((item, idx) => (
                            <button
                                key={`${item.type}-${item.id}-${idx}`}
                                onClick={() => handleSelect(item)}
                                className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 border-b border-gray-50 last:border-0"
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${item.type === 'section' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {item.type === 'section' ? <MapPin size={16} /> : <User size={16} />}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-800">
                                        {item.type === 'section' ? `Sección ${item.id}` : item.nombre}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {item.type === 'section' ? `Distrito ${item.distrito} • ${item.municipio || 'Querétaro'}` : `Líder D${item.distrito_id || '?'}`}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
