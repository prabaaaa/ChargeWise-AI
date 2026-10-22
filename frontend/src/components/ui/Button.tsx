import React from 'react';
import { cn } from '../../utils/formatting';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'tealOutline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-bold rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-[#20e3ff] focus:ring-offset-2 focus:ring-offset-[#080d12] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none cursor-pointer';

    const variants = {
      primary: 'bg-gradient-to-r from-[#20e3ff] to-[#00d6b3] text-[#080d12] shadow-lg shadow-[#20e3ff]/20 hover:shadow-[#20e3ff]/35 hover:brightness-105',
      secondary: 'bg-[#172330] hover:bg-[#1f2f3f] text-[#eaf5fa] border border-[#253441] shadow-sm',
      danger: 'bg-[#ef4444] hover:bg-[#dc2626] text-white shadow-md shadow-red-500/25',
      ghost: 'bg-transparent hover:bg-[#172330]/70 text-[#91a5b3] hover:text-[#eaf5fa]',
      outline: 'bg-transparent border border-[#253441] text-[#91a5b3] hover:text-[#eaf5fa] hover:border-[#20e3ff]/60 hover:bg-[#111a22]',
      tealOutline: 'bg-[#20e3ff]/10 border border-[#20e3ff]/40 text-[#20e3ff] hover:bg-[#20e3ff]/20 hover:border-[#20e3ff]',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 h-8 gap-1.5',
      md: 'text-sm px-4 py-2 h-10 gap-2',
      lg: 'text-base px-5 py-2.5 h-12 gap-2.5',
      icon: 'h-9 w-9 p-0 flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
