import React from 'react';
import { cn } from '../../utils/formatting';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glow' | 'danger' | 'bordered';
}

export const Card: React.FC<CardProps> = ({
  className,
  variant = 'default',
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-[#111a22]/95 border border-[#253441]/70 rounded-2xl shadow-xl p-5 backdrop-blur-md transition-all duration-200',
        variant === 'glow' && 'border-[#20e3ff]/40 shadow-[0_0_24px_rgba(32,227,255,0.12)]',
        variant === 'danger' && 'border-[#ef4444]/40 shadow-[0_0_24px_rgba(239,68,68,0.15)]',
        variant === 'bordered' && 'border-[#253441]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn('flex flex-col space-y-1.5 mb-4', className)} {...props}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <h3
      className={cn('text-base sm:text-lg font-bold tracking-tight text-[#eaf5fa] flex items-center gap-2', className)}
      {...props}
    >
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <p className={cn('text-xs text-[#91a5b3]', className)} {...props}>
      {children}
    </p>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn('pt-0', className)} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn('flex items-center pt-4 border-t border-[#253441]/60 mt-4', className)} {...props}>
      {children}
    </div>
  );
};
