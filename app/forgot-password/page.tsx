'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useSettings } from '@/components/settings/settings-provider';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { settings } = useSettings();
  const primaryColor = settings.primaryColor || '#22c55e';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Request failed');
        return;
      }

      setSent(true);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4'>
      <div className='w-full max-w-md'>
        <Card className='bg-white dark:bg-slate-800 border-0 shadow-xl rounded-2xl'>
          <div className='p-8'>
            <h1 className='text-2xl font-bold text-slate-900 dark:text-white mb-2'>Forgot password</h1>
            <p className='text-sm text-slate-600 dark:text-slate-400 mb-6'>
              Enter the email you use for your vendor account. We will send you a reset link if it exists.
            </p>

            {sent ? (
              <div className='space-y-4'>
                <div className='p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200'>
                  If an account exists for this email, check your inbox for a link to reset your password. The link
                  expires in one hour.
                </div>
                <Link
                  href='/login'
                  className='inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'>
                  <ArrowLeft className='w-4 h-4' />
                  Back to sign in
                </Link>
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
                  <label className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>Email</label>
                  <Input
                    type='email'
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder='you@example.com'
                    required
                    className='w-full h-12 bg-blue-50 dark:bg-slate-700 border-blue-100 dark:border-slate-600 rounded-lg'
                    disabled={loading}
                  />
                </div>

                <Button
                  type='submit'
                  disabled={loading}
                  className='w-full text-white h-12 text-base font-semibold rounded-lg transition-opacity cursor-pointer hover:opacity-90'
                  style={{ backgroundColor: primaryColor }}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </Button>

                <Link
                  href='/login'
                  className='inline-flex items-center gap-2 text-sm font-medium text-orange-500 hover:text-orange-600'>
                  <ArrowLeft className='w-4 h-4' />
                  Back to sign in
                </Link>
              </form>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
