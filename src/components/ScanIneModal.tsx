
import { useState, useRef } from 'react';
import { processIneImage, type ExtractedData } from '../lib/ocr';
import { compressImage, generateIneFileName } from '../lib/imageUtils';
import { supabase } from '../lib/supabase';
import { resolveSection } from '../lib/smartLocation';
import { Upload, X, Check, Loader2, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDistrict } from '../context/DistrictContext';

interface ScanIneProps {
    onClose: () => void;
    onSuccess: () => void;
    className?: string; // Allow custom styling for inline use
}

export function ScanIneForm({ onClose, onSuccess, className = '' }: ScanIneProps) {
    const { user } = useAuth();
    const { selectedDistrict } = useDistrict();
    const [isProcessing, setIsProcessing] = useState(false);
    const [scannedData, setScannedData] = useState<ExtractedData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Form State (Expanded)
    const [formData, setFormData] = useState({
        nombre: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        seccion: '',
        curp: '',
        claveElector: '',
        calle: '',
        numExt: '',
        numInt: '',
        colonia: '',
        cp: '',
        municipio: '',
        estado: '',
        fechaNacimiento: '',
        edad: 0,
        genero: '',
        vigencia: '',
        telefono: ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedFile(file);
        startScan(file);
    };

    const startScan = async (file: File) => {
        setIsProcessing(true);
        setError(null);
        try {
            const result = await processIneImage(file);
            setScannedData(result);

            // Fallback split logic if OCR didnt give specific name parts
            let apPat = result.apellidoPaterno || '';
            let apMat = result.apellidoMaterno || '';
            let nom = result.nombres || '';

            if (!nom && result.nombreCommon) {
                const nameParts = result.nombreCommon.split(' ');
                if (nameParts.length >= 3) {
                    apPat = nameParts[0];
                    apMat = nameParts[1];
                    nom = nameParts.slice(2).join(' ');
                } else {
                    nom = result.nombreCommon;
                }
            }

            // Auto-fill form with detailed OCR data
            setFormData(prev => ({
                ...prev,
                nombre: nom,
                apellidoPaterno: apPat,
                apellidoMaterno: apMat,
                seccion: result.seccion || '',
                curp: result.curp || '',
                claveElector: result.claveElector || '',

                // Address Mapping
                calle: result.calle || result.direccion || '',
                numExt: result.numero_exterior || '',
                colonia: result.colonia || '',
                cp: result.cp || '',
                municipio: result.municipio || '',
                estado: result.estado || '',

                // Metadata
                fechaNacimiento: result.fechaNacimiento || '',
                edad: result.edad || 0,
                genero: result.genero || '',
                vigencia: result.vigencia || ''
            }));

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Error al procesar la imagen.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSave = async () => {
        if (!formData.seccion || !formData.nombre) {
            setError('Nombre y Sección son obligatorios.');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            if (!user) throw new Error("No hay sesión de usuario activa.");
            if (!selectedDistrict) throw new Error("No hay distrito seleccionado.");

            // 1. Upload Image (Compressed)
            let ineUrl = null;
            if (selectedFile) {
                try {
                    const compressedBlob = await compressImage(selectedFile);
                    // Reconstruct File from Blob for Supabase (optional, Blob works too usually)
                    const fileName = generateIneFileName(`${formData.nombre}_${formData.apellidoPaterno}`);

                    const { error: uploadError } = await supabase
                        .storage
                        .from('documents') // Ensure this bucket exists!
                        .upload(`ines/${fileName}`, compressedBlob, {
                            contentType: 'image/jpeg',
                            upsert: true
                        });

                    if (uploadError) throw uploadError;

                    // Get Public URL
                    const { data: { publicUrl } } = supabase
                        .storage
                        .from('documents')
                        .getPublicUrl(`ines/${fileName}`);

                    ineUrl = publicUrl;

                } catch (imgErr) {
                    console.error("Image upload failed:", imgErr);
                    // We continue even if image fails, but warn?
                }
            }

            // 2. Smart Section Lookup
            const { seccion_id } = await resolveSection(formData.seccion, `${formData.calle} ${formData.colonia}`);

            // 3. Insert Affinity
            const fullNombre = `${formData.nombre} ${formData.apellidoPaterno} ${formData.apellidoMaterno}`.trim();

            const { error: insertErr } = await supabase
                .from('affinities')
                .insert({
                    nombre: fullNombre,
                    apellido_paterno: formData.apellidoPaterno,
                    apellido_materno: formData.apellidoMaterno,
                    clave_elector: formData.claveElector || null, // Updated column name
                    curp: formData.curp || null,

                    // Address
                    direccion: `${formData.calle} ${formData.numExt}`, // Legacy field
                    calle: formData.calle,
                    numero_exterior: formData.numExt,
                    numero_interior: formData.numInt,
                    colonia: formData.colonia,
                    cp: formData.cp,
                    municipio: formData.municipio,
                    estado: formData.estado,

                    // Metadata
                    fecha_nacimiento: formData.fechaNacimiento || null,
                    edad: formData.edad > 0 ? formData.edad : null,
                    genero: formData.genero,
                    telefono: formData.telefono,
                    ine_url: ineUrl,
                    vigencia: formData.vigencia,

                    seccion_id: seccion_id,
                    distrito_id: selectedDistrict,
                    confidence_score: scannedData?.confidence || 0.8,
                    user_id: user.id
                } as any);

            if (insertErr) throw insertErr;

            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Error al guardar los datos.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className={`bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden ${className}`}>

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Camera className="w-6 h-6 text-primary" />
                    Registro de Simpatizante (INE)
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-5 h-5 text-gray-500" />
                </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">

                {/* Upload Area */}
                {!scannedData && !isProcessing && (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary hover:bg-blue-50 transition-all group"
                    >
                        <Upload className="w-12 h-12 text-gray-400 group-hover:text-primary mb-4" />
                        <p className="font-medium text-gray-700">Haz clic para subir o arrastra foto del INE</p>
                        <p className="text-sm text-gray-500 mt-2">Se comprimirá automáticamente a formato JPG</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>
                )}

                {/* Loading State */}
                {isProcessing && !scannedData && (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                        <p className="text-lg font-medium text-gray-800">Procesando INE...</p>
                    </div>
                )}

                {/* Result Form */}
                {scannedData && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {/* --- Column 1: Personal Data --- */}
                        <div className="md:col-span-1 space-y-4 border-r pr-4">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Datos Personales</h3>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-600">Nombre(s)</label>
                                <input type="text" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} className="w-full text-sm p-2 border rounded focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-600">Apellido Paterno</label>
                                <input type="text" value={formData.apellidoPaterno} onChange={e => setFormData({ ...formData, apellidoPaterno: e.target.value })} className="w-full text-sm p-2 border rounded focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-600">Apellido Materno</label>
                                <input type="text" value={formData.apellidoMaterno} onChange={e => setFormData({ ...formData, apellidoMaterno: e.target.value })} className="w-full text-sm p-2 border rounded focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-600">Fecha Nacimiento</label>
                                <input type="date" value={formData.fechaNacimiento} onChange={e => setFormData({ ...formData, fechaNacimiento: e.target.value })} className="w-full text-sm p-2 border rounded focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-600">Edad</label>
                                    <input type="number" value={formData.edad} onChange={e => setFormData({ ...formData, edad: parseInt(e.target.value) || 0 })} className="w-full text-sm p-2 border rounded focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-600">Género</label>
                                    <select value={formData.genero} onChange={e => setFormData({ ...formData, genero: e.target.value })} className="w-full text-sm p-2 border rounded focus:ring-2 focus:ring-blue-500">
                                        <option value="">-</option>
                                        <option value="H">H</option>
                                        <option value="M">M</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-600">Teléfono</label>
                                <input type="tel" value={formData.telefono} placeholder="10 dígitos" onChange={e => setFormData({ ...formData, telefono: e.target.value })} className="w-full text-sm p-2 border rounded focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>

                        {/* --- Column 2: Address --- */}
                        <div className="md:col-span-1 space-y-4 border-r pr-4">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Domicilio</h3>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-600">Calle</label>
                                <input type="text" value={formData.calle} onChange={e => setFormData({ ...formData, calle: e.target.value })} className="w-full text-sm p-2 border rounded focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-600">Num. Ext</label>
                                    <input type="text" value={formData.numExt} onChange={e => setFormData({ ...formData, numExt: e.target.value })} className="w-full text-sm p-2 border rounded focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-600">Num. Int</label>
                                    <input type="text" value={formData.numInt} onChange={e => setFormData({ ...formData, numInt: e.target.value })} className="w-full text-sm p-2 border rounded focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-600">Colonia</label>
                                <input type="text" value={formData.colonia} onChange={e => setFormData({ ...formData, colonia: e.target.value })} className="w-full text-sm p-2 border rounded focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-600">CP</label>
                                    <input type="text" value={formData.cp} onChange={e => setFormData({ ...formData, cp: e.target.value })} className="w-full text-sm p-2 border rounded focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-600">Municipio</label>
                                    <input type="text" value={formData.municipio} onChange={e => setFormData({ ...formData, municipio: e.target.value })} className="w-full text-sm p-2 border rounded focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                        </div>

                        {/* --- Column 3: Electoral Data --- */}
                        <div className="md:col-span-1 space-y-4">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Datos Electorales</h3>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-600">Sección</label>
                                <input type="number" value={formData.seccion} onChange={e => setFormData({ ...formData, seccion: e.target.value })} className="w-full text-2xl p-2 border border-blue-200 rounded text-center font-mono font-bold text-blue-700 bg-blue-50" />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-600">Clave Elector</label>
                                <input type="text" value={formData.claveElector} onChange={e => setFormData({ ...formData, claveElector: e.target.value })} className="w-full text-sm p-2 border rounded focus:ring-2 focus:ring-blue-500 uppercase" />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-600">CURP</label>
                                <input type="text" value={formData.curp} onChange={e => setFormData({ ...formData, curp: e.target.value })} className="w-full text-sm p-2 border rounded focus:ring-2 focus:ring-blue-500 uppercase" />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-600">Vigencia</label>
                                <input type="text" value={formData.vigencia} onChange={e => setFormData({ ...formData, vigencia: e.target.value })} className="w-full text-sm p-2 border rounded focus:ring-2 focus:ring-blue-500" placeholder="Ej. 2028" />
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2">
                        <X className="w-5 h-5 flex-shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                    Cancelar
                </button>

                {scannedData && (
                    <button
                        onClick={handleSave}
                        disabled={isProcessing}
                        className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Guardar Simpatizante
                    </button>
                )}
            </div>

        </div>
    );
}

interface ScanIneModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function ScanIneModal({ isOpen, onClose, onSuccess }: ScanIneModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <ScanIneForm onClose={onClose} onSuccess={onSuccess} className="max-h-[90vh] overflow-y-auto" />
        </div>
    );
}
