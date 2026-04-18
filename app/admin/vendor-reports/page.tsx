import { AdminLayout } from '@/components/layout/admin-layout';
import { VendorReportsClient } from '@/components/reports/vendor-reports-client';

export const metadata = {
  title: 'Vendor Reports & Analytics | Admin',
  description: 'Vendor-focused reports and analytics',
};

export default function VendorReportsPage() {
  return (
    <AdminLayout>
      <VendorReportsClient />
    </AdminLayout>
  );
}

