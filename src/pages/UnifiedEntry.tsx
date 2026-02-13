import { useState, Suspense, lazy } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/DesignSystem/ThemeContext';
// Lazy load Map to prevent blocking initial render
const MapView = lazy(() => import('../components/Map/MapView'));
import LoginOverlay from '../components/Auth/LoginOverlay';
import SidebarFloating from '../components/Experimental/Saas/SidebarFloating';
import MetricsFloat from '../components/Experimental/Saas/MetricsFloat';
import BitacorasPanel from '../components/Experimental/Saas/BitacorasPanel';
import { useNavigate } from 'react-router-dom';
import ReportPanel from '../components/Experimental/Saas/ReportPanel';

// This is the "Unified" page that replaces the old Login and Dashboard separation
// It handles the "Zoom In" transition seamlessly
const UnifiedEntry = () => {
    const { session, loading, signOut } = useAuth();
    const { currentTheme } = useTheme();
    const navigate = useNavigate();

    // Manage active tab state for Sidebar
    // 'dashboard', 'bitacoras', 'reportes'
    const [activeTab, setActiveTab] = useState<'dashboard' | 'agenda' | 'bitacoras' | 'reportes'>('dashboard');

    // New States for "Stylized" View Control
    const [manualTheme, setManualTheme] = useState<'light' | 'dark' | null>(null);
    const [visibleDistricts, setVisibleDistricts] = useState<number[]>([]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white">
                <div className="animate-pulse">Cargando Territorio...</div>
            </div>
        );
    }

    const isGuest = !session;
    // Determine active theme (Manual override > Guest Default > System Default)
    const activeTheme = manualTheme || (isGuest ? 'light' : (currentTheme.id === 'ocean' ? 'dark' : 'light'));

    const handleLogout = async () => {
        await signOut();
        // MapView will detect isGuest=true and Zoom Out automatically
    };

    const switchToSimpleMode = () => {
        // Navigate to the classic dashboard route
        navigate('/dashboard');
    };

    return (
        <div className="relative h-screen w-full overflow-hidden bg-slate-950">
            {/* 1. BACKGROUND MAP (Always Present) */}
            <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${isGuest ? 'opacity-100' : 'opacity-100'} `}>
                <Suspense fallback={<div className="absolute inset-0 bg-slate-950" />}>
                    <MapView
                        theme={activeTheme}
                        isGuest={isGuest}
                        onDistrictsChange={setVisibleDistricts}
                        controlsClass="left-36" // Shift map controls to avoid SidebarFloating overlap
                    />
                </Suspense>
            </div>

            {/* Cinematic Gradients (Always Visible) */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/20" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/50 via-transparent to-transparent" />
            </div>

            {/* 2. LOGIN OVERLAY (If Guest) */}
            {isGuest && (
                <div className="absolute inset-0 z-50 animate-in fade-in duration-700">
                    <LoginOverlay />
                </div>
            )}

            {/* 3. DASHBOARD UI (If User) */}
            {!isGuest && (
                <div className="absolute inset-0 z-10 pointer-events-none">

                    {/* LEFT: Sidebar Navigation */}
                    <div className="pointer-events-auto absolute left-4 top-4 bottom-4 z-20">
                        <SidebarFloating
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                            onLogout={handleLogout}
                            onSwitchMode={switchToSimpleMode}
                        />
                    </div>

                    {/* RIGHT: Contextual Panels */}

                    {/* Dashboard Mode: Show Metrics */}
                    {activeTab === 'dashboard' && (
                        <div className="pointer-events-auto absolute right-4 top-4 z-20 animate-in slide-in-from-right-5 fade-in duration-500">
                            <MetricsFloat
                                visibleDistricts={visibleDistricts}
                                activeTheme={activeTheme}
                                onToggleTheme={() => setManualTheme(activeTheme === 'dark' ? 'light' : 'dark')}
                            />
                        </div>
                    )}

                    {/* Bitacoras Mode: Show Feed Panel */}
                    {activeTab === 'bitacoras' && (
                        <BitacorasPanel />
                    )}

                    {/* Reportes Mode: Placeholder or specific panel later */}
                    {/* Reportes Mode: Stylized Panel */}
                    {activeTab === 'reportes' && (
                        <ReportPanel />
                    )}

                </div>
            )}
        </div>
    );
};

export default UnifiedEntry;
