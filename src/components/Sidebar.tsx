import React from 'react';
import { LayoutDashboard, BarChart3, LogOut, Map as MapIcon, ChevronLeft, ChevronRight, BookOpen, ClipboardList, ShieldCheck } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import context

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
    const { profile } = useAuth(); // Get profile
    const navigate = useNavigate();

    const baseNavItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: BookOpen, label: 'Agenda', path: '/agenda' },
        { icon: ClipboardList, label: 'Bitácoras', path: '/activities' },
        { icon: BarChart3, label: 'Reportes', path: '/reports' },
    ];

    const navItems = [...baseNavItems];
    if (profile?.is_admin) {
        navItems.push({ icon: ShieldCheck, label: 'Admin', path: '/admin' });
    }

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : 'expanded'}`}>
            {/* Brand Header */}
            <div className="sidebar-header">
                <div className="brand-wrapper">
                    <div className="brand-icon">
                        <MapIcon size={20} color="white" />
                    </div>
                    {!collapsed && (
                        <span className="brand-text">
                            GIS Político
                        </span>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="nav-menu">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `nav-item ${isActive ? 'active' : ''}`
                        }
                        title={collapsed ? item.label : undefined}
                    >
                        <item.icon size={20} className="min-w-[20px]" />
                        {!collapsed && <span className="nav-label">{item.label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* Bottom Actions */}
            <div className="sidebar-footer">
                <button
                    className="footer-btn"
                    onClick={() => navigate('/')}
                    title="Cambiar a Vista Mapa"
                >
                    <MapIcon size={20} />
                    {!collapsed && <span className="nav-label">Vista Mapa</span>}
                </button>
                <button
                    className="footer-btn logout"
                    onClick={async () => {
                        if (window.confirm("¿Estás seguro que deseas cerrar sesión?")) {
                            const { supabase } = await import('../lib/supabase');
                            await supabase.auth.signOut();
                            window.location.reload(); // Hard reload to clear state
                        }
                    }}
                >
                    <LogOut size={20} />
                    {!collapsed && <span className="nav-label">Cerrar Sesión</span>}
                </button>
            </div>

            {/* Collapse Toggle */}
            <button
                onClick={onToggle}
                className="collapse-btn"
            >
                {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
        </aside>
    );
};

export default Sidebar;
