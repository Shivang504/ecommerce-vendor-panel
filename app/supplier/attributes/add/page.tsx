import { AdminLayout } from '@/components/layout/admin-layout';
import { AttributeFormPage } from '@/components/attributes/attribute-form-page';

export const metadata = {
  title: 'Add Attribute | Admin',
};


export default function AddAttributePage() {
  return (
    <AdminLayout>
      <AttributeFormPage />
    </AdminLayout>
  );
}


