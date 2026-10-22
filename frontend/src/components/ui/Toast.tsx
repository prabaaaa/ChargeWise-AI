import React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../utils/formatting';

export const ToastProvider = ToastPrimitive.Provider;
export const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      'fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]',
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

export interface ToastProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> {
  variant?: 'default' | 'success' | 'destructive' | 'info';
  title?: string;
  description?: string;
}

export const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  ToastProps
>(({ className, variant = 'default', title, description, children, ...props }, ref) => {
  const icons = {
    default: null,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
    destructive: <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />,
    info: <Info className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />,
  };

  const variants = {
    default: 'bg-navy-800 border-graphite-600 text-gray-200',
    success: 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200',
    destructive: 'bg-red-950/90 border-red-500/50 text-red-200',
    info: 'bg-teal-950/90 border-teal-500/50 text-teal-200',
  };

  return (
    <ToastPrimitive.Root
      ref={ref}
      className={cn(
        'group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border p-4 shadow-2xl transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full backdrop-blur-md',
        variants[variant],
        className
      )}
      {...props}
    >
      {icons[variant]}
      <div className="flex-1 space-y-1">
        {title && <ToastPrimitive.Title className="text-sm font-semibold">{title}</ToastPrimitive.Title>}
        {description && (
          <ToastPrimitive.Description className="text-xs opacity-90 leading-relaxed">
            {description}
          </ToastPrimitive.Description>
        )}
        {children}
      </div>
      <ToastPrimitive.Close className="rounded-md p-1 opacity-70 hover:opacity-100 transition-opacity">
        <X className="h-4 w-4" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
});
Toast.displayName = ToastPrimitive.Root.displayName;
