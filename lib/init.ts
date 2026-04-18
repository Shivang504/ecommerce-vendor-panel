// Initialization checks and startup messages
// This file is imported early to log initialization status

// Check VAPID keys configuration
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

// Check Socket.IO configuration
const ENABLE_SOCKET = process.env.NEXT_PUBLIC_ENABLE_SOCKET === 'true';

// Log initialization status
export function logInitializationStatus() {
  // VAPID keys check
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log('[Push] VAPID keys not configured, skipping push notification');
  } else {
    console.log('[Push] VAPID keys configured, push notifications enabled');
  }

  // Socket.IO check
  if (!ENABLE_SOCKET) {
    console.log('[Socket] Socket.IO not initialized. Real-time features disabled.');
  } else {
    // Check if socket.io is installed
    try {
      require('socket.io');
      console.log('[Socket] Socket.IO enabled and ready');
    } catch (error) {
      console.log('[Socket] Socket.IO not initialized. Real-time features disabled.');
      console.log('[Socket] Install with: npm install socket.io');
    }
  }
}

// Auto-run on module load (only in server-side)
if (typeof window === 'undefined') {
  logInitializationStatus();
}

