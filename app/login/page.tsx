'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle } from 'lucide-react';
import { useSettings } from '@/components/settings/settings-provider';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { settings } = useSettings();
  const primaryColor = settings.primaryColor || '#22c55e';
  const siteName = settings.siteName || 'E-commerce';
  const tagline = settings.tagline;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('[v0] Sending login request');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log('[v0] Login response received:', data);

      if (!response.ok) {
        console.log('[v0] Login failed:', data.error);
        setError(data.error || 'Login failed');
        return;
      }

      if (data.token) {
        console.log('[v0] Token received, storing in localStorage');
        localStorage.setItem('adminToken', data.token);
        if (data.admin) {
          localStorage.setItem(
            'adminUser',
            JSON.stringify({
              name: data.admin.name,
              email: data.admin.email,
              role: data.admin.role,
            })
          );
          console.log('[v0] User data stored:', data.admin.name);
        }
        console.log('[v0] Redirecting to dashboard');
        setTimeout(() => {
          window.location.href = '/admin';
        }, 100);
      } else {
        console.log('[v0] No token in response');
        setError('No token received from server');
      }
    } catch (err) {
      console.error('[v0] Login error:', err);
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
            {tagline && <p className='text-slate-600 dark:text-slate-400 text-sm'>{tagline}</p>}
          </div>
        </div>

        <Card className='bg-white dark:bg-slate-800 border-0 shadow-xl rounded-2xl'>
          <div className='p-8'>
            <h2 className='text-2xl font-bold text-slate-900 dark:text-white mb-6'>Vendor Sign In</h2>

            {error && (
              <div className='mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex gap-3'>
                <AlertCircle className='w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5' />
                <p className='text-sm text-red-700 dark:text-red-400'>{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className='space-y-5'>
              <div>
                <label className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>Username</label>
                <Input
                  type='email'
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder='alice.admin@example.com'
                  className='w-full h-12 bg-blue-50 dark:bg-slate-700 border-blue-100 dark:border-slate-600 rounded-lg'
                  disabled={loading}
                />
              </div>

              <div>
                <label className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>Password</label>
                <Input
                  type='password'
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder='••••••••'
                  className='w-full h-12 bg-blue-50 dark:bg-slate-700 border-blue-100 dark:border-slate-600 rounded-lg'
                  disabled={loading}
                />
              </div>

              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Checkbox id='remember' checked={rememberMe} onCheckedChange={checked => setRememberMe(checked as boolean)} />
                  <label htmlFor='remember' className='text-sm text-slate-600 dark:text-slate-400 cursor-pointer'>
                    Remember me
                  </label>
                </div>
                <a href='/forgot-password' className='text-sm font-medium text-orange-500 hover:text-orange-600'>
                  Forgot Password?
                </a>
              </div>

              <Button
                type='submit'
                disabled={loading}
                className='w-full text-white h-12 text-base font-semibold rounded-lg transition-opacity cursor-pointer hover:opacity-90'
                style={{ backgroundColor: primaryColor }}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
