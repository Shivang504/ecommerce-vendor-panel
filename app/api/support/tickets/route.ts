import { NextRequest, NextResponse } from 'next/server';
import { verifyCustomerToken } from '@/lib/auth';
import { createSupportTicket, getCustomerTickets } from '@/lib/models/support-ticket';
import { getCustomerById } from '@/lib/models/customer';
import { sendEmail } from '@/lib/email';
import { generateTicketCreatedEmailHTML } from '@/lib/email-templates';

// POST - Create a new support ticket
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.cookies.get('customerToken')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyCustomerToken(token);
    if (!decoded || !decoded.customerId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { subject, description, category, priority, orderId, productId, attachments } = body;

    // Validation
    if (!subject || !description || !category) {
      return NextResponse.json(
        { error: 'Subject, description, and category are required' },
        { status: 400 }
      );
    }

    const validCategories = ['order', 'product', 'payment', 'shipping', 'return', 'other'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    const ticket = await createSupportTicket({
      customerId: decoded.customerId,
      subject,
      description,
      category,
      priority,
      orderId,
      productId,
      attachments,
    });

    // Send email notification to customer
    try {
      const customer = await getCustomerById(decoded.customerId);
      if (customer && customer.email) {
        const emailHTML = generateTicketCreatedEmailHTML({
          customerName: customer.name || 'Customer',
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          category: ticket.category,
          priority: ticket.priority,
          ticketId: ticket._id!.toString(),
        });

        await sendEmail({
          to: customer.email,
          subject: `Support Ticket Created - ${ticket.ticketNumber}`,
          html: emailHTML,
        });

        console.log('[Support Ticket API] Ticket creation email sent to:', customer.email);
      }
    } catch (emailError) {
      console.error('[Support Ticket API] Error sending ticket creation email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      ticket,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Support Ticket API] Error creating ticket:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create ticket' },
      { status: 500 }
    );
  }
}

// GET - Get customer's tickets
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.cookies.get('customerToken')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyCustomerToken(token);
    if (!decoded || !decoded.customerId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as any;

    const tickets = await getCustomerTickets(decoded.customerId, status);

    return NextResponse.json({
      success: true,
      tickets,
    });
  } catch (error: any) {
    console.error('[Support Ticket API] Error fetching tickets:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}

