import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BarChart3, BookOpen, ClipboardList, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const BottomNav: React.FC = () => {
    const { profile } = useAuth();

    const navItems = [
        { icon: LayoutDashboard, label: 'Inicio', path: '/dashboard' },
        { icon: BookOpen, label: 'Agenda', path: '/agenda' },
        { icon: ClipboardList, label: 'Bitácoras', path: '/activities' },
        { icon: BarChart3, label: 'Reportes', path: '/reports' },
    ];

    if (profile?.is_admin) {
        navItems.push({ icon: ShieldCheck, label: 'Admin', path: '/admin' });
    }

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200/50 py-3 px-6 flex justify-around items-center z-[3000] md:hidden pb-safe shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)]">
            {navItems.map((item) => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-16 h-14 rounded-2xl transition-all duration-300 ease-spring ${isActive
                            ? 'text-blue-600 bg-blue-50/80 translate-y-[-2px] shadow-sm'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 active:scale-95'
                        }`
                    }
                >
                    {({ isActive }) => (
                        <>
                            <item.icon
                                size={22}
                                strokeWidth={isActive ? 2.5 : 2}
                                className={`transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}
                            />
                            <span className={`text-[10px] font-semibold mt-1 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                                {item.label}
                            </span>
                        </>
                    )}
                </NavLink>
            ))}
        </nav>
    );
};

export default BottomNav;
