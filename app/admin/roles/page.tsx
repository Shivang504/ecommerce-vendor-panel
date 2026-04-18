import { AdminLayout } from '@/components/layout/admin-layout';
import { RoleList } from '@/components/roles/role-list';

export const metadata = {
  title: 'Roles | Admin',
  description: 'Manage roles',
};

export default function RolesPage() {
  return (
    <AdminLayout>
      <RoleList />
    </AdminLayout>
  );
}


