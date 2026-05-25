import { AdminLayout } from '@/components/layout/admin-layout';
import { ProductFormPage } from '@/components/products/product-form-page';

export const metadata = {
  title: 'Edit Product | Admin',
  description: 'Edit product details',
};

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <AdminLayout>
      <ProductFormPage productId={id} />
    </AdminLayout>
  );
}
