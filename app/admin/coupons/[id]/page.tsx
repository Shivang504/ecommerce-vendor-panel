'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { CouponFormPage } from '@/components/coupons/coupon-form-page';

export default function EditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>('');
  
  useEffect(() => {
    params.then(resolved => setId(resolved.id));
  }, [params]);

  if (!id) return null;

  return (
    <AdminLayout>
      <CouponFormPage couponId={id} />
    </AdminLayout>
  );
}

