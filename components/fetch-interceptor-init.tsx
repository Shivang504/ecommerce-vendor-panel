'use client';

import { useEffect } from 'react';
import { initFetchInterceptor } from '@/lib/fetch-interceptor';

/**
 * Client component that initializes the global fetch interceptor
 * This should be included in the root layout
 * Uses dynamic import with ssr: false to prevent hydration issues
 */
export function FetchInterceptorInit() {
  useEffect(() => {
    // Initialize fetch interceptor on client side only
    // This runs after component mounts, so window is guaranteed to exist
    initFetchInterceptor();
  }, []);

  // Return null to avoid any rendering differences
  return null;
}

