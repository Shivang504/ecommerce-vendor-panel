import { AdminLayout } from '@/components/layout/admin-layout';
import { UserList } from '@/components/users/user-list';

export const metadata = {
  title: 'Users | Admin',
  description: 'Manage users',
};

export default function UsersPage() {
  return (
    <AdminLayout>
      <UserList />
    </AdminLayout>
  );
}
