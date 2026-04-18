'use client';

import { usePathname } from 'next/navigation';
import { WebsiteLayout } from './website-layout';

// Routes that should NOT have the website layout (admin, vendor, login pages)
const EXCLUDED_ROUTES = [
  '/admin',
  '/vendors',
  '/login',
  '/user-login',
  '/user-dashboard',
  '/become-member',
];

export function WebsiteLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Check if current route should have website layout
  const shouldUseWebsiteLayout = !EXCLUDED_ROUTES.some(route => pathname?.startsWith(route));
  
  if (shouldUseWebsiteLayout) {
    return <WebsiteLayout>{children}</WebsiteLayout>;
  }
  
  return <>{children}</>;
}

