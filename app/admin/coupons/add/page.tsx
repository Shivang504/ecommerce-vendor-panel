'use client';

import { AdminLayout } from '@/components/layout/admin-layout';
import { CouponFormPage } from '@/components/coupons/coupon-form-page';

export default function AddCouponPage() {
  return (
    <AdminLayout>
      <CouponFormPage />
    </AdminLayout>
  );
}

