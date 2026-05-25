import { AdminLayout } from '@/components/layout/admin-layout';
import { ProductFormPage } from '@/components/products/product-form-page';

export const metadata = {
  title: 'Add Product | Admin',
  description: 'Add a new product',
};

export default function AddProductPage() {
  return (
    <AdminLayout>
      <ProductFormPage />
    </AdminLayout>
  );
}
