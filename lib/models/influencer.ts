import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const REFERRAL_STORAGE_KEY = 'tryvvo_ref';

export interface InfluencerSettings {
  enabled: boolean;
  commissionRate: number;
  minOrderAmount: number;
  firstOrderOnly: boolean;
  creditOnStatus: 'delivered' | 'completed';
  minWithdrawal: number;
  cookieDays: number;
  autoApprove: boolean;
}

export const DEFAULT_INFLUENCER_SETTINGS: InfluencerSettings = {
  enabled: true,
  commissionRate: 5,
  minOrderAmount: 1,
  firstOrderOnly: false,
  creditOnStatus: 'delivered',
  minWithdrawal: 100,
  cookieDays: 30,
  autoApprove: true,
};

export interface InfluencerBankDetails {
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
}

export interface InfluencerCommission {
  _id?: string | ObjectId;
  influencerId: string | ObjectId;
  referredCustomerId: string | ObjectId;
  orderId: string | ObjectId;
  orderNumber: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'pending' | 'credited' | 'reversed';
  type: 'referral' | 'manual';
  note?: string;
  createdBy?: string;
  createdAt: Date;
  creditedAt?: Date;
  reversedAt?: Date;
}

export interface InfluencerWithdrawal {
  _id?: string | ObjectId;
  type: 'influencer';
  influencerId: string | ObjectId;
  influencerName?: string;
  influencerEmail?: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  requestNote?: string;
  adminNote?: string;
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: string | ObjectId;
  accountDetails?: InfluencerBankDetails;
}

export interface WalletTransaction {
  _id?: string | ObjectId;
  customerId: string | ObjectId;
  type: 'commission' | 'manual' | 'spend' | 'refund' | 'withdrawal' | 'withdrawal_reject';
  amount: number;
  balanceAfter: number;
  orderId?: string | ObjectId;
  orderNumber?: string;
  withdrawalId?: string | ObjectId;
  note?: string;
  createdAt: Date;
}

function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function getReferralSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw && /^https?:\/\//i.test(raw)) {
    return raw.replace(/\/$/, '');
  }
  return 'https://www.tryvvo.com';
}

export function buildReferralLink(code: string): string {
  return `${getReferralSiteUrl()}/?ref=${encodeURIComponent(code)}`;
}

export async function getInfluencerSettings(): Promise<InfluencerSettings> {
  const { db } = await connectToDatabase();
  const doc = await db.collection('influencer_settings').findOne({});
  return {
    ...DEFAULT_INFLUENCER_SETTINGS,
    ...(doc || {}),
    commissionRate: Number(doc?.commissionRate ?? DEFAULT_INFLUENCER_SETTINGS.commissionRate),
    minOrderAmount: Number(doc?.minOrderAmount ?? DEFAULT_INFLUENCER_SETTINGS.minOrderAmount),
    firstOrderOnly: Boolean(doc?.firstOrderOnly ?? DEFAULT_INFLUENCER_SETTINGS.firstOrderOnly),
    minWithdrawal: Number(doc?.minWithdrawal ?? DEFAULT_INFLUENCER_SETTINGS.minWithdrawal),
    cookieDays: Number(doc?.cookieDays ?? DEFAULT_INFLUENCER_SETTINGS.cookieDays),
    enabled: doc?.enabled !== false,
    autoApprove: doc?.autoApprove !== false,
    creditOnStatus: doc?.creditOnStatus === 'completed' ? 'completed' : 'delivered',
  };
}

export async function saveInfluencerSettings(input: Partial<InfluencerSettings>): Promise<InfluencerSettings> {
  const { db } = await connectToDatabase();
  const current = await getInfluencerSettings();
  const next: InfluencerSettings = {
    ...current,
    ...input,
    commissionRate: Math.min(50, Math.max(0, Number(input.commissionRate ?? current.commissionRate))),
    minOrderAmount: Math.max(0, Number(input.minOrderAmount ?? current.minOrderAmount)),
    minWithdrawal: Math.max(1, Number(input.minWithdrawal ?? current.minWithdrawal)),
    cookieDays: Math.max(1, Number(input.cookieDays ?? current.cookieDays)),
    firstOrderOnly: Boolean(input.firstOrderOnly ?? current.firstOrderOnly),
    enabled: input.enabled ?? current.enabled,
    autoApprove: input.autoApprove ?? current.autoApprove,
    creditOnStatus: input.creditOnStatus === 'completed' ? 'completed' : 'delivered',
  };

  await db.collection('influencer_settings').updateOne(
    {},
    { $set: { ...next, updatedAt: new Date() } },
    { upsert: true }
  );
  return next;
}

export async function generateUniqueReferralCode(name?: string): Promise<string> {
  const { db } = await connectToDatabase();
  const prefix = (name || 'TRY')
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, 'X');

  for (let i = 0; i < 20; i++) {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const code = `${prefix}${suffix}`;
    const exists = await db.collection('customers').findOne({ referralCode: code }, { projection: { _id: 1 } });
    if (!exists) return code;
  }
  return `TRY${Date.now().toString(36).toUpperCase().slice(-8)}`;
}

export async function findInfluencerByCode(code: string) {
  if (!code?.trim()) return null;
  const { db } = await connectToDatabase();
  return db.collection('customers').findOne({
    referralCode: code.trim().toUpperCase(),
    isInfluencer: true,
    influencerStatus: { $ne: 'suspended' },
  });
}

export async function attachReferralToCustomer(customerId: string, code: string) {
  const { db } = await connectToDatabase();
  const customer = await db.collection('customers').findOne({ _id: new ObjectId(customerId) });
  if (!customer || customer.referredBy) return null;

  const influencer = await findInfluencerByCode(code);
  if (!influencer) return null;
  if (influencer._id.toString() === customerId) return null;

  await db.collection('customers').updateOne(
    { _id: new ObjectId(customerId), referredBy: { $exists: false } },
    {
      $set: {
        referredBy: influencer._id,
        referredByCode: influencer.referralCode,
        referredAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  return {
    influencerId: influencer._id.toString(),
    referralCode: influencer.referralCode,
    influencerName: influencer.name,
  };
}

export async function convertCustomerToInfluencer(customerId: string) {
  const settings = await getInfluencerSettings();
  if (!settings.enabled) {
    throw new Error('Influencer program is currently disabled');
  }

  const { db } = await connectToDatabase();
  const customer = await db.collection('customers').findOne({ _id: new ObjectId(customerId) });
  if (!customer) throw new Error('Customer not found');
  if (customer.status === 'blocked') throw new Error('Blocked accounts cannot become influencers');

  if (customer.isInfluencer && customer.referralCode) {
    return serializeInfluencer(customer);
  }

  const referralCode = await generateUniqueReferralCode(customer.name);
  const update = {
    isInfluencer: true,
    influencerStatus: settings.autoApprove ? 'active' : 'pending',
    referralCode,
    influencerWalletBalance: customer.influencerWalletBalance || 0,
    influencerTotalEarned: customer.influencerTotalEarned || 0,
    influencerTotalWithdrawn: customer.influencerTotalWithdrawn || 0,
    influencerJoinedAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection('customers').updateOne({ _id: new ObjectId(customerId) }, { $set: update });
  return serializeInfluencer({ ...customer, ...update });
}

export function serializeInfluencer(customer: any) {
  const code = customer.referralCode || '';
  return {
    _id: customer._id?.toString(),
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    isInfluencer: !!customer.isInfluencer,
    influencerStatus: customer.influencerStatus || (customer.isInfluencer ? 'active' : 'inactive'),
    referralCode: code,
    referralLink: code ? buildReferralLink(code) : '',
    walletBalance: roundMoney(customer.influencerWalletBalance || 0),
    totalEarned: roundMoney(customer.influencerTotalEarned || 0),
    totalWithdrawn: roundMoney(customer.influencerTotalWithdrawn || 0),
    bankDetails: customer.influencerBankDetails || {},
    joinedAt: customer.influencerJoinedAt,
  };
}

export async function resolveOrderReferral(options: {
  customerId: string;
  referralCode?: string;
}) {
  const { db } = await connectToDatabase();
  const customer = await db.collection('customers').findOne({ _id: new ObjectId(options.customerId) });
  if (!customer) return null;

  let influencer: any = null;
  if (customer.referredBy) {
    influencer = await db.collection('customers').findOne({ _id: new ObjectId(customer.referredBy.toString()) });
  } else if (options.referralCode) {
    influencer = await findInfluencerByCode(options.referralCode);
    if (influencer) {
      await attachReferralToCustomer(options.customerId, options.referralCode);
    }
  }

  if (!influencer || !influencer.isInfluencer || influencer.influencerStatus === 'suspended') {
    return null;
  }
  if (influencer._id.toString() === options.customerId) {
    return null;
  }

  return {
    code: influencer.referralCode,
    influencerId: influencer._id.toString(),
    influencerName: influencer.name,
    commissionStatus: 'pending' as const,
    commissionAmount: 0,
  };
}

export async function applyWalletSpend(options: {
  customerId: string;
  requestedAmount: number;
  payableBeforeWallet: number;
  orderId?: string;
  orderNumber?: string;
}) {
  const requested = roundMoney(Math.max(0, options.requestedAmount || 0));
  if (requested <= 0) return { walletUsed: 0, remaining: roundMoney(options.payableBeforeWallet) };

  const { db } = await connectToDatabase();
  const customer = await db.collection('customers').findOne({ _id: new ObjectId(options.customerId) });
  const available = roundMoney(customer?.influencerWalletBalance || 0);
  const walletUsed = roundMoney(Math.min(requested, available, options.payableBeforeWallet));
  if (walletUsed <= 0) {
    return { walletUsed: 0, remaining: roundMoney(options.payableBeforeWallet) };
  }

  const result = await db.collection('customers').findOneAndUpdate(
    {
      _id: new ObjectId(options.customerId),
      influencerWalletBalance: { $gte: walletUsed },
    },
    {
      $inc: { influencerWalletBalance: -walletUsed },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: 'after' }
  );

  const updated = (result as any)?.value || result;
  if (!updated) {
    throw new Error('Insufficient influencer wallet balance');
  }

  await db.collection('influencer_wallet_transactions').insertOne({
    customerId: new ObjectId(options.customerId),
    type: 'spend',
    amount: -walletUsed,
    balanceAfter: roundMoney(updated.influencerWalletBalance || 0),
    orderId: options.orderId ? new ObjectId(options.orderId) : undefined,
    orderNumber: options.orderNumber,
    note: 'Used as gift card at checkout',
    createdAt: new Date(),
  } as WalletTransaction);

  return {
    walletUsed,
    remaining: roundMoney(options.payableBeforeWallet - walletUsed),
  };
}

export async function refundWalletSpend(order: any) {
  const walletUsed = roundMoney(order?.pricing?.walletDiscount || order?.referral?.walletUsed || 0);
  if (walletUsed <= 0 || order?.referral?.walletRefunded) return;

  const customerId = order.customerId?.toString();
  if (!customerId) return;

  const { db } = await connectToDatabase();
  const result = await db.collection('customers').findOneAndUpdate(
    { _id: new ObjectId(customerId) },
    {
      $inc: { influencerWalletBalance: walletUsed },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: 'after' }
  );
  const updated = (result as any)?.value || result;

  await db.collection('influencer_wallet_transactions').insertOne({
    customerId: new ObjectId(customerId),
    type: 'refund',
    amount: walletUsed,
    balanceAfter: roundMoney(updated?.influencerWalletBalance || 0),
    orderId: new ObjectId(order._id.toString()),
    orderNumber: order.orderNumber,
    note: 'Wallet gift card refunded after order cancel/return',
    createdAt: new Date(),
  } as WalletTransaction);

  await db.collection('orders').updateOne(
    { _id: new ObjectId(order._id.toString()) },
    { $set: { 'referral.walletRefunded': true, updatedAt: new Date() } }
  );
}

export async function creditInfluencerWallet(options: {
  influencerId: string;
  amount: number;
  type: WalletTransaction['type'];
  orderId?: string;
  orderNumber?: string;
  note?: string;
}) {
  const amount = roundMoney(options.amount);
  if (amount === 0) return 0;
  const { db } = await connectToDatabase();
  const inc: any = { influencerWalletBalance: amount };
  if (options.type === 'commission' || options.type === 'manual') {
    inc.influencerTotalEarned = amount;
  }
  if (options.type === 'refund' && amount < 0) {
    inc.influencerTotalEarned = amount;
  }
  const result = await db.collection('customers').findOneAndUpdate(
    { _id: new ObjectId(options.influencerId) },
    { $inc: inc, $set: { updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
  const updated = (result as any)?.value || result;
  await db.collection('influencer_wallet_transactions').insertOne({
    customerId: new ObjectId(options.influencerId),
    type: options.type,
    amount,
    balanceAfter: roundMoney(updated?.influencerWalletBalance || 0),
    orderId: options.orderId ? new ObjectId(options.orderId) : undefined,
    orderNumber: options.orderNumber,
    note: options.note,
    createdAt: new Date(),
  } as WalletTransaction);
  return roundMoney(updated?.influencerWalletBalance || 0);
}

export async function processInfluencerCommissionFromOrder(orderId: string) {
  const settings = await getInfluencerSettings();
  if (!settings.enabled) return;

  const { db } = await connectToDatabase();
  const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });
  if (!order) return;
  if (!order.referral?.influencerId || !order.referral?.code) return;
  if (order.referral.commissionStatus === 'credited') return;
  if (['cancelled', 'returned', 'refunded'].includes(order.orderStatus)) return;

  const eligibleStatuses = settings.creditOnStatus === 'completed'
    ? ['completed']
    : ['delivered', 'completed'];
  if (!eligibleStatuses.includes(order.orderStatus)) return;

  const commissionBase = roundMoney(
    (order.pricing?.subtotal || 0) - (order.pricing?.discount || 0)
  );
  if (commissionBase < settings.minOrderAmount) return;

  if (settings.firstOrderOnly) {
    const prior = await db.collection('influencer_commissions').findOne({
      referredCustomerId: new ObjectId(order.customerId.toString()),
      status: 'credited',
      type: 'referral',
    });
    if (prior) return;
  }

  const amount = roundMoney((commissionBase * settings.commissionRate) / 100);
  if (amount <= 0) return;

  const existing = await db.collection('influencer_commissions').findOne({
    orderId: new ObjectId(orderId),
    status: { $in: ['pending', 'credited'] },
  });
  if (existing?.status === 'credited') return;

  const commissionDoc: InfluencerCommission = {
    influencerId: new ObjectId(order.referral.influencerId),
    referredCustomerId: new ObjectId(order.customerId.toString()),
    orderId: new ObjectId(orderId),
    orderNumber: order.orderNumber,
    orderAmount: commissionBase,
    commissionRate: settings.commissionRate,
    commissionAmount: amount,
    status: 'credited',
    type: 'referral',
    createdAt: new Date(),
    creditedAt: new Date(),
  };

  if (existing?._id) {
    await db.collection('influencer_commissions').updateOne(
      { _id: existing._id },
      { $set: { status: 'credited', creditedAt: new Date(), commissionAmount: amount } }
    );
  } else {
    await db.collection('influencer_commissions').insertOne(commissionDoc);
  }

  await creditInfluencerWallet({
    influencerId: order.referral.influencerId.toString(),
    amount,
    type: 'commission',
    orderId,
    orderNumber: order.orderNumber,
    note: `Referral commission ${settings.commissionRate}% on order ${order.orderNumber}`,
  });

  await db.collection('orders').updateOne(
    { _id: new ObjectId(orderId) },
    {
      $set: {
        'referral.commissionStatus': 'credited',
        'referral.commissionAmount': amount,
        'referral.commissionRate': settings.commissionRate,
        'referral.creditedAt': new Date(),
        updatedAt: new Date(),
      },
    }
  );
}

export async function reverseInfluencerCommissionFromOrder(orderId: string) {
  const { db } = await connectToDatabase();
  const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });
  if (!order) return;

  await refundWalletSpend(order);

  const commission = await db.collection('influencer_commissions').findOne({
    orderId: new ObjectId(orderId),
    status: 'credited',
  });
  if (!commission) return;

  await db.collection('influencer_commissions').updateOne(
    { _id: commission._id },
    { $set: { status: 'reversed', reversedAt: new Date() } }
  );

  await creditInfluencerWallet({
    influencerId: commission.influencerId.toString(),
    amount: -roundMoney(commission.commissionAmount),
    type: 'refund',
    orderId,
    orderNumber: order.orderNumber,
    note: `Commission reversed for ${order.orderNumber}`,
  });

  await db.collection('orders').updateOne(
    { _id: new ObjectId(orderId) },
    {
      $set: {
        'referral.commissionStatus': 'reversed',
        updatedAt: new Date(),
      },
    }
  );
}

export async function getInfluencerDashboard(customerId: string) {
  const { db } = await connectToDatabase();
  const influencer = await db.collection('customers').findOne({ _id: new ObjectId(customerId) });
  if (!influencer) throw new Error('Customer not found');

  const settings = await getInfluencerSettings();
  const influencerOid = new ObjectId(customerId);

  const [referrals, referralOrders, commissions, withdrawals, transactions, pendingWithdrawals] = await Promise.all([
    db.collection('customers').countDocuments({ referredBy: influencerOid }),
    db.collection('orders').find({
      $or: [
        { 'referral.influencerId': customerId },
        { 'referral.influencerId': influencerOid },
      ],
    }).sort({ createdAt: -1 }).limit(50).toArray(),
    db.collection('influencer_commissions').find({ influencerId: influencerOid }).sort({ createdAt: -1 }).limit(50).toArray(),
    db.collection('influencer_withdrawals').find({ influencerId: influencerOid }).sort({ requestedAt: -1 }).limit(50).toArray(),
    db.collection('influencer_wallet_transactions').find({ customerId: influencerOid }).sort({ createdAt: -1 }).limit(50).toArray(),
    db.collection('influencer_withdrawals').aggregate([
      { $match: { influencerId: influencerOid, status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).toArray(),
  ]);

  const pendingWithdrawalAmount = roundMoney(pendingWithdrawals[0]?.total || 0);
  const walletBalance = roundMoney(influencer.influencerWalletBalance || 0);

  return {
    influencer: serializeInfluencer(influencer),
    settings: {
      commissionRate: settings.commissionRate,
      minWithdrawal: settings.minWithdrawal,
      firstOrderOnly: settings.firstOrderOnly,
      enabled: settings.enabled,
    },
    stats: {
      totalReferrals: referrals,
      totalReferralOrders: referralOrders.length,
      commissionEarned: roundMoney(influencer.influencerTotalEarned || 0),
      walletBalance,
      availableBalance: roundMoney(Math.max(0, walletBalance - pendingWithdrawalAmount)),
      pendingWithdrawals: pendingWithdrawalAmount,
      totalWithdrawn: roundMoney(influencer.influencerTotalWithdrawn || 0),
    },
    referralOrders: referralOrders.map(order => ({
      _id: order._id.toString(),
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      total: order.pricing?.total || 0,
      orderStatus: order.orderStatus,
      commissionStatus: order.referral?.commissionStatus || 'pending',
      commissionAmount: order.referral?.commissionAmount || 0,
      createdAt: order.createdAt,
    })),
    commissions,
    withdrawals,
    transactions,
  };
}

export async function createInfluencerWithdrawal(options: {
  customerId: string;
  amount: number;
  requestNote?: string;
  accountDetails?: InfluencerBankDetails;
}) {
  const settings = await getInfluencerSettings();
  const amount = roundMoney(options.amount);
  if (amount < settings.minWithdrawal) {
    throw new Error(`Minimum withdrawal is ₹${settings.minWithdrawal}`);
  }

  const dashboard = await getInfluencerDashboard(options.customerId);
  if (!dashboard.influencer.isInfluencer || dashboard.influencer.influencerStatus !== 'active') {
    throw new Error('Only active influencers can withdraw');
  }
  if (amount > dashboard.stats.availableBalance) {
    throw new Error(`Available balance is ₹${dashboard.stats.availableBalance.toFixed(2)}`);
  }

  const details = options.accountDetails || dashboard.influencer.bankDetails || {};
  const hasBank = details.accountNumber && details.ifscCode && details.accountHolderName;
  const hasUpi = details.upiId;
  if (!hasBank && !hasUpi) {
    throw new Error('Add bank account or UPI details before withdrawing');
  }

  const { db } = await connectToDatabase();
  const result = await db.collection('influencer_withdrawals').insertOne({
    type: 'influencer',
    influencerId: new ObjectId(options.customerId),
    influencerName: dashboard.influencer.name,
    influencerEmail: dashboard.influencer.email,
    amount,
    status: 'pending',
    requestNote: options.requestNote || '',
    requestedAt: new Date(),
    accountDetails: details,
  } as InfluencerWithdrawal);

  if (details.accountHolderName || details.upiId) {
    await db.collection('customers').updateOne(
      { _id: new ObjectId(options.customerId) },
      { $set: { influencerBankDetails: details, updatedAt: new Date() } }
    );
  }

  return result.insertedId.toString();
}

export async function processInfluencerWithdrawal(
  withdrawalId: string,
  status: 'approved' | 'rejected',
  adminNote?: string,
  processedBy?: string
) {
  const { db } = await connectToDatabase();
  const withdrawal = await db.collection('influencer_withdrawals').findOne({ _id: new ObjectId(withdrawalId) });
  if (!withdrawal) throw new Error('Withdrawal not found');
  if (withdrawal.status !== 'pending') throw new Error(`Withdrawal is already ${withdrawal.status}`);

  await db.collection('influencer_withdrawals').updateOne(
    { _id: new ObjectId(withdrawalId) },
    {
      $set: {
        status,
        adminNote: adminNote || '',
        processedAt: new Date(),
        processedBy: processedBy && ObjectId.isValid(processedBy) ? new ObjectId(processedBy) : processedBy,
      },
    }
  );

  if (status === 'approved') {
    const influencer = await db.collection('customers').findOne({ _id: new ObjectId(withdrawal.influencerId.toString()) });
    const balance = roundMoney(influencer?.influencerWalletBalance || 0);
    if (balance < withdrawal.amount) {
      throw new Error('Influencer wallet no longer has sufficient balance');
    }
    await db.collection('customers').updateOne(
      { _id: new ObjectId(withdrawal.influencerId.toString()) },
      {
        $inc: {
          influencerWalletBalance: -withdrawal.amount,
          influencerTotalWithdrawn: withdrawal.amount,
        },
        $set: { updatedAt: new Date() },
      }
    );
    const updated = await db.collection('customers').findOne({ _id: new ObjectId(withdrawal.influencerId.toString()) });
    await db.collection('influencer_wallet_transactions').insertOne({
      customerId: new ObjectId(withdrawal.influencerId.toString()),
      type: 'withdrawal',
      amount: -withdrawal.amount,
      balanceAfter: roundMoney(updated?.influencerWalletBalance || 0),
      withdrawalId: new ObjectId(withdrawalId),
      note: 'Withdrawal paid to bank/UPI',
      createdAt: new Date(),
    });
  }

  return { success: true };
}

export async function addManualCommission(options: {
  influencerId: string;
  amount: number;
  note?: string;
  createdBy?: string;
}) {
  const amount = roundMoney(options.amount);
  if (amount <= 0) throw new Error('Amount must be greater than 0');

  const { db } = await connectToDatabase();
  const influencer = await db.collection('customers').findOne({
    _id: new ObjectId(options.influencerId),
    isInfluencer: true,
  });
  if (!influencer) throw new Error('Influencer not found');

  await db.collection('influencer_commissions').insertOne({
    influencerId: new ObjectId(options.influencerId),
    referredCustomerId: new ObjectId(options.influencerId),
    orderId: new ObjectId(),
    orderNumber: 'MANUAL',
    orderAmount: amount,
    commissionRate: 0,
    commissionAmount: amount,
    status: 'credited',
    type: 'manual',
    note: options.note || 'Manual commission settlement',
    createdBy: options.createdBy,
    createdAt: new Date(),
    creditedAt: new Date(),
  } as InfluencerCommission);

  await creditInfluencerWallet({
    influencerId: options.influencerId,
    amount,
    type: 'manual',
    note: options.note || 'Manual commission settlement',
  });
}

export async function listInfluencers() {
  const { db } = await connectToDatabase();
  const influencers = await db.collection('customers').find({ isInfluencer: true }).sort({ influencerJoinedAt: -1 }).toArray();
  const withStats = await Promise.all(
    influencers.map(async customer => {
      const referrals = await db.collection('customers').countDocuments({ referredBy: customer._id });
      const orders = await db.collection('orders').countDocuments({
        $or: [
          { 'referral.influencerId': customer._id.toString() },
          { 'referral.influencerId': customer._id },
        ],
      });
      return {
        ...serializeInfluencer(customer),
        totalReferrals: referrals,
        totalReferralOrders: orders,
      };
    })
  );
  return withStats;
}
