import type { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonDSProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'solid' | 'outline' | 'ghost' | 'glass';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
}

const ButtonDS = ({
    variant = 'solid',
    size = 'md',
    isLoading = false,
    leftIcon,
    children,
    className = '',
    ...props
}: ButtonDSProps) => {

    // Base styles
    const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 outline-none focus:ring-2 focus:ring-[var(--ds-color-primary)] focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed";

    // Dynamic Radius from Token
    const radiusStyle = { borderRadius: 'var(--ds-radius-base)' };

    // Variants using CSS Variables
    const variants = {
        solid: "bg-[var(--ds-color-primary)] text-white hover:brightness-110 shadow-lg shadow-[var(--ds-color-primary)]/30",
        outline: "border-2 border-[var(--ds-color-primary)] text-[var(--ds-color-primary)] hover:bg-[var(--ds-color-primary)] hover:text-white",
        ghost: "text-slate-400 hover:text-[var(--ds-color-primary)] hover:bg-[var(--ds-color-primary)]/10",
        glass: "bg-white/5 backdrop-blur-md border border-white/10 text-white hover:bg-white/10"
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base"
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            style={radiusStyle}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
            {children}
        </button>
    );
};

export default ButtonDS;
