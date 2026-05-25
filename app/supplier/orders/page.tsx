import { AdminLayout } from '@/components/layout/admin-layout';
import { OrderList } from '@/components/orders/order-list';

export const metadata = {
  title: 'Orders | Admin',
  description: 'View orders',
};

export default function OrdersPage() {
  return (
    <AdminLayout>
      <OrderList />
    </AdminLayout>
  );
}


