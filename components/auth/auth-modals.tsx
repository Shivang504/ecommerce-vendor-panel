'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { OTPInput } from '@/components/ui/otp-input';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { validatePassword } from '@/lib/utils';
import Link from 'next/link';

interface AuthModalsProps {
  openLogin: boolean;
  openRegister: boolean;
  onCloseLogin: () => void;
  onCloseRegister: () => void;
  onSwitchToRegister: () => void;
  onSwitchToLogin: () => void;
}

export function AuthModals({
  openLogin,
  openRegister,
  onCloseLogin,
  onCloseRegister,
  onSwitchToRegister,
  onSwitchToLogin,
}: AuthModalsProps) {
  const router = useRouter();
  const [loginData, setLoginData] = useState({ emailOrPhone: '' });
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [isFacebookAvailable, setIsFacebookAvailable] = useState(false);

  // OTP Login States
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isExistingUser, setIsExistingUser] = useState(false);
  
  // Profile collection for new users
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '+91',
    consent: false,
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [loginIdentifierType, setLoginIdentifierType] = useState<'email' | 'phone' | null>(null); // Track what was used for login

  // Load Facebook SDK - Only on HTTPS or localhost
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isSecureContext = window.location.protocol === 'https:' || isLocalhost;

    // Only load Facebook SDK if on HTTPS or localhost
    if (!isSecureContext) {
      setIsFacebookAvailable(false);
      return;
    }

    if (!window.FB) {
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        if (window.FB) {
          try {
            window.FB.init({
              appId: '1561909058145232',
              cookie: true,
              xfbml: true,
              version: 'v18.0',
            });
            setIsFacebookAvailable(true);
          } catch (error) {
            console.error('Facebook SDK initialization error:', error);
            setIsFacebookAvailable(false);
          }
        }
      };
      script.onerror = () => {
        console.error('Failed to load Facebook SDK');
        setIsFacebookAvailable(false);
      };
      document.body.appendChild(script);

      return () => {
        const existingScript = document.querySelector('script[src*="facebook.net"]');
        if (existingScript && existingScript.parentNode) {
          existingScript.parentNode.removeChild(existingScript);
        }
      };
    } else {
      setIsFacebookAvailable(true);
    }
  }, []);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setSocialLoading(true);
    try {
      const response = await fetch('/api/auth/customer/social/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: credentialResponse.credential,
          accessToken: credentialResponse.access_token || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: 'Login Failed',
          description: data.error || 'Failed to login with Google',
          variant: 'destructive',
        });
        return;
      }

      if (data.token && data.customer) {
        localStorage.setItem('customerToken', data.token);
        localStorage.setItem('currentCustomer', JSON.stringify(data.customer));

        window.dispatchEvent(new Event('customerLogin'));

        toast({
          title: 'Success',
          description: 'Logged in successfully with Google!',
          variant: 'success',
        });

        onCloseLogin();
        // window.location.reload();
      }
    } catch (error) {
      console.error('Google login error:', error);
      toast({
        title: 'Error',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSocialLoading(false);
    }
  };

  const handleGoogleError = (error?: any) => {
    console.error('Google login error:', error);
    toast({
      title: 'Google Login Error',
      description:
        'Google login is not available. Please use email/password to login. Note: Make sure your domain is authorized in Google Console.',
      variant: 'destructive',
    });
  };

  const handleFacebookLoginResponse = async (accessToken: string, userID: string) => {
    try {
      const apiResponse = await fetch('/api/auth/customer/social/facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken,
          userID,
        }),
      });

      const data = await apiResponse.json();

      if (!apiResponse.ok) {
        toast({
          title: 'Login Failed',
          description: data.error || 'Failed to login with Facebook',
          variant: 'destructive',
        });
        setSocialLoading(false);
        return;
      }

      if (data.token && data.customer) {
        localStorage.setItem('customerToken', data.token);
        localStorage.setItem('currentCustomer', JSON.stringify(data.customer));

        window.dispatchEvent(new Event('customerLogin'));

        toast({
          title: 'Success',
          description: 'Logged in successfully with Facebook!',
          variant: 'success',
        });

        onCloseLogin();
        // window.location.reload();
      }
    } catch (error) {
      console.error('Facebook login error:', error);
      toast({
        title: 'Error',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      });
      setSocialLoading(false);
    }
  };

  const handleFacebookLogin = () => {
    // Check if running on HTTPS or localhost (required for Facebook login)
    const isLocalhost =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '';
    const isSecureContext = window.location.protocol === 'https:' || isLocalhost;

    if (!isSecureContext) {
      toast({
        title: 'HTTPS Required',
        description: 'Facebook login requires HTTPS. Please use a secure connection or localhost.',
        variant: 'destructive',
      });
      return;
    }

    if (!window.FB) {
      toast({
        title: 'Error',
        description: 'Facebook SDK not loaded. Please refresh the page.',
        variant: 'destructive',
      });
      return;
    }

    setSocialLoading(true);

    // Facebook SDK doesn't accept async callbacks, so we use a regular function
    window.FB.login(
      (response: any) => {
        if (response.authResponse) {
          // Call async function from regular callback
          handleFacebookLoginResponse(response.authResponse.accessToken, response.authResponse.userID);
        } else {
          setSocialLoading(false);
        }
      },
      { scope: 'email,public_profile' }
    );
  };

  // Helper function to check cart and redirect
  const redirectAfterLogin = async () => {
    try {
      // Check if cart exists
      const customerToken = localStorage.getItem('customerToken');
      if (customerToken) {
        const cartResponse = await fetch('/api/cart', {
          headers: {
            'Authorization': `Bearer ${customerToken}`,
          },
        });

        if (cartResponse.ok) {
          const cartData = await cartResponse.json();
          const hasCartItems = cartData.cartItems && cartData.cartItems.length > 0;

          // Redirect to checkout if cart exists, otherwise to home
          const redirectUrl = hasCartItems ? '/checkout' : '/';
          const storedRedirect = sessionStorage.getItem('redirectAfterLogin');
          
          // Use stored redirect if it exists and is not checkout/login pages
          const finalRedirect = storedRedirect && 
            !storedRedirect.includes('/checkout') && 
            !storedRedirect.includes('/login') && 
            !storedRedirect.includes('/register')
            ? storedRedirect 
            : redirectUrl;

          sessionStorage.removeItem('redirectAfterLogin');
          
          setTimeout(() => {
            window.location.href = finalRedirect;
          }, 100);
        } else {
          // If cart check fails, redirect to home
          const storedRedirect = sessionStorage.getItem('redirectAfterLogin') || '/';
          sessionStorage.removeItem('redirectAfterLogin');
          setTimeout(() => {
            window.location.href = storedRedirect;
          }, 100);
        }
      } else {
        // No token, redirect to home
        const storedRedirect = sessionStorage.getItem('redirectAfterLogin') || '/';
        sessionStorage.removeItem('redirectAfterLogin');
        setTimeout(() => {
          window.location.href = storedRedirect;
        }, 100);
      }
    } catch (error) {
      console.error('Error checking cart:', error);
      // On error, redirect to home
      const storedRedirect = sessionStorage.getItem('redirectAfterLogin') || '/';
      sessionStorage.removeItem('redirectAfterLogin');
      setTimeout(() => {
        window.location.href = storedRedirect;
      }, 100);
    }
  };

  // Handle OTP Send
  const handleSendOTP = async () => {
    if (!loginData.emailOrPhone) {
      toast({
        title: 'Error',
        description: 'Please enter your email address or phone number',
        variant: 'destructive',
      });
      return;
    }

    setOtpLoading(true);
    try {
      const response = await fetch('/api/auth/customer/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrPhone: loginData.emailOrPhone }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429 && data.remainingSeconds) {
          setResendCooldown(data.remainingSeconds);
          toast({
            title: 'Please Wait',
            description: data.error || 'Please wait before requesting a new OTP',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Error',
            description: data.error || 'Failed to send OTP',
            variant: 'destructive',
          });
        }
        return;
      }

      setOtpSent(true);
      setIsExistingUser(data.isExistingUser || false);
      setOtpCode('');
      setOtpError(false); // Clear any previous errors when OTP is sent
      
      // Track identifier type and pre-populate profile data if it's a new user
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginData.emailOrPhone);
      const identifierType = isEmail ? 'email' : 'phone';
      setLoginIdentifierType(identifierType);
      
      // Pre-populate profile data if it's a new user
      if (!data.isExistingUser) {
        setProfileData({
          name: '',
          email: isEmail ? loginData.emailOrPhone : '',
          phone: !isEmail ? (loginData.emailOrPhone.startsWith('+91') ? loginData.emailOrPhone : `+91${loginData.emailOrPhone}`) : '+91',
          consent: false,
        });
      }
      
      const identifierTypeDisplay = isEmail ? 'email' : 'phone number';
      toast({
        title: 'OTP Sent',
        description: `Please check your ${identifierTypeDisplay} for the OTP code`,
        variant: 'success',
      });

      // Start cooldown timer
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Send OTP error:', error);
      toast({
        title: 'Error',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setOtpLoading(false);
    }
  };

  // Handle OTP Verification
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otpCode || otpCode.length !== 6) {
      setOtpError(true);
      toast({
        title: 'Error',
        description: 'Please enter a valid 6-digit OTP',
        variant: 'destructive',
      });
      setTimeout(() => setOtpError(false), 3000);
      return;
    }

    setLoading(true);
    setOtpError(false); // Clear any previous errors
    try {
      const response = await fetch('/api/auth/customer/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrPhone: loginData.emailOrPhone, otp: otpCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOtpError(true);
        toast({
          title: 'Verification Failed',
          description: data.error || 'Invalid or expired OTP',
          variant: 'destructive',
        });
        // Clear error after 3 seconds
        setTimeout(() => setOtpError(false), 3000);
        return;
      }

      if (data.token && data.customer) {
        // If new user and requires profile, DON'T store token yet - wait for profile completion
        if (data.isNewUser && data.requiresProfile) {
          // Determine if login was with email or phone
          const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginData.emailOrPhone);
          const identifierType = isEmail ? 'email' : 'phone';
          setLoginIdentifierType(identifierType);
          
          // Store token temporarily in a separate key (will be moved to customerToken after profile completion)
          sessionStorage.setItem('pendingCustomerToken', data.token);
          sessionStorage.setItem('pendingCustomer', JSON.stringify(data.customer));
          
          // Pre-populate profile data based on what was used for login
          setProfileData({
            name: data.customer.name || '',
            email: isEmail ? loginData.emailOrPhone : '',
            phone: !isEmail 
              ? (loginData.emailOrPhone.startsWith('+91') 
                  ? loginData.emailOrPhone 
                  : `+91${loginData.emailOrPhone.replace(/\D/g, '')}`)
              : '+91',
            consent: false,
          });
          setShowProfileModal(true);
          setOtpSent(false);
          setOtpCode('');
          setLoading(false);
          return;
        }

        // For existing users or new users without profile requirement, store token immediately
        localStorage.setItem('customerToken', data.token);
        localStorage.setItem('currentCustomer', JSON.stringify(data.customer));

        // Trigger custom event for header update
        window.dispatchEvent(new Event('customerLogin'));

        // For existing users or new users without profile requirement
        toast({
          title: 'Success',
          description: data.isNewUser ? 'Account created successfully!' : 'Logged in successfully!',
          variant: 'success',
        });

        // Reset OTP state
        setOtpSent(false);
        setOtpCode('');
        onCloseLogin();

        // Redirect based on cart existence
        await redirectAfterLogin();
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      toast({
        title: 'Error',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle profile submission for new users
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profileData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your name',
        variant: 'destructive',
      });
      return;
    }

    // Validate email - required if not used for login
    if (loginIdentifierType !== 'email' && !profileData.email.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your email address',
        variant: 'destructive',
      });
      return;
    }

    // Validate email format if provided
    if (profileData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email.trim())) {
      toast({
        title: 'Error',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    // Validate phone - required if not used for login
    if (loginIdentifierType !== 'phone') {
      const phoneWithoutPrefix = profileData.phone.startsWith('+91') ? profileData.phone.substring(3) : profileData.phone;
      if (!phoneWithoutPrefix.trim() || phoneWithoutPrefix.trim().length < 10) {
        toast({
          title: 'Error',
          description: 'Please enter a valid 10-digit phone number',
          variant: 'destructive',
        });
        return;
      }
    }

    // Ensure at least one contact method is provided (email or phone)
    if (!profileData.email.trim() && !profileData.phone.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide either an email address or phone number',
        variant: 'destructive',
      });
      return;
    }

    if (!profileData.consent) {
      toast({
        title: 'Error',
        description: 'Please accept the terms and conditions',
        variant: 'destructive',
      });
      return;
    }

    setProfileLoading(true);
    try {
      // Ensure phone has +91 prefix before sending
      const phoneToSend = profileData.phone.startsWith('+91') 
        ? profileData.phone 
        : `+91${profileData.phone.replace(/\D/g, '')}`;
      
      const response = await fetch('/api/auth/customer/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileData.name,
          email: profileData.email,
          phone: phoneToSend,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update profile',
          variant: 'destructive',
        });
        return;
      }

      // Move pending token to actual token storage (for new users)
      const pendingToken = sessionStorage.getItem('pendingCustomerToken');
      const pendingCustomer = sessionStorage.getItem('pendingCustomer');
      
      if (pendingToken && pendingCustomer) {
        // Move from sessionStorage to localStorage
        localStorage.setItem('customerToken', pendingToken);
        localStorage.setItem('currentCustomer', JSON.stringify(data.customer));
        
        // Clear pending data
        sessionStorage.removeItem('pendingCustomerToken');
        sessionStorage.removeItem('pendingCustomer');
        
        // Trigger custom event for header update
        window.dispatchEvent(new Event('customerLogin'));
      } else {
        // Update stored customer data (for existing users updating profile)
        const currentCustomer = JSON.parse(localStorage.getItem('currentCustomer') || '{}');
        const updatedCustomer = { ...currentCustomer, ...data.customer };
        localStorage.setItem('currentCustomer', JSON.stringify(updatedCustomer));
      }

      toast({
        title: 'Success',
        description: 'Profile updated successfully!',
        variant: 'success',
      });

      setShowProfileModal(false);
      onCloseLogin();

      // Redirect based on cart existence (matching flowchart)
      await redirectAfterLogin();
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        title: 'Error',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If OTP not sent yet, send OTP
    if (!otpSent) {
      await handleSendOTP();
      return;
    }

    // If OTP sent, verify OTP
    await handleVerifyOTP(e);
  };


  return (
    <>
      {/* Login Modal */}
      <Dialog open={openLogin} onOpenChange={onCloseLogin}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-2xl font-bold text-web text-center'>Welcome Back</DialogTitle>
            <DialogDescription className='text-center text-gray-600 mt-2'>Sign in to your account to continue</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLoginSubmit} className='space-y-4 mt-6'>
            <div>
              <label htmlFor='login-email-phone' className='block text-sm font-semibold text-gray-700 mb-2'>
                Email Address or Phone Number
              </label>
              <Input
                id='login-email-phone'
                type='text'
                value={loginData.emailOrPhone}
                onChange={e => {
                  setLoginData(prev => ({ ...prev, emailOrPhone: e.target.value }));
                  // Reset OTP state when input changes
                  setOtpSent(false);
                  setOtpCode('');
                }}
                placeholder='Enter your email or phone number'
                required
                className='w-full'
                disabled={loading || otpLoading || otpSent}
              />
            </div>

            {otpSent ? (
              <>
                <div>
                  <label className='block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 text-center'>
                    Enter OTP
                  </label>
                  <OTPInput
                    length={6}
                    value={otpCode}
                    onChange={(value) => {
                      setOtpCode(value);
                      // Clear error when user starts typing
                      if (otpError) setOtpError(false);
                    }}
                    disabled={loading || otpLoading}
                    error={otpError}
                    className='mb-4'
                  />
                  <p className='text-xs text-gray-500 dark:text-gray-400 mt-4 text-center'>
                    {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginData.emailOrPhone) 
                      ? 'Check your email for the OTP code'
                      : 'Check your phone for the OTP code'}
                  </p>
                </div>
                <div className='flex items-center justify-center gap-2'>
                  <button
                    type='button'
                    onClick={handleSendOTP}
                    disabled={otpLoading || resendCooldown > 0}
                    className='text-sm text-web hover:underline disabled:opacity-50 disabled:cursor-not-allowed'>
                    {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              </>
            ) : (
              <div className='text-center py-2'>
                <p className='text-sm text-gray-600 dark:text-gray-400'>We'll send a 6-digit OTP to your {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginData.emailOrPhone) ? 'email address' : 'phone number'}</p>
              </div>
            )}

            <button
              type='submit'
              disabled={loading || otpLoading || (otpSent && otpCode.length !== 6)}
              className='w-full bg-web text-white rounded-full px-6 py-3 font-semibold hover:bg-web/90 transition disabled:opacity-50 disabled:cursor-not-allowed'>
              {loading || otpLoading ? (!otpSent ? 'Sending OTP...' : 'Verifying...') : !otpSent ? 'Send OTP' : 'Verify OTP'}
            </button>
          </form>


          <div className='mt-3'>
            <div className='relative'>
              <div className='absolute inset-0 flex items-center'>
                <div className='w-full border-t border-gray-300'></div>
              </div>
              <div className='relative flex justify-center text-sm'>
                <span className='px-2 bg-white text-gray-500'>Or continue with</span>
              </div>
            </div>

            <div className='mt-4 grid grid-cols-2 gap-3'>
              <div className='flex items-center justify-center'>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={false}
                  shape='pill'
                  theme='outline'
                  size='medium'
                  text='signin_with'
                  locale='en'
                />
              </div>
              <button
                type='button'
                onClick={handleFacebookLogin}
                disabled={loading || socialLoading || !isFacebookAvailable}
                title={!isFacebookAvailable ? 'Facebook login requires HTTPS' : ''}
                className='flex items-center justify-center gap-2 border border-gray-300 rounded-full px-4 py-2 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed'>
                {socialLoading ? (
                  <div className='w-5 h-5 border-2 border-gray-300 border-t-web rounded-full animate-spin' />
                ) : (
                  <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 24 24'>
                    <path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' />
                  </svg>
                )}
                <span className='text-sm font-medium'>Facebook</span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Register/Profile Collection Modal for New Users */}
      <Dialog 
        open={showProfileModal} 
        onOpenChange={(open) => {
          // If trying to close without completing profile, clear pending data
          if (!open && !profileData.consent) {
            // Clear pending token and customer data
            sessionStorage.removeItem('pendingCustomerToken');
            sessionStorage.removeItem('pendingCustomer');
            setShowProfileModal(false);
            // Reset login state
            setOtpSent(false);
            setOtpCode('');
            setLoginData({ emailOrPhone: '' });
            toast({
              title: 'Registration Cancelled',
              description: 'Please complete the registration process to continue.',
              variant: 'info',
            });
          } else if (open) {
            setShowProfileModal(true);
          }
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-2xl font-bold text-web text-center'>Complete Registration</DialogTitle>
            <DialogDescription className='text-center text-gray-600 mt-2'>
              Please provide some basic information to complete your registration
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleProfileSubmit} className='space-y-4 mt-4'>
            <div>
              <label htmlFor='profile-name' className='block text-sm font-semibold text-gray-700 mb-2'>
                Full Name <span className='text-red-500'>*</span>
              </label>
              <Input
                id='profile-name'
                type='text'
                value={profileData.name}
                onChange={e => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                placeholder='Enter your full name'
                required
                className='w-full'
                disabled={profileLoading}
              />
            </div>

            <div>
              <label htmlFor='profile-email' className='block text-sm font-semibold text-gray-700 mb-2'>
                Email Address {loginIdentifierType === 'email' && <span className='text-xs text-gray-500'>(Used for login)</span>}
                {loginIdentifierType !== 'email' && <span className='text-red-500'> *</span>}
              </label>
              <Input
                id='profile-email'
                type='email'
                value={profileData.email}
                onChange={e => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                placeholder='Enter your email address'
                required={loginIdentifierType !== 'email'}
                className='w-full'
                disabled={profileLoading || loginIdentifierType === 'email'}
              />
            </div>

            <div>
              <label htmlFor='profile-phone' className='block text-sm font-semibold text-gray-700 mb-2'>
                Phone Number {loginIdentifierType === 'phone' && <span className='text-xs text-gray-500'>(Used for login)</span>}
                {loginIdentifierType !== 'phone' && <span className='text-red-500'> *</span>}
              </label>
              <div className='relative'>
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-medium text-sm ${(profileLoading || loginIdentifierType === 'phone') ? 'opacity-50' : ''}`}>+91</span>
                <Input
                  id='profile-phone'
                  type='tel'
                  value={(() => {
                    if (loginIdentifierType === 'phone') {
                      // If phone was used for login, show full number with +91
                      return profileData.phone.startsWith('+91') ? profileData.phone.substring(3) : profileData.phone;
                    }
                    // For new phone entry, show only digits (without +91 prefix in input)
                    return profileData.phone.startsWith('+91') ? profileData.phone.substring(3) : profileData.phone.replace(/^\+91/, '');
                  })()}
                  onChange={e => {
                    if (loginIdentifierType === 'phone') return; // Don't allow editing if used for login
                    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                    // Limit to 10 digits
                    const limitedValue = value.slice(0, 10);
                    setProfileData(prev => ({ ...prev, phone: `+91${limitedValue}` }));
                  }}
                  placeholder='Enter your 10-digit phone number'
                  required={loginIdentifierType !== 'phone'}
                  className='w-full pl-12'
                  disabled={profileLoading || loginIdentifierType === 'phone'}
                  maxLength={10}
                />
              </div>
            </div>

            <div className='flex items-start gap-2'>
              <input
                type='checkbox'
                id='profile-consent'
                checked={profileData.consent}
                onChange={e => setProfileData(prev => ({ ...prev, consent: e.target.checked }))}
                required
                className='w-4 h-4 mt-1 text-web border-gray-300 rounded'
                disabled={profileLoading}
              />
              <label htmlFor='profile-consent' className='text-sm text-gray-600'>
                I agree to the{' '}
                <a href='/terms-conditions' target='_blank' className='text-web hover:underline'>
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href='/privacy-policy' target='_blank' className='text-web hover:underline'>
                  Privacy Policy
                </a>
                <span className='text-red-500'> *</span>
              </label>
            </div>

            <button
              type='submit'
              disabled={profileLoading}
              className='w-full bg-web text-white rounded-full px-6 py-3 font-semibold hover:bg-web/90 transition disabled:opacity-50 disabled:cursor-not-allowed'>
              {profileLoading ? 'Saving...' : 'Complete Registration'}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

