import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'dark' | 'outline' | 'danger' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * Botón estandarizado de Kynea para acciones y mutaciones.
 * Previene doble clic automáticamente mediante `isLoading`, muestra micro-spinner
 * `Loader2` y adapta el texto de acción a gerundio sin saltos de layout.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className = '',
    variant = 'primary',
    size = 'md',
    isLoading = false,
    loadingText,
    leftIcon,
    rightIcon,
    disabled = false,
    type = 'button',
    ...props
  },
  ref
) {
  const variantClasses = {
    primary: 'btn-primary',
    dark: 'btn-dark',
    outline: 'btn-outline',
    danger:
      'inline-flex items-center justify-center gap-2 font-sans font-semibold text-[15px] px-7 py-[14px] rounded-btn border bg-red border-red text-white hover:bg-red-dark active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed',
    ghost:
      'inline-flex items-center justify-center gap-2 font-sans font-semibold text-[15px] px-4 py-2 rounded-btn text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed',
  }[variant];

  const sizeClasses = {
    xs: 'btn-xs text-xs px-2.5 py-1',
    sm: 'btn-sm text-[13px] px-4 py-2',
    md: '',
    lg: 'px-8 py-4 text-[16px]',
  }[size];

  const isDisabled = disabled || isLoading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading}
      aria-disabled={isDisabled}
      className={`relative select-none ${variantClasses} ${sizeClasses} ${
        isLoading ? 'cursor-wait pointer-events-none' : ''
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="shrink-0 flex items-center">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

export default Button;
