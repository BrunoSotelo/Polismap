import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: string;
    trend?: string;
    trendUp?: boolean;
    icon: LucideIcon;
    color?: 'blue' | 'green' | 'purple' | 'orange' | 'pink';
    size?: 'normal' | 'compact';
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, trend, trendUp, icon: Icon, color = 'blue', size = 'normal' }) => {
    const colorMap = {
        blue: { bg: '#eff6ff', text: '#2563eb' },
        green: { bg: '#f0fdf4', text: '#16a34a' },
        purple: { bg: '#faf5ff', text: '#9333ea' },
        orange: { bg: '#fff7ed', text: '#ea580c' },
        pink: { bg: '#fce7f3', text: '#db2777' },
    };

    const theme = colorMap[color];

    if (size === 'compact') {
        return (
            <div className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-3 shadow-sm min-w-[200px] flex-1">
                <div
                    className="p-2 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: theme.bg, color: theme.text }}
                >
                    <Icon size={18} />
                </div>
                <div>
                    <p className="text-xs text-slate-500 font-medium">{title}</p>
                    <div className="flex items-baseline gap-2">
                        <h4 className="text-lg font-bold text-slate-800 leading-none">{value}</h4>
                        {trend && (
                            <span className={`text-xs font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
                                {trendUp ? '↑' : '↓'}{trend}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="stats-card">
            <div className="stats-info">
                <p className="stats-label">{title}</p>
                <h4>{value}</h4>
                {trend && (
                    <p className={`trend-indicator ${trendUp ? 'trend-up' : 'trend-down'}`}>
                        {trendUp ? '↑' : '↓'} {trend} <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400, marginLeft: '4px' }}>vs mes anterior</span>
                    </p>
                )}
            </div>
            <div
                className="stats-icon-wrapper"
                style={{ backgroundColor: theme.bg, color: theme.text }}
            >
                <Icon size={20} />
            </div>
        </div>
    );
};

export default StatsCard;
