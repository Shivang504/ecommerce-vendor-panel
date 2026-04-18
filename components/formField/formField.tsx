import React from 'react';

interface InputProps {
  label: string;
  error?: string;
  required?: boolean;
  textarea?: boolean;
  placeholder?: string;
  helperText?: string;
  containerClassName?: string;
  inputClassName?: string;
  labelClassName?: string;
  hideLabel?: boolean;
  inline?: boolean;
  [key: string]: any;
}

export default function FormField({
  label,
  error,
  required,
  textarea,
  placeholder,
  helperText,
  containerClassName = '',
  inputClassName = '',
  labelClassName = '',
  hideLabel = false,
  inline = false,
  ...rest
}: InputProps) {
  const baseInputClasses =
    'w-full border rounded-md p-3 text-sm bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition';

  return (
    <div className={`w-full ${inline ? 'flex items-center gap-4' : 'flex flex-col gap-1'} ${containerClassName}`}>
      {!hideLabel && (
        <label className={`text-sm font-medium text-gray-700 dark:text-slate-300 ${inline ? 'w-32' : 'mb-1'} ${labelClassName}`}>
          {label} {required && <span className='text-black'>*</span>}
        </label>
      )}

      <div className={inline ? 'flex-1' : ''}>
        {textarea ? (
          <textarea
            placeholder={placeholder}
            {...rest}
            className={`${baseInputClasses} ${inputClassName} min-h-[48px] resize-y`}></textarea>
        ) : (
          <input placeholder={placeholder} {...rest} className={`${baseInputClasses} ${inputClassName}`} />
        )}

        {helperText && !error && <p className='text-xs text-slate-500 mt-1'>{helperText}</p>}
        {error && <p className='text-red-500 text-xs mt-1'>{error}</p>}
      </div>
    </div>
  );
}
