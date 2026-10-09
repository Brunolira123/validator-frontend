import type{ ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  ...rest
}: Props) {
  const variants = {
    primary: 'bg-vr-600 hover:bg-vr-700 active:bg-vr-800 text-white shadow-sm',
    secondary: 'bg-white border border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 text-neutral-700',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 min-h-11 md:min-h-0 font-semibold rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && (
        <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
      )}
      {children}
    </button>
  );
}