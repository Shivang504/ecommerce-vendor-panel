'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Minimize2,
  Maximize2,
  Loader2,
  User,
  Mail,
  Phone,
  HelpCircle,
  ShoppingBag,
  Package,
  CreditCard,
  RefreshCw,
  Settings,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Check,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePathname } from 'next/navigation';

interface ChatMessage {
  _id: string;
  senderId: string;
  senderType: 'customer' | 'admin';
  senderName?: string;
  message: string;
  createdAt: string;
  read: boolean;
}

interface ChatSession {
  chatId: string;
  status: 'pending' | 'active' | 'waiting' | 'closed';
  unreadCount: number;
  preChatForm?: {
    email: string;
    phone?: string;
    question1?: string;
    question2?: string;
    question3?: string;
    question4?: string;
  };
}

export function LiveChatWidget() {
  // All hooks must be called before any conditional returns
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showPreChatForm, setShowPreChatForm] = useState(false);
  const [submittingForm, setSubmittingForm] = useState(false);
  // Pre-chat form fields - only department needed
  const [formData, setFormData] = useState({
    department: '',
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statusPollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pathname = usePathname();
  const { toast } = useToast();
  
  // Check if admin route after all hooks are declared
  const isAdmin = pathname.startsWith('/admin');

  // Define scrollToBottom before useEffects that use it
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // All useEffect hooks must be declared before any conditional returns
  useEffect(() => {
    // Don't run if admin route
    if (isAdmin) return;

    const token = localStorage.getItem('customerToken');
    if (!token) return;

    if (isOpen) {
      checkExistingSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isAdmin]);

  useEffect(() => {
    // Don't run if admin route
    if (isAdmin) return;

    scrollToBottom();
  }, [messages, isAdmin, scrollToBottom]);

  // Allow other components to open chat programmatically
  useEffect(() => {
    // Don't run if admin route
    if (isAdmin) return;

    const handleOpenChat = () => {
      const token = localStorage.getItem('customerToken');
      if (!token) {
        toast({
          title: 'Login Required',
          description: 'Please login to use live chat',
          variant: 'destructive',
        });
        return;
      }
      setIsOpen(true);
      setIsMinimized(false);
      setShowPreChatForm(false);
    };

    window.addEventListener('open-live-chat', handleOpenChat);
    return () => window.removeEventListener('open-live-chat', handleOpenChat);
  }, [toast, isAdmin]);

  // Last useEffect - must be before early return
  useEffect(() => {
    // Don't run if admin route
    if (isAdmin) return;

    if (session && session.status === 'active' && isOpen && !isMinimized) {
      startMessagePolling();
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (statusPollingIntervalRef.current) {
        clearInterval(statusPollingIntervalRef.current);
        statusPollingIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isMinimized, session, isAdmin]);

  // Early return after all hooks
  if (isAdmin) {
    return null;
  }

  const checkExistingSession = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('customerToken');
      if (!token) {
        setIsOpen(false);
        return;
      }

      const response = await fetch('/api/chat/session', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.session) {
          // If session is closed, reset everything and show pre-chat form
          if (data.session.status === 'closed') {
            setSession(null);
            setMessages([]);
            setMessage('');
            setFormData({ department: '' });
            setShowPreChatForm(true);
            if (statusPollingIntervalRef.current) {
              clearInterval(statusPollingIntervalRef.current);
              statusPollingIntervalRef.current = null;
            }
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          } else {
            // Session is active or pending
            setSession(data.session);
            setMessages(data.messages || []);

            // If status is pending, show waiting message and poll for status
            if (data.session.status === 'pending') {
              setShowPreChatForm(false);
              startStatusPolling(data.session.chatId);
            } else if (data.session.status === 'active') {
              setShowPreChatForm(false);
              startMessagePolling();
            }
          }
        } else {
          // No session exists, show pre-chat form
          setSession(null);
          setMessages([]);
          setMessage('');
          setFormData({ department: '' });
          setShowPreChatForm(true);
        }
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setLoading(false);
    }
  };

  const startStatusPolling = (chatId: string) => {
    // Clear existing interval
    if (statusPollingIntervalRef.current) {
      clearInterval(statusPollingIntervalRef.current);
    }

    statusPollingIntervalRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem('customerToken');
        if (!token) return;

        const response = await fetch('/api/chat/session', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.session) {
            if (data.session.status === 'active') {
              // Status changed to active, start message polling
              setSession(data.session);
              setShowPreChatForm(false);
              if (statusPollingIntervalRef.current) {
                clearInterval(statusPollingIntervalRef.current);
                statusPollingIntervalRef.current = null;
              }
              startMessagePolling();
              toast({
                title: 'Chat Started',
                description: 'Your chat has been approved. You can now start chatting!',
              });
            } else if (data.session.status === 'closed') {
              // Chat was closed by admin - Reset chat to allow starting a new one
              if (statusPollingIntervalRef.current) {
                clearInterval(statusPollingIntervalRef.current);
                statusPollingIntervalRef.current = null;
              }
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              
              // Reset chat state to allow customer to start a new chat
              setSession(null);
              setMessages([]);
              setMessage('');
              setFormData({ department: '' });
              setShowPreChatForm(true);
              
              toast({
                title: 'Chat Closed',
                description: 'This chat session has been closed. You can start a new chat by selecting a category below.',
              });
            }
          }
        }
      } catch (error) {
        console.error('Error polling status:', error);
      }
    }, 3000); // Poll every 3 seconds for status update
  };

  const startMessagePolling = () => {
    // Clear any existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (!session || !isOpen || isMinimized) {
      return;
    }

    const poll = async () => {
      if (!isOpen || isMinimized || !session) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        return;
      }

      try {
        const token = localStorage.getItem('customerToken');
        if (!token) return;

        // Check session status first
        const sessionResponse = await fetch('/api/chat/session', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          if (sessionData.session && sessionData.session.status === 'closed') {
            // Chat was closed - Reset everything
            setSession(null);
            setMessages([]);
            setMessage('');
            setFormData({ department: '' });
            setShowPreChatForm(true);
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            toast({
              title: 'Chat Closed',
              description: 'This chat session has been closed. You can start a new chat by selecting a category.',
            });
            return;
          }
        }

        // Poll for messages
        const response = await fetch(`/api/chat/messages?chatId=${session.chatId}&limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages || []);
        }
      } catch (error) {
        console.error('Error polling messages:', error);
      }
    };

    poll(); // Initial poll
    pollingIntervalRef.current = setInterval(poll, 5000);
  };

  const handleSubmitPreChatForm = async (department: string) => {
    if (!department) {
      toast({
        title: 'Validation Error',
        description: 'Please select a category',
        variant: 'destructive',
      });
      return;
    }

    setSubmittingForm(true);
    try {
      const token = localStorage.getItem('customerToken');
      if (!token) {
        setIsOpen(false);
        return;
      }

      // Get customer info from localStorage (optional - API will fetch from DB if not provided)
      const customerData = localStorage.getItem('currentCustomer') || localStorage.getItem('customer');
      let customerInfo: { name?: string; email?: string; phone?: string } = {};
      
      if (customerData) {
        try {
          const parsed = JSON.parse(customerData);
          customerInfo = {
            name: parsed.name,
            email: parsed.email,
            phone: parsed.phone,
          };
        } catch (e) {
          // Ignore parse errors - API will fetch from DB
        }
      }

      const response = await fetch('/api/chat/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          preChatForm: {
            ...(customerInfo.name && { name: customerInfo.name }),
            ...(customerInfo.email && { email: customerInfo.email }),
            ...(customerInfo.phone && { phone: customerInfo.phone }),
            question1: department,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSession(data.session);
        setShowPreChatForm(false);
        toast({
          title: 'Chat Started',
          description: 'Your chat session is now active. You can start chatting!',
        });

        // Start message polling if session is active
        if (data.session.status === 'active') {
          startMessagePolling();
        }
      } else {
        const errorData = await response.json();
        toast({
          title: 'Error',
          description: errorData.error || 'Failed to start chat',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setSubmittingForm(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !session || sending || session.status !== 'active') return;

    setSending(true);
    try {
      const token = localStorage.getItem('customerToken');
      if (!token) return;

      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chatId: session.chatId,
          message: message.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, data.message]);
        setMessage('');
      } else {
        const errorData = await response.json();
        toast({
          title: 'Error',
          description: errorData.error || 'Failed to send message',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleToggle = () => {
    const token = localStorage.getItem('customerToken');
    if (!token) {
      toast({
        title: 'Login Required',
        description: 'Please login to use live chat',
        variant: 'destructive',
      });
      return;
    }
    setIsOpen(!isOpen);
    if (!isOpen) {
      setIsMinimized(false);
      setShowPreChatForm(false);
      setFormData({ department: '' }); // Reset form when opening
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={handleToggle}
        className='fixed bottom-6 right-6 bg-web text-white rounded-full p-4 shadow-lg hover:bg-web/90 transition z-50 flex items-center gap-2 animate-pulse hover:animate-none'>
        <MessageCircle className='w-6 h-6' />
        <span className='hidden sm:inline font-medium'>Need Help? Chat with us</span>
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 flex flex-col ${
        isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
      } transition-all`}>
      {/* Header */}
      <div className='bg-gradient-to-r from-web to-web/90 text-white p-4 rounded-t-lg flex items-center justify-between shadow-md'>
        <div className='flex items-center gap-3 flex-1 min-w-0'>
          <div className='relative flex-shrink-0'>
            <MessageCircle className='w-5 h-5' />
            {session?.status === 'active' && (
              <span className='absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white animate-pulse'></span>
            )}
          </div>
          <div className='flex flex-col min-w-0 flex-1'>
            <span className='font-semibold text-sm truncate'>
              {session?.status === 'active'
                ? 'Chat with Support'
                : session?.status === 'pending'
                ? 'Waiting for Support'
                : session?.status === 'closed'
                ? 'Chat Closed'
                : 'Need Help? Chat with us'}
            </span>
            {session?.status === 'active' && <span className='text-xs text-white/80 font-normal'>We typically reply in a few minutes</span>}
          </div>
          {session?.status === 'pending' && (
            <span className='text-xs bg-yellow-500 px-2 py-1 rounded-full flex-shrink-0 whitespace-nowrap'>Pending</span>
          )}
          {session?.status === 'waiting' && (
            <span className='text-xs bg-yellow-500 px-2 py-1 rounded-full flex-shrink-0 whitespace-nowrap'>Waiting...</span>
          )}
          {session?.status === 'closed' && (
            <span className='text-xs bg-gray-500 px-2 py-1 rounded-full flex-shrink-0 whitespace-nowrap'>Closed</span>
          )}
        </div>
        <div className='flex items-center gap-1 flex-shrink-0'>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className='hover:bg-white/20 rounded p-1.5 transition'
            title={isMinimized ? 'Expand' : 'Minimize'}>
            {isMinimized ? <Maximize2 className='w-4 h-4' /> : <Minimize2 className='w-4 h-4' />}
          </button>
          <button onClick={handleToggle} className='hover:bg-white/20 rounded p-1.5 transition' title='Close'>
            <X className='w-4 h-4' />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Loading State */}
          {loading && (
            <div className='flex-1 overflow-y-auto p-4 bg-gray-50 flex items-center justify-center'>
              <div className='text-center'>
                <Loader2 className='w-8 h-8 animate-spin text-web mx-auto mb-2' />
                <p className='text-sm text-gray-600'>Loading chat...</p>
              </div>
            </div>
          )}

          {/* Pre-chat Form - Category Selection Only */}
          {!loading && showPreChatForm && !session && (
            <div className='flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white flex flex-col'>
              <div className='flex-1 overflow-y-auto p-5'>
                <div className='space-y-4'>
                  <div className='text-center mb-6'>
                    <div className='w-16 h-16 bg-web/10 rounded-full flex items-center justify-center mx-auto mb-3'>
                      <ShoppingBag className='w-8 h-8 text-web' />
                    </div>
                    <h3 className='text-xl font-bold text-gray-900 mb-2'>What can we help you with?</h3>
                    <p className='text-sm text-gray-600'>Select a category to start chatting</p>
                  </div>
                  <div className='grid grid-cols-2 gap-3'>
                    {[
                      { value: 'order', label: 'Order Issue', icon: Package, desc: 'Order tracking, delivery' },
                      { value: 'product', label: 'Product Question', icon: ShoppingBag, desc: 'Product details, size' },
                      { value: 'payment', label: 'Payment Issue', icon: CreditCard, desc: 'Payment, refund, billing' },
                      { value: 'return', label: 'Return/Refund', icon: RefreshCw, desc: 'Returns, exchanges' },
                      { value: 'technical', label: 'Technical Support', icon: Settings, desc: 'Website, app issues' },
                      { value: 'other', label: 'Other', icon: HelpCircle, desc: 'General inquiries' },
                    ].map(dept => {
                      const Icon = dept.icon;
                      return (
                        <button
                          key={dept.value}
                          type='button'
                          onClick={() => {
                            if (submittingForm) return;
                            handleSubmitPreChatForm(dept.value);
                          }}
                          disabled={submittingForm}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-left ${
                            submittingForm
                              ? 'opacity-50 cursor-not-allowed'
                              : formData.department === dept.value
                              ? 'border-web bg-web/5 text-web shadow-md'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-web/50 hover:shadow-sm'
                          }`}>
                          {submittingForm && formData.department === dept.value ? (
                            <Loader2 className='w-6 h-6 flex-shrink-0 animate-spin' />
                          ) : (
                            <Icon className='w-6 h-6 flex-shrink-0' />
                          )}
                          <div className='flex flex-col items-center text-center w-full'>
                            <span className='text-sm font-semibold'>{dept.label}</span>
                            <span className='text-xs text-gray-500 mt-1'>{dept.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* Chat Closed Message - This should not show anymore since we reset on closed */}
          {false && session && session.status === 'closed' && !showPreChatForm && (
            <div className='flex-1 overflow-y-auto p-4 bg-gray-50 flex items-center justify-center'>
              <div className='text-center max-w-sm'>
                <div className='w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <CheckCircle2 className='w-8 h-8 text-gray-400' />
                </div>
                <h3 className='text-lg font-semibold text-gray-900 mb-2'>Chat Session Closed</h3>
                <p className='text-sm text-gray-600 mb-4'>
                  This chat session has been closed by our support team. If you need further assistance, please start a new chat.
                </p>
                {messages.length > 0 && (
                  <div className='bg-white rounded-lg p-4 border border-gray-200 mb-4 text-left'>
                    <p className='text-xs font-medium text-gray-500 mb-2'>Chat Summary:</p>
                    <p className='text-xs text-gray-600'>
                      {messages.length} message{messages.length > 1 ? 's' : ''} exchanged in this conversation
                    </p>
                  </div>
                )}
                <button
                  onClick={() => {
                    setSession(null);
                    setMessages([]);
                    setShowPreChatForm(true);
                    setFormData({
                      department: '',
                    });
                  }}
                  className='bg-web text-white rounded-lg px-6 py-2.5 font-semibold hover:bg-web/90 transition flex items-center gap-2 mx-auto'>
                  <MessageCircle className='w-4 h-4' />
                  Start New Chat
                </button>
              </div>
            </div>
          )}

          {/* Active Chat */}
          {session && session.status === 'active' && !showPreChatForm && (
            <>
              {/* Messages */}
              <div className='flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50'>
                {loading ? (
                  <div className='flex items-center justify-center py-8'>
                    <Loader2 className='w-6 h-6 animate-spin text-web' />
                  </div>
                ) : messages.length === 0 ? (
                  <div className='text-center py-8 text-gray-500'>
                    <MessageCircle className='w-12 h-12 mx-auto mb-2 text-gray-400' />
                    <p>Start a conversation with our support team</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const senderType = msg.senderType || 'unknown';
                    const isCustomerMessage = senderType === 'customer';

                    // Customer widget: Admin messages on LEFT, Customer messages on RIGHT (WhatsApp style)
                    if (isCustomerMessage) {
                      // Customer's own message - RIGHT side (blue bubble, avatar on right)
                      return (
                        <div key={msg._id} className='w-full flex justify-end mb-4'>
                          <div className='flex items-end gap-2 max-w-[85%]'>
                            <div className='max-w-full rounded-2xl px-4 py-2.5 bg-web text-white rounded-br-sm shadow-sm'>
                              <p className='text-sm whitespace-pre-wrap leading-relaxed text-white mb-1'>{msg.message}</p>
                              <div className='flex items-center justify-end gap-1 mt-1'>
                                <p className='text-xs text-blue-100'>
                                  {new Date(msg.createdAt).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true,
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className='w-8 h-8 rounded-full bg-web text-white flex items-center justify-center text-xs font-semibold flex-shrink-0 shadow-sm'>
                              <User className='w-4 h-4' />
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      // Admin's message - LEFT side (white/gray bubble, avatar on left)
                      return (
                        <div key={msg._id} className='w-full flex justify-start mb-4'>
                          <div className='flex items-start gap-2 max-w-[85%]'>
                            <div className='w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold flex-shrink-0 shadow-sm'>
                              <span>{msg.senderName ? msg.senderName.charAt(0).toUpperCase() : 'A'}</span>
                            </div>
                            <div className='max-w-full rounded-2xl px-4 py-2.5 bg-white border border-gray-200 text-gray-900 rounded-bl-sm shadow-sm'>
                              {msg.senderName && (
                                <div className='flex items-center gap-1 mb-1'>
                                  <span className='text-xs font-semibold text-gray-700'>{msg.senderName}</span>
                                </div>
                              )}
                              <p className='text-sm whitespace-pre-wrap leading-relaxed text-gray-800 mb-1'>{msg.message}</p>
                              <div className='flex items-center justify-start gap-1 mt-1'>
                                <p className='text-xs text-gray-500'>
                                  {new Date(msg.createdAt).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true,
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              {session.status === 'active' && (
                <form onSubmit={handleSendMessage} className='border-t border-gray-200 p-4 bg-white'>
                  <div className='flex gap-2'>
                    <input
                      type='text'
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder='Type your message...'
                      className='flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-web'
                      disabled={sending || session.status !== 'active'}
                    />
                    <button
                      type='submit'
                      disabled={sending || !message.trim() || session.status !== 'active'}
                      className='bg-web text-white rounded-lg px-4 py-2 hover:bg-web/90 transition disabled:opacity-50 disabled:cursor-not-allowed'>
                      {sending ? <Loader2 className='w-5 h-5 animate-spin' /> : <Send className='w-5 h-5' />}
                    </button>
                  </div>
                  <p className='text-xs text-gray-500 mt-2 text-center'>Press Enter to send message</p>
                </form>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
