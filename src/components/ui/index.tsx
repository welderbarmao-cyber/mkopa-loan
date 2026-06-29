'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

// ============ Card ============
export const Card = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-ink-200 bg-white text-ink-900 shadow-premium',
        'dark:border-ink-800 dark:bg-ink-900 dark:text-ink-50',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1 p-6', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-ink-500 dark:text-ink-400', className)} {...props} />
  )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  )
);
CardFooter.displayName = 'CardFooter';

// ============ Button ============
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success' | 'warning';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'gradient-mkopa text-white shadow-premium-md hover:shadow-premium-lg hover:opacity-90',
  secondary: 'bg-ink-100 text-ink-900 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-50 dark:hover:bg-ink-700',
  outline: 'border border-ink-200 bg-white text-ink-900 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-50 dark:hover:bg-ink-800',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-50',
  destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-premium-md',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-premium-md',
  warning: 'bg-amber-500 text-white hover:bg-amber-600 shadow-premium-md',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs rounded-lg',
  md: 'h-10 px-4 text-sm rounded-lg',
  lg: 'h-12 px-6 text-base rounded-xl',
  icon: 'h-10 w-10 rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mkopa-green/30',
        'disabled:opacity-40 disabled:pointer-events-none',
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = 'Button';

// ============ Badge ============
type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline' | 'primary';

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  primary: 'bg-mkopa-green/10 text-mkopa-green dark:bg-mkopa-green/20 dark:text-mkopa-green',
  outline: 'border border-ink-200 text-ink-700 dark:border-ink-700 dark:text-ink-300',
};

export function Badge({ className, variant = 'default', ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold',
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}

// ============ Input ============
export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm',
        'placeholder:text-ink-400',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mkopa-green/30 focus-visible:border-mkopa-green',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'dark:border-ink-700 dark:bg-ink-900 dark:placeholder:text-ink-500',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';

// ============ Avatar ============
export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const colors = [
    'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-amber-500',
    'bg-emerald-500', 'bg-red-500', 'bg-indigo-500', 'bg-teal-500',
  ];
  const colorIndex = name.charCodeAt(0) % colors.length;
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full text-white font-semibold text-sm',
        colors[colorIndex],
        className || 'w-9 h-9'
      )}
    >
      {initials}
    </div>
  );
}

// ============ Skeleton ============
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-md bg-ink-200 dark:bg-ink-800', className)} />
  );
}

// ============ Empty State ============
export function EmptyState({ icon: Icon, title, description, action }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-ink-100 dark:bg-ink-800 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-ink-400" />
      </div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      {description && <p className="text-sm text-ink-500 max-w-md mb-4">{description}</p>}
      {action}
    </div>
  );
}

// ============ Separator ============
export function Separator({ className }: { className?: string }) {
  return <div className={cn('h-px bg-ink-200 dark:bg-ink-800', className)} />;
}
