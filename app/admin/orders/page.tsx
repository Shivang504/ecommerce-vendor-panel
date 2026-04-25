import { Suspense } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { OrderList } from '@/components/orders/order-list';

export const metadata = {
  title: 'Orders | Vendor',
  description: 'View orders',
};

export default function OrdersPage() {
  return (
    <AdminLayout>
      <Suspense fallback={<div className='p-8 text-center text-slate-600'>Loading orders…</div>}>
        <OrderList />
      </Suspense>
    </AdminLayout>
  );
}


