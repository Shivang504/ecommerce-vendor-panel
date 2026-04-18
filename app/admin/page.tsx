import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { AdminLayout } from '@/components/layout/admin-layout';

export const metadata = {
  title: 'Admin Dashboard',
  description: 'E-commerce Admin Dashboard',
};

export default function AdminPage() {
  return (
    <AdminLayout>
      <DashboardClient />
    </AdminLayout>
  );
}
