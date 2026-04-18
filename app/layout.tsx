import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import { SettingsProvider } from '@/components/settings/settings-provider';
import { ErrorHandler } from '@/components/error-handler';
import { FontLoader } from '@/components/font-loader';
import { FetchInterceptorWrapper } from '@/components/fetch-interceptor-wrapper';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3001';

export const metadata: Metadata = {
  title: 'Vendor Panel',
  description: 'Vendor dashboard',
  metadataBase: new URL(siteUrl),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en-IN' suppressHydrationWarning>
      <body className='font-sans antialiased'>
        <FontLoader />
        <ErrorHandler />
        <FetchInterceptorWrapper />
        <ThemeProvider attribute='class' defaultTheme='light' enableSystem>
          <SettingsProvider>{children}</SettingsProvider>
        </ThemeProvider>
        <Toaster position='top-right' />
      </body>
    </html>
  );
}
