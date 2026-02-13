import React, { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2, Save } from 'lucide-react';
import { processIneImage, type ExtractedData } from '../../lib/ocr';
import { supabase } from '../../lib/supabase';
import { resolveSection } from '../../lib/smartLocation';
import { useAuth } from '../../context/AuthContext';
import { useDistrict } from '../../context/DistrictContext';

interface BatchFile {
    id: string;
    file: File;
    status: 'pending' | 'processing' | 'success' | 'error';
    data?: ExtractedData;
    errorMsg?: string;
    previewUrl: string;
}

interface BatchUploadProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const BatchUpload: React.FC<BatchUploadProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const { selectedDistrict } = useDistrict();
    const [files, setFiles] = useState<BatchFile[]>([]);
    const [isProcessingQueue, setIsProcessingQueue] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles: BatchFile[] = Array.from(e.target.files).map(file => ({
                id: Math.random().toString(36).substr(2, 9),
                file,
                status: 'pending',
                previewUrl: URL.createObjectURL(file)
            }));
            setFiles(prev => [...prev, ...newFiles]);
        }
    };

    const processQueue = async () => {
        setIsProcessingQueue(true);

        // Process sequentially to avoid rate limits or browser hang
        for (let i = 0; i < files.length; i++) {
            if (files[i].status === 'pending') {
                // Update status to processing
                setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'processing' } : f));

                try {
                    const data = await processIneImage(files[i].file);

                    setFiles(prev => prev.map((f, idx) => idx === i ? {
                        ...f,
                        status: 'success',
                        data
                    } : f));

                } catch (err: any) {
                    setFiles(prev => prev.map((f, idx) => idx === i ? {
                        ...f,
                        status: 'error',
                        errorMsg: err.message || "Error al procesar"
                    } : f));
                }
            }
        }
        setIsProcessingQueue(false);
    };

    const saveAll = async () => {
        setIsSaving(true);
        const successFiles = files.filter(f => f.status === 'success' && f.data);

        if (successFiles.length === 0) {
            setIsSaving(false);
            return;
        }

        try {
            if (!user) throw new Error("No hay sesión de usuario activa.");
            if (!selectedDistrict) throw new Error("No hay distrito seleccionado.");

            for (const item of successFiles) {
                if (!item.data) continue;

                // 1. Upload Image to Storage (SKIP if no strict user, or use dummy path)
                // If user is null, we can't upload to a folder named 'undefined' cleanly, 
                // so we use the userId variable which is guaranteed string.
                const fileExt = item.file.name.split('.').pop();
                const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('ines')
                    .upload(fileName, item.file);

                if (uploadError) {
                    console.error("Upload error for", item.file.name, uploadError);
                    // Mark as error in UI? For now just log and skip DB insert
                    continue;
                }

                // 2. Smart Section Lookup
                let seccionId = 0;
                try {
                    const resolution = await resolveSection(item.data.seccion || '0', item.data.direccion || '');
                    seccionId = resolution.seccion_id;
                } catch (e) {
                    console.warn("Smart resolution failed, using raw", item.data.seccion);
                    seccionId = parseInt(item.data.seccion || '0');
                }

                // 3. Insert to DB
                // @ts-ignore
                const { error: insertErr } = await supabase.from('affinities').insert({
                    nombre: item.data.nombreCommon || `${item.data.nombres || ''} ${item.data.apellidoPaterno || ''}`.trim(),
                    curp: item.data.curp,
                    direccion: item.data.direccion,
                    fecha_nacimiento: item.data.fechaNacimiento,
                    edad: item.data.edad,
                    genero: item.data.genero,
                    seccion_id: seccionId || null,
                    distrito_id: selectedDistrict,
                    confidence_score: item.data.confidence,
                    user_id: user.id,
                    image_path: fileName // Store the path!
                });

                if (insertErr) {
                    console.error("Insert error", insertErr);
                    // If unique constraint error (usually CURP), mark as such?
                    // For now just continue, maybe log it differently
                }
            }

            onSuccess();
            onClose();

        } catch (e) {
            console.error(e);
            alert("Error guardando lotes. Revisa la consola.");
        } finally {
            setIsSaving(false);
        }
    };

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    // Calculate current step
    let currentStep = 1;
    if (files.length > 0 && files.some(f => f.status === 'pending')) currentStep = 2; // Ready to process
    if (files.length > 0 && !files.some(f => f.status === 'pending') && files.some(f => f.status === 'success')) currentStep = 3; // Ready to save

    const pendingCount = files.filter(f => f.status === 'pending').length;
    const successCount = files.filter(f => f.status === 'success').length;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden"
            >

                {/* 1. HEADER & STEPPER */}
                <div className="bg-slate-50 border-b border-slate-200 flex-shrink-0">
                    <div className="p-4 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Upload className="w-5 h-5 text-purple-600" />
                                Carga Masiva de INEs
                            </h2>
                        </div>
                        <button onClick={onClose} disabled={isSaving || isProcessingQueue} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Stepper Progress Bar */}
                    <div className="px-6 pb-4">
                        <div className="flex items-center justify-between relative">
                            {/* Line Background */}
                            <div className="absolute left-0 right-0 top-1/2 h-1 bg-slate-200 -z-10 rounded-full" />

                            {/* Step 1: Upload */}
                            <div className={`flex items-center gap-2 px-4 py-1 rounded-full bg-white border-2 transition-colors ${files.length > 0 ? 'border-purple-600 text-purple-700' : 'border-slate-300 text-slate-500'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${files.length > 0 ? 'bg-purple-600 text-white' : 'bg-slate-200'}`}>1</div>
                                <span className="text-sm font-bold">Cargar</span>
                            </div>

                            {/* Step 2: Process */}
                            <div className={`flex items-center gap-2 px-4 py-1 rounded-full bg-white border-2 transition-colors ${currentStep >= 2 ? 'border-purple-600 text-purple-700' : 'border-slate-300 text-slate-500'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= 2 ? 'bg-purple-600 text-white' : 'bg-slate-200'}`}>2</div>
                                <span className="text-sm font-bold">Procesar</span>
                            </div>

                            {/* Step 3: Save */}
                            <div className={`flex items-center gap-2 px-4 py-1 rounded-full bg-white border-2 transition-colors ${currentStep >= 3 ? 'border-green-600 text-green-700' : 'border-slate-300 text-slate-500'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= 3 ? 'bg-green-600 text-white' : 'bg-slate-200'}`}>3</div>
                                <span className="text-sm font-bold">Guardar</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. TOOLBAR (Upload Button) */}
                <div className="p-3 bg-white border-b border-slate-100 flex justify-between items-center gap-4 flex-shrink-0">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessingQueue}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                        <PlusIcon />
                        {files.length === 0 ? 'Seleccionar Archivos' : 'Agregar más'}
                    </button>
                    <input
                        type="file"
                        multiple
                        accept="image/*,.pdf"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileSelect}
                    />

                    <div className="text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                        {files.length} Archivos • {pendingCount} Pendientes • {successCount} Listos
                    </div>
                </div>

                {/* 3. SCROLLABLE CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 min-h-0">
                    {files.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 rounded-xl m-4 bg-slate-50">
                            <Upload className="w-16 h-16 mb-4 opacity-30 text-purple-500" />
                            <p className="font-medium text-lg">Arrastra tus INEs aquí</p>
                            <p className="text-sm opacity-70">o usa el botón de "Seleccionar Archivos"</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
                            {files.map(file => (
                                <FileCard key={file.id} file={file} onRemove={() => removeFile(file.id)} />
                            ))}
                        </div>
                    )}
                </div>

                {/* 4. FIXED FOOTER ACTIONS */}
                <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3 flex-shrink-0 z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
                    {/* Botón Procesar */}
                    {pendingCount > 0 && (
                        <button
                            onClick={() => {
                                console.log("Procesando cola...", { files, pendingCount });
                                processQueue();
                            }}
                            disabled={isProcessingQueue}
                            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-purple-200 transition-all hover:scale-105 active:scale-95"
                        >
                            {isProcessingQueue ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                            Procesar {pendingCount} Archivos
                        </button>
                    )}

                    {/* Botón Guardar (Solo aparece si hay listos y no hay pendientes que bloqueen el flujo lógico visual, o se mantiene pero deshabilitado) */}
                    {(successCount > 0 || (files.length > 0 && pendingCount === 0)) && (
                        <button
                            onClick={saveAll}
                            disabled={isSaving || pendingCount > 0} // Force process first logic
                            className={`px-8 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg transition-all hover:scale-105 active:scale-95 ${pendingCount > 0
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' // Dimmed if still pending items
                                : 'bg-green-600 hover:bg-green-700 text-white shadow-green-200'
                                }`}
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Guardar {successCount} Simpatizantes
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
};

const FileCard = ({ file, onRemove }: { file: BatchFile, onRemove: () => void }) => {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            {/* Image Preview */}
            <div className="h-32 bg-slate-100 flex items-center justify-center relative group">
                <img src={file.previewUrl} alt="preview" className="h-full w-full object-cover opacity-80" />
                <button
                    onClick={onRemove}
                    className="absolute top-2 right-2 p-1 bg-white/80 rounded-full text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Status & Data */}
            <div className="p-3 text-sm flex-1 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <span className="font-mono text-xs text-slate-500 truncate max-w-[150px]" title={file.file.name}>{file.file.name}</span>
                    <StatusBadge status={file.status} />
                </div>

                {file.status === 'success' && file.data && (
                    <div className="text-xs space-y-1">
                        <p className="font-bold text-slate-800">{file.data.nombreCommon || 'Nombre no detectado'}</p>
                        <p className="text-slate-600">Sec: {file.data.seccion || '?'}</p>
                        <p className="text-slate-400 truncate">{file.data.direccion}</p>
                    </div>
                )}

                {file.status === 'error' && (
                    <div className="text-xs text-red-500 bg-red-50 p-2 rounded">
                        {file.errorMsg}
                    </div>
                )}
            </div>
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case 'pending': return <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] uppercase font-bold">Pendiente</span>;
        case 'processing': return <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px] uppercase font-bold flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> OCR</span>;
        case 'success': return <span className="px-2 py-0.5 bg-green-100 text-green-600 rounded text-[10px] uppercase font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Listo</span>;
        case 'error': return <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-[10px] uppercase font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Error</span>;
        default: return null;
    }
};

const PlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
);
