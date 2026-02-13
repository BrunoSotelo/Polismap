import React from 'react';
import { Camera, Upload, UserPlus, X, ClipboardList } from 'lucide-react';

interface NewEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectOption: (option: 'scan' | 'batch' | 'leader' | 'log') => void;
}

export const NewEntryModal: React.FC<NewEntryModalProps> = ({ isOpen, onClose, onSelectOption }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="bg-slate-50 p-6 flex justify-between items-center border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Nuevo Registro</h2>
                        <p className="text-slate-500 text-sm">Selecciona cómo deseas capturar la información.</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Options Grid */}
                <div className="p-6 grid gap-4">

                    {/* Option 1: Individual Scan */}
                    <button
                        onClick={() => onSelectOption('scan')}
                        className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all group text-left"
                    >
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Camera size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 group-hover:text-blue-700">Escanear INE (Individual)</h3>
                            <p className="text-xs text-slate-500">Captura rápida usando la cámara o subiendo una foto.</p>
                        </div>
                    </button>

                    {/* Option 2: Batch Upload */}
                    <button
                        onClick={() => onSelectOption('batch')}
                        className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-purple-500 hover:bg-purple-50 transition-all group text-left"
                    >
                        <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Upload size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 group-hover:text-purple-700">Carga Masiva (Lotes)</h3>
                            <p className="text-xs text-slate-500">Sube múltiples archivos PDF o imágenes a la vez.</p>
                        </div>
                    </button>

                    {/* Option 3: Manual Leader */}
                    <button
                        onClick={() => onSelectOption('leader')}
                        className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-orange-500 hover:bg-orange-50 transition-all group text-left"
                    >
                        <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <UserPlus size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 group-hover:text-orange-700">Registrar Líder</h3>
                            <p className="text-xs text-slate-500">Formulario manual con ubicación exacta en mapa.</p>
                        </div>
                    </button>

                    {/* Option 4: Bitacora */}
                    <button
                        onClick={() => onSelectOption('log')}
                        className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-pink-500 hover:bg-pink-50 transition-all group text-left"
                    >
                        <div className="w-12 h-12 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <ClipboardList size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 group-hover:text-pink-700">Registrar Bitácora</h3>
                            <p className="text-xs text-slate-500">Reuniones, eventos, recorridos u otros.</p>
                        </div>
                    </button>

                </div>

                <div className="p-4 bg-slate-50 text-center text-xs text-slate-400">
                    Los datos se guardan de forma segura en Supabase.
                </div>
            </div>
        </div>
    );
};
