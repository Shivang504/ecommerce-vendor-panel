'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useSettings } from '@/components/settings/settings-provider';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const { settings } = useSettings();
  const primaryColor = settings.primaryColor || '#22c55e';
  const siteName = settings.siteName || 'E-commerce';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(true);
  const [linkValid, setLinkValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Reset link is missing or invalid. Request a new one.');
      setChecking(false);
      return;
    }
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then(async res => {
        const data = await res.json().catch(() => ({}));
        if (res.ok) setLinkValid(true);
        else setError(data?.error || 'Invalid reset link. Request a new one.');
      })
      .catch(() => setError('Could not check the reset link. Please try again.'))
      .finally(() => setChecking(false));
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

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
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Could not reset password');
        if (data?.expired) setLinkValid(false);
        return;
      }
      setLinkValid(false);
      setSuccess('Password updated. Redirecting to login.');
      setTimeout(() => router.push('/login'), 1500);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full h-12 bg-blue-50 dark:bg-slate-700 border-blue-100 dark:border-slate-600 rounded-lg';

  return (
    <div className='w-full max-w-md'>
      <div className='text-center mb-8 space-y-2'>
        {settings.logo ? (
          <div className='w-20 h-20 mx-auto rounded-2xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden'>
            <img src={settings.logo} alt={siteName} className='w-full h-full object-contain' />
          </div>
        ) : (
          <div
            className='inline-flex items-center justify-center w-20 h-20 rounded-2xl text-white text-4xl font-bold'
            style={{ backgroundColor: primaryColor }}>
            {siteName[0]}
          </div>
        )}
        <h1 className='text-3xl font-bold text-slate-900 dark:text-white'>{siteName}</h1>
        <p className='text-slate-600 dark:text-slate-400 text-sm'>Choose a new vendor password</p>
      </div>

      <Card className='bg-white dark:bg-slate-800 border-0 shadow-xl rounded-2xl'>
        <div className='p-8'>
          <h2 className='text-2xl font-bold text-slate-900 dark:text-white mb-6'>Reset Password</h2>

          {error && (
            <div className='mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex gap-3'>
              <AlertCircle className='w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5' />
              <p className='text-sm text-red-700 dark:text-red-400'>{error}</p>
            </div>
          )}
          {success && (
            <div className='mb-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex gap-3'>
              <CheckCircle2 className='w-5 h-5 text-green-700 dark:text-green-400 shrink-0 mt-0.5' />
              <p className='text-sm text-green-800 dark:text-green-300'>{success}</p>
            </div>
          )}

          {checking ? (
            <p className='text-sm text-slate-500'>Checking your reset link...</p>
          ) : linkValid ? (
            <form onSubmit={submit} className='space-y-5'>
              <div>
                <label className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>New password</label>
                <div className='relative'>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder='At least 8 characters'
                    autoComplete='new-password'
                    className={`${inputClass} pr-10`}
                    disabled={loading}
                  />
                  <button
                    type='button'
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-500'
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                  </button>
                </div>
              </div>
              <div>
                <label className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>Confirm password</label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  autoComplete='new-password'
                  className={inputClass}
                  disabled={loading}
                />
              </div>
              <Button
                type='submit'
                disabled={loading}
                className='w-full text-white h-12 text-base font-semibold rounded-lg transition-opacity cursor-pointer hover:opacity-90'
                style={{ backgroundColor: primaryColor }}>
                {loading ? 'Saving...' : 'Reset Password'}
              </Button>
            </form>
          ) : null}

          <div className='mt-5 flex items-center justify-between text-sm'>
            <Link href='/login' className='text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'>
              Back to login
            </Link>
            {!success && (
              <Link href='/forgot-password' className='font-medium text-orange-500 hover:text-orange-600'>
                Request new link
              </Link>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4'>
      <Suspense fallback={<div className='h-40' />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
