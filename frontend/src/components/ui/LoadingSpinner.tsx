import React from 'react';
import { cn } from '../../utils/formatting';
import { Loader2 } from 'lucide-react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message,
  className,
}) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center p-6 text-center space-y-3', className)}>
      <Loader2 className={cn('animate-spin text-teal-400', sizeMap[size])} />
      {message && <p className="text-xs text-gray-400 animate-pulse">{message}</p>}
    </div>
  );
};
