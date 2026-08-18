import { AdminLayout } from '@/components/layout/admin-layout';
import { OrderList } from '@/components/orders/order-list';

export const metadata = {
  title: 'Referral Orders',
  description: 'Orders that came through influencer referrals',
};

export default function ReferralOrdersPage() {
  return (
    <AdminLayout>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Referral Orders</h1>
        <p className="text-sm text-muted-foreground">
          Orders of your products that came through an influencer referral code or link.
        </p>
      </div>
      <OrderList referralOnly />
    </AdminLayout>
  );
}
