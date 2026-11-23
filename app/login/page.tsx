'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  Megaphone,
  Rocket,
  ShieldCheck,
  Store,
  TrendingUp,
  UserPlus,
  X,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { VENDOR_PENDING_CODE } from '@/lib/vendor-approval';
import { useSettings } from '@/components/settings/settings-provider';

const PURPLE = '#5C2D91';
const GREEN = '#066A2B';

function getRegisterHref(): string {
  const raw = process.env.NEXT_PUBLIC_STOREFRONT_URL?.trim() || process.env.NEXT_PUBLIC_CUSTOMER_APP_URL?.trim();
  if (raw) return `${raw.replace(/\/$/, '')}/become-member`;
  return 'https://www.tryvvo.com/become-member';
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showFailModal, setShowFailModal] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { settings } = useSettings();
  const siteName = (settings.siteName || 'Tryvvo').replace(/\s+admin$/i, '');
  const tagline = settings.tagline || 'SHOP · SAVE · SMILE';
  const registerHref = getRegisterHref();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShowFailModal(false);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === VENDOR_PENDING_CODE) {
          setPendingMessage(data.error);
          return;
        }
        setError(data.error || 'Login failed');
        setShowFailModal(true);
        return;
      }

      if (data.token) {
        localStorage.setItem('adminToken', data.token);
        if (data.admin) {
          localStorage.setItem(
            'adminUser',
            JSON.stringify({
              id: data.admin.id,
              name: data.admin.name,
              email: data.admin.email,
              role: data.admin.role,
              storeName: data.admin.storeName,
            })
          );
        }
        setTimeout(() => {
          window.location.href = '/supplier';
        }, 100);
      } else {
        setError('No token received from server');
        setShowFailModal(true);
      }
    } catch (err) {
      console.error('[vendor-login]', err);
      setError('An error occurred. Please try again.');
      setShowFailModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='relative min-h-screen overflow-hidden bg-[#FAF8FD] font-[Poppins]'>
      <div className='pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full opacity-25 blur-3xl' style={{ backgroundColor: PURPLE }} />
      <div className='pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full opacity-20 blur-3xl' style={{ backgroundColor: GREEN }} />

      <AlertDialog open={!!pendingMessage} onOpenChange={open => !open && setPendingMessage(null)}>
        <AlertDialogContent className='max-w-[calc(100vw-32px)] sm:max-w-[440px]' data-testid='vendor-pending-dialog'>
          <AlertDialogHeader>
            <div className='mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600'>
              <Clock className='h-6 w-6' />
            </div>
            <AlertDialogTitle className='text-center'>Account pending approval</AlertDialogTitle>
            <AlertDialogDescription className='text-center'>{pendingMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='sm:justify-center'>
            <AlertDialogAction onClick={() => setPendingMessage(null)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showFailModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' role='dialog' aria-modal='true' data-testid='vendor-login-failed'>
          <div className='relative w-full max-w-[420px] rounded-[24px] bg-white p-7 text-center shadow-2xl'>
            <button
              type='button'
              aria-label='Close'
              onClick={() => setShowFailModal(false)}
              className='absolute right-4 top-4 rounded-full p-1 text-[#6B6480] hover:bg-[#F3F0F8]'>
              <X className='h-5 w-5' />
            </button>
            <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500'>
              <AlertTriangle className='h-8 w-8' />
            </div>
            <h2 className='mt-4 text-[22px] font-bold' style={{ color: PURPLE }}>
              Login Failed
            </h2>
            <p className='mt-2 text-[14px] leading-relaxed text-[#5A5270]'>
              {error || 'The email or password you entered is incorrect. Please try again.'}
            </p>
            <button
              type='button'
              onClick={() => setShowFailModal(false)}
              className='mt-6 w-full rounded-full px-6 py-3 font-semibold text-white transition hover:opacity-95'
              style={{ backgroundColor: PURPLE }}>
              Try Again
            </button>
          </div>
        </div>
      )}

      <div className='relative mx-auto grid min-h-screen max-w-[1200px] lg:grid-cols-2'>
        {/* Left marketing */}
        <section className='relative hidden flex-col justify-center px-10 py-12 lg:flex xl:px-14'>
          <div
            className='mb-6 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold text-white'
            style={{ backgroundColor: PURPLE }}>
            <Store className='h-3.5 w-3.5' />
            Sell on {siteName.toUpperCase()}
          </div>
          <h1 className='text-[40px] font-bold leading-[1.15] text-[#1F1535] xl:text-[46px]'>
            Grow Your Business{' '}
            <span className='relative inline-block' style={{ color: GREEN }}>
              Online
              <span className='absolute -bottom-1 left-0 h-2 w-full rounded-full opacity-30' style={{ backgroundColor: GREEN }} />
            </span>
          </h1>
          <p className='mt-4 max-w-md text-[15px] leading-relaxed text-[#5A5270]'>
            Join {siteName}&apos;s multi-vendor marketplace and reach customers across Fashion, Beauty, Wellness, Kids & more.
          </p>
          <ul className='mt-8 space-y-3'>
            {[
              { icon: Rocket, label: 'Zero Hassle Onboarding' },
              { icon: TrendingUp, label: 'Reach a Larger Audience' },
              { icon: Megaphone, label: 'Run Promotions & Ads' },
              { icon: ShieldCheck, label: 'Secure & Timely Payments' },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className='flex items-center gap-3 text-[14px] font-semibold text-[#2C2540]'>
                <span className='flex h-9 w-9 items-center justify-center rounded-full bg-[#EAF3EA]' style={{ color: GREEN }}>
                  <Icon className='h-4 w-4' />
                </span>
                {label}
              </li>
            ))}
          </ul>
          <div className='mt-10 grid max-w-md grid-cols-2 gap-3'>
            <div className='rounded-2xl bg-white p-4 shadow-sm'>
              <Store className='mb-2 h-7 w-7' style={{ color: PURPLE }} />
              <p className='text-sm font-semibold'>Vendor dashboard</p>
              <p className='text-xs text-[#6B6480]'>Orders, products, payouts</p>
            </div>
            <div className='rounded-2xl bg-white p-4 shadow-sm'>
              <TrendingUp className='mb-2 h-7 w-7' style={{ color: GREEN }} />
              <p className='text-sm font-semibold'>Grow faster</p>
              <p className='text-xs text-[#6B6480]'>Campaigns & visibility</p>
            </div>
          </div>
        </section>

        {/* Right form */}
        <section className='flex flex-col justify-center px-4 py-10 sm:px-8 lg:px-10'>
          <div className='mb-6 flex items-center justify-center gap-2 lg:justify-end'>
            {settings.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logo} alt={siteName} className='h-12 w-auto max-w-[180px] object-contain' />
            ) : (
              <>
                <span
                  className='flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold text-white'
                  style={{ background: `linear-gradient(135deg, ${PURPLE}, ${GREEN})` }}>
                  {siteName[0]?.toUpperCase() || 'T'}
                </span>
                <div>
                  <p className='text-[22px] font-bold leading-none' style={{ color: PURPLE }}>
                    {siteName.toUpperCase()}
                  </p>
                  <p className='mt-1 text-[10px] font-semibold tracking-[0.12em] text-[#3A3350]'>{tagline}</p>
                </div>
              </>
            )}
          </div>

          <div className='mx-auto w-full max-w-[440px] rounded-[24px] border border-[#EDE7F6] bg-white p-6 shadow-xl sm:p-8'>
            <div className='mb-6 flex items-start gap-3'>
              <span className='flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F6F1FC]' style={{ color: PURPLE }}>
                <Store className='h-5 w-5' />
              </span>
              <div>
                <h2 className='text-[22px] font-bold' style={{ color: PURPLE }}>
                  Vendor Sign In
                </h2>
                <p className='mt-1 text-[12.5px] leading-relaxed text-[#6B6480]'>
                  Access your vendor dashboard, manage orders, products, payments and growth.
                </p>
              </div>
            </div>

            <form onSubmit={handleLogin} className='space-y-5' autoComplete='on'>
              <div>
                <label className='mb-2 block text-sm font-semibold text-[#2C2540]'>Username / Email</label>
                <div className='relative'>
                  <Mail className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B849C]' />
                  <Input
                    type='email'
                    name='email'
                    autoComplete='username'
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder='Enter your registered email'
                    className='h-12 rounded-xl border-[#E4DFF0] bg-[#F8F6FC] pl-10'
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div>
                <label className='mb-2 block text-sm font-semibold text-[#2C2540]'>Password</label>
                <div className='relative'>
                  <Lock className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B849C]' />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    name='password'
                    autoComplete='current-password'
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder='Enter your password'
                    className='h-12 rounded-xl border-[#E4DFF0] bg-[#F8F6FC] pl-10 pr-11'
                    disabled={loading}
                    required
                  />
                  <button
                    type='button'
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6480] hover:text-[#2C2540]'
                    onClick={() => setShowPassword(prev => !prev)}
                    disabled={loading}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff className='h-5 w-5' /> : <Eye className='h-5 w-5' />}
                  </button>
                </div>
              </div>

              <div className='flex items-center justify-between gap-3'>
                <div className='flex items-center gap-2'>
                  <Checkbox id='remember' checked={rememberMe} onCheckedChange={checked => setRememberMe(checked as boolean)} />
                  <label htmlFor='remember' className='cursor-pointer text-sm text-[#5A5270]'>
                    Remember me
                  </label>
                </div>
                <Link href='/forgot-password' className='text-sm font-semibold hover:underline' style={{ color: PURPLE }}>
                  Forgot Password?
                </Link>
              </div>

              <Button
                type='submit'
                disabled={loading}
                className='h-12 w-full rounded-full text-base font-semibold text-white hover:opacity-95'
                style={{ backgroundColor: GREEN }}>
                <LogIn className='mr-2 h-4 w-4' />
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <div className='my-6 flex items-center gap-3'>
              <div className='h-px flex-1 bg-[#EDE7F6]' />
              <span className='text-[12px] font-medium text-[#8B849C]'>New on {siteName}?</span>
              <div className='h-px flex-1 bg-[#EDE7F6]' />
            </div>

            <a
              href={registerHref}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border-2 text-[14px] font-semibold transition hover:bg-[#F6F1FC]'
              style={{ borderColor: PURPLE, color: PURPLE }}>
              <UserPlus className='h-4 w-4' />
              Register as a Vendor
              <ArrowRight className='h-4 w-4' />
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
