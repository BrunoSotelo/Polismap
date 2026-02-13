
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Types
interface Profile {
    id: string;
    email: string;
    is_admin: boolean;
    created_at: string;
    theme_id?: string;
}

interface UserDistrict {
    user_id: string;
    distrito_id: number;
}

export default function AdminUsers() {
    const { profile } = useAuth();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [assignments, setAssignments] = useState<UserDistrict[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [districtToAdd, setDistrictToAdd] = useState<number>(6);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            // 1. Get all profiles
            // Note: RLS rule "Profiles visible to owner or admin" ensures only Admin sees all.
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .order('email');

            if (profilesError) throw profilesError;

            // 2. Get all assignments
            const { data: distData, error: distError } = await supabase
                .from('user_districts')
                .select('*');

            if (distError) throw distError;

            setProfiles(profilesData || []);
            setAssignments(distData || []);

        } catch (error) {
            console.error("Error fetching admin data:", error);
            alert("Error cargando usuarios.");
        } finally {
            setLoading(false);
        }
    };

    const handleAssignDistrict = async () => {
        if (!selectedUser || !districtToAdd) return;

        try {
            const { error } = await (supabase as any)
                .from('user_districts')
                .insert({ user_id: selectedUser, distrito_id: districtToAdd } as any);

            if (error) {
                if (error.code === '23505') { // Unique violation
                    alert("Este usuario ya tiene ese distrito asignado.");
                } else {
                    console.error(error);
                    alert("Error asignando distrito.");
                }
            } else {
                // Refresh
                fetchData();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleRemoveDistrict = async (userId: string, distritoId: number) => {
        if (!window.confirm(`¿Quitar Distrito ${distritoId}?`)) return;

        try {
            const { error } = await supabase
                .from('user_districts')
                .delete()
                .eq('user_id', userId)
                .eq('distrito_id', distritoId);

            if (error) throw error;
            fetchData();
        } catch (error) {
            console.error(error);
            alert("Error eliminando distrito.");
        }
    };

    const handleUpdateTheme = async (themeId: string) => {
        if (!selectedUser) return;
        if (!window.confirm(`¿Asignar identidad "${themeId}" al usuario seleccionado?`)) return;

        try {
            setLoading(true);
            const { error } = await (supabase as any)
                .from('profiles')
                .update({ theme_id: themeId } as any)
                .eq('id', selectedUser);

            if (error) throw error;

            alert("Identidad actualizada correctamente.");
            fetchData(); // Refresh list to see new theme
        } catch (error) {
            console.error("Error updating theme:", error);
            alert("Error al actualizar tema. Verificar que la columna 'theme_id' exista en la tabla 'profiles'.");
        } finally {
            setLoading(false);
        }
    };

    // Security Check
    if (!profile?.is_admin) {
        return <div className="p-10 text-red-500 font-bold">Acceso Denegado. Solo Administradores.</div>;
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Administración de Usuarios</h1>

            {/* Assignment Panel */}
            <div className="bg-white p-6 rounded-xl shadow-md mb-8 border border-gray-100">
                <h2 className="text-lg font-semibold mb-4 text-blue-900 border-b pb-2">Gestión de Accesos e Identidad</h2>
                <div className="flex flex-wrap gap-6 items-start">

                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                        <select
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500"
                        >
                            <option value="">Seleccionar Usuario...</option>
                            {profiles.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.email} {p.is_admin ? '(Admin)' : ''}
                                </option>
                            ))}
                        </select>
                        {/* Helper info about selected user */}
                        {selectedUser && (
                            <div className="mt-2 text-xs text-slate-500">
                                Tema actual: <strong>{profiles.find(p => p.id === selectedUser)?.theme_id || 'Default'}</strong>
                            </div>
                        )}
                    </div>

                    {/* District Assignment */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Asignar Territorio</h3>
                        <div className="flex items-end gap-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Distrito</label>
                                <input
                                    type="number"
                                    value={districtToAdd}
                                    onChange={(e) => setDistrictToAdd(parseInt(e.target.value))}
                                    className="w-20 p-2 border border-gray-300 rounded-md"
                                    placeholder="6"
                                />
                            </div>
                            <button
                                onClick={handleAssignDistrict}
                                disabled={!selectedUser}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 font-medium whitespace-nowrap"
                            >
                                + Asignar
                            </button>
                        </div>
                    </div>

                    {/* Theme Assignment */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Identidad Gráfica</h3>
                        <div className="flex items-end gap-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tema / Partido</label>
                                <select
                                    onChange={(e) => handleUpdateTheme(e.target.value)}
                                    className="w-40 p-2 border border-gray-300 rounded-md"
                                    disabled={!selectedUser}
                                    value="" // Always reset to prompt selection
                                >
                                    <option value="" disabled>Seleccionar...</option>
                                    <option value="neutral_authority">Autoridad Neutral (Gob)</option>
                                    <option value="action_blue">Acción (Azul)</option>
                                    <option value="regeneration_maroon">Regeneración (Guinda)</option>
                                    <option value="institutional_tricolor">Institucional (Tricolor)</option>
                                    <option value="movement_orange">Movimiento (Naranja)</option>
                                    <option value="alliance_green">Alianza (Verde)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Users List */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                <h2 className="text-lg font-semibold mb-4 text-gray-700">Usuarios Registrados ({profiles.length})</h2>

                {loading ? <p>Cargando...</p> : (
                    <div className="grid gap-4">
                        {profiles.map(user => {
                            const userDistricts = assignments
                                .filter(a => a.user_id === user.id)
                                .sort((a, b) => a.distrito_id - b.distrito_id);

                            return (
                                <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-900">{user.email}</span>
                                            {user.is_admin && (
                                                <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-bold">ADMIN</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">
                                            ID: {user.id} <br />
                                            <span className="text-blue-400">Tema: {user.theme_id || 'Default'}</span>
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500 mr-2">Distritos:</span>
                                        {userDistricts.length === 0 ? (
                                            <span className="text-xs italic text-gray-400">Sin asignar</span>
                                        ) : (
                                            userDistricts.map(d => (
                                                <span key={d.distrito_id} className="inline-flex items-center gap-1 bg-white border border-blue-200 text-blue-700 text-sm px-2 py-1 rounded">
                                                    Distrito {d.distrito_id}
                                                    <button
                                                        onClick={() => handleRemoveDistrict(user.id, d.distrito_id)}
                                                        className="text-red-400 hover:text-red-600 text-xs ml-1 font-bold"
                                                        title="Eliminar acceso"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
