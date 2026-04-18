/**
 * Utility functions for handling authentication and automatic logout
 */

/**
 * Detects if an error is related to invalid/expired authentication
 * Only 401 (Unauthorized) triggers logout, not 403 (Forbidden)
 * 403 means authenticated but not authorized - should not logout
 */
export function isAuthError(response: Response, errorMessage?: string): boolean {
  // Only 401 indicates authentication failure - should logout
  // 403 means authenticated but not authorized - should NOT logout
  if (response.status === 401) {
    return true;
  }

  // For 403, only logout if error message indicates authentication issue
  // (not just permission denied)
  if (response.status === 403) {
    if (errorMessage) {
      const lowerMessage = errorMessage.toLowerCase();
      const authErrorKeywords = [
        'invalid token',
        'token expired',
        'authentication required',
        'token is invalid',
        'token has expired',
        'invalid or expired token',
        'authentication failed',
      ];
      
      // Only logout on 403 if it's an authentication error, not permission error
      return authErrorKeywords.some(keyword => lowerMessage.includes(keyword));
    }
    // 403 without auth-related error message = permission denied, don't logout
    return false;
  }

  // Check error messages for other status codes
  if (errorMessage) {
    const lowerMessage = errorMessage.toLowerCase();
    const authErrorKeywords = [
      'invalid token',
      'token expired',
      'authentication required',
      'unauthorized',
      'token is invalid',
      'token has expired',
      'invalid or expired token',
      'authentication failed',
      'unauthorized access',
    ];

    return authErrorKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  return false;
}

/**
 * Safe fetch wrapper that automatically handles 401/Unauthorized errors
 * Use this instead of native fetch for all API calls
 * 
 * @example
 * const response = await safeFetch('/api/notifications', { headers: {...} });
 * const data = await response.json();
 */
export async function safeFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init);
  
  // Check if response is not ok and might be an auth error
  if (!response.ok) {
    // Clone response to read body without consuming it
    const clonedResponse = response.clone();
    const data = await clonedResponse.json().catch(() => ({}));
    const errorMessage = data?.message || data?.error || 'Request failed';
    
    // Check if this is an authentication error
    if (isAuthError(response, errorMessage)) {
      console.log('[safeFetch] Auth error detected, logging out user');
      // Perform automatic logout
      performAutoLogout();
      // Return the response anyway so caller can handle it
      return response;
    }
  }
  
  return response;
}

/**
 * Helper function to handle fetch responses and check for auth errors
 * Use this when making direct fetch calls instead of apiClient
 * 
 * @example
 * const response = await fetch('/api/orders', {...});
 * const data = await handleFetchResponse(response);
 * if (data === null) return; // Auth error occurred, user was logged out
 */
export async function handleFetchResponse(response: Response): Promise<any | null> {
  const data = await response.json().catch(() => ({}));
  const errorMessage = data?.message || data?.error || 'Request failed';

  // Check if this is an authentication error
  if (isAuthError(response, errorMessage)) {
    // Perform automatic logout
    performAutoLogout();
    return null;
  }

  if (!response.ok) {
    throw new Error(errorMessage);
  }

  return data;
}

/**
 * Automatically logs out the user based on which token they have
 * Clears localStorage and redirects appropriately
 */
export function performAutoLogout(): void {
  if (typeof window === 'undefined') return;

  const adminToken = localStorage.getItem('adminToken');
  const customerToken = localStorage.getItem('customerToken');
  const userToken = localStorage.getItem('userToken');

  // Determine user type and logout accordingly
  if (adminToken) {
    // Check if user is a vendor or admin
    const adminUserStr = localStorage.getItem('adminUser');
    let isVendor = false;
    
    if (adminUserStr) {
      try {
        const adminUser = JSON.parse(adminUserStr);
        isVendor = adminUser?.role === 'vendor';
      } catch (e) {
        // If parsing fails, assume admin
      }
    }

    // Clear tokens
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    
    // Try to call logout API (don't wait for it)
    fetch('/api/auth/logout', {
      method: 'POST',
    }).catch(() => {
      // Ignore errors, we're logging out anyway
    });

    // Redirect to login page (same for both admin and vendor)
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
  } else if (customerToken) {
    // Customer logout
    localStorage.removeItem('customerToken');
    localStorage.removeItem('currentCustomer');
    
    // Try to call logout API (don't wait for it)
    fetch('/api/auth/customer/logout', {
      method: 'POST',
    }).catch(() => {
      // Ignore errors, we're logging out anyway
    });

    // Redirect to home page
    setTimeout(() => {
      window.location.href = '/';
    }, 100);
  } else if (userToken) {
    // User logout (for user-dashboard)
    localStorage.removeItem('userToken');
    localStorage.removeItem('currentUser');
    
    // Redirect to login page
    setTimeout(() => {
      window.location.href = '/user-login';
    }, 100);
  }
}

