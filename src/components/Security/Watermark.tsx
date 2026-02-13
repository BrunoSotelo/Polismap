import React from 'react';
import { useAuth } from '../../context/AuthContext';

const Watermark: React.FC = () => {
    const { user, profile } = useAuth();
    const identifier = profile?.email || user?.email || 'Confidencial';
    const date = new Date().toLocaleDateString('es-MX');

    // Create a pattern of text
    const text = `${identifier} • ${date} • CONFIDENCIAL`;

    return (
        <div
            className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden select-none"
            aria-hidden="true"
        >
            <div className="absolute inset-0 flex flex-wrap content-start justify-center opacity-[0.015] mix-blend-multiply rotate-[-45deg] scale-150">
                {Array.from({ length: 100 }).map((_, i) => (
                    <div key={i} className="p-12 text-sm font-bold text-slate-900 whitespace-nowrap">
                        {text}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Watermark;
