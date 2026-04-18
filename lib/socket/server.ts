
import { Server as HTTPServer } from 'http';

// Optional Socket.io types
type SocketIOServer = any;
let io: SocketIOServer | null = null;

export function initializeSocket(server: HTTPServer) {
  try {
    // Dynamic import to handle missing socket.io
    const { Server: SocketIOServer } = require('socket.io');
    
    io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'https://e-commrce-xi.vercel.app',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      path: '/api/socket',
    });
  } catch (error) {
    console.warn('[Socket] Socket.io not installed. Install with: npm install socket.io');
    console.warn('[Socket] Real-time notifications disabled. Using polling instead.');
    return null;
  }

  io.on('connection', (socket) => {
    console.log('[Socket] Client connected:', socket.id);

    // Join customer room for order updates
    socket.on('join:customer', (customerId: string) => {
      socket.join(`customer:${customerId}`);
      console.log(`[Socket] Customer ${customerId} joined their room`);
    });

    // Join admin room for notifications
    socket.on('join:admin', () => {
      socket.join('admin');
      console.log('[Socket] Admin joined admin room');
    });

    // Join order room for specific order updates
    socket.on('join:order', (orderId: string) => {
      socket.join(`order:${orderId}`);
      console.log(`[Socket] Joined order room: ${orderId}`);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Client disconnected:', socket.id);
    });
  });

  return io;
}

export function getSocketIO(): SocketIOServer | null {
  if (!io) {
    console.warn('[Socket] Socket.IO not initialized. Real-time features disabled.');
    return null;
  }
  return io;
}

// Emit new notification to admin
export function emitNewNotification(notification: any) {
  try {
    const socketIO = getSocketIO();
    if (!socketIO) {
      return; // Socket.io not available, use polling
    }
    socketIO.to('admin').emit('notification:new', {
      notification,
      timestamp: new Date(),
    });
    console.log('[Socket] Emitted new notification to admin');
  } catch (error) {
    // Don't throw - notifications can work without Socket.io
    console.log('[Socket] Socket.io not available, using polling');
  }
}

// Emit notification read status update
export function emitNotificationRead(notificationId: string) {
  try {
    const socketIO = getSocketIO();
    if (!socketIO) return;
    socketIO.to('admin').emit('notification:read', {
      notificationId,
      timestamp: new Date(),
    });
  } catch (error) {
    // Silent fail - polling will handle updates
  }
}

// Emit order status update
export function emitOrderStatusUpdate(orderId: string, customerId: string, status: string) {
  try {
    const socketIO = getSocketIO();
    if (!socketIO) return;
    
    // Notify customer
    socketIO.to(`customer:${customerId}`).emit('order:status:update', {
      orderId,
      status,
      timestamp: new Date(),
    });
    
    // Notify order room
    socketIO.to(`order:${orderId}`).emit('order:status:update', {
      orderId,
      status,
      timestamp: new Date(),
    });
    
    // Notify admin
    socketIO.to('admin').emit('order:status:update', {
      orderId,
      customerId,
      status,
      timestamp: new Date(),
    });
  } catch (error) {
    // Silent fail - polling will handle updates
  }
}

// Emit payment status update
export function emitPaymentStatusUpdate(
  orderId: string,
  customerId: string,
  paymentStatus: string,
  paymentId?: string
) {
  try {
    const socketIO = getSocketIO();
    if (!socketIO) return;
    
    // Notify customer
    socketIO.to(`customer:${customerId}`).emit('payment:status:update', {
      orderId,
      paymentId,
      paymentStatus,
      timestamp: new Date(),
    });
    
    // Notify order room
    socketIO.to(`order:${orderId}`).emit('payment:status:update', {
      orderId,
      paymentId,
      paymentStatus,
      timestamp: new Date(),
    });
    
    // Notify admin
    socketIO.to('admin').emit('payment:status:update', {
      orderId,
      customerId,
      paymentId,
      paymentStatus,
      timestamp: new Date(),
    });
  } catch (error) {
    // Silent fail - polling will handle updates
  }
}

// Emit tracking update
export function emitTrackingUpdate(orderId: string, customerId: string, trackingInfo: any) {
  try {
    const socketIO = getSocketIO();
    if (!socketIO) return;
    
    socketIO.to(`customer:${customerId}`).emit('order:tracking:update', {
      orderId,
      trackingInfo,
      timestamp: new Date(),
    });
    
    socketIO.to(`order:${orderId}`).emit('order:tracking:update', {
      orderId,
      trackingInfo,
      timestamp: new Date(),
    });
  } catch (error) {
    // Silent fail - polling will handle updates
  }
}
