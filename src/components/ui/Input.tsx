import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export function Input({ label, error, icon, className = '', id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-gray-400">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={`w-full px-4 py-2.5 text-sm rounded-xl border bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 ${icon ? 'ps-10' : ''} ${error ? 'border-error-300 focus:ring-error-200 focus:border-error-400' : 'border-gray-200'} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-error-600">{error}</p>}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: ReactNode;
}

export function Select({ label, error, className = '', id, children, ...props }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full px-4 py-2.5 text-sm rounded-xl border bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 ${error ? 'border-error-300' : 'border-gray-200'} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-error-600">{error}</p>}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = '', id, ...props }: TextareaProps) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`w-full px-4 py-2.5 text-sm rounded-xl border bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 ${error ? 'border-error-300' : 'border-gray-200'} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-error-600">{error}</p>}
    </div>
  );
}
