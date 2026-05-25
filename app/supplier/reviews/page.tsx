import { AdminLayout } from '@/components/layout/admin-layout';
import { ReviewListAdmin } from '@/components/reviews/review-list-admin';

export const metadata = {
  title: 'Reviews | Admin',
  description: 'Manage product reviews',
};

export default function ReviewsPage() {
  return (
    <AdminLayout>
      <ReviewListAdmin />
    </AdminLayout>
  );
}

