import { AdminLayout } from '@/components/layout/admin-layout';
import { AttributeList } from '@/components/attributes/attribute-list';

export const metadata = {
  title: 'Attributes | Admin',
};

export default function AttributesPage() {
  return (
    <AdminLayout>
      <AttributeList />
    </AdminLayout>
  );
}


