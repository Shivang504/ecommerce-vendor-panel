'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, HelpCircle, FileText } from 'lucide-react';
import { useSettings } from '@/components/settings/settings-provider';
import { NotificationBell } from '@/components/admin/notification-bell';
import { VENDOR_PURPLE } from '@/lib/vendor-ui-theme';

export function TopBar() {
  const router = useRouter();
  const { settings } = useSettings();

  const [userData, setUserData] = useState<{ name: string; email: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  const primaryColor = settings.primaryColor || VENDOR_PURPLE;
  const searchInputStyle = useMemo(
    () => ({ '--tw-ring-color': primaryColor } as CSSProperties & Record<string, string>),
    [primaryColor]
  );

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

  const handleProfile = () => router.push('/supplier/profile');
  const handleSettings = () => router.push('/supplier/profile');

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  if (!mounted) return null;

  return (
    <header className='sticky top-0 z-40 border-b border-[#EDE7F6] bg-white/95 px-4 py-3 backdrop-blur sm:px-6'>
      <div className='flex items-center justify-between gap-4'>
        <div className='w-full max-w-2xl'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-[#8B849C]' size={18} />
            <input
              type='text'
              placeholder='Search for products, orders, reports...'
              className='w-full rounded-full border border-[#E4DFF0] bg-[#F8F6FC] py-2.5 pl-10 pr-4 text-sm text-[#1F1535] placeholder:text-[#8B849C] focus:outline-none focus:ring-2'
              style={searchInputStyle}
            />
          </div>
        </div>

        <div className='flex shrink-0 items-center gap-2 sm:gap-3'>
          <button type='button' className='rounded-full p-2 text-[#5A5270] hover:bg-[#F6F1FC]' title='Help'>
            <HelpCircle size={20} />
          </button>
          <button type='button' className='rounded-full p-2 text-[#5A5270] hover:bg-[#F6F1FC]' title='Documentation'>
            <FileText size={20} />
          </button>
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type='button'
                className='ml-1 flex items-center gap-2 rounded-full border border-[#EDE7F6] bg-white py-1.5 pl-1.5 pr-3 shadow-sm transition hover:bg-[#F6F1FC]'>
                <div
                  className='flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white'
                  style={{ background: primaryColor }}>
                  {userData ? getInitials(userData.name) : 'A'}
                </div>
                <div className='hidden text-left lg:block'>
                  <p className='max-w-[160px] truncate text-sm font-semibold text-[#1F1535]'>{userData?.name || 'Admin'}</p>
                  <p className='max-w-[160px] truncate text-[11px] text-[#6B6480]'>{userData?.email || 'admin@email.com'}</p>
                </div>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align='end' className='w-52'>
              <DropdownMenuItem disabled className='cursor-default flex-col items-start py-2 hover:bg-transparent'>
                <span className='text-sm font-medium'>{userData?.name || 'Admin'}</span>
                <span className='text-xs text-[#6B6480]'>{userData?.email || 'admin@email.com'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem className='cursor-pointer' onClick={handleProfile}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className='cursor-pointer' onClick={handleSettings}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem className='cursor-pointer text-red-600' onClick={handleLogout}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
