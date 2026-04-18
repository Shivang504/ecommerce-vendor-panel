'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  requestNotificationPermission,
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
  registerPushSubscription,
  unregisterPushSubscription,
} from '@/lib/push-notifications';

export function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if browser supports notifications and service workers
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);

      // Register service worker
      registerServiceWorker().then((reg) => {
        if (reg) {
          setRegistration(reg);
          // Check if already subscribed
          reg.pushManager.getSubscription().then((subscription) => {
            setIsSubscribed(!!subscription);
          });
        }
      });
    }
  }, []);

  const handleEnable = async () => {
    if (!isSupported || !registration) {
      toast({
        title: 'Not Supported',
        description: 'Your browser does not support push notifications',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Request permission
      const perm = await requestNotificationPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        toast({
          title: 'Permission Denied',
          description: 'Please allow notifications in your browser settings',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Subscribe to push
      const subscription = await subscribeToPush(registration);
      if (!subscription) {
        throw new Error('Failed to subscribe to push notifications');
      }

      // Register with server
      const success = await registerPushSubscription(subscription);
      if (!success) {
        throw new Error('Failed to register subscription with server');
      }

      setIsSubscribed(true);
      toast({
        title: 'Success',
        description: 'Push notifications enabled successfully',
        variant: 'success',
      });
    } catch (error: any) {
      console.error('[Push] Enable failed:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to enable push notifications',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!registration) return;

    setIsLoading(true);

    try {
      // Get current subscription
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // Unsubscribe
        await unsubscribeFromPush(registration);

        // Unregister from server
        await unregisterPushSubscription(subscription.endpoint);
      }

      setIsSubscribed(false);
      toast({
        title: 'Success',
        description: 'Push notifications disabled successfully',
        variant: 'success',
      });
    } catch (error: any) {
      console.error('[Push] Disable failed:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to disable push notifications',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return null; // Don't show anything if not supported
  }

  return (
    <div className='flex items-center gap-2'>
      {isSubscribed ? (
        <Button
          onClick={handleDisable}
          disabled={isLoading}
          variant='outline'
          size='sm'
          className='gap-2'>
          {isLoading ? (
            <>
              <Loader2 className='w-4 h-4 animate-spin' />
              Disabling...
            </>
          ) : (
            <>
              <BellOff className='w-4 h-4' />
              Disable Notifications
            </>
          )}
        </Button>
      ) : (
        <Button
          onClick={handleEnable}
          disabled={isLoading || permission === 'denied'}
          variant='outline'
          size='sm'
          className='gap-2'>
          {isLoading ? (
            <>
              <Loader2 className='w-4 h-4 animate-spin' />
              Enabling...
            </>
          ) : (
            <>
              <Bell className='w-4 h-4' />
              Enable Notifications
            </>
          )}
        </Button>
      )}
    </div>
  );
}

