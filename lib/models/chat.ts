import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export interface ChatMessage {
  _id?: string | ObjectId;
  chatId: string;
  senderId: string;
  senderType: 'customer' | 'admin';
  senderName?: string;
  message: string;
  attachments?: Array<{
    url: string;
    filename: string;
    type: string;
  }>;
  read: boolean;
  createdAt: Date;
}

export interface ChatSession {
  _id?: string | ObjectId;
  chatId: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  // Pre-chat form fields
  preChatForm?: {
    name?: string;
    email: string;
    phone?: string;
    question1?: string; // Department/Category
    question2?: string; // Order Reference
    question3?: string; // Message/Description
    question4?: string;
  };
  adminId?: string;
  adminName?: string;
  status: 'pending' | 'active' | 'waiting' | 'closed';
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Generate unique chat ID
function generateChatId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `chat-${timestamp}-${random}`;
}

// Create chat session with pre-chat form
export async function createChatSessionWithPreChat(
  customerId: string,
  preChatForm: {
    name?: string;
    email: string;
    phone?: string;
    question1?: string;
    question2?: string;
    question3?: string;
    question4?: string;
  }
): Promise<ChatSession> {
  const { db } = await connectToDatabase();

  // Get customer details
  const customer = await db.collection('customers').findOne({ _id: new ObjectId(customerId) });

  // Create new chat session with active status (no admin approval required)
  const newChat: Omit<ChatSession, '_id'> = {
    chatId: generateChatId(),
    customerId,
    customerName: preChatForm.name || customer?.name,
    customerEmail: preChatForm.email,
    customerPhone: preChatForm.phone,
    preChatForm,
    status: 'active',
    unreadCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection('chat_sessions').insertOne(newChat);

  return {
    ...newChat,
    _id: result.insertedId.toString(),
  } as ChatSession;
}

// Create or get chat session
export async function getOrCreateChatSession(customerId: string): Promise<ChatSession | null> {
  const { db } = await connectToDatabase();

  // Get customer details
  const customer = await db.collection('customers').findOne({ _id: new ObjectId(customerId) });

  // Try to find existing active/waiting/pending chat
  let chat = await db.collection('chat_sessions').findOne({
    customerId,
    status: { $in: ['active', 'waiting', 'pending'] },
  });

  if (chat) {
    // Update customer info if available
    if (customer && (!chat.customerName || !chat.customerEmail)) {
      await db.collection('chat_sessions').updateOne(
        { _id: chat._id },
        {
          $set: {
            customerName: customer.name,
            customerEmail: customer.email,
            updatedAt: new Date(),
          },
        }
      );
      chat.customerName = customer.name;
      chat.customerEmail = customer.email;
    }
    return {
      ...chat,
      _id: chat._id.toString(),
    } as ChatSession;
  }

  // Return null if no chat found (customer needs to submit pre-chat form)
  return null;
}

// Try to auto-assign chat to available admin
async function tryAutoAssignChat(chatId: string): Promise<void> {
  try {
    const { db } = await connectToDatabase();

    // Find admin with least active chats
    const adminStats = await db
      .collection('chat_sessions')
      .aggregate([
        {
          $match: {
            status: 'active',
            adminId: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: '$adminId',
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: 1 },
        },
        {
          $limit: 1,
        },
      ])
      .toArray();

    if (adminStats.length > 0) {
      const adminId = adminStats[0]._id;
      let admin;
      
      // Try to find admin by string ID first
      if (typeof adminId === 'string') {
        admin = await db.collection('users').findOne({ _id: new ObjectId(adminId) });
      } else {
        admin = await db.collection('users').findOne({ _id: adminId });
      }

      if (admin) {
        const adminIdStr = typeof adminId === 'string' ? adminId : adminId.toString();
        await assignChatToAdmin(chatId, adminIdStr, admin.name || 'Admin');
        return;
      }
    }

    // If no admin has active chats, assign to first available admin
    const firstAdmin = await db.collection('users').findOne({
      role: { $in: ['admin', 'superadmin'] },
      status: 'active',
    });

    if (firstAdmin) {
      await assignChatToAdmin(chatId, firstAdmin._id.toString(), firstAdmin.name || 'Admin');
    }
  } catch (error) {
    // Silently fail - chat will remain in waiting status
    console.error('[Chat] Error auto-assigning chat:', error);
  }
}

// Get chat session by ID
export async function getChatSession(chatId: string): Promise<ChatSession | null> {
  const { db } = await connectToDatabase();

  const chat = await db.collection('chat_sessions').findOne({ chatId });

  if (!chat) {
    return null;
  }

  return {
    ...chat,
    _id: chat._id.toString(),
  } as ChatSession;
}

// Get all chat sessions (admin)
export async function getAllChatSessions(
  status?: ChatSession['status'],
  page: number = 1,
  limit: number = 50
): Promise<{ sessions: ChatSession[]; total: number }> {
  const { db } = await connectToDatabase();

  const query: any = {};
  if (status) {
    query.status = status;
  } else {
    // By default, show pending and active chats (not closed)
    query.status = { $ne: 'closed' };
  }

  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    db
      .collection('chat_sessions')
      .find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection('chat_sessions').countDocuments(query),
  ]);

  return {
    sessions: sessions.map(session => ({
      ...session,
      _id: session._id.toString(),
    })) as ChatSession[],
    total,
  };
}

// Get chat messages
export async function getChatMessages(
  chatId: string,
  limit: number = 50,
  before?: Date
): Promise<ChatMessage[]> {
  const { db } = await connectToDatabase();

  const query: any = { chatId };
  if (before) {
    query.createdAt = { $lt: before };
  }

  const messages = await db
    .collection('chat_messages')
    .find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return messages
    .reverse()
    .map(msg => ({
      ...msg,
      _id: msg._id.toString(),
    })) as ChatMessage[];
}

// Add chat message
export async function addChatMessage(
  chatId: string,
  message: {
    senderId: string;
    senderType: 'customer' | 'admin';
    senderName?: string;
    message: string;
    attachments?: Array<{
      url: string;
      filename: string;
      type: string;
    }>;
  }
): Promise<ChatMessage> {
  const { db } = await connectToDatabase();

  const newMessage: Omit<ChatMessage, '_id'> = {
    chatId,
    senderId: message.senderId,
    senderType: message.senderType,
    senderName: message.senderName,
    message: message.message,
    attachments: message.attachments || [],
    read: false,
    createdAt: new Date(),
  };

  const result = await db.collection('chat_messages').insertOne(newMessage);

  // Update chat session
  if (message.senderType === 'customer') {
    await db.collection('chat_sessions').updateOne(
      { chatId },
      {
        $set: {
          lastMessage: message.message,
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        },
        $inc: { unreadCount: 1 },
      }
    );
  } else {
    await db.collection('chat_sessions').updateOne(
      { chatId },
      {
        $set: {
          lastMessage: message.message,
          lastMessageAt: new Date(),
          updatedAt: new Date(),
          unreadCount: 0,
        },
      }
    );
  }

  return {
    ...newMessage,
    _id: result.insertedId.toString(),
  } as ChatMessage;
}

// Mark messages as read
export async function markChatMessagesAsRead(chatId: string, userId: string): Promise<void> {
  const { db } = await connectToDatabase();

  await db.collection('chat_messages').updateMany(
    {
      chatId,
      senderId: { $ne: userId },
      read: false,
    },
    {
      $set: { read: true },
    }
  );

  // Reset unread count
  await db.collection('chat_sessions').updateOne(
    { chatId },
    {
      $set: {
        unreadCount: 0,
        updatedAt: new Date(),
      },
    }
  );
}

// Approve chat session (change from pending to active)
export async function approveChatSession(
  chatId: string,
  adminId: string,
  adminName: string
): Promise<ChatSession | null> {
  const { db } = await connectToDatabase();

  const result = await db.collection('chat_sessions').findOneAndUpdate(
    { chatId, status: 'pending' },
    {
      $set: {
        adminId,
        adminName,
        status: 'active',
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );

  if (!result.value) {
    return null;
  }

  return {
    ...result.value,
    _id: result.value._id.toString(),
  } as ChatSession;
}

// Assign chat to admin
export async function assignChatToAdmin(
  chatId: string,
  adminId: string,
  adminName: string
): Promise<ChatSession | null> {
  const { db } = await connectToDatabase();

  const result = await db.collection('chat_sessions').findOneAndUpdate(
    { chatId },
    {
      $set: {
        adminId,
        adminName,
        status: 'active',
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );

  if (!result.value) {
    return null;
  }

  return {
    ...result.value,
    _id: result.value._id.toString(),
  } as ChatSession;
}

// Close chat session
export async function closeChatSession(chatId: string): Promise<void> {
  const { db } = await connectToDatabase();

  await db.collection('chat_sessions').updateOne(
    { chatId },
    {
      $set: {
        status: 'closed',
        updatedAt: new Date(),
      },
    }
  );
}

// Reopen chat session
export async function reopenChatSession(
  chatId: string,
  adminId: string,
  adminName: string
): Promise<ChatSession | null> {
  const { db } = await connectToDatabase();

  const result = await db.collection('chat_sessions').findOneAndUpdate(
    { chatId },
    {
      $set: {
        status: 'active',
        adminId,
        adminName,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );

  if (!result.value) {
    return null;
  }

  return {
    ...result.value,
    _id: result.value._id.toString(),
  } as ChatSession;
}

