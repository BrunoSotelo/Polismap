import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Loader2, TrendingUp, Users, Calendar } from 'lucide-react';

import { ReportGenerator } from '../components/Reporting/ReportGenerator';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function Reports() {
    // ... existing state hooks ...
    const [isLoading, setIsLoading] = useState(true);
    const [affinities, setAffinities] = useState<any[]>([]);
    const [bitacoras, setBitacoras] = useState<any[]>([]);

    useEffect(() => {
        // ... existing loadData logic ...
        const loadData = async () => {
            setIsLoading(true);
            try {
                // Fetch Affinities
                const { data: affData } = await supabase.from('affinities').select('*');
                if (affData) setAffinities(affData);

                // Fetch Bitacoras
                const { data: logData } = await supabase.from('bitacoras').select('*');
                if (logData) setBitacoras(logData);

            } catch (error) {
                console.error("Error loading reports data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    // --- Process Data for Charts ---

    // 1. Affinities by District (Estimated via Section)
    const affinitiesBySection = useMemo(() => {
        const counts: Record<string, number> = {};
        affinities.forEach(a => {
            const sec = a.seccion_id || 'Sin Sección';
            counts[sec] = (counts[sec] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([name, value]) => ({ name: `Sec ${name}`, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    }, [affinities]);

    // 2. Gender Distribution
    const genderData = useMemo(() => {
        const counts: Record<string, number> = { H: 0, M: 0, Otro: 0 };
        affinities.forEach(a => {
            const g = a.genero === 'H' ? 'H' : a.genero === 'M' ? 'M' : 'Otro';
            counts[g]++;
        });
        return [
            { name: 'Hombres', value: counts.H },
            { name: 'Mujeres', value: counts.M },
        ];
    }, [affinities]);

    // 3. Activity Over Time (Last 30 Days)
    const activityData = useMemo(() => {
        const days: Record<string, number> = {};
        const now = new Date();

        // Init last 30 days 0
        for (let i = 0; i < 30; i++) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            days[d.toISOString().split('T')[0]] = 0;
        }

        bitacoras.forEach(b => {
            if (!b.fecha) return;
            const dateStr = b.fecha.split('T')[0];
            if (days[dateStr] !== undefined) {
                days[dateStr]++;
            }
        });

        return Object.entries(days)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(d => ({ ...d, date: d.date.slice(5) })); // MM-DD
    }, [bitacoras]);

    // 4. Activity by Type
    const activityByType = useMemo(() => {
        const counts: Record<string, number> = {};
        bitacoras.forEach(b => {
            const t = b.tipo || 'otro';
            counts[t] = (counts[t] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [bitacoras]);


    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">Reportes y Estadísticas</h1>
            </div>

            {/* AI Generator Section */}
            <ReportGenerator />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Total Simpatizantes</p>
                        <p className="text-2xl font-bold text-slate-800">{affinities.length}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Actividades (Mes)</p>
                        <p className="text-2xl font-bold text-slate-800">{bitacoras.length}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Promedio Diario</p>
                        <p className="text-2xl font-bold text-slate-800">{(bitacoras.length / 30).toFixed(1)}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Chart 1: Activity Over Time */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-700 mb-4">Actividad Diaria (Últimos 30 días)</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={activityData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart 2: Affinities by Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-700 mb-4">Top 10 Secciones con Más Simpatizantes</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={affinitiesBySection}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Bar dataKey="value" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart 3: Gender Distribution */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-700 mb-4">Distribución por Género</h3>
                    <div className="h-64 w-full flex justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={genderData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {genderData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#0088FE' : '#FF8042'} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart 4: Activity by Type */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-700 mb-4">Tipos de Interacción</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={activityByType} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                    {activityByType.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
}
