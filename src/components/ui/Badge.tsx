import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral' | 'info';

interface BadgeProps {
  variant?: Variant;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary-50 text-primary-700 ring-primary-200',
  secondary: 'bg-secondary-50 text-secondary-700 ring-secondary-200',
  success: 'bg-success-50 text-success-700 ring-success-200',
  warning: 'bg-warning-50 text-warning-600 ring-warning-200',
  error: 'bg-error-50 text-error-600 ring-error-200',
  neutral: 'bg-gray-100 text-gray-600 ring-gray-200',
  info: 'bg-blue-50 text-blue-600 ring-blue-200',
};

const dotColors: Record<Variant, string> = {
  primary: 'bg-primary-500',
  secondary: 'bg-secondary-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  error: 'bg-error-500',
  neutral: 'bg-gray-400',
  info: 'bg-blue-500',
};

export function Badge({ variant = 'neutral', children, className = '', dot }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full ring-1 ring-inset ${variantClasses[variant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}
