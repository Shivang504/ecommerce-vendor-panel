import { AdminLayout } from '@/components/layout/admin-layout';
import { UserFormPage } from '@/components/users/user-form-page';

export const metadata = {
  title: 'Edit User | Admin',
  description: 'Edit user details',
};

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <AdminLayout>
      <UserFormPage userId={id} />
    </AdminLayout>
  );
}
