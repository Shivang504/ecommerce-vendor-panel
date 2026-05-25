'use client';

import { AdminLayout } from '@/components/layout/admin-layout';
import { CouponList } from '@/components/coupons/coupon-list';

export default function CouponsPage() {
  return (
    <AdminLayout>
      <CouponList />
    </AdminLayout>
  );
}

