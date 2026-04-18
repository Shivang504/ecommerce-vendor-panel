'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapPin, Loader2, CheckCircle2, AlertCircle, LocateIcon, Truck, IndianRupee, ShieldCheck, Clock as ClockIcon } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AuthModals } from '@/components/auth/auth-modals';
import { reverseGeocodeToIndianPincode } from '@/lib/reverse-geocode-nominatim';

type Serviceability = {
  pincode: string;
  city?: string;
  state?: string;
  district?: string;
  isServiceable: boolean;
  deliveryDays?: number;
  deliveryCharges?: number;
  codAvailable?: boolean;
};

type StoredLocation = Serviceability & {
  message: string;
};

const STORAGE_KEY = 'selectedLocation';

async function checkPincodeServiceability(pincode: string): Promise<Serviceability> {
  const response = await fetch('/api/pincode/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pincode }),
  });

  const data = await response.json();

  if (!response.ok || !data?.serviceability) {
    throw new Error(data?.error || 'Failed to validate pincode');
  }

  return data.serviceability as Serviceability;
}

export function LocationSelector() {
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [pincodeInput, setPincodeInput] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [location, setLocation] = useState<StoredLocation | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [openLogin, setOpenLogin] = useState(false);
  const [openRegister, setOpenRegister] = useState(false);

  useEffect(() => {
    try {
      const token = localStorage.getItem('customerToken');
      setIsLoggedIn(!!token);

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setLocation(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error loading stored location', err);
    }
  }, []);

  useEffect(() => {
    if (location) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
    }
  }, [location]);

  const triggerLabel = useMemo(() => {
    if (location?.pincode && location.isServiceable) {
      return `${location.pincode}${location.city ? ` • ${location.city}` : ''}`;
    }
    return '';
  }, [location]);

  const handleCheck = async (value?: string) => {
    const pin = (typeof value === 'string' ? value : pincodeInput || '').trim();

    if (!/^\d{6}$/.test(pin)) {
      setErrorText('Enter a valid 6-digit pincode.');
      return;
    }

    setChecking(true);
    setErrorText(null);

    try {
      const serviceability = await checkPincodeServiceability(pin);
      const message = serviceability.isServiceable ? 'Delivery available to your location' : 'Delivery not available in your area';

      const saved: StoredLocation = { ...serviceability, message };
      setLocation(saved);
      setPincodeInput(pin);
      setOpen(false);

      toast({
        description: message,
        variant: serviceability.isServiceable ? 'default' : 'destructive',
      });
    } catch (err: any) {
      const fallbackMessage = 'Delivery not available in your area';
      setLocation({
        pincode: pin,
        isServiceable: false,
        message: fallbackMessage,
      });
      toast({
        variant: 'destructive',
        description: err?.message || fallbackMessage,
      });
    } finally {
      setChecking(false);
    }
  };

  const handleDetect = () => {
    if (!navigator?.geolocation) {
      setErrorText('Geolocation is not supported in this browser.');
      toast({
        variant: 'destructive',
        description: 'Geolocation not supported by your browser.',
      });
      return;
    }

    setDetecting(true);
    setErrorText(null);

    navigator.geolocation.getCurrentPosition(
      async position => {
        let detectedPin = '';
        try {
          const { latitude, longitude } = position.coords;
          const { pincode, city, state } = await reverseGeocodeToIndianPincode(latitude, longitude);
          detectedPin = pincode || '';

          if (!pincode || !/^\d{6}$/.test(pincode)) {
            throw new Error('Could not detect a valid pincode. Try manually.');
          }

          setPincodeInput(pincode);

          const serviceability = await checkPincodeServiceability(pincode);
          const message = serviceability.isServiceable
            ? 'Delivery available to your location'
            : `Delivery not available in your area at this pincode: ${pincode}`;

          const saved: StoredLocation = {
            ...serviceability,
            city: serviceability.city || city,
            state: serviceability.state || state,
            message,
          };

          setLocation(saved);
          setOpen(false);

          toast({
            description: message,
            variant: serviceability.isServiceable ? 'default' : 'destructive',
          });
        } catch (err: any) {
          console.error('Detect location error:', err);
          // Show errors via toast only to avoid lingering under the input
          setErrorText(null);
          const detectedPinMsg = typeof err?.pincode === 'string' && err.pincode ? ` (pincode ${err.pincode})` : '';
          toast({
            variant: 'destructive',
            description:
              (err?.message || 'Unable to detect your location.') +
              (detectedPin ? ` (pincode ${detectedPin})` : detectedPinMsg),
          });
        } finally {
          setDetecting(false);
        }
      },
      geoError => {
        setDetecting(false);
        const description =
          geoError.code === geoError.PERMISSION_DENIED
            ? 'Permission denied. Please allow location access.'
            : 'Unable to fetch your location. Try again.';
        toast({ variant: 'destructive', description });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <>
      <Dialog open={open && isLoggedIn} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            className={`flex items-center px-2 py-2 rounded-full text-white hover:bg-white/10 transition ${triggerLabel ? 'gap-2' : 'gap-0'}`}
            aria-label='Select delivery location'
            onClick={() => {
              if (!isLoggedIn) {
                setOpenLogin(true);
                return;
              }
            }}>
            <MapPin className='w-6 h-6' />
            <span className='hidden sm:block text-sm font-medium truncate max-w-[150px]'>{triggerLabel}</span>
          </button>
        </DialogTrigger>

        <DialogContent className='sm:max-w-lg p-0 overflow-hidden'>
          <div className='bg-gradient-to-r from-slate-50 to-white border-b px-6 py-5'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2 text-lg font-semibold text-slate-900'>
                <MapPin className='w-5 h-5 text-web' />
                Choose your delivery location
              </DialogTitle>
              <DialogDescription className='text-sm text-slate-600'>
                Detect automatically or enter a pincode to check delivery availability.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className='px-6 py-5 space-y-4'>
            {location && (
              <div className='rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-3'>
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <p className='text-base font-semibold text-slate-900'>{location.pincode}</p>
                    {(location.city || location.state) && (
                      <p className='text-xs text-slate-500'>{[location.city, location.state].filter(Boolean).join(', ')}</p>
                    )}
                    <p className={`mt-1 text-sm font-medium ${location.isServiceable ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {location.message}
                    </p>
                  </div>
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full 
    text-xs font-semibold border shadow-sm
    ${location.isServiceable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    {location.isServiceable ? (
                      <>
                        <CheckCircle2 className='w-4 h-4' />
                        Delivery Available
                      </>
                    ) : (
                      <>
                        <AlertCircle className='w-4 h-4' />
                        Delivery Unavailable
                      </>
                    )}
                  </div>
                </div>

                {/* Admin pincode details */}
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700'>
                  <div className='flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2'>
                    <ClockIcon className='w-4 h-4 text-slate-500' />
                    <div>
                      <p className='text-xs text-slate-500'>Delivery ETA</p>
                      <p className='font-semibold text-slate-900'>
                        {location.deliveryDays !== undefined ? `${location.deliveryDays} day${location.deliveryDays === 1 ? '' : 's'}` : '—'}
                      </p>
                    </div>
                  </div>
                  <div className='flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2'>
                    <IndianRupee className='w-4 h-4 text-slate-500' />
                    <div>
                      <p className='text-xs text-slate-500'>Delivery Charges</p>
                      <p className='font-semibold text-slate-900'>
                        {location.deliveryCharges === 0
                          ? 'Free'
                          : location.deliveryCharges !== undefined
                          ? `₹${location.deliveryCharges}`
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <div className='flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2'>
                    <ShieldCheck className='w-4 h-4 text-slate-500' />
                    <div>
                      <p className='text-xs text-slate-500'>COD</p>
                      <p className='font-semibold text-slate-900'>{location.codAvailable ? 'Available' : 'Not available'}</p>
                    </div>
                  </div>
                  <div className='flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2'>
                    <Truck className='w-4 h-4 text-slate-500' />
                    <div>
                      <p className='text-xs text-slate-500'>Express Delivery</p>
                      <p className='font-semibold text-slate-900'>{location.expressDeliveryAvailable ? 'Available' : 'Not available'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className='space-y-2'>
              <button
                onClick={handleDetect}
                type='button'
                disabled={detecting || checking}
                className='
      w-full inline-flex items-center justify-center gap-2
      rounded-lg px-6 py-3
      bg-web text-white font-semibold text-sm
      shadow-md shadow-web/30
      transition-all duration-200
      hover:bg-web/90 hover:shadow-lg
      active:scale-[0.98]
      disabled:opacity-50 disabled:cursor-not-allowed
    '>
                {detecting ? <Loader2 className='w-4 h-4 animate-spin' /> : <LocateIcon className='w-4 h-4' />}
                <span>Use my current location</span>
              </button>

              <p className='text-xs text-muted-foreground text-center'>We use your browser&apos;s GPS to fetch the nearest pincode.</p>
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium text-gray-700'>Or enter pincode</label>

              <div className='flex items-center gap-2'>
                <input
                  type='text'
                  placeholder='Enter 6-digit pincode'
                  maxLength={6}
                  value={pincodeInput}
                  onChange={e => {
                    setErrorText(null);
                    setPincodeInput(e.target.value.replace(/\D/g, ''));
                  }}
                  inputMode='numeric'
                  className='
      w-full h-11 px-4
      rounded-lg
      border border-gray-300
      bg-white
      text-sm font-medium text-gray-900
      placeholder:text-gray-400
      transition-all duration-200
      focus:outline-none focus:ring-0
      focus:border-web
      hover:border-gray-400
    '
                />

                <button
                  onClick={() => handleCheck()}
                  disabled={checking || pincodeInput.length !== 6}
                  className='
          inline-flex items-center justify-center gap-2
          h-11 px-5 rounded-lg
          bg-web text-white font-semibold text-sm
          shadow-md shadow-web/30
          transition-all duration-200
          hover:bg-web/90 hover:shadow-lg
          active:scale-[0.98]
          disabled:opacity-50 disabled:cursor-not-allowed
        '>
                  {checking ? <Loader2 className='w-4 h-4 animate-spin' /> : <CheckCircle2 className='w-4 h-4' />}
                  <span>Check</span>
                </button>
              </div>

              {errorText && <p className='text-xs text-rose-600 font-medium'>{errorText}</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AuthModals
        openLogin={openLogin}
        openRegister={openRegister}
        onCloseLogin={() => setOpenLogin(false)}
        onCloseRegister={() => setOpenRegister(false)}
        onSwitchToRegister={() => {
          setOpenLogin(false);
          setOpenRegister(true);
        }}
        onSwitchToLogin={() => {
          setOpenRegister(false);
          setOpenLogin(true);
        }}
      />
    </>
  );
 }
