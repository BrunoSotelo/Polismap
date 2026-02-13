import React, { createContext, useContext, useEffect, useState } from 'react';

// 1. Define the Shape of our Theme
export interface ThemeConfig {
    id: string;
    name: string;
    colors: {
        primary: string;   // Brand Color
        surface: string;   // Card/Panel Background
        accent: string;    // Highlight/Secondary
        danger: string;    // Error states
    };
    radius: {
        base: string;      // e.g., '0.5rem' or '8px'
    };
    logoUrl?: string;      // White-label logo
}

// 2. Default Themes (Presets)
export const defaultThemes: Record<string, ThemeConfig> = {
    neutral_authority: {
        id: 'neutral_authority',
        name: 'Autoridad Neutral (Login/Gob)',
        colors: {
            primary: '#f59e0b', // amber-500 (Gold)
            surface: '#171717', // neutral-900
            accent: '#d4d4d8',  // zinc-300
            danger: '#ef4444',
        },
        radius: { base: '0.5rem' }
    },
    action_blue: {
        id: 'action_blue',
        name: 'Acción (Azul/Blanco)',
        colors: {
            primary: '#2563eb', // blue-600
            surface: '#0f172a', // slate-900 (Deep Blue)
            accent: '#ffffff',  // White
            danger: '#ef4444',
        },
        radius: { base: '0.3rem' }
    },
    regeneration_maroon: {
        id: 'regeneration_maroon',
        name: 'Regeneración (Guinda)',
        colors: {
            primary: '#be123c', // rose-700 (Close to Guinda)
            surface: '#450a0a', // red-950 (Deep Maroon)
            accent: '#facc15',  // yellow-400 (Gold)
            danger: '#ef4444',
        },
        radius: { base: '0.75rem' }
    },
    institutional_tricolor: {
        id: 'institutional_tricolor',
        name: 'Institucional (Tricolor)',
        colors: {
            primary: '#16a34a', // green-600
            surface: '#1a2e05', // dark green
            accent: '#b91c1c',  // red-700
            danger: '#ef4444',
        },
        radius: { base: '0.25rem' }
    },
    movement_orange: {
        id: 'movement_orange',
        name: 'Movimiento (Naranja)',
        colors: {
            primary: '#f97316', // orange-500
            surface: '#2a1205', // dark orange/brown
            accent: '#fdba74',  // orange-300
            danger: '#ef4444',
        },
        radius: { base: '1rem' }
    },
    alliance_green: {
        id: 'alliance_green',
        name: 'Alianza (Verde)',
        colors: {
            primary: '#65a30d', // lime-600
            surface: '#142808', // dark lime
            accent: '#bef264',  // lime-200
            danger: '#ef4444',
        },
        radius: { base: '1.2rem' }
    },
    // Legacy support
    ocean: {
        id: 'ocean',
        name: 'Ocean (Legacy)',
        colors: { primary: '#2563eb', surface: '#0f172a', accent: '#06b6d4', danger: '#ef4444' },
        radius: { base: '0.75rem' }
    }
};

interface ThemeContextType {
    currentTheme: ThemeConfig;
    setThemeId: (id: string) => void;
    updateThemeValues: (partial: Partial<ThemeConfig>) => void;
    availableThemes: ThemeConfig[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Custom Hook to listen to Auth changes
import { useAuth } from '../AuthContext';

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    // Start with default theme, or load from local storage
    const [theme, setTheme] = useState<ThemeConfig>(defaultThemes['neutral_authority']);

    // Connect to Auth to auto-load user preference
    const { profile } = useAuth();

    // Effect: Sync Theme with Profile
    useEffect(() => {
        if (profile?.theme_id && defaultThemes[profile.theme_id]) {
            console.log(`[Theme] Loading user preference: ${profile.theme_id}`);
            setTheme(defaultThemes[profile.theme_id]);
        }
    }, [profile]);

    // Inject CSS Variables whenever 'theme' state changes
    useEffect(() => {
        const root = document.documentElement;

        // Colors
        root.style.setProperty('--ds-color-primary', theme.colors.primary);
        root.style.setProperty('--ds-color-surface', theme.colors.surface);
        root.style.setProperty('--ds-color-accent', theme.colors.accent);
        root.style.setProperty('--ds-color-danger', theme.colors.danger);

        // Shape
        root.style.setProperty('--ds-radius-base', theme.radius.base);

        console.log(`[Theme] Applied ${theme.name}`);
    }, [theme]);

    const setThemeId = (id: string) => {
        if (defaultThemes[id]) {
            setTheme(defaultThemes[id]);
        }
    };

    const updateThemeValues = (partial: Partial<ThemeConfig>) => {
        setTheme(prev => ({ ...prev, ...partial }));
    };

    return (
        <ThemeContext.Provider value={{
            currentTheme: theme,
            setThemeId,
            updateThemeValues,
            availableThemes: Object.values(defaultThemes)
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};
