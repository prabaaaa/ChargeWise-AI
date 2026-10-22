import React from 'react';
import { cn } from '../../utils/formatting';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'outline';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  dot = false,
  children,
  ...props
}) => {
  const variants = {
    success: 'bg-[#7cff6b]/15 text-[#7cff6b] border-[#7cff6b]/35',
    warning: 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/35',
    danger: 'bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/35',
    info: 'bg-[#20e3ff]/15 text-[#20e3ff] border-[#20e3ff]/35',
    neutral: 'bg-[#172330] text-[#91a5b3] border-[#253441]',
    outline: 'bg-transparent text-[#91a5b3] border-[#253441]',
  };

  const dotColors = {
    success: 'bg-[#7cff6b]',
    warning: 'bg-[#f59e0b]',
    danger: 'bg-[#ef4444]',
    info: 'bg-[#20e3ff]',
    neutral: 'bg-[#91a5b3]',
    outline: 'bg-[#91a5b3]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide transition-colors',
        variants[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', dotColors[variant])} />
      )}
      {children}
    </span>
  );
};
