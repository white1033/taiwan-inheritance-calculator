import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ hasError, className = '', ...props }, ref) {
    return (
      <input
        ref={ref}
        className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          hasError ? 'border-red-400' : 'border-slate-300'
        } ${className}`}
        {...props}
      />
    );
  }
);
