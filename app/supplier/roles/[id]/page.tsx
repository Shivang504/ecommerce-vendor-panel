import { AdminLayout } from '@/components/layout/admin-layout';
import { RoleFormPage } from '@/components/roles/role-form-page';

interface RoleEditPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: 'Edit Role | Admin',
  description: 'Edit role',
};

export default async function EditRolePage({ params }: RoleEditPageProps) {
  const { id } = await params;

  return (
    <AdminLayout>
      <RoleFormPage roleId={id} />
    </AdminLayout>
  );
}


