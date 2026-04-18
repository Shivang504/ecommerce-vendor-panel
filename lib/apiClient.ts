import { isAuthError, performAutoLogout } from './auth-utils';

// const BASE_URL = 'https://e-commrce-xi.vercel.app';
export async function apiClient({
  url,
  method = 'GET',
  body,
  onSuccess,
  toast,
  setLoading,
  showSuccessToast = true,
}: {
  url: string;
  method?: string;
  body?: any;
  onSuccess?: (data: any) => void;
  toast?: any;
  setLoading?: (state: boolean) => void;
  showSuccessToast?: boolean;
}) {
  try {
    setLoading?.(true);
    // const fullUrl = BASE_URL + url;
    
    // Get token from localStorage if available (try adminToken first, then customerToken)
    const adminToken = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    const customerToken = typeof window !== 'undefined' ? localStorage.getItem('customerToken') : null;
    const token = adminToken || customerToken;
    
    // Build headers
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      method,
      headers,
      credentials: 'include', // Include cookies as fallback
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data?.message || data?.error || 'Request failed';
      
      // Check if this is an authentication error
      if (isAuthError(response, errorMessage)) {
        // Show error toast
        toast?.({
          title: 'Session Expired',
          description: 'Your session has expired. Please login again.',
          variant: 'destructive',
        });
        
        // Perform automatic logout
        performAutoLogout();
        
        throw new Error(errorMessage);
      }

      toast?.({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      throw new Error(errorMessage);
    }

    onSuccess?.(data);

    if (showSuccessToast) {
      toast?.({
        title: 'Success',
        description: data?.message || 'Success',
      });
    }

    return data;
  } catch (error: any) {
    console.error('API Error:', error);

    return null;
  } finally {
    setLoading?.(false);
  }
}
