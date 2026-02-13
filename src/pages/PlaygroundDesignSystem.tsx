import { useState } from 'react';
import { useTheme, type ThemeConfig } from '../context/DesignSystem/ThemeContext';
import ButtonDS from '../components/DesignSystem/Atoms/ButtonDS';
import { Save, User, Settings, AlertTriangle } from 'lucide-react';

const PlaygroundDesignSystem = () => {
    const { currentTheme, setThemeId, availableThemes } = useTheme();
    const [loading, setLoading] = useState(false);

    const toggleLoad = () => {
        setLoading(true);
        setTimeout(() => setLoading(false), 2000);
    };

    return (
        <div className="min-h-screen bg-black text-slate-200 p-8 font-sans selection:bg-[var(--ds-color-primary)] selection:text-white">

            {/* Header / Theme Switcher */}
            <header className="mb-12 flex justify-between items-center bg-slate-900/50 p-6 rounded-2xl border border-white/10">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Design System <span className="text-[var(--ds-color-primary)]">Alchemy</span></h1>
                    <p className="text-slate-400">Sistema de componentes atómicos con "Theming" dinámico.</p>
                </div>

                <div className="flex gap-4 items-center">
                    <span className="text-sm font-bold text-slate-500 uppercase">Cambiar Identidad:</span>
                    {availableThemes.map((t: ThemeConfig) => (
                        <button
                            key={t.id}
                            onClick={() => setThemeId(t.id)}
                            style={{ backgroundColor: t.colors.primary }}
                            className={`
                                w-8 h-8 rounded-full border-2 transition-transform hover:scale-110
                                ${currentTheme.id === t.id ? 'border-white ring-2 ring-offset-2 ring-offset-black ring-[var(--ds-color-primary)]' : 'border-transparent opacity-50 hover:opacity-100'}
                            `}
                            title={t.name}
                        />
                    ))}
                </div>
            </header>

            {/* Showcase Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

                {/* 1. Brand Identity Card */}
                <div
                    className="p-6 rounded-[var(--ds-radius-base)] border border-white/5 relative overflow-hidden group"
                    style={{ backgroundColor: 'var(--ds-color-surface)' }}
                >
                    <div className="absolute top-0 left-0 w-1 h-full bg-[var(--ds-color-primary)]"></div>
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <User className="text-[var(--ds-color-primary)]" />
                        Perfil del Candidato
                    </h2>
                    <p className="text-sm text-slate-400 mb-6">
                        Este componente hereda automáticamente los colores del partido seleccionado.
                        Observa como los bordes, botones y acentos cambian.
                    </p>
                    <div className="flex gap-2">
                        <ButtonDS variant="solid" leftIcon={<Save size={16} />} onClick={toggleLoad} isLoading={loading}>
                            Guardar Cambios
                        </ButtonDS>
                        <ButtonDS variant="outline">Cancelar</ButtonDS>
                    </div>
                </div>

                {/* 2. Variant Showcase */}
                <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/30">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">Button Variants</h3>
                    <div className="flex flex-wrap gap-3">
                        <ButtonDS variant="solid">Solid Action</ButtonDS>
                        <ButtonDS variant="outline">Outline</ButtonDS>
                        <ButtonDS variant="ghost" leftIcon={<Settings size={16} />}>Settings</ButtonDS>
                        <ButtonDS variant="glass">Glass UI</ButtonDS>
                    </div>

                    <h3 className="text-sm font-bold text-slate-500 uppercase mt-8 mb-4">Sizes</h3>
                    <div className="flex flex-wrap items-center gap-3">
                        <ButtonDS size="sm" variant="solid">Small</ButtonDS>
                        <ButtonDS size="md" variant="solid">Medium</ButtonDS>
                        <ButtonDS size="lg" variant="solid">Large</ButtonDS>
                    </div>
                </div>

                {/* 3. System States */}
                <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/30 space-y-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">Alerts & System Colors</h3>

                    <div className="flex items-center gap-4 p-4 rounded-[var(--ds-radius-base)] bg-[var(--ds-color-primary)]/10 border border-[var(--ds-color-primary)]/20 text-[var(--ds-color-primary)]">
                        <User size={20} />
                        <span className="font-medium">Primary Info Block</span>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-[var(--ds-radius-base)] bg-[var(--ds-color-danger)]/10 border border-[var(--ds-color-danger)]/20 text-[var(--ds-color-danger)]">
                        <AlertTriangle size={20} />
                        <span className="font-medium">Critical Alert Block</span>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-[var(--ds-radius-base)] bg-[var(--ds-color-accent)]/10 border border-[var(--ds-color-accent)]/20 text-[var(--ds-color-accent)]">
                        <Settings size={20} />
                        <span className="font-medium">Accent / Highlight</span>
                    </div>
                </div>

            </div>

            <div className="mt-12 text-center text-slate-600 text-sm">
                Design System v1.0 • Powered by CSS Variables
            </div>
        </div>
    );
};

export default PlaygroundDesignSystem;
