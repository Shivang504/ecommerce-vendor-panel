import { AdminLayout } from '@/components/layout/admin-layout';
import { VendorRequestsPage } from '@/components/vendor-requests/vendor-requests-page';

export const metadata = {
  title: 'Vendor requests | Admin',
  description: 'Vendor requests to admin',
};

export default function VendorRequestsAdminPage() {
  return (
    <AdminLayout>
      <VendorRequestsPage />
    </AdminLayout>
  );
}
