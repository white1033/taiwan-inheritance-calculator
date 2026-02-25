import { forwardRef, type SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ hasError, className = '', children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          hasError ? 'border-red-400' : 'border-slate-300'
        } ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);
