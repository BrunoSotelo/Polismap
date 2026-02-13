
import { BarChart, Bar, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Map, ShieldCheck, Zap, Award, Activity } from 'lucide-react';

export default function BrandingPreview() {
    const data = [
        { name: 'Lun', val: 400 },
        { name: 'Mar', val: 300 },
        { name: 'Mie', val: 600 },
        { name: 'Jue', val: 400 },
        { name: 'Vie', val: 500 },
    ];

    return (
        <div className="min-h-screen bg-black p-8 overflow-y-auto">
            <h1 className="text-3xl text-white font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                Prototipeado de Identidad Visual
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">

                {/* CONCEPT A: THE STRATEGIST (Navy/Steel) */}
                <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col h-[600px]">
                    <div className="absolute top-0 w-full h-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] z-20" />
                    <div className="p-6 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-indigo-100">
                            <ShieldCheck size={20} className="text-indigo-500" />
                            <span className="font-bold tracking-tight uppercase text-sm">GIS Estratégico</span>
                        </div>
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded border border-indigo-500/20">v2.0</span>
                    </div>

                    <div className="p-6 flex-1 flex flex-col gap-6">
                        <div className="flex gap-4">
                            <div className="flex-1 bg-slate-800 p-4 rounded-lg border border-slate-700">
                                <p className="text-xs text-slate-400 uppercase tracking-wider">Simpatizantes</p>
                                <p className="text-2xl font-bold text-white mt-1">12,450</p>
                            </div>
                            <div className="flex-1 bg-slate-800 p-4 rounded-lg border border-slate-700">
                                <p className="text-xs text-slate-400 uppercase tracking-wider">Meta</p>
                                <p className="text-2xl font-bold text-emerald-400 mt-1">85%</p>
                            </div>
                        </div>

                        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 h-40">
                            <p className="text-xs text-slate-400 mb-2">Rendimiento Semanal</p>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data}>
                                    <Bar dataKey="val" fill="#6366f1" radius={[2, 2, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-slate-950 rounded-lg border border-slate-800 p-4 flex-1 relative overflow-hidden">
                            <Map className="text-slate-700 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20" size={120} strokeWidth={0.5} />
                            <div className="absolute top-4 right-4 bg-white/5 backdrop-blur px-3 py-1 rounded text-xs text-indigo-300 border border-indigo-500/30">
                                Vista Satelital
                            </div>
                        </div>

                        <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-indigo-900/20">
                            Acceder al Sistema
                        </button>
                    </div>
                </div>


                {/* CONCEPT B: THE INNOVATOR (Neon/Dark) */}
                <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl flex flex-col h-[600px]">
                    <div className="p-6 relative z-10">
                        {/* Glow Effect */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-fuchsia-500/20 blur-[60px] rounded-full pointer-events-none" />

                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-2">
                                <Zap size={20} className="text-cyan-400" fill="currentColor" />
                                <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 uppercase tracking-widest text-sm">NEO GIS</span>
                            </div>
                            <Activity size={16} className="text-fuchsia-500 animate-pulse" />
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-zinc-900/50 backdrop-blur border border-zinc-800 p-4 rounded-2xl relative group overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <p className="text-[10px] text-zinc-500 uppercase font-mono">Total Data</p>
                                <p className="text-2xl font-bold text-white font-mono">12.4k</p>
                            </div>
                            <div className="bg-zinc-900/50 backdrop-blur border border-zinc-800 p-4 rounded-2xl relative group overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <p className="text-[10px] text-zinc-500 uppercase font-mono">Live Pulse</p>
                                <p className="text-2xl font-bold text-fuchsia-400 font-mono">ON</p>
                            </div>
                        </div>

                        <div className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-2xl h-48 mb-4 relative">
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/10 to-transparent opacity-50" />
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                                    <Bar dataKey="val" fill="#22d3ee" radius={[4, 4, 4, 4]} barSize={8} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-auto">
                            <button className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm tracking-widest font-bold uppercase transition-all hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                                Initializing...
                            </button>
                        </div>
                    </div>
                </div>


                {/* CONCEPT C: THE AUTHORITY (Neutral/Gold) */}
                <div className="relative overflow-hidden rounded-none border border-neutral-800 bg-neutral-900 shadow-2xl flex flex-col h-[600px]">
                    <div className="p-8 border-b border-neutral-800 flex flex-col items-center">
                        <Award size={32} className="text-amber-500 mb-2" />
                        <h2 className="text-lg font-serif text-neutral-200 tracking-wide">QRO INTELLIGENCE</h2>
                        <div className="h-px w-12 bg-amber-500/50 mt-2" />
                    </div>

                    <div className="p-8 flex-1 bg-neutral-900">
                        <div className="flex justify-between items-baseline mb-8 border-b border-neutral-800 pb-4">
                            <span className="text-neutral-500 font-serif italic">Resumen Diario</span>
                            <span className="text-amber-500 font-mono text-xs">OCT 2026</span>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between items-center group cursor-pointer">
                                <div>
                                    <p className="text-sm text-neutral-300 font-serif">Cobertura Territorial</p>
                                    <p className="text-xs text-neutral-600">Distrito 06</p>
                                </div>
                                <span className="text-xl text-white font-light group-hover:text-amber-400 transition-colors">78%</span>
                            </div>

                            <div className="flex justify-between items-center group cursor-pointer">
                                <div>
                                    <p className="text-sm text-neutral-300 font-serif">Líderes Activos</p>
                                    <p className="text-xs text-neutral-600">Verificado</p>
                                </div>
                                <span className="text-xl text-white font-light group-hover:text-amber-400 transition-colors">342</span>
                            </div>
                        </div>

                        <div className="mt-12 p-4 bg-neutral-950 border border-neutral-800 relative">
                            <div className="absolute top-0 right-0 p-1">
                                <div className="w-2 h-2 bg-amber-500 rounded-full" />
                            </div>
                            <p className="text-neutral-500 text-xs font-serif leading-relaxed italic">
                                "La estrategia territorial muestra un avance significativo en los sectores prioritarios."
                            </p>
                        </div>

                        <button className="mt-auto w-full py-4 bg-amber-600 hover:bg-amber-700 text-neutral-950 font-bold text-xs uppercase tracking-widest mt-8 transition-all">
                            Acceso Autorizado
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
