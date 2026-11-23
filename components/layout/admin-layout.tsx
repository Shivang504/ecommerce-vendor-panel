'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';
import { ThemeProvider } from '@/components/theme-provider';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-[#401d5d] animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div className="flex h-screen bg-[#FAF8FD]">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="relative flex-1 overflow-auto bg-gradient-to-br from-[#F6F1FC] via-white to-[#EAF3EA] p-4 sm:p-6">
            <div
              className="pointer-events-none absolute -right-20 -top-16 h-56 w-56 rounded-full opacity-30 blur-3xl"
              style={{ backgroundColor: '#5C2D91' }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full opacity-25 blur-3xl"
              style={{ backgroundColor: '#066A2B' }}
              aria-hidden
            />
            <div className="relative z-[1]">{children}</div>
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
