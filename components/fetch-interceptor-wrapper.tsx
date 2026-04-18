'use client';

import dynamic from 'next/dynamic';

// Load fetch interceptor only on client side to avoid hydration issues
const FetchInterceptorInit = dynamic(() => import('@/components/fetch-interceptor-init').then(mod => ({ default: mod.FetchInterceptorInit })), {
  ssr: false, // Client-side only
});

/**
 * Client component wrapper for fetch interceptor
 * This allows us to use dynamic import with ssr: false
 */
export function FetchInterceptorWrapper() {
  return <FetchInterceptorInit />;
}

