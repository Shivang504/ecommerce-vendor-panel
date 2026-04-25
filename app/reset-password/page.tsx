'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useSettings } from '@/components/settings/settings-provider';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token')?.trim() || '';
  const router = useRouter();
  const { settings } = useSettings();
  const primaryColor = settings.primaryColor || '#22c55e';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Reset failed');
        return;
      }

      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Card className='bg-white dark:bg-slate-800 border-0 shadow-xl rounded-2xl'>
        <div className='p-8 space-y-4'>
          <p className='text-slate-700 dark:text-slate-300'>This page needs a valid reset link from your email.</p>
          <Link href='/forgot-password' className='text-sm font-medium text-orange-500 hover:text-orange-600'>
            Request a new link
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className='bg-white dark:bg-slate-800 border-0 shadow-xl rounded-2xl'>
      <div className='p-8'>
        <h1 className='text-2xl font-bold text-slate-900 dark:text-white mb-2'>Set new password</h1>
        <p className='text-sm text-slate-600 dark:text-slate-400 mb-6'>Choose a strong password for your vendor account.</p>

        {done ? (
          <div className='p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200'>
            Password updated. Redirecting to sign in…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className='space-y-5'>
            {error && (
              <div className='p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex gap-3'>
                <AlertCircle className='w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5' />
                <p className='text-sm text-red-700 dark:text-red-400'>{error}</p>
              </div>
            )}

            <div>
              <label className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>New password</label>
              <div className='relative'>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder='At least 8 characters'
                  required
                  minLength={8}
                  autoComplete='new-password'
                  className='w-full h-12 pr-11 bg-blue-50 dark:bg-slate-700 border-blue-100 dark:border-slate-600 rounded-lg'
                  disabled={loading}
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(v => !v)}
                  className='absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-slate-400'
                  aria-label={showPassword ? 'Hide new password' : 'Show new password'}>
                  {showPassword ? <EyeOff className='h-5 w-5' aria-hidden /> : <Eye className='h-5 w-5' aria-hidden />}
                </button>
              </div>
            </div>

            <div>
              <label className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>
                Confirm password
              </label>
              <div className='relative'>
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder='Repeat password'
                  required
                  minLength={8}
                  autoComplete='new-password'
                  className='w-full h-12 pr-11 bg-blue-50 dark:bg-slate-700 border-blue-100 dark:border-slate-600 rounded-lg'
                  disabled={loading}
                />
                <button
                  type='button'
                  onClick={() => setShowConfirm(v => !v)}
                  className='absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-slate-400'
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}>
                  {showConfirm ? <EyeOff className='h-5 w-5' aria-hidden /> : <Eye className='h-5 w-5' aria-hidden />}
                </button>
              </div>
            </div>

            <Button
              type='submit'
              disabled={loading}
              className='w-full text-white h-12 text-base font-semibold rounded-lg transition-opacity cursor-pointer hover:opacity-90'
              style={{ backgroundColor: primaryColor }}>
              {loading ? 'Saving…' : 'Update password'}
            </Button>

            <Link
              href='/login'
              className='inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'>
              <ArrowLeft className='w-4 h-4' />
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4'>
      <div className='w-full max-w-md'>
        <Suspense
          fallback={
            <Card className='bg-white dark:bg-slate-800 border-0 shadow-xl rounded-2xl p-8 text-center text-slate-600 dark:text-slate-400'>
              Loading…
            </Card>
          }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
