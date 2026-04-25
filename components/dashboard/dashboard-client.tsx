'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowUpRight,
  ArrowDownRight,
  Download,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Store,
  ShoppingBag,
  Clock,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useSettings } from '@/components/settings/settings-provider';
import { displayNameForVendorPanel } from '@/lib/vendor-brand';
import {
  DASHBOARD_EXPORT_MAX_MONTH_OFFSET,
  dateAtFirstOfOffset,
  getMonthRangeByOffset,
  monthOffsetFromAnyDayInMonth,
} from '@/lib/dashboard-month-range';

/** Matches storefront `--web` (see globals.css) */
const BRAND_WEB = '#401d5d';
const BRAND_MUTED = '#6b4d7a';

interface DashboardData {
  stats: {
    totalOrders: { value: string; change: string; trend: 'up' | 'down' };
    pendingOrders: { value: string; change: string; trend: 'up' | 'down' };
    cancelledOrders: { value: string; change: string; trend: 'up' | 'down' };
    returnedItems: { value: string; change: string; trend: 'up' | 'down' };
  };
  revenueData: Array<{ month: string; income: number; expense: number }>;
  categoryDistribution: Array<{ name: string; value: number; color: string; count?: number }>;
  topProducts: Array<{
    supplier: string;
    products: string;
    nextShipment: string;
    contact: string;
    rating: number;
    revenue?: number;
  }>;
  recentOrders: Array<{ id: string; customer: string; product: string; price: number; status: string }>;
  topDeals?: Array<{ name: string; category: string; price: string; icon?: string; sales?: number }>;
}

export function DashboardClient() {
  const { settings } = useSettings();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  const selectedDate = useMemo(() => dateAtFirstOfOffset(monthOffset), [monthOffset]);
  const [calendarMonth, setCalendarMonth] = useState(() => selectedDate);
  useEffect(() => {
    setCalendarMonth(selectedDate);
  }, [selectedDate]);

  const calendarBounds = useMemo(() => {
    const today = new Date();
    const endMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startMonth = new Date(today.getFullYear() - 10, today.getMonth(), 1);
    return { startMonth, endMonth };
  }, []);

  const selectedMonthLabel = getMonthRangeByOffset(monthOffset).label;

  const siteLabel = displayNameForVendorPanel(settings.siteName?.trim() || 'Store');
  const dashboardTitle = `${siteLabel} · Dashboard`;

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
        const response = await fetch('/api/admin/dashboard', {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          credentials: 'include',
        });

        if (!response.ok) throw new Error('Failed to fetch dashboard data');

        const dashboardData = await response.json();

        const transformedData: DashboardData = {
          stats: dashboardData.stats || {
            totalOrders: { value: '0', change: '0%', trend: 'up' },
            pendingOrders: { value: '0', change: '0%', trend: 'up' },
            cancelledOrders: { value: '0', change: '0%', trend: 'up' },
            returnedItems: { value: '0', change: '0%', trend: 'up' },
          },
          revenueData: dashboardData.revenueData || [],
          categoryDistribution: dashboardData.categoryDistribution || [],
          topProducts: dashboardData.topProducts || [],
          recentOrders: dashboardData.recentOrders || [],
          topDeals: dashboardData.topDeals || [],
        };

        setData(transformedData);
      } catch (error) {
        console.error('[Dashboard] Failed to fetch:', error);
        setData({
          stats: {
            totalOrders: { value: '0', change: '0%', trend: 'up' },
            pendingOrders: { value: '0', change: '0%', trend: 'up' },
            cancelledOrders: { value: '0', change: '0%', trend: 'up' },
            returnedItems: { value: '0', change: '0%', trend: 'up' },
          },
          revenueData: [],
          categoryDistribution: [],
          topProducts: [],
          recentOrders: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className='flex min-h-[50vh] items-center justify-center'>
        <div className='text-center'>
          <div
            className='mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-transparent'
            style={{ borderTopColor: BRAND_WEB }}
          />
          <p className='text-sm text-slate-600'>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className='py-12 text-center text-destructive'>Failed to load dashboard</div>;
  }

  const formatNumber = (amount: number) => amount.toLocaleString('en-IN');

  const handleExportDraft = async () => {
    try {
      setExporting(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
      const res = await fetch(`/api/admin/dashboard/export?monthOffset=${monthOffset}`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || 'Export failed');
      }
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition');
      const match = cd?.match(/filename="([^"]+)"/);
      const filename = match?.[1] || `dashboard-draft-${monthOffset}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded draft for ${selectedMonthLabel}`);
    } catch (e) {
      console.error('[Dashboard export]', e);
      toast.error(e instanceof Error ? e.message : 'Could not export');
    } finally {
      setExporting(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className='rounded-lg border border-slate-200 bg-white p-3 shadow-lg'>
        <p className='mb-2 text-xs font-semibold text-slate-500'>{label}</p>
        <p className='text-sm font-semibold text-emerald-600'>Income ₹{formatNumber(payload[0]?.value || 0)}</p>
        <p className='text-sm font-semibold text-amber-600'>Shipping & fees ₹{formatNumber(payload[1]?.value || 0)}</p>
      </div>
    );
  };

  const kpiItems = [
    { label: 'Total orders', stat: data.stats.totalOrders, icon: ShoppingBag, href: '/admin/orders' },
    {
      label: 'Pending',
      stat: data.stats.pendingOrders,
      icon: Clock,
      href: '/admin/orders?orderStatusIn=pending,processing,confirmed',
    },
    {
      label: 'Cancelled',
      stat: data.stats.cancelledOrders,
      icon: XCircle,
      href: '/admin/orders?orderStatus=cancelled',
    },
    { label: 'Returns', stat: data.stats.returnedItems, icon: RotateCcw, href: '/admin/orders?returned=1' },
  ];

  return (
    <div className='min-h-full space-y-6 bg-gradient-to-b from-slate-50/80 to-white pb-10'>
      <div className='border-b border-slate-200/80 bg-white/90 px-4 py-5 shadow-sm sm:px-6 lg:px-8'>
        <div className='mx-auto flex max-w-[1600px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-wider' style={{ color: BRAND_MUTED }}>
              Overview
            </p>
            <h1 className='text-2xl font-bold tracking-tight text-slate-900'>{dashboardTitle}</h1>
            <p className='mt-1 text-sm text-slate-500'>Orders, revenue, and catalog — aligned with your storefront.</p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <div className='flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white p-1 shadow-sm'>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                title='Older month'
                disabled={monthOffset >= DASHBOARD_EXPORT_MAX_MONTH_OFFSET}
                onClick={() => setMonthOffset(m => Math.min(DASHBOARD_EXPORT_MAX_MONTH_OFFSET, m + 1))}
                className='h-9 w-9 shrink-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900'>
                <ChevronLeft className='h-4 w-4' />
              </Button>
              <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type='button'
                    variant='ghost'
                    title='Choose month'
                    className='h-9 min-w-[12.5rem] justify-between gap-2 px-3 font-medium text-slate-800 hover:bg-slate-50'>
                    <span className='flex items-center gap-2 truncate'>
                      <CalendarDays className='h-4 w-4 shrink-0 opacity-70' style={{ color: BRAND_WEB }} />
                      <span className='truncate'>{selectedMonthLabel}</span>
                    </span>
                    <ChevronDown className='h-4 w-4 shrink-0 opacity-50' />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align='end'
                  sideOffset={8}
                  className='w-auto border border-slate-200 p-0 shadow-xl sm:min-w-[min(100vw-2rem,20rem)]'>
                  <div className='border-b border-slate-100 bg-slate-50/80 px-3 py-2'>
                    <p className='text-xs font-medium text-slate-600'>Export period</p>
                    <p className='text-[11px] text-slate-500'>Pick any day in the month — CSV uses the full month.</p>
                  </div>
                  <Calendar
                    mode='single'
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    selected={selectedDate}
                    onSelect={d => {
                      if (!d) return;
                      setMonthOffset(monthOffsetFromAnyDayInMonth(d));
                      setMonthPickerOpen(false);
                    }}
                    captionLayout='dropdown'
                    startMonth={calendarBounds.startMonth}
                    endMonth={calendarBounds.endMonth}
                    disabled={{ after: new Date() }}
                    className='rounded-b-lg [--cell-size:2.25rem]'
                  />
                </PopoverContent>
              </Popover>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                title='Newer month'
                disabled={monthOffset <= 0}
                onClick={() => setMonthOffset(m => Math.max(0, m - 1))}
                className='h-9 w-9 shrink-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900'>
                <ChevronRight className='h-4 w-4' />
              </Button>
            </div>
            <button
              type='button'
              onClick={handleExportDraft}
              disabled={exporting}
              className='inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60'
              style={{ backgroundColor: BRAND_WEB }}>
              <Download className='h-4 w-4' />
              {exporting ? 'Preparing…' : 'Export draft (CSV)'}
            </button>
          </div>
        </div>
      </div>

      <div className='mx-auto max-w-[1600px] space-y-6 px-4 sm:px-6 lg:px-8'>
        {/* KPI */}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          {kpiItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className='group block rounded-xl outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#401d5d]'
              aria-label={`${item.label}: ${item.stat.value}. Open orders filtered by ${item.label}`}>
              <Card
                className='h-full border border-slate-100 bg-white p-5 shadow-sm transition group-hover:shadow-md group-hover:border-slate-200'
                style={{ borderTopWidth: 3, borderTopColor: BRAND_WEB }}>
                <div className='mb-3 flex items-start justify-between'>
                  <p className='text-sm font-medium text-slate-600'>{item.label}</p>
                  <item.icon className='h-4 w-4 shrink-0' style={{ color: BRAND_MUTED }} />
                </div>
                <p className='mb-2 text-3xl font-bold tabular-nums text-slate-900'>{item.stat.value}</p>
                <div className='flex items-center gap-1'>
                  {item.stat.trend === 'down' ? (
                    <ArrowDownRight className='h-4 w-4 text-red-500' />
                  ) : (
                    <ArrowUpRight className='h-4 w-4 text-emerald-600' />
                  )}
                  <span
                    className={`text-xs font-semibold ${
                      item.stat.trend === 'down' ? 'text-red-600' : 'text-emerald-600'
                    }`}>
                    {item.stat.change}
                  </span>
                  <span className='ml-auto text-xs font-medium text-slate-400 group-hover:text-[#401d5d]'>
                    View →
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
          {/* Revenue */}
          <Card className='border border-slate-100 bg-white shadow-sm'>
            <div className='p-6'>
              <div className='mb-4 flex items-center justify-between'>
                <h3 className='text-lg font-bold text-slate-900'>Revenue & shipping</h3>
              </div>
              <div className='mb-4 flex flex-wrap items-center justify-between gap-4'>
                <div className='flex gap-6'>
                  <div className='flex items-center gap-2'>
                    <div className='h-3 w-3 rounded-full bg-emerald-500' />
                    <span className='text-xs font-medium text-slate-600'>Order value</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <div className='h-3 w-3 rounded-full bg-amber-400' />
                    <span className='text-xs font-medium text-slate-600'>Shipping / fees</span>
                  </div>
                </div>
                <select className='rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 focus:outline-none'>
                  <option>Monthly</option>
                </select>
              </div>
              <ResponsiveContainer width='100%' height={300}>
                <AreaChart data={data.revenueData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id='colorIncome' x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='5%' stopColor='#10b981' stopOpacity={0.45} />
                      <stop offset='95%' stopColor='#10b981' stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id='colorExpense' x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='5%' stopColor='#f59e0b' stopOpacity={0.4} />
                      <stop offset='95%' stopColor='#f59e0b' stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray='3 3' stroke='#f1f5f9' vertical={false} />
                  <XAxis dataKey='month' stroke='#94a3b8' style={{ fontSize: 12 }} />
                  <YAxis stroke='#94a3b8' style={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(64, 29, 93, 0.04)' }} />
                  <Area
                    type='monotone'
                    dataKey='income'
                    stroke='#10b981'
                    fillOpacity={1}
                    fill='url(#colorIncome)'
                    strokeWidth={2}
                    dot={false}
                  />
                  <Area
                    type='monotone'
                    dataKey='expense'
                    stroke='#f59e0b'
                    fillOpacity={1}
                    fill='url(#colorExpense)'
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Category mix */}
          <Card className='border border-slate-100 bg-white shadow-sm'>
            <div className='p-6'>
              <div className='mb-4 flex items-center justify-between'>
                <h3 className='text-lg font-bold text-slate-900'>Catalog by category</h3>
                <MoreVertical className='h-4 w-4 text-slate-400' />
              </div>
              <div className='mb-4'>
                <ResponsiveContainer width='100%' height={240}>
                  <PieChart>
                    <Pie
                      data={
                        data.categoryDistribution.length > 0
                          ? data.categoryDistribution
                          : [{ name: 'No data', value: 100, color: '#e2e8f0' }]
                      }
                      cx='45%'
                      cy='50%'
                      innerRadius={55}
                      outerRadius={90}
                      dataKey='value'
                      label={({ value }) => `${value}%`}
                      labelLine={false}>
                      {(data.categoryDistribution.length > 0
                        ? data.categoryDistribution
                        : [{ name: 'No data', value: 100, color: '#e2e8f0' }]
                      ).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className='grid grid-cols-2 gap-2 text-xs'>
                {data.categoryDistribution.length > 0 ? (
                  data.categoryDistribution.slice(0, 4).map((cat, index) => (
                    <div key={index} className='flex items-center gap-2 rounded-md p-2 hover:bg-slate-50'>
                      <div className='h-2.5 w-2.5 shrink-0 rounded-full' style={{ backgroundColor: cat.color }} />
                      <span className='truncate font-medium text-slate-700'>{cat.name}</span>
                      <span className='ml-auto font-bold text-slate-900'>{cat.value}%</span>
                    </div>
                  ))
                ) : (
                  <div className='col-span-2 py-2 text-center text-xs text-slate-500'>No category data yet</div>
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
          {/* Vendors */}
          <Card className='border border-slate-100 bg-white shadow-sm'>
            <div className='p-6'>
              <div className='mb-4 flex items-center gap-2'>
                <Store className='h-5 w-5' style={{ color: BRAND_WEB }} />
                <h3 className='text-base font-bold text-slate-900'>Top vendors (this month)</h3>
              </div>
              <div className='space-y-3'>
                <div className='grid grid-cols-12 gap-2 border-b border-slate-200 pb-3 text-xs font-semibold text-slate-500'>
                  <p className='col-span-4'>Vendor</p>
                  <p className='col-span-3'>Orders</p>
                  <p className='col-span-3'>MTD revenue</p>
                  <p className='col-span-2 text-right'>Contact</p>
                </div>
                {data.topProducts.length > 0 ? (
                  data.topProducts.map((row, index) => (
                    <div
                      key={index}
                      className='grid grid-cols-12 gap-2 rounded-lg py-2 text-sm transition hover:bg-slate-50'>
                      <div className='col-span-4 font-medium text-slate-900'>{row.supplier}</div>
                      <div className='col-span-3 text-slate-600'>{row.products}</div>
                      <div className='col-span-3 font-medium text-slate-800'>
                        {typeof row.revenue === 'number' && row.revenue > 0
                          ? `₹${formatNumber(Math.round(row.revenue))}`
                          : '—'}
                      </div>
                      <div className='col-span-2 truncate text-right text-xs text-slate-500' title={row.contact}>
                        {row.contact}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='py-6 text-center text-sm text-slate-500'>No vendor activity this month</div>
                )}
              </div>
              <div className='mt-4 flex items-center justify-between border-t border-slate-100 pt-4'>
                <Button variant='ghost' size='sm' className='text-slate-600' asChild>
                  <a href='/admin/vendors'>View all vendors</a>
                </Button>
                <div className='flex gap-1'>
                  <button type='button' className='rounded p-1 hover:bg-slate-100'>
                    <ChevronLeft className='h-4 w-4 text-slate-600' />
                  </button>
                  <button type='button' className='rounded p-1 hover:bg-slate-100'>
                    <ChevronRight className='h-4 w-4 text-slate-600' />
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Best sellers */}
          <Card className='border border-slate-100 bg-white shadow-sm'>
            <div className='p-6'>
              <div className='mb-4 flex items-center justify-between'>
                <h3 className='text-base font-bold text-slate-900'>Best selling products</h3>
                <Button variant='link' className='h-auto p-0 text-sm font-medium text-[#401d5d] hover:text-[#401d5d]/90' asChild>
                  <a href='/admin/products'>See catalog →</a>
                </Button>
              </div>
              <div className='space-y-4'>
                <div className='border-b border-slate-200 pb-3'>
                  <div className='grid grid-cols-2 gap-4 text-xs font-semibold text-slate-500'>
                    <span>Product</span>
                    <span className='text-right'>Avg. price</span>
                  </div>
                </div>
                {data.topDeals && data.topDeals.length > 0 ? (
                  data.topDeals.slice(0, 5).map((item: any, index: number) => (
                    <div
                      key={index}
                      className='grid grid-cols-2 gap-4 rounded-lg py-2 transition hover:bg-slate-50'>
                      <div className='flex items-center gap-3'>
                        <span className='text-xl' aria-hidden>
                          {item.icon || '🛍️'}
                        </span>
                        <div>
                          <p className='text-sm font-medium text-slate-900'>{item.name}</p>
                          <p className='text-xs text-slate-500'>
                            {item.sales != null ? `${item.sales} sold` : item.category}
                          </p>
                        </div>
                      </div>
                      <div className='flex items-center justify-end'>
                        <p className='text-sm font-semibold text-slate-900'>{item.price}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='py-6 text-center text-sm text-slate-500'>No sales data for this period</div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Recent orders */}
        <Card className='border border-slate-100 bg-white shadow-sm'>
          <div className='p-6'>
            <div className='mb-6 flex items-center justify-between'>
              <h3 className='text-base font-bold text-slate-900'>Recent orders</h3>
              <Button variant='outline' size='sm' asChild>
                <a href='/admin/orders'>Open orders</a>
              </Button>
            </div>

            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b border-slate-200'>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-slate-600'>Order ID</th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-slate-600'>Customer</th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-slate-600'>Product</th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-slate-600'>Price</th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-slate-600'>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.length > 0 ? (
                    data.recentOrders.map((order, index) => (
                      <tr key={index} className='border-b border-slate-100 transition hover:bg-slate-50/80'>
                        <td className='px-4 py-4 font-medium text-slate-900'>{order.id}</td>
                        <td className='px-4 py-4 text-slate-600'>{order.customer}</td>
                        <td className='px-4 py-4 text-slate-600'>{order.product}</td>
                        <td className='px-4 py-4 font-medium text-slate-900'>
                          ₹{order.price.toLocaleString('en-IN')}
                        </td>
                        <td className='px-4 py-4'>
                          {(() => {
                            const displayStatus = order.status === 'completed' ? 'delivered' : order.status;
                            return (
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  displayStatus === 'delivered'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : displayStatus === 'cancelled'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-amber-100 text-amber-800'
                                }`}>
                                {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className='py-10 text-center text-slate-500'>
                        No recent orders
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
