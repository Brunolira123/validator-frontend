import { forwardRef, type InputHTMLAttributes } from "react";


interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, hint, className = '', ...rest }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          {...rest}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-vr-500 transition-colors ${
            error ? 'border-red-300 focus:ring-red-500' : 'border-slate-300'
          } ${className}`}
        />
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';