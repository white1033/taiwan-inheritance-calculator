import { forwardRef, type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'default' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  default: 'border border-slate-300 hover:bg-slate-50',
  danger: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100',
  ghost: 'hover:bg-slate-100 text-slate-500',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = 'default', className = '', children, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className={`px-3 py-2 text-sm rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
