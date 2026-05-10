import { AdminLayout } from '@/components/layout/admin-layout';
import { VendorRequestsPage } from '@/components/vendor-requests/vendor-requests-page';

export const metadata = {
  title: 'Vendor requests',
  description: 'Raise requests to admin or manage vendor queries',
};

export default function VendorRequestsRoute() {
  return (
    <AdminLayout>
      <VendorRequestsPage />
    </AdminLayout>
  );
}
