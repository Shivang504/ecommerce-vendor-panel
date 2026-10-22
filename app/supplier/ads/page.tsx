'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Placement = {
  _id: string;
  key: string;
  name: string;
  type: 'featured_product' | 'banner';
  description: string;
  pricePerDay: number;
  slots: number;
  minDays: number;
  maxDays: number;
  bannerSize?: string;
};

type Booking = {
  _id: string;
  placementName: string;
  type: string;
  productName?: string;
  banner?: { title?: string; link?: string };
  startDate: string;
  endDate: string;
  days: number;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  state: string;
  adminNote?: string;
  impressions?: number;
  clicks?: number;
};

type Product = { _id: string; name: string; status?: string };

const MAX_BANNER_BYTES = 1.5 * 1024 * 1024;

function inr(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function stateTone(state: string) {
  if (state === 'live') return 'bg-emerald-100 text-emerald-700';
  if (state === 'scheduled') return 'bg-sky-100 text-sky-700';
  if (state === 'pending') return 'bg-amber-100 text-amber-700';
  if (state === 'rejected' || state === 'cancelled') return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-700';
}

export default function VendorAdsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [wallet, setWallet] = useState({ available: 0, balance: 0, pendingWithdrawals: 0 });
  const [today, setToday] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({
    placementKey: '',
    productId: '',
    bannerImage: '',
    bannerTitle: '',
    bannerLink: '',
    startDate: '',
    days: 7,
    paymentMethod: 'wallet' as 'wallet' | 'offline',
  });

  const headers = () => {
    const token = localStorage.getItem('adminToken');
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [adsRes, productsRes] = await Promise.all([
        fetch('/api/admin/ads', { headers: headers(), credentials: 'include' }),
        fetch('/api/admin/products?status=active&limit=200', { headers: headers(), credentials: 'include' }),
      ]);
      const ads = await adsRes.json().catch(() => ({}));
      if (!adsRes.ok) throw new Error(ads?.error || 'Failed to load ads');
      const productData = await productsRes.json().catch(() => ({}));
      setPlacements(ads.placements || []);
      setBookings(ads.bookings || []);
      setWallet(ads.wallet || { available: 0, balance: 0, pendingWithdrawals: 0 });
      setToday(ads.today || '');
      setProducts(productData.products || []);
      setForm(prev => ({
        ...prev,
        placementKey: prev.placementKey || ads.placements?.[0]?.key || '',
        startDate: prev.startDate || ads.today || '',
      }));
    } catch (err: any) {
      setError(err?.message || 'Failed to load ads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const placement = useMemo(() => placements.find(item => item.key === form.placementKey), [placements, form.placementKey]);
  const total = placement ? placement.pricePerDay * Number(form.days || 0) : 0;

  const uploadBanner = async (file?: File) => {
    if (!file) return;
    if (file.size > MAX_BANNER_BYTES) {
      setError('Banner image must be under 1.5 MB.');
      return;
    }
    const data = new FormData();
    data.append('file', file);
    const response = await fetch('/api/upload', { method: 'POST', body: data });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.url) {
      setError(json?.details || json?.error || 'Upload failed');
      return;
    }
    setError('');
    setForm(prev => ({ ...prev, bannerImage: json.url }));
  };

  const book = async () => {
    try {
      setSaving(true);
      setError('');
      setMessage('');
      const response = await fetch('/api/admin/ads', {
        method: 'POST',
        headers: headers(),
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || 'Booking failed');
      setMessage('Booking sent. Admin will approve it before it goes live.');
      setForm(prev => ({ ...prev, productId: '', bannerImage: '', bannerTitle: '', bannerLink: '' }));
      await load();
    } catch (err: any) {
      setError(err?.message || 'Booking failed');
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (id: string) => {
    const response = await fetch(`/api/admin/ads/${id}`, { method: 'DELETE', headers: headers(), credentials: 'include' });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json?.error || 'Cancel failed');
      return;
    }
    setMessage('Booking cancelled. Wallet payments are refunded.');
    await load();
  };

  return (
    <AdminLayout>
      <div className='space-y-6'>
        <div className='flex flex-wrap items-end justify-between gap-3'>
          <div>
            <h1 className='text-2xl font-bold text-slate-900'>Advertise</h1>
            <p className='mt-1 text-sm text-slate-500'>Book a featured product slot or a banner on tryvvo.com.</p>
          </div>
          <div className='rounded-xl border border-slate-200 bg-white px-4 py-2 text-right'>
            <p className='text-xs text-slate-500'>Wallet available</p>
            <p className='text-lg font-semibold text-slate-900'>{inr(wallet.available)}</p>
          </div>
        </div>

        {error && <p className='rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700'>{error}</p>}
        {message && <p className='rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700'>{message}</p>}

        {loading ? (
          <p className='text-sm text-slate-500'>Loading ads...</p>
        ) : (
          <>
            <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
              {placements.map(item => (
                <button
                  key={item.key}
                  type='button'
                  onClick={() => setForm(prev => ({ ...prev, placementKey: item.key, days: Math.min(Math.max(prev.days, item.minDays), item.maxDays) }))}
                  className={`rounded-xl border bg-white p-4 text-left transition ${form.placementKey === item.key ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200 hover:border-slate-300'}`}>
                  <p className='text-xs uppercase tracking-wide text-slate-500'>{item.type === 'banner' ? 'Banner' : 'Featured product'}</p>
                  <p className='mt-1 font-semibold text-slate-900'>{item.name}</p>
                  <p className='mt-1 text-xs text-slate-500'>{item.description}</p>
                  <p className='mt-3 text-lg font-bold text-emerald-700'>{inr(item.pricePerDay)} / day</p>
                  <p className='text-xs text-slate-500'>
                    {item.slots} slots · {item.minDays}–{item.maxDays} days{item.bannerSize ? ` · ${item.bannerSize}` : ''}
                  </p>
                </button>
              ))}
            </div>

            {placement && (
              <section className='rounded-xl border border-slate-200 bg-white p-5 space-y-4'>
                <h2 className='font-semibold text-slate-900'>Book: {placement.name}</h2>
                <div className='grid gap-4 md:grid-cols-2'>
                  <div className='space-y-1'>
                    <Label>{placement.type === 'banner' ? 'Product to link (optional)' : 'Product to feature'}</Label>
                    <select
                      className='w-full rounded-md border border-slate-200 px-3 py-2 text-sm'
                      value={form.productId}
                      onChange={e => setForm(prev => ({ ...prev, productId: e.target.value }))}>
                      <option value=''>{placement.type === 'banner' ? 'No product' : 'Select a live product'}</option>
                      {products.map(product => (
                        <option key={product._id} value={product._id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='space-y-1'>
                      <Label>Start date</Label>
                      <Input type='date' min={today} value={form.startDate} onChange={e => setForm(prev => ({ ...prev, startDate: e.target.value }))} />
                    </div>
                    <div className='space-y-1'>
                      <Label>Days</Label>
                      <Input
                        type='number'
                        min={placement.minDays}
                        max={placement.maxDays}
                        value={form.days}
                        onChange={e => setForm(prev => ({ ...prev, days: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>

                {placement.type === 'banner' && (
                  <div className='grid gap-4 md:grid-cols-2'>
                    <div className='space-y-1'>
                      <Label>Banner image ({placement.bannerSize}, under 1.5 MB)</Label>
                      <Input type='file' accept='image/*' onChange={e => uploadBanner(e.target.files?.[0])} />
                      {form.bannerImage && <img src={form.bannerImage} alt='Banner preview' className='mt-2 max-h-32 w-full rounded-md border object-cover' />}
                    </div>
                    <div className='space-y-3'>
                      <div className='space-y-1'>
                        <Label>Banner title (optional)</Label>
                        <Input value={form.bannerTitle} onChange={e => setForm(prev => ({ ...prev, bannerTitle: e.target.value }))} placeholder='Festive sale – up to 40% off' />
                      </div>
                      <div className='space-y-1'>
                        <Label>Link (optional)</Label>
                        <Input value={form.bannerLink} onChange={e => setForm(prev => ({ ...prev, bannerLink: e.target.value }))} placeholder='/products/your-item' />
                      </div>
                    </div>
                  </div>
                )}

                <div className='flex flex-wrap items-center gap-4'>
                  <label className='flex items-center gap-2 text-sm'>
                    <input type='radio' checked={form.paymentMethod === 'wallet'} onChange={() => setForm(prev => ({ ...prev, paymentMethod: 'wallet' }))} />
                    Pay from wallet ({inr(wallet.available)} available)
                  </label>
                  <label className='flex items-center gap-2 text-sm'>
                    <input type='radio' checked={form.paymentMethod === 'offline'} onChange={() => setForm(prev => ({ ...prev, paymentMethod: 'offline' }))} />
                    Pay offline (admin confirms)
                  </label>
                </div>

                <div className='flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4'>
                  <p className='text-sm text-slate-600'>
                    {inr(placement.pricePerDay)} × {form.days || 0} days = <span className='text-lg font-bold text-slate-900'>{inr(total)}</span>
                  </p>
                  <Button onClick={book} disabled={saving}>
                    {saving ? 'Booking...' : 'Book ad'}
                  </Button>
                </div>
              </section>
            )}

            <section className='rounded-xl border border-slate-200 bg-white'>
              <h2 className='border-b border-slate-100 px-5 py-3 font-semibold text-slate-900'>My bookings</h2>
              <div className='overflow-x-auto'>
                <table className='min-w-full text-sm'>
                  <thead className='bg-slate-50 text-left text-slate-500'>
                    <tr>
                      {['Placement', 'Item', 'Dates', 'Amount', 'Payment', 'Status', 'Views', 'Clicks', ''].map(header => (
                        <th key={header} className='px-4 py-3 font-medium'>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.length === 0 ? (
                      <tr>
                        <td colSpan={9} className='px-4 py-8 text-slate-500'>
                          No ad bookings yet.
                        </td>
                      </tr>
                    ) : (
                      bookings.map(row => (
                        <tr key={row._id} className='border-t border-slate-100'>
                          <td className='px-4 py-3'>{row.placementName}</td>
                          <td className='px-4 py-3'>{row.type === 'banner' ? row.banner?.title || row.productName || 'Banner' : row.productName}</td>
                          <td className='px-4 py-3 whitespace-nowrap'>
                            {row.startDate} → {row.endDate}
                            <span className='block text-xs text-slate-500'>{row.days} days</span>
                          </td>
                          <td className='px-4 py-3'>{inr(row.amount)}</td>
                          <td className='px-4 py-3'>
                            {row.paymentMethod === 'wallet' ? 'Wallet' : 'Offline'}
                            <span className='block text-xs text-slate-500'>{row.paymentStatus}</span>
                          </td>
                          <td className='px-4 py-3'>
                            <Badge className={stateTone(row.state)}>{row.state}</Badge>
                            {row.adminNote && <span className='block text-xs text-slate-500 mt-1'>{row.adminNote}</span>}
                          </td>
                          <td className='px-4 py-3'>{row.impressions || 0}</td>
                          <td className='px-4 py-3'>{row.clicks || 0}</td>
                          <td className='px-4 py-3'>
                            {row.status === 'pending' && (
                              <Button size='sm' variant='outline' onClick={() => cancel(row._id)}>
                                Cancel
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
