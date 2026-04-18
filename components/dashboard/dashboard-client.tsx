'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowUpRight,
  ArrowDownRight,
  Download,
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

  const siteLabel = settings.siteName?.trim() || 'Store';
  const dashboardTitle = `${siteLabel} · Admin`;

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
    { label: 'Total orders', stat: data.stats.totalOrders, icon: ShoppingBag },
    { label: 'Pending', stat: data.stats.pendingOrders, icon: Clock },
    { label: 'Cancelled', stat: data.stats.cancelledOrders, icon: XCircle },
    { label: 'Returns', stat: data.stats.returnedItems, icon: RotateCcw },
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
            <div className='flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600'>
              <span>This month</span>
              <ChevronLeft className='h-4 w-4 opacity-50' />
            </div>
            <button
              type='button'
              className='inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-95'
              style={{ backgroundColor: BRAND_WEB }}>
              <Download className='h-4 w-4' />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className='mx-auto max-w-[1600px] space-y-6 px-4 sm:px-6 lg:px-8'>
        {/* KPI */}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          {kpiItems.map((item, index) => (
            <Card
              key={index}
              className='border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md'
              style={{ borderTopWidth: 3, borderTopColor: BRAND_WEB }}>
              <div className='mb-3 flex items-start justify-between'>
                <p className='text-sm font-medium text-slate-600'>{item.label}</p>
                <item.icon className='h-4 w-4' style={{ color: BRAND_MUTED }} />
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
              </div>
            </Card>
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
