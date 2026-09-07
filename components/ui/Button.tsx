import React from 'react';

type ButtonVariant = 'primary' | 'light' | 'secondary' | 'danger';
type ButtonSize = 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'pg-btn-primary',
  light: 'pg-btn-light',
  secondary: 'pg-btn-secondary',
  danger: 'pg-btn-danger',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...props
}) => (
  <button
    {...props}
    disabled={disabled || loading}
    className={`pg-btn ${variantClass[variant]} ${size === 'lg' ? '!min-h-[54px] !rounded-[20px]' : ''} ${fullWidth ? 'w-full' : ''} ${className}`}
  >
    {loading ? (
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-current/20 border-t-current" aria-hidden="true" />
    ) : icon ? (
      <span className="material-symbols-rounded !text-[20px]" aria-hidden="true">{icon}</span>
    ) : null}
    {children}
  </button>
);
