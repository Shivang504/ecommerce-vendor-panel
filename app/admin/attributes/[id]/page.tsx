import { AdminLayout } from '@/components/layout/admin-layout';
import { AttributeFormPage } from '@/components/attributes/attribute-form-page';

interface AttributeEditPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: 'Edit Attribute | Admin',
};

export default async function AttributeEditPage({ params }: AttributeEditPageProps) {
  const { id } = await params;

  return (
    <AdminLayout>
      <AttributeFormPage attributeId={id} />
    </AdminLayout>
  );
}


