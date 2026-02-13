import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save, Trash2, Loader2 } from 'lucide-react';
import type { AgendaItem } from '../pages/Agenda';

interface EditAgendaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    item: AgendaItem | null;
}

export const EditAgendaModal: React.FC<EditAgendaModalProps> = ({ isOpen, onClose, onSuccess, item }) => {
    if (!isOpen || !item) return null;

    const [formData, setFormData] = useState({
        nombre: '',
        seccion_id: 0,
        direccion: '',
        telefono: '',
        email: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (item) {
            setFormData({
                nombre: item.nombre || '',
                seccion_id: item.seccion_id || 0,
                // Use specific address components if available, else fallback to string
                direccion: item.direccion || '', // Logic could be improved but fine for now
                telefono: item.telefono || '',
                email: item.email || ''
            });
        }
    }, [item]);

    const handleSave = async () => {
        setIsLoading(true);
        setError(null);

        try {

            // Prepare update object
            const updates: any = {
                nombre: formData.nombre,
                seccion_id: formData.seccion_id,
                direccion: formData.direccion,
                telefono: formData.telefono, // Now applied to both
                email: formData.email
            };

            if (item.type === 'lider') {
                const { error: updateError } = await (supabase as any)
                    .from('lideres')
                    .update(updates as any)
                    .eq('id', item.id);
                if (updateError) throw updateError;
            } else {
                // For affinities, we might verify if columns exist, but assuming migration ran:
                const { error: updateError } = await (supabase as any)
                    .from('affinities')
                    .update({
                        ...updates,
                        // Ensure we don't try to update email if it doesn't exist on affinities or handle it gracefully
                        // My migration didn't explicitly add email to affinities, so let's be careful.
                        // But I did add 'telefono'.
                        telefono: formData.telefono,
                        // Remove email from updates for affinities if not supported
                        email: undefined
                    } as any)
                    .eq('id', item.id);
                if (updateError) throw updateError;
            }

            onSuccess();
            onClose();

        } catch (err: any) {
            console.error("Error updating:", err);
            setError(err.message || "Error al guardar cambios.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.")) return;

        setIsLoading(true);
        try {
            if (item.type === 'lider') {
                const { error: deleteError } = await supabase
                    .from('lideres')
                    .delete()
                    .eq('id', item.id);
                if (deleteError) throw deleteError;
            } else {
                const { error: deleteError } = await supabase
                    .from('affinities')
                    .delete()
                    .eq('id', item.id);
                if (deleteError) throw deleteError;
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Error deleting:", err);
            setError(err.message || "Error al eliminar.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">

                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-800">Editar {item.type === 'lider' ? 'Líder' : 'Simpatizante'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Nombre Completo</label>
                        <input
                            type="text"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            value={formData.nombre}
                            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Sección</label>
                            <input
                                type="number"
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.seccion_id}
                                onChange={e => setFormData({ ...formData, seccion_id: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Dirección</label>
                        <textarea
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                            value={formData.direccion}
                            onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Teléfono</label>
                            <input
                                type="text"
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.telefono}
                                onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                            />
                        </div>
                        {item.type === 'lider' && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
                                <input
                                    type="email"
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                            {error}
                        </div>
                    )}

                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between">
                    <button
                        onClick={handleDelete}
                        className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50 transition-colors"
                        title="Eliminar Registro"
                    >
                        <Trash2 size={18} />
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Guardar
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
