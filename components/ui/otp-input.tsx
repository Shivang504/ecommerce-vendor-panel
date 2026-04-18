'use client';

import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import { cn } from '@/lib/utils';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export function OTPInput({ length = 6, value, onChange, onComplete, disabled = false, error = false, className }: OTPInputProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Auto-complete callback when all digits are filled
  useEffect(() => {
    if (value.length === length && onComplete) {
      onComplete(value);
    }
  }, [value, length, onComplete]);

  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Extract only the last character if multiple characters are present
    // This handles cases where user pastes or types quickly
    const lastChar = inputValue.slice(-1);

    // Only allow numeric input
    if (lastChar && !/^\d$/.test(lastChar)) {
      // If invalid, reset to current value at this index
      e.target.value = value[index] || '';
      return;
    }

    // If the value at this index is already the same, don't update (prevents duplicate)
    if (value[index] === lastChar && lastChar) {
      return;
    }

    const newValue = [...value.split('')];

    // Ensure array is properly sized
    while (newValue.length < length) {
      newValue.push('');
    }

    if (lastChar) {
      // If there's a valid digit, replace ONLY at current index
      newValue[index] = lastChar;

      // If not the last input, move to next
      if (index < length - 1) {
        setTimeout(() => {
          const nextInput = inputRefs.current[index + 1];
          if (nextInput) {
            nextInput.focus();
          }
        }, 0);
      }
    } else {
      // If empty, clear current index
      newValue[index] = '';
    }

    const updatedValue = newValue.join('').slice(0, length);
    onChange(updatedValue);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();

      const newValue = value.split('');

      if (value[index]) {
        // If current input has value, clear it
        newValue[index] = '';
      } else if (index > 0) {
        // If current input is empty, move to previous and clear it
        newValue[index - 1] = '';
        const prevInput = inputRefs.current[index - 1];
        if (prevInput) {
          prevInput.focus();
        }
      }

      onChange(newValue.join(''));
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      const prevInput = inputRefs.current[index - 1];
      if (prevInput) {
        prevInput.focus();
      }
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      const nextInput = inputRefs.current[index + 1];
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);

    if (pastedData) {
      const newValue = pastedData.padEnd(length, '').split('').slice(0, length);
      onChange(newValue.join(''));

      // Focus the next empty input or the last input
      const nextIndex = Math.min(pastedData.length, length - 1);
      const nextInput = inputRefs.current[nextIndex];
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  const handleFocus = (index: number) => {
    setFocusedIndex(index);
  };

  const handleBlur = () => {
    setFocusedIndex(null);
  };

  return (
    <div className={cn('flex items-center justify-center gap-3 sm:gap-4', className)}>
      {Array.from({ length }).map((_, index) => {
        const digit = value[index] || '';
        const isFocused = focusedIndex === index;
        const hasError = error;

        return (
          <input
            key={index}
            ref={el => (inputRefs.current[index] = el)}
            type='text'
            inputMode='numeric'
            maxLength={1}
            value={digit}
            onChange={e => {
              if (value[index] && e.target.value.length > 1) {
                e.target.value = value[index];
                return;
              }
              handleChange(index, e);
            }}
            onKeyDown={e => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={() => handleFocus(index)}
            onBlur={handleBlur}
            disabled={disabled}
            autoComplete='off'
            autoCorrect='off'
            autoCapitalize='off'
            spellCheck={false}
            className={cn(
              'h-10 w-10',
              'rounded-xl',
              'text-center text-xl font-semibold',
              'transition-all duration-200 ease-out',
              'focus:outline-none',
              'disabled:opacity-50 disabled:cursor-not-allowed',

              /* Base */
              'bg-white/90 dark:bg-gray-900/70 backdrop-blur',
              'border border-gray-300 dark:border-gray-700',
              'text-gray-900 dark:text-gray-100',

              /* Hover */
              // 'hover:border-web/50',

              /* Focus */
              isFocused && !hasError && ['border-web', 'ring-4 ring-web/10', '', 'shadow-lg'],

              /* Error */
              hasError && !isFocused && ['border-red-500', 'ring-2 ring-red-500/20'],

              /* Error + Focus */
              hasError && isFocused && ['border-red-500', 'ring-4 ring-red-500/30', 'scale-[1.05]'],

              /* Filled */
              digit && !isFocused && !hasError && ['border-web/40', 'bg-web/5']
            )}
            aria-label={`OTP digit ${index + 1}`}
          />
        );
      })}
    </div>
  );
}
