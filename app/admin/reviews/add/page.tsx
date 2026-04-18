import { AdminLayout } from '@/components/layout/admin-layout';
import { ReviewFormPage } from '@/components/reviews/review-form-page';

export const metadata = {
  title: 'Add Review',
  description: 'Add a new product review',
};

export default function AddReviewPage() {
  return (
    <AdminLayout>
      <ReviewFormPage />
    </AdminLayout>
  );
}

