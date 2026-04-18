'use client';

import { useId, useState } from 'react';
import { ImageIcon, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MainImageUploadProps {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  required?: boolean;
  description?: string;
  helperText?: string;
  recommendedText?: string;
  error?: string;
  disabled?: boolean;
  inputId?: string;
  accept?: string;
  uploadHandler?: (file: File) => Promise<string>;
  allowRemove?: boolean;
  hideLabel?: boolean;
}

export function MainImageUpload({
  label = 'Main Image',
  value = '',
  onChange,
  required,
  description = 'Click to upload or drag and drop',
  helperText,
  recommendedText = 'Recommended: 800×800px, JPG/PNG',
  error,
  disabled = false,
  inputId,
  accept = 'image/*',
  uploadHandler,
  allowRemove = true,
  hideLabel = false,
}: MainImageUploadProps) {
  const generatedId = useId();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputId = inputId || generatedId;
  const previewSrc = value || '/placeholder.svg';

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = event => resolve(event.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || disabled) return;

    setIsUploading(true);
    try {
      const nextValue = uploadHandler ? await uploadHandler(file) : await readFileAsDataUrl(file);
      onChange(nextValue || '');
    } catch (uploadError) {
      console.error('[MainImageUpload] Failed to process file', uploadError);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className='space-y-2'>
      {!hideLabel && (
        <label htmlFor={fileInputId} className='block text-sm font-medium text-slate-700 dark:text-slate-300'>
          {label}
          {required && <span className='text-red-500'> *</span>}
        </label>
      )}

      <div
        className={cn(
          'border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-6 text-center transition bg-white dark:bg-slate-900/40',
          disabled && 'opacity-60 cursor-not-allowed',
        )}
      >
        <input
          type='file'
          id={fileInputId}
          accept={accept}
          onChange={handleFileChange}
          className='hidden'
          disabled={disabled || isUploading}
        />

        <label htmlFor={fileInputId} className={cn('cursor-pointer block', disabled && 'pointer-events-none')}>
          <div className='flex flex-col items-center gap-2 text-slate-600 dark:text-slate-400'>
            <ImageIcon className='w-10 h-10 text-slate-400' />
            <p className='text-sm font-medium'>
              {isUploading ? 'Uploading...' : description}
            </p>
            {recommendedText && (
              <p className='text-xs text-slate-500 flex items-center gap-1'>
                <Upload className='w-4 h-4' />
                {recommendedText}
              </p>
            )}
          </div>
        </label>

        {value && (
          <div className='mt-4 relative inline-block'>
            <img src={previewSrc} alt={label} className='h-32 w-32 object-cover rounded border border-slate-200 bg-white' />
            {allowRemove && !disabled && (
              <button
                type='button'
                onClick={() => onChange('')}
                className='absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-md'
              >
                <X className='w-3 h-3' />
              </button>
            )}
          </div>
        )}
      </div>

      {helperText && <p className='text-xs text-slate-500'>{helperText}</p>}
      {error && <p className='text-xs text-red-500'>{error}</p>}
    </div>
  );
}

