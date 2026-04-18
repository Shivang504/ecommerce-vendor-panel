/**
 * Global fetch interceptor for automatic 401/Unauthorized handling
 * This intercepts all fetch calls and automatically logs out users on auth errors
 */

import { isAuthError, performAutoLogout } from './auth-utils';

// Store original fetch (only on client side)
let originalFetch: typeof fetch | null = null;

/**
 * Initialize global fetch interceptor
 * Call this once in your app (e.g., in app/layout.tsx or _app.tsx)
 */
export function initFetchInterceptor() {
  if (typeof window === 'undefined') return;

  // Only intercept if not already intercepted
  if ((window as any).__fetchIntercepted) {
    return;
  }

  (window as any).__fetchIntercepted = true;

  // Store original fetch
  originalFetch = window.fetch.bind(window);

  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

  // Override global fetch
  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    // Call original fetch
    if (!originalFetch) {
      throw new Error('Fetch interceptor not properly initialized');
    }
    let resolvedInput = input;
    if (apiBase && typeof input === 'string' && input.startsWith('/api')) {
      resolvedInput = `${apiBase}${input}`;
    }
    const response = await originalFetch(resolvedInput, init);

    // Check if response is not ok and might be an auth error
    if (!response.ok) {
      // Clone response to read body without consuming it
      const clonedResponse = response.clone();
      
      try {
        const data = await clonedResponse.json();
        const errorMessage = data?.message || data?.error || 'Request failed';
        
        // Check if this is an authentication error
        if (isAuthError(response, errorMessage)) {
          console.log('[Fetch Interceptor] Auth error detected, logging out user');
          // Perform automatic logout
          performAutoLogout();
        }
      } catch (e) {
        // If JSON parsing fails, only logout on 401 (not 403)
        // 403 means authenticated but not authorized - should not logout
        if (response.status === 401) {
          console.log('[Fetch Interceptor] Auth error detected (401), logging out user');
          performAutoLogout();
        }
      }
    }

    return response;
  };
}

