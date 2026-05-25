import { AdminLayout } from '@/components/layout/admin-layout';
import { RoleFormPage } from '@/components/roles/role-form-page';

export const metadata = {
  title: 'Add Role | Admin',
  description: 'Create a new role',
};

export default function AddRolePage() {
  return (
    <AdminLayout>
      <RoleFormPage />
    </AdminLayout>
  );
}


