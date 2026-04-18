'use client';

import { useEffect } from 'react';

export function ErrorHandler() {
  useEffect(() => {
    // Suppress React development mode cleanup errors
    if (typeof window === 'undefined') return;

    const originalError = console.error;
    const originalWarn = console.warn;
    
    // Override error handler
    console.error = (...args: any[]) => {
      const errorMessage = args[0]?.toString() || '';
      const stackTrace = args.join(' ') || '';
      
      // Suppress specific React development mode cleanup errors
      if (
        process.env.NODE_ENV === 'development' &&
        (errorMessage.includes('removeChild') ||
         (errorMessage.includes('Cannot read properties of null') && 
          stackTrace.includes('commitDeletionEffectsOnFiber')))
      ) {
        // Suppress this specific error in development
        return;
      }
      
      originalError.apply(console, args);
    };

    // Cleanup on unmount
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  return null;
}

