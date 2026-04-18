import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface DropdownProps {
  options: Option[];
  placeholder?: string;
  withSearch?: boolean;
  onChange?: (option: Option) => void;
  error?: string;
  labelMain?: string;
  value?: string;
  disabled?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({
  options,
  placeholder = 'Select an option',
  withSearch = false,
  onChange,
  error,
  labelMain,
  value,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selected, setSelected] = useState<Option | null>(() => {
    if (value) {
      const foundOption = options.find(opt => opt.value === value);
      return foundOption || null;
    }
    return null;
  });
  const [searchTerm, setSearchTerm] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
      setSearchTerm('');
    }
  }, [disabled]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && withSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, withSearch]);

  // Update selected when value prop changes
  useEffect(() => {
    if (value) {
      const foundOption = options.find(opt => opt.value === value);
      setSelected(foundOption || null);
    } else {
      setSelected(null);
    }
  }, [value, options]);

  const filteredOptions = options.filter(option => option.label.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSelect = (option: Option) => {
    setSelected(option);
    setIsOpen(false);
    setSearchTerm('');
    if (onChange) onChange(option);
  };

  return (
    <div className='w-full max-w-full'>
      {labelMain && <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'>{labelMain}</label>}

      <div className='relative' ref={dropdownRef}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setIsOpen(!isOpen);
          }}
          className={`w-full px-4 py-[10px] rounded-md text-left bg-white dark:bg-slate-700 border 
          border-slate-200 dark:border-slate-600
           transition-all duration-200 flex items-center justify-between
           ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-slate-300'}`}>
          <span className={selected ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>{selected ? selected.label : placeholder}</span>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className='absolute z-50 w-full mt-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg overflow-hidden'>
            {withSearch && (
              <div className='p-3 border-b border-gray-100 dark:border-slate-600'>
                <div className='relative'>
                  <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
                  <input
                    ref={searchInputRef}
                    type='text'
                    placeholder='Search...'
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className='w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-gray-900 dark:text-white'
                  />
                </div>
              </div>
            )}

            <div className='max-h-60 overflow-y-auto'>
              {filteredOptions.length > 0 ? (
                filteredOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className='w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors duration-150 flex items-center justify-between group'>
                    <span
                      className={`text-sm ${
                        selected?.value === option.value ? 'text-black font-semibold' : 'text-gray-700 dark:text-gray-200'
                      }`}>
                      {option.label}
                    </span>
                    {selected?.value === option.value && <Check className='w-4 h-4 text-black' />}
                  </button>
                ))
              ) : (
                <div className='px-4 py-8 text-center text-sm text-gray-400'>No results found</div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && !isOpen && (
        <p className='text-red-500 text-xs mt-1 flex items-center gap-1'>
          {/* <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg> */}
          {error}
        </p>
      )}
    </div>
  );
};

export default Dropdown;
