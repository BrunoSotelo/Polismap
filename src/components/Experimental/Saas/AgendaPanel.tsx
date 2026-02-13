import { Calendar as CalendarIcon, Clock, MapPin, Plus } from 'lucide-react';

const AgendaPanel = () => {
    const events = [
        { id: 1, title: 'Reunión Distrito 6', time: '09:00 AM', loc: 'Savantia de Distrito', type: 'meeting' },
        { id: 2, title: 'Recorrido en Zona Norte', time: '02:30 PM', loc: 'Zona Norte', type: 'field' },
        { id: 3, title: 'Presentación de Proyecto', time: '11:00 AM', loc: 'Savantia de Mone', type: 'presentation' },
        { id: 4, title: 'Encuentro con Líderes', time: '04:00 PM', loc: 'Centro de Entorno', type: 'meeting' },
    ];

    const currentDay = "30";
    const currentMonth = "OCTUBRE 2024";

    return (
        <div className="fixed right-6 top-24 z-[1050] w-80 animate-in slide-in-from-right-10 fade-in duration-500">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <CalendarIcon size={14} className="text-blue-400" />
                        Agenda
                    </h2>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded">
                        {currentMonth}
                    </span>
                </div>

                {/* Calendar Grid Mini */}
                <div className="p-4">
                    <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => <span key={d} className="text-slate-500 font-bold">{d}</span>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
                        {Array.from({ length: 5 }).map((_, i) => <span key={`prev-${i}`} className="opacity-20">{26 + i}</span>)}
                        {Array.from({ length: 30 }).map((_, i) => (
                            <span
                                key={i}
                                className={`
                                    h-7 w-7 flex items-center justify-center rounded-full hover:bg-white/10 cursor-pointer transition-colors
                                    ${(i + 1).toString() === currentDay ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/50' : ''}
                                `}
                            >
                                {i + 1}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Events Feed */}
                <div className="border-t border-white/10 bg-slate-950/30 max-h-[300px] overflow-y-auto custom-scrollbar">
                    <div className="p-2 flex flex-col gap-1">
                        <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Próximos Eventos</div>
                        {events.map((evt) => (
                            <div key={evt.id} className="group p-3 hover:bg-white/5 rounded-xl transition-all cursor-pointer border border-transparent hover:border-white/5">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="text-sm font-medium text-slate-200 group-hover:text-blue-300 transition-colors">
                                        {evt.title}
                                    </h4>
                                    <div className="flex flex-col items-center bg-slate-800 rounded px-1.5 py-0.5 min-w-[32px]">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{currentMonth.slice(0, 3)}</span>
                                        <span className="text-xs font-bold text-white">{15 + evt.id}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1 mt-1">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                        <Clock size={12} className={evt.id === 1 ? 'text-emerald-400' : ''} />
                                        <span>{evt.time}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                                        <MapPin size={12} />
                                        <span>{evt.loc}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Footer */}
                <div className="p-3 border-t border-white/10 bg-white/5">
                    <button className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all text-white text-xs font-bold shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2">
                        <Plus size={16} />
                        Nuevo Evento
                    </button>
                </div>

            </div>
        </div>
    );
};

export default AgendaPanel;
