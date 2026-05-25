import { AdminLayout } from '@/components/layout/admin-layout';
import { ProductList } from '@/components/products/product-list';

export const metadata = {
  title: 'Products | Admin',
  description: 'Manage products',
};

export default function ProductsPage() {
  return (
    <AdminLayout>
      <ProductList />
    </AdminLayout>
  );
}
