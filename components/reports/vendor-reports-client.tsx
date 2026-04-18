'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/components/settings/settings-provider';

interface VendorReportsData {
  stats: {
    totalOrders: { value: string; change: string; trend: 'up' | 'down' };
    pendingOrders: { value: string; change: string; trend: 'up' | 'down' };
    cancelledOrders: { value: string; change: string; trend: 'up' | 'down' };
    returnedItems: { value: string; change: string; trend: 'up' | 'down' };
  };
  recentOrders: Array<{ id: string; customer: string; product: string; price: number; status: string }>;
  topProducts: Array<{ supplier: string; products: string; nextShipment: string; contact: string; rating: number }>;
}

export function VendorReportsClient() {
  const { settings } = useSettings();
  const [data, setData] = useState<VendorReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('adminUser');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUserRole(parsed?.role ?? null);
        return;
      }

      const token = localStorage.getItem('adminToken');
      if (!token) return;
      const payload = token.split('.')[1];
      if (!payload) return;
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(atob(normalized));
      setUserRole(decoded?.role ?? null);
    } catch {
      setUserRole(null);
    }
  }, []);

  useEffect(() => {
    const fetchReports = async () => {
      if (userRole !== 'vendor') {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const token = localStorage.getItem('adminToken');
        const response = await fetch('/api/admin/dashboard', {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch vendor reports');
        }

        const dashboardData = await response.json();
        setData({
          stats: dashboardData.stats,
          recentOrders: dashboardData.recentOrders || [],
          topProducts: dashboardData.topProducts || [],
        });
      } catch (error) {
        console.error('[v0] Failed to fetch vendor reports:', error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [userRole]);

  const reportTitle = useMemo(() => {
    const brand = settings.siteName || 'E-commerce';
    return `${brand} Vendor Reports & Analytics`;
  }, [settings.siteName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-muted border-t-green-500 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading vendor reports...</p>
        </div>
      </div>
    );
  }

  if (userRole !== 'vendor') {
    return (
      <Card className="p-6">
        <h1 className="text-xl font-semibold text-gray-900">Vendor Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground mt-2">
          This section is available to vendors only and shows vendor-related performance reports.
        </p>
      </Card>
    );
  }

  if (!data) {
    return <div className="text-center py-12 text-destructive">Failed to load vendor reports</div>;
  }

  const metrics = [
    { label: 'Total Orders', value: data.stats?.totalOrders?.value ?? '0' },
    { label: 'Pending Orders', value: data.stats?.pendingOrders?.value ?? '0' },
    { label: 'Cancelled Orders', value: data.stats?.cancelledOrders?.value ?? '0' },
    { label: 'Returned Items', value: data.stats?.returnedItems?.value ?? '0' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{reportTitle}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View vendor-specific performance metrics, orders, and product insights.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map(metric => (
          <Card key={metric.label} className="p-4">
            <p className="text-sm text-muted-foreground">{metric.label}</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">{metric.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
          <Badge variant="secondary">Vendor Only</Badge>
        </div>
        <div className="mt-4 space-y-3">
          {data.recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent orders found.</p>
          ) : (
            data.recentOrders.slice(0, 6).map(order => (
              <div key={order.id} className="flex items-center justify-between border-b pb-3 last:border-b-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{order.product}</p>
                  <p className="text-xs text-muted-foreground">Order #{order.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">₹{order.price}</p>
                  <p className="text-xs text-muted-foreground capitalize">{order.status}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Top Products</h2>
          <Badge variant="secondary">Vendor Only</Badge>
        </div>
        <div className="mt-4 space-y-3">
          {data.topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No top products data available.</p>
          ) : (
            data.topProducts.slice(0, 6).map((product, index) => (
              <div key={`${product.products}-${index}`} className="flex items-center justify-between border-b pb-3 last:border-b-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{product.products}</p>
                  <p className="text-xs text-muted-foreground">Supplier: {product.supplier}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">Rating: {product.rating || 0}</div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

