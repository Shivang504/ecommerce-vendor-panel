import { AdminLayout } from '@/components/layout/admin-layout';
import { UserFormPage } from '@/components/users/user-form-page';

export const metadata = {
  title: 'View User | Admin',
  description: 'View user details',
};

export default async function ViewUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <AdminLayout>
      <UserFormPage adminId={id} />
    </AdminLayout>
  );
}
