import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';

export type AdType = 'featured_product' | 'banner';
export type AdStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'ended';

export interface AdPlacement {
  key: string;
  name: string;
  type: AdType;
  description: string;
  pricePerDay: number;
  slots: number;
  minDays: number;
  maxDays: number;
  active: boolean;
  bannerSize?: string;
}

export const DEFAULT_PLACEMENTS: AdPlacement[] = [
  {
    key: 'home_sponsored',
    name: 'Home page – Sponsored products',
    type: 'featured_product',
    description: 'Product card in the Sponsored row on the home page.',
    pricePerDay: 199,
    slots: 8,
    minDays: 1,
    maxDays: 30,
    active: true,
  },
  {
    key: 'listing_sponsored',
    name: 'Product listing – Sponsored',
    type: 'featured_product',
    description: 'Product card above the results on the product listing and search page.',
    pricePerDay: 149,
    slots: 4,
    minDays: 1,
    maxDays: 30,
    active: true,
  },
  {
    key: 'home_banner',
    name: 'Home page – Banner',
    type: 'banner',
    description: 'Wide banner below the home page hero.',
    pricePerDay: 499,
    slots: 3,
    minDays: 1,
    maxDays: 30,
    active: true,
    bannerSize: '1600 × 400 px',
  },
  {
    key: 'listing_banner',
    name: 'Product listing – Top banner',
    type: 'banner',
    description: 'Wide banner at the top of the product listing and search page.',
    pricePerDay: 299,
    slots: 2,
    minDays: 1,
    maxDays: 30,
    active: true,
    bannerSize: '1600 × 300 px',
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BANNER_LENGTH = 2_000_000;

export function indiaToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export function addDays(day: string, count: number) {
  const [year, month, date] = day.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, date) + count * DAY_MS);
  return next.toISOString().slice(0, 10);
}

function idVariants(id: string) {
  return ObjectId.isValid(id) ? [id, new ObjectId(id)] : [id];
}

function money(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export async function ensurePlacements() {
  const { db } = await connectToDatabase();
  const existing = await db.collection('ad_placements').countDocuments();
  if (existing > 0) return;
  await db.collection('ad_placements').insertMany(
    DEFAULT_PLACEMENTS.map(placement => ({ ...placement, createdAt: new Date(), updatedAt: new Date() }))
  );
}

export async function listPlacements(activeOnly = false) {
  await ensurePlacements();
  const { db } = await connectToDatabase();
  const docs = await db
    .collection('ad_placements')
    .find(activeOnly ? { active: true } : {})
    .sort({ type: 1, pricePerDay: -1 })
    .toArray();
  return docs.map(doc => ({ ...doc, _id: doc._id.toString() })) as unknown as Array<AdPlacement & { _id: string }>;
}

async function pendingWithdrawals(vendorId: string) {
  const { db } = await connectToDatabase();
  const rows = await db
    .collection('withdrawals')
    .aggregate([
      { $match: { vendorId: { $in: idVariants(vendorId) }, status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ])
    .toArray();
  return money(rows[0]?.total || 0);
}

export async function getVendorAdWallet(vendorId: string) {
  const { db } = await connectToDatabase();
  const vendor = await db.collection('vendors').findOne({ _id: new ObjectId(vendorId) }, { projection: { walletBalance: 1, storeName: 1 } });
  const pending = await pendingWithdrawals(vendorId);
  const balance = money(vendor?.walletBalance || 0);
  return { balance, pendingWithdrawals: pending, available: money(Math.max(0, balance - pending)), storeName: vendor?.storeName || '' };
}

export async function createBooking(
  vendorId: string,
  input: {
    placementKey: string;
    productId?: string;
    bannerImage?: string;
    bannerTitle?: string;
    bannerLink?: string;
    startDate: string;
    days: number;
    paymentMethod: 'wallet' | 'offline';
  }
) {
  if (!ObjectId.isValid(vendorId)) throw new Error('Vendor account not found');
  const { db } = await connectToDatabase();
  const placements = await listPlacements(true);
  const placement = placements.find(item => item.key === input.placementKey);
  if (!placement) throw new Error('This ad placement is not available');

  const days = Math.floor(Number(input.days));
  if (!Number.isFinite(days) || days < placement.minDays || days > placement.maxDays) {
    throw new Error(`Choose between ${placement.minDays} and ${placement.maxDays} days`);
  }
  const today = indiaToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate || '') || input.startDate < today) {
    throw new Error('Start date must be today or later');
  }
  const startDate = input.startDate;
  const endDate = addDays(startDate, days - 1);

  const vendor = await db.collection('vendors').findOne({ _id: new ObjectId(vendorId) }, { projection: { storeName: 1, email: 1 } });
  if (!vendor) throw new Error('Vendor account not found');

  const booking: Record<string, unknown> = {
    vendorId,
    vendorName: vendor.storeName || vendor.email || 'Vendor',
    placementKey: placement.key,
    placementName: placement.name,
    type: placement.type,
    startDate,
    endDate,
    days,
    pricePerDay: placement.pricePerDay,
    amount: money(placement.pricePerDay * days),
    paymentMethod: input.paymentMethod === 'wallet' ? 'wallet' : 'offline',
    paymentStatus: 'unpaid',
    status: 'pending' as AdStatus,
    impressions: 0,
    clicks: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let product: any = null;
  if (input.productId) {
    if (!ObjectId.isValid(input.productId)) throw new Error('Product not found');
    product = await db.collection('products').findOne({
      _id: new ObjectId(input.productId),
      vendorId: { $in: idVariants(vendorId) },
    });
    if (!product) throw new Error('Pick one of your own products');
    booking.productId = product._id.toString();
    booking.productName = product.name;
    booking.productSlug = product.urlSlug || '';
  }

  if (placement.type === 'featured_product') {
    if (!product) throw new Error('Pick the product to feature');
    if (!['active', 'Active', 'published', 'Published'].includes(String(product.status || ''))) {
      throw new Error('Only a live (active) product can be featured');
    }
  } else {
    const image = String(input.bannerImage || '');
    if (!image) throw new Error('Upload a banner image');
    if (image.length > MAX_BANNER_LENGTH) throw new Error('Banner image is too large. Keep it under 1.5 MB');
    if (!/^(data:image\/|https:\/\/)/.test(image)) throw new Error('Banner image must be an uploaded image');
    const link = String(input.bannerLink || '').trim();
    if (link && !link.startsWith('/') && !link.startsWith('https://www.tryvvo.com')) {
      throw new Error('Banner link must be a tryvvo.com page, for example /products/your-item');
    }
    booking.banner = {
      imageUrl: image,
      title: String(input.bannerTitle || '').trim().slice(0, 80),
      link: link || (product ? `/products/${product.urlSlug || product._id.toString()}` : '/products'),
    };
  }

  const overlapping = await db.collection('ad_bookings').countDocuments({
    placementKey: placement.key,
    status: { $in: ['pending', 'approved'] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  });
  if (overlapping >= placement.slots) {
    throw new Error('All slots for this placement are booked for those dates. Try other dates.');
  }

  if (booking.paymentMethod === 'wallet') {
    const pending = await pendingWithdrawals(vendorId);
    const amount = booking.amount as number;
    const charged = await db.collection('vendors').updateOne(
      { _id: new ObjectId(vendorId), walletBalance: { $gte: amount + pending } },
      { $inc: { walletBalance: -amount, totalAdSpend: amount }, $set: { updatedAt: new Date() } }
    );
    if (!charged.modifiedCount) throw new Error('Not enough wallet balance. Choose Pay offline or a shorter booking.');
    booking.paymentStatus = 'paid';
    booking.paidAt = new Date();
  }

  const result = await db.collection('ad_bookings').insertOne(booking);
  return result.insertedId.toString();
}

export function liveState(booking: { status: string; startDate: string; endDate: string }, today = indiaToday()) {
  if (booking.status !== 'approved') return booking.status;
  if (today < booking.startDate) return 'scheduled';
  if (today > booking.endDate) return 'completed';
  return 'live';
}

export async function listVendorBookings(vendorId: string) {
  const { db } = await connectToDatabase();
  const docs = await db
    .collection('ad_bookings')
    .find({ vendorId }, { projection: { 'banner.imageUrl': 0 } })
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();
  const today = indiaToday();
  return docs.map(doc => ({
    ...doc,
    _id: doc._id.toString(),
    state: liveState(doc as any, today),
  }));
}

export async function cancelVendorBooking(vendorId: string, bookingId: string) {
  if (!ObjectId.isValid(bookingId)) throw new Error('Booking not found');
  const { db } = await connectToDatabase();
  const booking = await db.collection('ad_bookings').findOneAndUpdate(
    { _id: new ObjectId(bookingId), vendorId, status: 'pending' },
    { $set: { status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date() } },
    { returnDocument: 'before' }
  );
  const doc = (booking as any)?.value ?? booking;
  if (!doc) throw new Error('Only a pending booking can be cancelled');
  if (doc.paymentMethod === 'wallet' && doc.paymentStatus === 'paid') {
    await db.collection('vendors').updateOne(
      { _id: new ObjectId(vendorId) },
      { $inc: { walletBalance: doc.amount, totalAdSpend: -doc.amount }, $set: { updatedAt: new Date() } }
    );
    await db.collection('ad_bookings').updateOne(
      { _id: doc._id },
      { $set: { paymentStatus: 'refunded', refundedAt: new Date() } }
    );
  }
}
