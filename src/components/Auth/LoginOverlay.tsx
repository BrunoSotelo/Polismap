import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/DesignSystem/ThemeContext';
import ButtonDS from '../DesignSystem/Atoms/ButtonDS';
import { Eye, EyeOff, MapPin, ShieldCheck, Lock } from 'lucide-react';

const LoginOverlay = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    // Theme context for manual overrides if needed, though CSS vars handle most
    const { currentTheme } = useTheme();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            // AuthContext will detect change and parent component will remove this overlay
            // No navigation needed here to preserve the map state
        }
    };

    return (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[2000] w-full max-w-[300px] pointer-events-none">
            <div className="w-full pointer-events-auto">
                {/* Glass Card */}
                <div
                    className="relative overflow-hidden rounded-xl border border-white/20 bg-slate-900/60 shadow-2xl backdrop-blur-xl transition-all duration-500"
                    style={{ boxShadow: `0 0 40px -10px ${currentTheme.colors.primary}40` }}
                >
                    {/* Decorative Top Line */}
                    <div className="h-1 w-full bg-gradient-to-r from-transparent via-[var(--ds-color-primary)] to-transparent opacity-80" />

                    <div className="p-6">
                        {/* Header Compacto */}
                        <div className="mb-6 text-center text-white">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <ShieldCheck size={20} className="text-[var(--ds-color-primary)]" />
                                <h1 className="text-lg font-bold tracking-tight">GIS Político</h1>
                            </div>
                            <p className="text-[10px] text-slate-400">Inteligencia Electoral <span className="text-white font-semibold">2026</span></p>
                        </div>

                        {error && (
                            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-center text-xs text-red-400 backdrop-blur-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-1">
                                <div className="relative group">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 transition-colors">
                                        <MapPin size={14} />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full rounded-lg border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-[var(--ds-color-primary)] focus:bg-black/40 focus:outline-none focus:ring-1 focus:ring-[var(--ds-color-primary)] transition-all"
                                        placeholder="usuario@partido.mx"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <div className="relative group">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 transition-colors">
                                        <Lock size={14} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full rounded-lg border border-white/10 bg-black/20 py-2 pl-9 pr-9 text-xs text-white placeholder-slate-500 focus:border-[var(--ds-color-primary)] focus:bg-black/40 focus:outline-none focus:ring-1 focus:ring-[var(--ds-color-primary)] transition-all"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-white transition-colors cursor-pointer"
                                    >
                                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                            </div>

                            <div className="pt-1">
                                <ButtonDS
                                    type="submit"
                                    variant="solid"
                                    size="sm"
                                    className="w-full text-xs font-semibold shadow-lg shadow-[var(--ds-color-primary)]/20 hover:shadow-[var(--ds-color-primary)]/40"
                                    isLoading={loading}
                                >
                                    Iniciar Sesión
                                </ButtonDS>
                            </div>
                        </form>

                        <div className="mt-4 text-center">
                            <a href="#" className="text-[10px] text-slate-500 hover:text-[var(--ds-color-primary)] transition-colors">
                                Recuperar contraseña
                            </a>
                        </div>
                    </div>
                </div>

                {/* Footer Brand Compact */}
                <div className="mt-4 text-center opacity-50 hover:opacity-100 transition-opacity">
                    <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-light">Versión 2.0.4 - Querétaro</p>
                </div>
            </div>
        </div>
    );
};

export default LoginOverlay;
