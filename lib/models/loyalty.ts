import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const LOYALTY_REF_STORAGE_KEY = 'tryvvo_loyalty_ref';

export interface LoyaltySettings {
  enabled: boolean;
  /** Points earned per ₹1 of eligible order amount */
  pointsPerRupee: number;
  /** ₹ value of 1 point when redeeming at checkout */
  rupeePerPoint: number;
  /** Minimum points required to redeem */
  minRedeemPoints: number;
  /** Flat points for an approved product review */
  reviewPoints: number;
  /** Extra points when review includes photos */
  reviewPhotoBonusPoints: number;
  /** Points to referrer when referred friend places first delivered order */
  referralReferrerPoints: number;
  /** Welcome points to new customer after first delivered order via loyalty referral */
  referralRefereePoints: number;
  creditOnStatus: 'delivered' | 'completed';
  minOrderAmount: number;
  /** Product IDs that can be unlocked / bought with points only */
  exclusiveProductIds: string[];
  /** Points cost to unlock exclusive checkout (0 = just need any balance) */
  exclusiveUnlockPoints: number;
}

export const DEFAULT_LOYALTY_SETTINGS: LoyaltySettings = {
  enabled: true,
  pointsPerRupee: 0.1, // 1 point per ₹10
  rupeePerPoint: 0.1, // 10 points = ₹1
  minRedeemPoints: 100,
  reviewPoints: 50,
  reviewPhotoBonusPoints: 25,
  referralReferrerPoints: 200,
  referralRefereePoints: 100,
  creditOnStatus: 'delivered',
  minOrderAmount: 1,
  exclusiveProductIds: [],
  exclusiveUnlockPoints: 0,
};

export type LoyaltyTxnType =
  | 'purchase'
  | 'review'
  | 'referral_referrer'
  | 'referral_referee'
  | 'redeem'
  | 'adjust'
  | 'reverse'
  | 'exclusive_unlock';

export interface LoyaltyTransaction {
  _id?: string | ObjectId;
  customerId: string | ObjectId;
  type: LoyaltyTxnType;
  points: number;
  balanceAfter: number;
  orderId?: string | ObjectId;
  orderNumber?: string;
  reviewId?: string | ObjectId;
  productId?: string | ObjectId;
  relatedCustomerId?: string | ObjectId;
  note?: string;
  createdBy?: string;
  createdAt: Date;
}

function roundPoints(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function getLoyaltySiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw && /^https?:\/\//i.test(raw)) {
    return raw.replace(/\/$/, '');
  }
  return 'https://www.tryvvo.com';
}

export function buildLoyaltyReferralLink(code: string): string {
  return `${getLoyaltySiteUrl()}/?lref=${encodeURIComponent(code)}`;
}

export async function getLoyaltySettings(): Promise<LoyaltySettings> {
  const { db } = await connectToDatabase();
  const doc = await db.collection('loyalty_settings').findOne({});
  const exclusive = Array.isArray(doc?.exclusiveProductIds)
    ? doc.exclusiveProductIds.map((id: any) => id.toString())
    : [];
  return {
    ...DEFAULT_LOYALTY_SETTINGS,
    ...(doc || {}),
    pointsPerRupee: Number(doc?.pointsPerRupee ?? DEFAULT_LOYALTY_SETTINGS.pointsPerRupee),
    rupeePerPoint: Number(doc?.rupeePerPoint ?? DEFAULT_LOYALTY_SETTINGS.rupeePerPoint),
    minRedeemPoints: Number(doc?.minRedeemPoints ?? DEFAULT_LOYALTY_SETTINGS.minRedeemPoints),
    reviewPoints: Number(doc?.reviewPoints ?? DEFAULT_LOYALTY_SETTINGS.reviewPoints),
    reviewPhotoBonusPoints: Number(
      doc?.reviewPhotoBonusPoints ?? DEFAULT_LOYALTY_SETTINGS.reviewPhotoBonusPoints
    ),
    referralReferrerPoints: Number(
      doc?.referralReferrerPoints ?? DEFAULT_LOYALTY_SETTINGS.referralReferrerPoints
    ),
    referralRefereePoints: Number(
      doc?.referralRefereePoints ?? DEFAULT_LOYALTY_SETTINGS.referralRefereePoints
    ),
    minOrderAmount: Number(doc?.minOrderAmount ?? DEFAULT_LOYALTY_SETTINGS.minOrderAmount),
    exclusiveUnlockPoints: Number(
      doc?.exclusiveUnlockPoints ?? DEFAULT_LOYALTY_SETTINGS.exclusiveUnlockPoints
    ),
    enabled: doc?.enabled !== false,
    creditOnStatus: doc?.creditOnStatus === 'completed' ? 'completed' : 'delivered',
    exclusiveProductIds: exclusive,
  };
}

export async function saveLoyaltySettings(
  input: Partial<LoyaltySettings>
): Promise<LoyaltySettings> {
  const { db } = await connectToDatabase();
  const current = await getLoyaltySettings();
  const next: LoyaltySettings = {
    ...current,
    ...input,
    pointsPerRupee: Math.max(0, Number(input.pointsPerRupee ?? current.pointsPerRupee)),
    rupeePerPoint: Math.max(0, Number(input.rupeePerPoint ?? current.rupeePerPoint)),
    minRedeemPoints: Math.max(0, Number(input.minRedeemPoints ?? current.minRedeemPoints)),
    reviewPoints: Math.max(0, Number(input.reviewPoints ?? current.reviewPoints)),
    reviewPhotoBonusPoints: Math.max(
      0,
      Number(input.reviewPhotoBonusPoints ?? current.reviewPhotoBonusPoints)
    ),
    referralReferrerPoints: Math.max(
      0,
      Number(input.referralReferrerPoints ?? current.referralReferrerPoints)
    ),
    referralRefereePoints: Math.max(
      0,
      Number(input.referralRefereePoints ?? current.referralRefereePoints)
    ),
    minOrderAmount: Math.max(0, Number(input.minOrderAmount ?? current.minOrderAmount)),
    exclusiveUnlockPoints: Math.max(
      0,
      Number(input.exclusiveUnlockPoints ?? current.exclusiveUnlockPoints)
    ),
    enabled: input.enabled !== undefined ? Boolean(input.enabled) : current.enabled,
    creditOnStatus: input.creditOnStatus === 'completed' ? 'completed' : 'delivered',
    exclusiveProductIds: Array.isArray(input.exclusiveProductIds)
      ? input.exclusiveProductIds.map(String)
      : current.exclusiveProductIds,
  };
  await db.collection('loyalty_settings').updateOne(
    {},
    { $set: { ...next, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );
  return next;
}

function makeLoyaltyCode(seed: string): string {
  const clean = seed.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4) || 'TRYV';
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LOY${clean}${rand}`.slice(0, 12);
}

export async function ensureLoyaltyReferralCode(customerId: string): Promise<string> {
  const { db } = await connectToDatabase();
  const customer = await db.collection('customers').findOne({ _id: new ObjectId(customerId) });
  if (!customer) throw new Error('Customer not found');
  if (customer.loyaltyReferralCode) return customer.loyaltyReferralCode as string;

  let code = makeLoyaltyCode(customer.name || customer.email || 'USER');
  for (let i = 0; i < 5; i++) {
    const exists = await db.collection('customers').findOne({ loyaltyReferralCode: code });
    if (!exists) break;
    code = makeLoyaltyCode(`${customer.name || 'U'}${i}`);
  }

  await db.collection('customers').updateOne(
    { _id: new ObjectId(customerId) },
    {
      $set: {
        loyaltyReferralCode: code,
        rewardPoints: Number(customer.rewardPoints || 0),
        loyaltyTotalEarned: Number(customer.loyaltyTotalEarned || 0),
        loyaltyTotalRedeemed: Number(customer.loyaltyTotalRedeemed || 0),
        updatedAt: new Date(),
      },
    }
  );
  return code;
}

export async function attachLoyaltyReferralToCustomer(customerId: string, code: string) {
  if (!code?.trim()) return false;
  const { db } = await connectToDatabase();
  const customer = await db.collection('customers').findOne({ _id: new ObjectId(customerId) });
  if (!customer) return false;
  if (customer.loyaltyReferredBy) return false;

  const referrer = await db.collection('customers').findOne({
    loyaltyReferralCode: code.trim().toUpperCase(),
  });
  if (!referrer) return false;
  if (referrer._id.toString() === customerId) return false;

  await db.collection('customers').updateOne(
    { _id: new ObjectId(customerId) },
    {
      $set: {
        loyaltyReferredBy: referrer._id,
        loyaltyReferralCodeAttachedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );
  return true;
}

export async function creditLoyaltyPoints(options: {
  customerId: string;
  points: number;
  type: LoyaltyTxnType;
  orderId?: string;
  orderNumber?: string;
  reviewId?: string;
  productId?: string;
  relatedCustomerId?: string;
  note?: string;
  createdBy?: string;
}): Promise<number> {
  const points = roundPoints(options.points);
  if (points === 0) return 0;

  const { db } = await connectToDatabase();
  const inc: Record<string, number> = { rewardPoints: points };
  if (points > 0 && options.type !== 'adjust') {
    inc.loyaltyTotalEarned = points;
  }
  if (points < 0 && (options.type === 'redeem' || options.type === 'exclusive_unlock')) {
    inc.loyaltyTotalRedeemed = Math.abs(points);
  }

  const result = await db.collection('customers').findOneAndUpdate(
    { _id: new ObjectId(options.customerId) },
    { $inc: inc, $set: { updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
  const updated = (result as any)?.value || result;
  const balanceAfter = roundPoints(updated?.rewardPoints || 0);

  await db.collection('loyalty_transactions').insertOne({
    customerId: new ObjectId(options.customerId),
    type: options.type,
    points,
    balanceAfter,
    orderId: options.orderId ? new ObjectId(options.orderId) : undefined,
    orderNumber: options.orderNumber,
    reviewId: options.reviewId ? new ObjectId(options.reviewId) : undefined,
    productId: options.productId ? new ObjectId(options.productId) : undefined,
    relatedCustomerId: options.relatedCustomerId
      ? new ObjectId(options.relatedCustomerId)
      : undefined,
    note: options.note,
    createdBy: options.createdBy,
    createdAt: new Date(),
  } as any);

  return balanceAfter;
}

export async function getLoyaltyBalance(customerId: string): Promise<number> {
  const { db } = await connectToDatabase();
  const customer = await db.collection('customers').findOne({ _id: new ObjectId(customerId) });
  return roundPoints(customer?.rewardPoints || 0);
}

export function pointsToRupeeDiscount(points: number, settings: LoyaltySettings): number {
  return roundMoney(Math.max(0, points) * settings.rupeePerPoint);
}

export function maxRedeemablePoints(
  availablePoints: number,
  orderPayable: number,
  settings: LoyaltySettings
): number {
  if (!settings.enabled || availablePoints < settings.minRedeemPoints) return 0;
  if (settings.rupeePerPoint <= 0 || orderPayable <= 0) return 0;
  const maxByOrder = Math.floor(orderPayable / settings.rupeePerPoint);
  return Math.max(0, Math.min(availablePoints, maxByOrder));
}

export async function processLoyaltyPurchaseFromOrder(orderId: string) {
  const settings = await getLoyaltySettings();
  if (!settings.enabled) return;

  const { db } = await connectToDatabase();
  const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });
  if (!order?.customerId) return;
  if (order.loyalty?.purchaseCredited) return;
  if (['cancelled', 'returned', 'refunded'].includes(order.orderStatus)) return;

  const eligible =
    settings.creditOnStatus === 'completed'
      ? ['completed']
      : ['delivered', 'completed'];
  if (!eligible.includes(order.orderStatus)) return;

  const base = roundMoney((order.pricing?.subtotal || 0) - (order.pricing?.discount || 0));
  if (base < settings.minOrderAmount) return;

  const points = roundPoints(base * settings.pointsPerRupee);
  if (points <= 0) return;

  const customerId = order.customerId.toString();
  await creditLoyaltyPoints({
    customerId,
    points,
    type: 'purchase',
    orderId,
    orderNumber: order.orderNumber,
    note: `Earned ${points} pts on order ${order.orderNumber}`,
  });

  await db.collection('orders').updateOne(
    { _id: new ObjectId(orderId) },
    {
      $set: {
        'loyalty.purchaseCredited': true,
        'loyalty.purchasePoints': points,
        updatedAt: new Date(),
      },
    }
  );

  // Dual-sided loyalty referral on first delivered order
  await processLoyaltyReferralRewards(customerId, orderId, order.orderNumber);
}

async function processLoyaltyReferralRewards(
  customerId: string,
  orderId: string,
  orderNumber?: string
) {
  const settings = await getLoyaltySettings();
  if (!settings.enabled) return;

  const { db } = await connectToDatabase();
  const customer = await db.collection('customers').findOne({ _id: new ObjectId(customerId) });
  if (!customer?.loyaltyReferredBy) return;
  if (customer.loyaltyReferralRewarded) return;

  // Only first delivered order counts
  const priorDelivered = await db.collection('orders').countDocuments({
    customerId: new ObjectId(customerId),
    orderStatus: { $in: ['delivered', 'completed'] },
    _id: { $ne: new ObjectId(orderId) },
  });
  if (priorDelivered > 0) return;

  const referrerId = customer.loyaltyReferredBy.toString();
  if (referrerId === customerId) return;

  if (settings.referralReferrerPoints > 0) {
    await creditLoyaltyPoints({
      customerId: referrerId,
      points: settings.referralReferrerPoints,
      type: 'referral_referrer',
      orderId,
      orderNumber,
      relatedCustomerId: customerId,
      note: `Referral reward for inviting customer (order ${orderNumber})`,
    });
  }

  if (settings.referralRefereePoints > 0) {
    await creditLoyaltyPoints({
      customerId,
      points: settings.referralRefereePoints,
      type: 'referral_referee',
      orderId,
      orderNumber,
      relatedCustomerId: referrerId,
      note: `Welcome referral bonus (order ${orderNumber})`,
    });
  }

  await db.collection('customers').updateOne(
    { _id: new ObjectId(customerId) },
    { $set: { loyaltyReferralRewarded: true, updatedAt: new Date() } }
  );
}

export async function reverseLoyaltyPurchaseFromOrder(orderId: string) {
  const { db } = await connectToDatabase();
  const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });
  if (!order?.customerId || !order.loyalty?.purchaseCredited) return;
  if (order.loyalty?.purchaseReversed) return;

  const points = Number(order.loyalty.purchasePoints || 0);
  if (points > 0) {
    await creditLoyaltyPoints({
      customerId: order.customerId.toString(),
      points: -points,
      type: 'reverse',
      orderId,
      orderNumber: order.orderNumber,
      note: `Reversed purchase points for order ${order.orderNumber}`,
    });
  }

  // Refund redeemed points if any
  const redeemed = Number(order.loyalty?.pointsRedeemed || 0);
  if (redeemed > 0) {
    await creditLoyaltyPoints({
      customerId: order.customerId.toString(),
      points: redeemed,
      type: 'adjust',
      orderId,
      orderNumber: order.orderNumber,
      note: `Refunded redeemed points for cancelled/returned order ${order.orderNumber}`,
    });
  }

  await db.collection('orders').updateOne(
    { _id: new ObjectId(orderId) },
    {
      $set: {
        'loyalty.purchaseReversed': true,
        updatedAt: new Date(),
      },
    }
  );
}

export async function processLoyaltyReviewReward(options: {
  customerId: string;
  reviewId: string;
  productId: string;
  photoCount?: number;
}) {
  const settings = await getLoyaltySettings();
  if (!settings.enabled || settings.reviewPoints <= 0) return 0;

  const { db } = await connectToDatabase();
  const existing = await db.collection('loyalty_transactions').findOne({
    customerId: new ObjectId(options.customerId),
    type: 'review',
    reviewId: new ObjectId(options.reviewId),
  });
  if (existing) return 0;

  // One review reward per product
  const priorProduct = await db.collection('loyalty_transactions').findOne({
    customerId: new ObjectId(options.customerId),
    type: 'review',
    productId: new ObjectId(options.productId),
  });
  if (priorProduct) return 0;

  let points = settings.reviewPoints;
  if ((options.photoCount || 0) > 0) {
    points += settings.reviewPhotoBonusPoints;
  }

  await creditLoyaltyPoints({
    customerId: options.customerId,
    points,
    type: 'review',
    reviewId: options.reviewId,
    productId: options.productId,
    note: `Review reward${(options.photoCount || 0) > 0 ? ' (+photo bonus)' : ''}`,
  });
  return points;
}

export async function redeemLoyaltyPointsForOrder(options: {
  customerId: string;
  points: number;
  orderId: string;
  orderNumber?: string;
}): Promise<{ points: number; discount: number }> {
  const settings = await getLoyaltySettings();
  if (!settings.enabled) throw new Error('Loyalty program is disabled');

  const points = Math.floor(Number(options.points) || 0);
  if (points < settings.minRedeemPoints) {
    throw new Error(`Minimum ${settings.minRedeemPoints} points required to redeem`);
  }

  const balance = await getLoyaltyBalance(options.customerId);
  if (points > balance) throw new Error('Insufficient reward points');

  const discount = pointsToRupeeDiscount(points, settings);
  await creditLoyaltyPoints({
    customerId: options.customerId,
    points: -points,
    type: 'redeem',
    orderId: options.orderId,
    orderNumber: options.orderNumber,
    note: `Redeemed ${points} pts (₹${discount.toFixed(2)}) on order ${options.orderNumber || options.orderId}`,
  });

  return { points, discount };
}

export async function getLoyaltyDashboard(customerId: string) {
  const settings = await getLoyaltySettings();
  const { db } = await connectToDatabase();
  const code = await ensureLoyaltyReferralCode(customerId);
  const customer = await db.collection('customers').findOne({ _id: new ObjectId(customerId) });

  const transactions = await db
    .collection('loyalty_transactions')
    .find({ customerId: new ObjectId(customerId) })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();

  const exclusiveIds = settings.exclusiveProductIds || [];
  let exclusiveProducts: any[] = [];
  if (exclusiveIds.length > 0) {
    exclusiveProducts = await db
      .collection('products')
      .find({
        _id: { $in: exclusiveIds.filter(ObjectId.isValid).map(id => new ObjectId(id)) },
        status: 'active',
      })
      .project({ name: 1, slug: 1, price: 1, images: 1, thumbnail: 1 })
      .limit(24)
      .toArray();
  }

  const balance = roundPoints(customer?.rewardPoints || 0);

  return {
    settings: {
      enabled: settings.enabled,
      pointsPerRupee: settings.pointsPerRupee,
      rupeePerPoint: settings.rupeePerPoint,
      minRedeemPoints: settings.minRedeemPoints,
      reviewPoints: settings.reviewPoints,
      reviewPhotoBonusPoints: settings.reviewPhotoBonusPoints,
      referralReferrerPoints: settings.referralReferrerPoints,
      referralRefereePoints: settings.referralRefereePoints,
      exclusiveUnlockPoints: settings.exclusiveUnlockPoints,
    },
    balance,
    totalEarned: roundPoints(customer?.loyaltyTotalEarned || 0),
    totalRedeemed: roundPoints(customer?.loyaltyTotalRedeemed || 0),
    rupeeValue: pointsToRupeeDiscount(balance, settings),
    referralCode: code,
    referralLink: buildLoyaltyReferralLink(code),
    transactions: transactions.map(t => ({
      ...t,
      _id: t._id?.toString(),
      customerId: t.customerId?.toString(),
      orderId: t.orderId?.toString(),
      reviewId: t.reviewId?.toString(),
      productId: t.productId?.toString(),
    })),
    exclusiveProducts: exclusiveProducts.map(p => ({
      ...p,
      _id: p._id.toString(),
    })),
  };
}
