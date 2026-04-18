'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Package, Check, CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { useNotificationSocket } from './notification-bell-client';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  orderId?: string;
  orderNumber?: string;
  customerName?: string;
  isRead: boolean;
  createdAt: string;
  metadata?: any;
}

export function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);

  const fetchNotifications = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const token = localStorage.getItem('adminToken');
      if (!token) {
        console.log('[NotificationBell] No admin token found');
        return;
      }

      // Prevent too frequent requests (min 1 second between requests)
      const now = Date.now();
      if (now - lastFetchRef.current < 1000) {
        return;
      }
      lastFetchRef.current = now;

      console.log('[NotificationBell] Fetching notifications...');
      const { safeFetch } = await import('@/lib/auth-utils');
      const response = await safeFetch('/api/notifications?limit=20', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[NotificationBell] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[NotificationBell] Received data:', {
          success: data.success,
          notificationsCount: data.notifications?.length || 0,
          unreadCount: data.unreadCount || 0,
        });
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } else {
        // If 401/403, safeFetch already handled logout, just clear state
        if (response.status === 401 || response.status === 403) {
          console.log('[NotificationBell] Unauthorized, user will be logged out');
          setNotifications([]);
          setUnreadCount(0);
          return;
        }
        
        const errorData = await response.json().catch(() => ({}));
        console.error('[NotificationBell] Failed to fetch notifications:', {
          status: response.status,
          error: errorData.error || 'Unknown error',
        });
        // Set empty arrays on error
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('[NotificationBell] Error fetching notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  // Use Socket.io hook for real-time updates (falls back to polling if not available)
  useNotificationSocket(() => {
    console.log('[NotificationBell] Socket.io notification received, refreshing...');
    fetchNotifications(true); // Silent fetch on socket notification
  });

  useEffect(() => {
    // Initial fetch
    fetchNotifications();

    // Poll for new notifications every 3 seconds (reduced from 10 for faster updates)
    // Only poll when page is visible
    const startPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      pollingIntervalRef.current = setInterval(() => {
        // Only poll if page is visible
        if (!document.hidden) {
          fetchNotifications(true); // Silent polling
        }
      }, 3000); // Poll every 3 seconds
    };

    startPolling();

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, stop polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      } else {
        // Page is visible, resume polling and fetch immediately
        fetchNotifications();
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) return;

      const { safeFetch } = await import('@/lib/auth-utils');
      const response = await safeFetch(`/api/notifications/${notificationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Update local state
        setNotifications(prev =>
          prev.map(notif =>
            notif._id === notificationId
              ? { ...notif, isRead: true }
              : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else if (response.status === 401 || response.status === 403) {
        // Auth error already handled by safeFetch
        return;
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) return;

      const { safeFetch } = await import('@/lib/auth-utils');
      const response = await safeFetch('/api/notifications/mark-all-read', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, isRead: true }))
        );
      } else if (response.status === 401 || response.status === 403) {
        // Auth error already handled by safeFetch
        return;
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      await handleMarkAsRead(notification._id);
    }

    // Navigate to order detail page
    if (notification.orderId) {
      setOpen(false);
      router.push(`/admin/orders/${notification.orderId}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_placed':
      case 'order_confirmed':
      case 'order_shipped':
      case 'order_delivered':
        return <Package className='w-4 h-4' />;
      default:
        return <Bell className='w-4 h-4' />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'order_placed':
        return 'bg-blue-100 text-blue-700';
      case 'order_confirmed':
        return 'bg-green-100 text-green-700';
      case 'order_shipped':
        return 'bg-purple-100 text-purple-700';
      case 'order_delivered':
        return 'bg-emerald-100 text-emerald-700';
      case 'payment_received':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='relative'
          onClick={() => fetchNotifications()}
        >
          <Bell className='h-5 w-5' />
          {unreadCount > 0 && (
            <span className='absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white'>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-96 p-0' align='end'>
        <div className='flex items-center justify-between border-b px-4 py-3'>
          <h3 className='font-semibold text-gray-900'>Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant='ghost'
              size='sm'
              onClick={handleMarkAllAsRead}
              className='text-xs'
            >
              <CheckCheck className='w-3 h-3 mr-1' />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className='h-[400px]'>
          {notifications.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 px-4'>
              <Bell className='w-12 h-12 text-gray-300 mb-3' />
              <p className='text-sm text-gray-500'>No notifications</p>
            </div>
          ) : (
            <div className='divide-y'>
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.isRead ? 'bg-blue-50/50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className='flex items-start gap-3'>
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getNotificationColor(
                        notification.type
                      )}`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-start justify-between gap-2'>
                        <div className='flex-1'>
                          <p
                            className={`text-sm font-semibold ${
                              !notification.isRead
                                ? 'text-gray-900'
                                : 'text-gray-700'
                            }`}
                          >
                            {notification.title}
                          </p>
                          <p className='text-xs text-gray-600 mt-1'>
                            {notification.message}
                          </p>
                          {notification.orderNumber && (
                            <p className='text-xs text-gray-500 mt-1'>
                              Order: {notification.orderNumber}
                            </p>
                          )}
                        </div>
                        {!notification.isRead && (
                          <div className='w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1' />
                        )}
                      </div>
                      <p className='text-xs text-gray-400 mt-2'>
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <div className='border-t px-4 py-2'>
            <Button
              variant='ghost'
              size='sm'
              className='w-full text-xs'
              onClick={() => router.push('/admin/orders')}
            >
              View all orders
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

