'use client';

// Client-side Socket.io hook (optional - for real-time updates)
// Currently using polling, but this can be enhanced with Socket.io
// Note: Socket.io-client is optional. Install with: npm install socket.io-client

import { useEffect, useRef } from 'react';

type Socket = any;

function getVendorIdFromStorage(): string | null {
  try {
    const raw = localStorage.getItem('adminUser');
    if (raw) {
      const user = JSON.parse(raw);
      if (user?.role === 'vendor' && (user.id || user._id)) {
        return user.id || user._id;
      }
    }
    const token = localStorage.getItem('adminToken');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1] || ''));
    return payload?.id || null;
  } catch {
    return null;
  }
}

export function useNotificationSocket(onNewNotification: () => void) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Only connect if Socket.io is enabled
    const enableSocket = process.env.NEXT_PUBLIC_ENABLE_SOCKET === 'true';
    
    if (!enableSocket) {
      return; // Use polling instead
    }

    let socket: Socket | null = null;
    const loadSocket = async () => {
      try {
        const socketIO = await import('socket.io-client');
        const { io } = socketIO;
        const socketUrl =
          process.env.NEXT_PUBLIC_SOCKET_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          (typeof window !== 'undefined' ? window.location.origin : '');
        socket = io(socketUrl, {
          path: '/api/socket',
          transports: ['websocket', 'polling'],
        });

        socket.on('connect', () => {
          console.log('[Socket Client] Connected');
          const vendorId = getVendorIdFromStorage();
          if (vendorId) {
            socket?.emit('join:vendor', vendorId);
          } else {
            socket?.emit('join:admin');
          }
        }); 
        socket.on('notification:new', (data) => {
          console.log('[Socket Client] New notification received:', data);
          onNewNotification();
        });
        socket.on('notification:read', (data) => {
          console.log('[Socket Client] Notification read:', data);
          onNewNotification();
        });
        socket.on('disconnect', () => {
          console.log('[Socket Client] Disconnected');
        });

        socketRef.current = socket;
      } catch (error) {
        console.log('[Socket Client] Socket.io-client not available. Using polling instead.', error);
        // Fallback to polling - no action needed
      }
    };

    loadSocket();

    return () => {
      if (socket) {
        try {
          socket.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
      }
    };
  }, [onNewNotification]);

  return socketRef.current;
}

