import { AdminLayout } from '@/components/layout/admin-layout';
import { SeoOverview } from '@/components/seo/seo-overview';

export const metadata = {
  title: 'SEO Management | Admin',
  description: 'Manage SEO settings',
};

export default function SeoPage() {
  return (
    <AdminLayout>
      <SeoOverview />
    </AdminLayout>
  );
}
