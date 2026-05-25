import { AdminLayout } from '@/components/layout/admin-layout';
import { UserFormPage } from '@/components/users/user-form-page';

export const metadata = {
  title: 'Add User | Admin',
  description: 'Add a new user',
};

export default function AddUserPage() {
  return (
    <AdminLayout>
      <UserFormPage />
    </AdminLayout>
  );
}
