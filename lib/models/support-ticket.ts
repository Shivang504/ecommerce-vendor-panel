import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export interface SupportTicket {
  _id?: string | ObjectId;
  ticketNumber: string;
  customerId: string;
  subject: string;
  description: string;
  category: 'order' | 'product' | 'payment' | 'shipping' | 'return' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  orderId?: string;
  productId?: string;
  attachments?: Array<{
    url: string;
    filename: string;
    type: string;
  }>;
  assignedTo?: string; // Admin user ID
  messages?: Array<{
    _id?: string;
    senderId: string;
    senderType: 'customer' | 'admin';
    message: string;
    attachments?: Array<{
      url: string;
      filename: string;
      type: string;
    }>;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

// Generate unique ticket number
function generateTicketNumber(): string {
  const prefix = 'TKT';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}-${random}`;
}

// Create a new support ticket
export async function createSupportTicket(data: {
  customerId: string;
  subject: string;
  description: string;
  category: SupportTicket['category'];
  priority?: SupportTicket['priority'];
  orderId?: string;
  productId?: string;
  attachments?: SupportTicket['attachments'];
}): Promise<SupportTicket> {
  const { db } = await connectToDatabase();

  const ticket: Omit<SupportTicket, '_id'> = {
    ticketNumber: generateTicketNumber(),
    customerId: data.customerId,
    subject: data.subject,
    description: data.description,
    category: data.category,
    priority: data.priority || 'medium',
    status: 'open',
    orderId: data.orderId,
    productId: data.productId,
    attachments: data.attachments || [],
    messages: [
      {
        senderId: data.customerId,
        senderType: 'customer',
        message: data.description,
        attachments: data.attachments || [],
        createdAt: new Date(),
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection('support_tickets').insertOne(ticket);

  return {
    ...ticket,
    _id: result.insertedId.toString(),
  } as SupportTicket;
}

// Get ticket by ID
export async function getTicketById(ticketId: string): Promise<SupportTicket | null> {
  const { db } = await connectToDatabase();

  if (!ObjectId.isValid(ticketId)) {
    return null;
  }

  const ticket = await db.collection('support_tickets').findOne({
    _id: new ObjectId(ticketId),
  });

  if (!ticket) {
    return null;
  }

  return {
    ...ticket,
    _id: ticket._id.toString(),
  } as SupportTicket;
}

// Get ticket by ticket number
export async function getTicketByNumber(ticketNumber: string): Promise<SupportTicket | null> {
  const { db } = await connectToDatabase();

  const ticket = await db.collection('support_tickets').findOne({
    ticketNumber,
  });

  if (!ticket) {
    return null;
  }

  return {
    ...ticket,
    _id: ticket._id.toString(),
  } as SupportTicket;
}

// Get tickets for a customer
export async function getCustomerTickets(
  customerId: string,
  status?: SupportTicket['status']
): Promise<SupportTicket[]> {
  const { db } = await connectToDatabase();

  const query: any = { customerId };
  if (status) {
    query.status = status;
  }

  const tickets = await db
    .collection('support_tickets')
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();

  return tickets.map(ticket => ({
    ...ticket,
    _id: ticket._id.toString(),
  })) as SupportTicket[];
}

// Get all tickets (admin)
export async function getAllTickets(
  filters?: {
    status?: SupportTicket['status'];
    priority?: SupportTicket['priority'];
    category?: SupportTicket['category'];
    assignedTo?: string;
    search?: string;
  },
  page: number = 1,
  limit: number = 50
): Promise<{ tickets: SupportTicket[]; total: number }> {
  const { db } = await connectToDatabase();

  const query: any = {};
  if (filters?.status) query.status = filters.status;
  if (filters?.priority) query.priority = filters.priority;
  if (filters?.category) query.category = filters.category;
  if (filters?.assignedTo) query.assignedTo = filters.assignedTo;
  
  // Add search filter
  if (filters?.search) {
    const searchRegex = { $regex: filters.search, $options: 'i' };
    query.$or = [
      { subject: searchRegex },
      { ticketNumber: searchRegex },
      { description: searchRegex },
    ];
  }

  const skip = (page - 1) * limit;

  const [tickets, total] = await Promise.all([
    db
      .collection('support_tickets')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection('support_tickets').countDocuments(query),
  ]);

  return {
    tickets: tickets.map(ticket => ({
      ...ticket,
      _id: ticket._id.toString(),
    })) as SupportTicket[],
    total,
  };
}

// Update ticket
export async function updateTicket(
  ticketId: string,
  updates: Partial<SupportTicket>
): Promise<SupportTicket | null> {
  const { db } = await connectToDatabase();

  if (!ObjectId.isValid(ticketId)) {
    return null;
  }

  const updateData = {
    ...updates,
    updatedAt: new Date(),
  };

  if (updates.status === 'resolved' || updates.status === 'closed') {
    updateData.resolvedAt = new Date();
  }

  const result = await db.collection('support_tickets').findOneAndUpdate(
    { _id: new ObjectId(ticketId) },
    { $set: updateData },
    { returnDocument: 'after' }
  );

  if (!result.value) {
    return null;
  }

  return {
    ...result.value,
    _id: result.value._id.toString(),
  } as SupportTicket;
}

// Add message to ticket
export async function addTicketMessage(
  ticketId: string,
  message: {
    senderId: string;
    senderType: 'customer' | 'admin';
    message: string;
    attachments?: Array<{
      url: string;
      filename: string;
      type: string;
    }>;
  }
): Promise<SupportTicket | null> {
  const { db } = await connectToDatabase();

  if (!ObjectId.isValid(ticketId)) {
    return null;
  }

  const newMessage = {
    _id: new ObjectId(),
    ...message,
    createdAt: new Date(),
  };

  const result = await db.collection('support_tickets').findOneAndUpdate(
    { _id: new ObjectId(ticketId) },
    {
      $push: { messages: newMessage },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: 'after' }
  );

  if (!result.value) {
    return null;
  }

  return {
    ...result.value,
    _id: result.value._id.toString(),
  } as SupportTicket;
}

// Get ticket statistics
export async function getTicketStats(): Promise<{
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  byCategory: Record<string, number>;
}> {
  const { db } = await connectToDatabase();

  const [total, open, inProgress, resolved, closed, byPriority, byCategory] = await Promise.all([
    db.collection('support_tickets').countDocuments({}),
    db.collection('support_tickets').countDocuments({ status: 'open' }),
    db.collection('support_tickets').countDocuments({ status: 'in-progress' }),
    db.collection('support_tickets').countDocuments({ status: 'resolved' }),
    db.collection('support_tickets').countDocuments({ status: 'closed' }),
    db
      .collection('support_tickets')
      .aggregate([
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    db
      .collection('support_tickets')
      .aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
          },
        },
      ])
      .toArray(),
  ]);

  const priorityMap: Record<string, number> = {
    low: 0,
    medium: 0,
    high: 0,
    urgent: 0,
  };

  byPriority.forEach((item: any) => {
    if (item._id) {
      priorityMap[item._id] = item.count;
    }
  });

  const categoryMap: Record<string, number> = {};
  byCategory.forEach((item: any) => {
    if (item._id) {
      categoryMap[item._id] = item.count;
    }
  });

  return {
    total,
    open,
    inProgress,
    resolved,
    closed,
    byPriority: priorityMap,
    byCategory: categoryMap,
  };
}

