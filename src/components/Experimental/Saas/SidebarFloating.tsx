import { Home, Notebook, BarChart2, Settings, LogOut, Map as MapIcon } from 'lucide-react';


interface SidebarFloatingProps {
    activeTab: 'dashboard' | 'agenda' | 'bitacoras' | 'reportes';
    onTabChange: (tab: 'dashboard' | 'agenda' | 'bitacoras' | 'reportes') => void;
    onLogout?: () => void;
    onSwitchMode?: () => void;
}

const SidebarFloating = ({ activeTab, onTabChange, onLogout, onSwitchMode }: SidebarFloatingProps) => {
    // We can also access theme directly if needed for JS logic, but CSS vars handle most
    // const { currentTheme } = useTheme();

    const menuItems = [
        { id: 'dashboard', icon: Home, label: 'Inicio' },
        { id: 'bitacoras', icon: Notebook, label: 'Bitácoras' },
        { id: 'reportes', icon: BarChart2, label: 'Reportes' },
    ];

    return (
        <div className="fixed left-6 top-1/2 -translate-y-1/2 z-[1100]">
            <div className="bg-[var(--ds-color-surface)]/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-3 flex flex-col gap-6 transition-all hover:bg-[var(--ds-color-surface)]/90">

                {/* Brand Icon */}
                <div className="p-3 bg-primary/20 rounded-xl flex justify-center items-center text-primary mb-2 cursor-pointer hover:bg-primary/30 transition-colors">
                    <MapIcon size={24} />
                </div>

                {/* Navigation */}
                <nav className="flex flex-col gap-2">
                    {menuItems.map((item) => {
                        const isActive = activeTab === item.id;
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id as any)}
                                className={`
                                    relative group p-3 rounded-xl transition-all duration-300
                                    flex items-center justify-center cursor-pointer
                                    ${isActive
                                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/50'
                                        : 'text-slate-400 hover:bg-white/10 hover:text-white'}
                                `}
                            >
                                <Icon size={20} className="relative z-10" />

                                {/* Tooltip */}
                                <span className={`
                                    absolute left-full ml-4 px-3 py-1.5 rounded-lg text-xs font-medium 
                                    bg-slate-900 border border-white/10 text-white whitespace-nowrap
                                    opacity-0 -translate-x-2 pointer-events-none transition-all duration-300
                                    group-hover:opacity-100 group-hover:translate-x-0 z-20
                                `}>
                                    {item.label}
                                </span>

                                {/* Active Glow */}
                                {isActive && (
                                    <div className="absolute inset-0 bg-primary blur-md opacity-40 rounded-xl z-0"></div>
                                )}
                            </button>
                        );
                    })}
                </nav>

                <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-2">
                    <button
                        onClick={onSwitchMode}
                        className="p-3 text-slate-500 hover:text-slate-300 transition-colors group relative"
                        title="Modo Simple"
                    >
                        <Settings size={20} />
                        {/* Tooltip */}
                        <span className={`
                            absolute left-full ml-4 px-3 py-1.5 rounded-lg text-xs font-medium 
                            bg-slate-900 border border-white/10 text-white whitespace-nowrap
                            opacity-0 -translate-x-2 pointer-events-none transition-all duration-300
                            group-hover:opacity-100 group-hover:translate-x-0 z-20
                        `}>
                            Modo Simple
                        </span>
                    </button>
                    <button
                        onClick={onLogout}
                        className="p-3 text-danger/70 hover:text-danger transition-colors hover:bg-danger/10 rounded-xl"
                        title="Cerrar Sesión"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SidebarFloating;
