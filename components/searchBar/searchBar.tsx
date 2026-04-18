'use client';

import { SearchIcon } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';

type SearchBarProps = {
  categories: string[];
  value: string;
  placeholder?: string;
  selectedCategory: string;
  onChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSearch: () => void;
  searchResults?: any[];
  showSearchResults?: boolean;
  searchLoading?: boolean;
  onProductClick?: (product: any) => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

const SearchBar: React.FC<SearchBarProps> = ({
  categories,
  value,
  selectedCategory,
  placeholder = 'What are you looking for?',
  onChange,
  onCategoryChange,
  onSearch,
  searchResults = [],
  showSearchResults = false,
  searchLoading = false,
  onProductClick,
  onFocus,
  onBlur,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (
        searchResultsRef.current &&
        !searchResultsRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('input')
      ) {
        onBlur?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onBlur]);

  const handleCategorySelect = (category: string) => {
    onCategoryChange(category);
    setIsOpen(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  const getProductUrl = (product: any) => {
    return product.urlSlug ? `/products/${product.urlSlug}` : `/products/${product._id || product.id}`;
  };

  const getProductPrice = (product: any) => {
    return product.sellingPrice || product.price || product.regularPrice || 0;
  };

  const getProductImage = (product: any) => {
    return product.mainImage || (Array.isArray(product.galleryImages) && product.galleryImages[0]) || '/placeholder.jpg';
  };

  return (
    <div className='w-full max-w-3xl relative'>
      <div className='flex items-center bg-white rounded-full shadow-lg border-2 border-transparent hover:border-gray-200 focus-within:border-web transition-all duration-200'>
        {/* CATEGORY DROPDOWN */}
        <div className='relative z-50 flex-shrink-0' ref={dropdownRef}>
          <button
            type='button'
            className='flex items-center gap-1.5 sm:gap-2 pl-3 sm:pl-4 pr-2 sm:pr-3 
                       py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-gray-700
                       hover:text-web hover:bg-gray-50 rounded-l-full transition-colors duration-200'
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}>
            <span className='whitespace-nowrap max-w-[120px] sm:max-w-[150px] truncate'>{selectedCategory}</span>
            <svg
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 transition-transform duration-200 flex-shrink-0 ${
                isOpen ? 'rotate-180' : ''
              }`}
              fill='none'
              stroke='currentColor'
              strokeWidth='2.5'
              viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' d='M19 9l-7 7-7-7' />
            </svg>
          </button>

          {isOpen && (
            <div
              className='
      absolute left-0 top-full mt-2 w-56 sm:w-64 
      bg-white rounded-xl shadow-xl border border-gray-200 
      py-2 z-[99999] max-h-[320px] overflow-y-auto 
      scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent
    '>
              {categories?.length > 0 ? (
                <>
                  {categories.map((cat, i) => (
                    <button
                      key={`${cat}-${i}`}
                      type='button'
                      className={`
              w-full text-left px-4 py-2.5 sm:py-3 text-sm  cursor-pointer
              flex items-center justify-between rounded-lg transition-all
              ${selectedCategory === cat ? 'bg-web/10 text-web font-semibold' : 'text-gray-700 hover:bg-gray-50 hover:text-web'}
            `}
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCategorySelect(cat);
                      }}>
                      <span className='truncate'>{cat}</span>

                      {selectedCategory === cat && <span className='w-2 h-2 rounded-full bg-web'></span>}
                    </button>
                  ))}
                </>
              ) : (
                <div className='px-4 py-3 text-sm text-gray-500 text-center'>No categories available</div>
              )}
            </div>
          )}
        </div>

        {/* DIVIDER */}
        <div className='h-6 sm:h-7 w-px bg-gray-300' />

        {/* INPUT */}
        <input
          type='text'
          className='flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-700 
                     placeholder-gray-400 focus:outline-none bg-transparent'
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyPress={handleKeyPress}
          onFocus={onFocus}
        />

        {/* SEARCH BUTTON */}
        <button
          type='button'
          onClick={onSearch}
          className='p-2 sm:p-2.5 m-1 sm:m-1.5 rounded-full text-web hover:bg-web/10 transition-all duration-200 flex-shrink-0'>
          <SearchIcon size={18} className='sm:w-5 sm:h-5' />
        </button>
      </div>

      {/* SEARCH RESULTS DROPDOWN */}
      {showSearchResults && (
        <div
          ref={searchResultsRef}
          className='absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border-2 border-gray-100 z-[99998] max-h-[500px] flex flex-col'>
          {searchLoading ? (
            <div className='p-6 text-center text-gray-500 flex-shrink-0'>
              <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-web'></div>
              <p className='mt-3 text-sm font-medium'>Searching...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <>
              <div className='p-3 sm:p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0 rounded-t-xl rounded-r-xl'>
                <p className='text-sm font-semibold text-gray-700'>
                  {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} found
                </p>
              </div>
              <div className='overflow-y-auto overflow-x-hidden scrollbar-thin' style={{ maxHeight: '400px' }}>
                <div className='py-2'>
                  {searchResults.map(product => (
                    <button
                      key={product._id || product.id}
                      type='button'
                      onClick={() => onProductClick?.(product)}
                      className='w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-all duration-150 text-left border-b border-gray-100 last:border-b-0'>
                      <div className='w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200'>
                        <img
                          src={getProductImage(product)}
                          alt={product.name}
                          className='w-full h-full object-cover'
                          onError={e => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder.jpg';
                          }}
                        />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <h3 className='text-sm sm:text-base font-semibold text-gray-900 truncate mb-1'>{product.name}</h3>
                        <p className='text-xs text-gray-500 truncate mb-2'>
                          {product.shortDescription || product.categoryDetails?.name || ''}
                        </p>
                        <p className='text-sm sm:text-base font-bold text-web'>₹{getProductPrice(product).toFixed(2)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {value.trim() && (
                <div className='p-3 sm:p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0 rounded-b-xl'>
                  <button
                    type='button'
                    onClick={onSearch}
                    className='w-full text-center text-sm font-semibold text-web hover:text-web/80 transition py-2 rounded-lg hover:bg-web/5'>
                    View All Results ({searchResults.length}+)
                  </button>
                </div>
              )}
            </>
          ) : value.trim().length >= 2 ? (
            <div className='p-6 text-center text-gray-500 flex-shrink-0'>
              <p className='text-sm font-medium mb-1'>No products found</p>
              <p className='text-xs text-gray-400'>Try different keywords or check spelling</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
