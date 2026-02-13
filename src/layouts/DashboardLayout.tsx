import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Watermark from '../components/Security/Watermark';
import { Bell, UserCircle, Menu, X } from 'lucide-react'; // Imports updated
import { useAuth } from '../context/AuthContext';
import { GlobalSearch } from '../components/Navigation/GlobalSearch';

const DashboardLayout: React.FC = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false); // Mobile Drawer State
    const { user, profile } = useAuth();

    return (
        <div className="dashboard-container relative">
            {/* Security Watermark - Always Present */}
            <Watermark />

            {/* Mobile Sidebar Overlay (New) */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden flex">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                        onClick={() => setMobileOpen(false)}
                    />

                    {/* Drawer Content */}
                    <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#0f172a] h-full shadow-2xl animate-in slide-in-from-left duration-300">
                        <div className="absolute top-0 right-0 -mr-12 pt-4">
                            <button
                                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                                onClick={() => setMobileOpen(false)}
                            >
                                <X className="h-6 w-6 text-white" aria-hidden="true" />
                            </button>
                        </div>
                        <Sidebar collapsed={false} onToggle={() => { }} /> {/* Always expanded in mobile drawer */}
                    </div>
                </div>
            )}

            {/* Desktop Sidebar - Fixed Left (Hidden on Mobile/Tablet) */}
            <div className="hidden lg:block h-full z-30">
                <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
            </div>

            {/* Main Content Wrapper */}
            <div className="main-content-wrapper flex-1 flex flex-col min-h-screen pb-20 lg:pb-0">

                {/* Top Header */}
                <header className="top-header sticky top-0 z-20 bg-white shadow-sm px-4 py-2 flex items-center justify-between gap-4">

                    {/* Left: Hamburger (Mobile) + Global Search */}
                    <div className="flex items-center gap-4 flex-1 max-w-xl">
                        {/* Mobile Menu Button */}
                        <button
                            type="button"
                            className="lg:hidden -ml-2 p-2 text-slate-500 hover:text-slate-700 rounded-md"
                            onClick={() => setMobileOpen(true)}
                        >
                            <Menu className="h-6 w-6" aria-hidden="true" />
                        </button>

                        <GlobalSearch />
                    </div>


                    {/* Right Actions */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => alert("No tienes notificaciones nuevas.")}
                            className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <Bell size={20} />
                        </button>
                        <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>
                        <button className="flex items-center gap-2 hover:bg-slate-50 py-1 px-2 rounded-lg transition-colors">
                            <UserCircle size={32} className="text-slate-400" />
                            <div className="text-left hidden sm:block">
                                <p className="text-sm font-semibold text-slate-700 leading-none">
                                    {profile?.email || user?.email || 'Usuario'}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {profile?.is_admin ? 'Administrador' : 'Encargado Territorial'}
                                </p>
                            </div>
                        </button>
                    </div>
                </header>

                {/* Scrollable Content Area */}
                <main className="dashboard-content flex-1 p-4 overflow-y-auto">
                    <div className="content-max-width mx-auto w-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
