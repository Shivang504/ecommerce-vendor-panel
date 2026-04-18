'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

import {
  DropdownMenu as SettingsDropdown,
  DropdownMenuContent as SettingsContent,
  DropdownMenuTrigger as SettingsTrigger,
} from '@/components/ui/dropdown-menu';

import Link from 'next/link';
import { Search, HelpCircle, FileText, Bell, Settings } from 'lucide-react';
import { useSettings } from '@/components/settings/settings-provider';
import { NotificationBell } from '@/components/admin/notification-bell';

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { settings } = useSettings();

  const [userData, setUserData] = useState<{ name: string; email: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  const primaryColor = settings.primaryColor || '#16a34a';
  const accentColor = settings.accentColor || '#0f172a';
  const tagline = settings.tagline;
  const siteName = settings.siteName;

  const searchInputStyle = useMemo(() => ({ '--tw-ring-color': primaryColor } as CSSProperties & Record<string, string>), [primaryColor]);

  useEffect(() => {
    setMounted(true);

    const storedUser = localStorage.getItem('adminUser');
    if (storedUser) {
      try {
        setUserData(JSON.parse(storedUser));
      } catch (err) {
        console.error('Error parsing user:', err);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminToken');
    router.push('/login');
  };

  const handleProfile = () => router.push('/admin/profile');
  const handleSettings = () => router.push('/admin/settings');

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  if (!mounted) return null;

  return (
    <header className='bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-40'>
      <div className='flex items-center justify-between'>
        {/* LEFT SIDE SEARCH */}
        <div className='flex flex-col w-full max-w-2xl'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' size={20} />

            <input
              type='text'
              placeholder='Search...'
              className='w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-2'
              style={searchInputStyle}
            />

            <div className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm'>⌘</div>
          </div>
        </div>

        {/* RIGHT SIDE ICONS */}
        <div className='flex items-center space-x-4 ml-6'>
          {/* Help */}
          <button className='p-2 hover:bg-gray-100 rounded-lg cursor-pointer' title='Help'>
            <HelpCircle size={20} className='text-gray-600' />
          </button>

          {/* Docs */}
          <button className='p-2 hover:bg-gray-100 rounded-lg cursor-pointer' title='Documentation'>
            <FileText size={20} className='text-gray-600' />
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* SETTINGS DROPDOWN PREVIEW */}
          <SettingsDropdown>
            <SettingsTrigger asChild>
              <button className='p-2 hover:bg-gray-100 rounded-lg cursor-pointer'>
                <Settings size={20} className='text-gray-600' />
              </button>
            </SettingsTrigger>

            <SettingsContent align='end' className='w-80 p-0 rounded-xl shadow-xl border border-gray-200 overflow-hidden'>
              {/* HEADER */}
              <div className='px-4 py-3 border-b bg-gray-50'>
                <p className='text-sm font-semibold text-gray-800 flex items-center gap-2'>
                  <Settings size={16} className='text-gray-500' /> Site Settings
                </p>
              </div>

              <div className='p-4 space-y-4'>
                {/* BASIC INFO */}
                <div className='space-y-2'>
                  <Detail label='Website Name' value={siteName} />
                  <Detail label='Browser Title' value={settings.browserTitle} />
                  <Detail label='Tagline' value={tagline} />
                </div>

                {/* COLORS */}
                <div className='grid grid-cols-2 gap-3'>
                  <ColorPreview label='Primary Color' value={primaryColor} />
                  <ColorPreview label='Accent Color' value={accentColor} />
                </div>

                {/* LOGO & FAVICON */}
                <div className='grid grid-cols-2 gap-4'>
                  <ImagePreview label='Logo' src={settings.logo} />
                  <ImagePreview label='Favicon' src={settings.favicon} />
                </div>

                {/* FULL SETTINGS BUTTON */}
                <button
                  onClick={handleSettings}
                  className='w-full py-2 mt-1 text-xs font-medium border rounded-lg hover:bg-gray-100 transition'>
                  Go to Settings
                </button>
              </div>
            </SettingsContent>
          </SettingsDropdown>

          {/* USER DROPDOWN */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className='flex items-center gap-3 pl-4 border-l border-none cursor-pointer'>
                <div
                  className='w-10 h-10 rounded-full font-semibold flex items-center justify-center text-white text-sm'
                  style={{ background: `${primaryColor}` }}>
                  {userData ? getInitials(userData.name) : 'A'}
                </div>

                <div className='hidden lg:block text-left'>
                  <p className='text-sm font-medium text-gray-900'>{userData?.name || 'Admin'}</p>
                  <p className='text-xs text-gray-500'>{userData?.email || 'admin@email.com'}</p>
                </div>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align='end' className='w-48'>
              <DropdownMenuItem disabled className='flex flex-col py-2 hover:bg-transparent cursor-default'>
                <span className='text-sm font-medium'>{userData?.name || 'Admin'}</span>
                <span className='text-xs'>{userData?.email || 'admin@email.com'}</span>
              </DropdownMenuItem>

              <DropdownMenuItem className='cursor-pointer hover:bg-transparent' onClick={handleProfile}>
                Profile
              </DropdownMenuItem>

              <DropdownMenuItem className='cursor-pointer hover:bg-transparent' onClick={handleSettings}>
                Settings
              </DropdownMenuItem>

              <DropdownMenuItem className='text-red-600 cursor-pointer hover:bg-transparent' onClick={handleLogout}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div className='flex justify-between text-xs'>
      <span className='text-gray-500'>{label}:</span>
      <span className='font-medium text-gray-800'>{value || '-'}</span>
    </div>
  );
}

function ColorPreview({ label, value }: { label: string; value: string }) {
  return (
    <div className='border rounded-lg px-3 py-2 flex flex-col bg-gray-50'>
      <span className='text-[11px] text-gray-500'>{label}</span>
      <div className='mt-1 flex items-center gap-2'>
        <span className='w-4 h-4 rounded border' style={{ backgroundColor: value }} />
        <span className='text-xs font-medium'>{value}</span>
      </div>
    </div>
  );
}

function ImagePreview({ label, src }: { label: string; src?: string }) {
  return (
    <div className='flex flex-col text-xs'>
      <p className='font-semibold text-gray-700 mb-1'>{label}</p>

      {src ? (
        <img src={src} className='w-full h-14 rounded-lg border object-contain bg-white' />
      ) : (
        <div className='w-full h-14 rounded-lg border flex items-center justify-center text-gray-400 bg-gray-50'>No {label}</div>
      )}
    </div>
  );
}
