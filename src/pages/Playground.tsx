import MapViewExperimental from '../components/Map/MapViewExperimental';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Playground = () => {
    return (
        <div className="w-screen h-screen bg-slate-50 flex flex-col overflow-hidden">
            {/* Header overlay */}
            <div className="fixed top-0 left-0 w-full z-[1000] p-4 pointer-events-none">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <Link
                        to="/"
                        className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md border border-slate-200 rounded-full text-slate-600 hover:text-slate-900 hover:bg-white pointer-events-auto transition-colors shadow-sm"
                    >
                        <ArrowLeft size={16} />
                        <span className="text-sm font-medium">Volver</span>
                    </Link>

                    <div className="px-4 py-2 bg-blue-50/80 backdrop-blur-md border border-blue-100 rounded-full shadow-sm">
                        <span className="text-xs font-bold text-blue-700 uppercase tracking-widest">
                            Experimental Map: Theme Switcher
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Content - Fullscreen Map */}
            <div className="flex-1 w-full h-full relative">
                <MapViewExperimental />
            </div>
        </div>
    );
};

export default Playground;
