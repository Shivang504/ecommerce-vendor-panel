'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useSettings } from '@/components/settings/settings-provider';

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { settings } = useSettings();
  const primaryColor = settings.primaryColor || '#22c55e';
  const siteName = settings.siteName || 'E-commerce';

  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const helperText = useMemo(() => {
    const v = identifier.trim();
    if (!v) return 'Enter your registered email address or mobile number.';
    return isEmail(v) ? 'We’ll send a reset link to your email.' : 'We’ll send a reset link to the email on your vendor account.';
  }, [identifier]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const value = identifier.trim();
    if (!value) {
      setError('Email or mobile number is required');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: value }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || 'Failed to send password reset link');
        return;
      }

      setSuccess('If your account exists, a password reset link has been sent.');
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4'>
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
          <div>
            <h1 className='text-3xl font-bold text-slate-900 dark:text-white mb-1'>{siteName}</h1>
            <p className='text-slate-600 dark:text-slate-400 text-sm'>Reset your password</p>
          </div>
        </div>

        <Card className='bg-white dark:bg-slate-800 border-0 shadow-xl rounded-2xl'>
          <div className='p-8'>
            <button
              type='button'
              onClick={() => router.push('/login')}
              className='inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6'>
              <ArrowLeft className='w-4 h-4' />
              Back to login
            </button>

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

            <form onSubmit={submit} className='space-y-4'>
              <div>
                <label className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>Email or Mobile</label>
                <Input
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder='you@example.com or 9876543210'
                  className='w-full h-12 bg-blue-50 dark:bg-slate-700 border-blue-100 dark:border-slate-600 rounded-lg'
                  disabled={loading}
                />
                <p className='mt-2 text-xs text-slate-500 dark:text-slate-400'>{helperText}</p>
              </div>

              <Button
                type='submit'
                disabled={loading}
                className='w-full text-white h-12 text-base font-semibold rounded-lg transition-opacity cursor-pointer hover:opacity-90'
                style={{ backgroundColor: primaryColor }}>
                {loading ? 'Sending...' : 'Send reset link'}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}

