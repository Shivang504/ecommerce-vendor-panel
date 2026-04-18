'use client';

import HomeHeader from '@/components/home/header';
import { HomeFooter } from '@/components/home/footer';

export function WebsiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HomeHeader />
      <main className='flex-1'>{children}</main>
      <HomeFooter />
    </>
  );
}

