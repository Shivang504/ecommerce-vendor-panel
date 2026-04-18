'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Download, Search, Filter, Plus, Trash2, Pencil, Eye } from 'lucide-react';
import { CommonDialog } from '../dialog/dialog';
import { Switch } from '@/components/ui/switch';
import { formatIndianDate } from '@/app/utils/helper';

interface Product {
  _id?: string;
  id?: string;
  name: string;
  category: string;
  vendor: string;
  product_type?: string;
  free_shipping?: boolean;
  allow_return?: boolean;
  price?: number;
  sellingPrice?: number;
  stock: number;
  status: string;
  trending?: boolean;
  bestSeller?: boolean;
  image?: string;
  seoStatus?: string;
  sku?: string;
  brand?: string;
}

interface ProductDetails extends Product {
  shortDescription?: string;
  longDescription?: string;
  regularPrice?: number;
  costPrice?: number;
  taxRate?: number;
  lowStockThreshold?: number;
  allowBackorders?: boolean;
  allowReviews?: boolean;
  return_policy?: string;
  returnPolicyDays?: number;
  warrantyPeriod?: string;
  mainImage?: string;
  galleryImages?: string[];
  visibility?: string;
  featured?: boolean;
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
  urlSlug?: string;
  focusKeyword?: string;
}

interface Category {
  _id: string;
  name: string;
}

interface Vendor {
  _id: string;
  storeName: string;
}

export function ProductList() {
  const router = useRouter();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [viewProductId, setViewProductId] = useState<string | null>(null);
  const [viewProductData, setViewProductData] = useState<ProductDetails | null>(null);
  const [loadingProductDetails, setLoadingProductDetails] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // useEffect(() => {
  //   toast({
  //     title: 'Product added!',
  //     description: 'Item added to cart successfully.',
  //     variant: 'success',
  //   });
  // }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, statusFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/admin/products?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
      });
      const data = await response.json();

      const formattedProducts = (data.products || data).map((p: any) => ({
        id: p._id || p.id,
        _id: p._id,
        ...p,
      }));

      setProducts(formattedProducts);
      setTotal(data.total || formattedProducts.length);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast({
        title: 'Error',
        description: 'Failed to load products',
        variant: 'destructive',
      });
      setProducts([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1); // Reset to first page on search
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = page - 1; i <= page + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/categories', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
      });
      const data = await response.json();
      setCategories(Array.isArray(data.categories) ? data.categories : Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setCategories([]);
    }
  };

  const fetchVendors = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/vendors', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
      });
      const data = await response.json();
      setVendors(Array.isArray(data.vendors) ? data.vendors : []);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
      setVendors([]);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p?.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
      (p?.sku && p.sku?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p?.brand && p.brand?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    const matchesVendor = vendorFilter === 'all' || p.vendor === vendorFilter;
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'in-stock' && p.stock > 0) ||
      (stockFilter === 'out-of-stock' && p.stock === 0) ||
      (stockFilter === 'low-stock' && p.stock > 0 && p.stock <= 10);

    return matchesSearch && matchesCategory && matchesVendor && matchesStatus && matchesStock;
  });

  const handleAddProduct = () => {
    router.push('/admin/products/add');
  };

  const handleEditProduct = (product: Product) => {
    router.push(`/admin/products/edit/${product._id || product.id}`);
  };

  const handleDeleteClick = (productId: string) => {
    setProductToDelete(productId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      const response = await fetch(`/api/admin/products/${productToDelete}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setProducts(products.filter(p => (p._id || p.id) !== productToDelete));
        toast({
          title: 'Success',
          description: 'Product deleted successfully',
          variant: 'success',
        });
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      console.error('[v0] Failed to delete product:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete product',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const handleToggleStatus = async (productId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setProducts(products.map(p => ((p._id || p.id) === productId ? { ...p, status: newStatus } : p)));
        toast({
          title: 'Success',
          description: `Product ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
          variant: 'success',
        });
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('[v0] Failed to toggle product status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update product status',
        variant: 'destructive',
      });
    }
  };

  const handleToggleTrending = async (productId: string, currentTrending: boolean) => {
    try {
      const newTrending = !currentTrending;
      const response = await fetch(`/api/admin/products/${productId}/trending`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trending: newTrending }),
      });

      if (response.ok) {
        setProducts(products.map(p => ((p._id || p.id) === productId ? { ...p, trending: newTrending } : p)));
        toast({
          title: 'Success',
          description: `Product ${newTrending ? 'marked as trending' : 'removed from trending'} successfully`,
          variant: 'success',
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update trending status');
      }
    } catch (error) {
      console.error('[v0] Failed to toggle trending status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update trending status',
        variant: 'destructive',
      });
    }
  };

  const handleToggleBestSeller = async (productId: string, currentBestSeller: boolean) => {
    try {
      const newBestSeller = !currentBestSeller;
      const response = await fetch(`/api/admin/products/${productId}/best-seller`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bestSeller: newBestSeller }),
      });

      if (response.ok) {
        setProducts(products.map(p => ((p._id || p.id) === productId ? { ...p, bestSeller: newBestSeller } : p)));
        toast({
          title: 'Success',
          description: `Product ${newBestSeller ? 'marked as best seller' : 'removed from best seller'} successfully`,
          variant: 'success',
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update best seller status');
      }
    } catch (error) {
      console.error('[v0] Failed to toggle best seller status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update best seller status',
        variant: 'destructive',
      });
    }
  };

  const handleExport = () => {
    try {
      const csvHeaders = ['Name', 'SKU', 'Category', 'Vendor', 'Price', 'Stock', 'Status'];
      const csvRows = filteredProducts.map(p => [
        p.name,
        p.sku || '',
        p.category,
        p.vendor,
        p.sellingPrice || p.price || 0,
        p.stock,
        p.status,
      ]);

      const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `products_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      // Use setTimeout to ensure click completes before removal
      setTimeout(() => {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
      }, 100);

      toast({
        title: 'Success',
        description: `Exported ${filteredProducts.length} products to CSV`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Failed to export:', error);
      toast({
        title: 'Error',
        description: 'Failed to export products',
        variant: 'destructive',
      });
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setVendorFilter('all');
    setStatusFilter('all');
    setStockFilter('all');
  };

  const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return '-';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
  };
  const isJewelleryDialogProduct = viewProductData?.product_type === 'Jewellery';

  const fetchProductDetails = async (id: string) => {
    try {
      setLoadingProductDetails(true);
      const response = await fetch(`/api/admin/products/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.error || 'Failed to fetch product details');
      }
      const data = await response.json();
      setViewProductData(data);
    } catch (error) {
      console.error('[v0] Failed to fetch product details:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch product details',
        variant: 'destructive',
      });
    } finally {
      setLoadingProductDetails(false);
    }
  };

  const handleViewProduct = (productId?: string) => {
    if (!productId) return;
    setViewProductId(productId);
    setViewProductData(null);
    fetchProductDetails(productId);
  };

  const DetailItem = ({ label, value }: { label: string; value?: ReactNode }) => (
    <div>
      <strong>{label}:</strong>
      <p className='mt-0.5 text-slate-900 dark:text-white'>{value ?? '-'}</p>
    </div>
  );

  return (
    <>
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-slate-900 dark:text-white'>Products</h1>
            <p className='text-slate-600 dark:text-slate-400 mt-1'>
              Showing {filteredProducts.length} of {total} products
            </p>
          </div>
          <div className='flex gap-3'>
            <Button
              variant='outline'
              className='gap-2 border-slate-300 dark:border-slate-600'
              onClick={handleExport}
              disabled={filteredProducts.length === 0}>
              <Download className='w-4 h-4' />
              Export CSV
            </Button>
            <Button className='gap-2 bg-[#22c55e] text-white' onClick={handleAddProduct}>
              <Plus className='h-4 w-4' />
              Add Product
            </Button>
          </div>
        </div>

        <Card className='p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'>
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <h3 className='text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2'>
                <Filter className='w-5 h-5' />
                Filters
              </h3>
            </div>

            <div className='flex flex-row flex-wrap gap-2'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400' />
                <Input
                  placeholder='Search by name, SKU, brand...'
                  value={searchTerm}
                  onChange={e => handleSearchChange(e.target.value)}
                  className='pl-10 bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 max-w-[300px]'
                />
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className='bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600'>
                  <SelectValue placeholder='All Categories' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Categories</SelectItem>
                  {(Array.isArray(categories) ? categories : []).map(cat => (
                    <SelectItem key={cat._id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger className='bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600'>
                  <SelectValue placeholder='All Vendors' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Vendors</SelectItem>
                  {(Array.isArray(vendors) ? vendors : []).map(vendor => (
                    <SelectItem key={vendor._id} value={vendor.storeName}>
                      {vendor.storeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className='bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600'>
                  <SelectValue placeholder='All Statuses' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Statuses</SelectItem>
                  <SelectItem value='active'>Active</SelectItem>
                  <SelectItem value='inactive'>Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className='bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600'>
                  <SelectValue placeholder='All Stock' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Stock Levels</SelectItem>
                  <SelectItem value='in-stock'>In Stock</SelectItem>
                  <SelectItem value='low-stock'>Low Stock (≤10)</SelectItem>
                  <SelectItem value='out-of-stock'>Out of Stock</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant='outline'
                size='sm'
                onClick={handleClearFilters}
                className='text-slate-600 dark:text-slate-400 !h-[36px] dark:hover:text-white'>
                Clear All
              </Button>
            </div>
          </div>

          <div>
            {loading ? (
              <div className='text-center py-8 text-slate-600 dark:text-slate-400'>Loading products...</div>
            ) : filteredProducts.length === 0 ? (
              <div className='text-center py-8 text-slate-600 dark:text-slate-400'>No products found matching your filters</div>
            ) : (
              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow className='border-b-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-700/40'>
                      <TableHead className='font-semibold text-slate-900 dark:text-white py-4 px-4'>Product</TableHead>
                      <TableHead className='font-semibold text-slate-900 dark:text-white py-4 px-4'>Vendor</TableHead>
                      <TableHead className='font-semibold text-slate-900 dark:text-white py-4 px-4'>Price</TableHead>
                      <TableHead className='font-semibold text-slate-900 dark:text-white py-4 px-4 text-center'>Stock</TableHead>
                      <TableHead className='font-semibold text-slate-900 dark:text-white py-4 px-4 text-center'>Status</TableHead>
                      <TableHead className='font-semibold text-slate-900 dark:text-white py-4 px-4 text-center'>Trending</TableHead>
                      <TableHead className='font-semibold text-slate-900 dark:text-white py-4 px-4 text-center'>Best Seller</TableHead>
                      <TableHead className='font-semibold text-slate-900 dark:text-white py-4 px-4 text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map(product => (
                      <TableRow
                        key={product._id || product.id}
                        className='border-b border-slate-100 dark:border-slate-700 hover:bg-green-50 dark:hover:bg-slate-700/50 transition-colors duration-150'>
                        <TableCell className='py-4 px-4'>
                          <div className='flex items-start gap-3'>
                            {product.image && (
                              <img
                                src={product.image || '/placeholder.svg'}
                                alt={product.name}
                                className='w-12 h-12 rounded-lg border border-slate-200 dark:border-slate-600 object-cover shadow-sm flex-shrink-0'
                              />
                            )}
                            <div className='flex-1 min-w-0'>
                              <span className='font-medium text-slate-900 dark:text-white block break-words whitespace-normal'>{product.name}</span>
                              {product.sku && <p className='text-xs text-slate-500 dark:text-slate-400 mt-1 break-words'>SKU: {product.sku}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className='py-4 px-4 text-sm text-slate-700 dark:text-slate-300 font-medium'>{product.vendor}</TableCell>
                        <TableCell className='py-4 px-4 text-sm font-semibold text-slate-900 dark:text-white'>
                          ₹{(product.sellingPrice || product.price || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className='py-4 px-4 text-center'>
                          <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                              product.stock === 0
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                : product.stock <= 10
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            }`}>
                            {product.stock}
                          </span>
                        </TableCell>
                        <TableCell className='py-4 px-4 text-center'>
                          <Switch
                            size='md'
                            checked={product.status === 'active'}
                            onCheckedChange={() => handleToggleStatus(product._id || product.id || '', product.status)}
                          />
                        </TableCell>
                        <TableCell className='py-4 px-4 text-center'>
                          <Switch
                            size='md'
                            checked={product.trending || false}
                            onCheckedChange={() => handleToggleTrending(product._id || product.id || '', product.trending || false)}
                          />
                        </TableCell>
                        <TableCell className='py-4 px-4 text-center'>
                          <Switch
                            size='md'
                            checked={product.bestSeller || false}
                            onCheckedChange={() => handleToggleBestSeller(product._id || product.id || '', product.bestSeller || false)}
                          />
                        </TableCell>
                        <TableCell className='py-4 px-4 text-right'>
                          <div className='flex justify-end gap-6'>
                            <button
                              onClick={() => handleViewProduct(product._id || product.id)}
                              title='View product'
                              className='text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer'>
                              <Eye className='h-5 w-5' />
                            </button>
                            {/* Edit Icon Button */}
                            <button
                              onClick={() => handleEditProduct(product)}
                              title='Edit product'
                              className='text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer'>
                              <Pencil className='h-5 w-5' />
                            </button>
                            {/* Delete Icon Button */}
                            <button
                              onClick={() => handleDeleteClick(product._id || product.id || '')}
                              title='Delete product'
                              className='text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer'>
                              <Trash2 className='h-5 w-5' />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className='px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50'>
              <div className='flex items-center gap-2'>
                <span className='text-sm text-slate-600 dark:text-slate-400'>
                  Showing <span className='font-medium'>{(page - 1) * limit + 1}</span> to{' '}
                  <span className='font-medium'>{Math.min(page * limit, total)}</span> of{' '}
                  <span className='font-medium'>{total}</span> products
                </span>
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-sm text-slate-600 dark:text-slate-400'>Items per page:</span>
                <select
                  value={limit}
                  onChange={e => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className='border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-web'>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className='flex items-center gap-1'>
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className='px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300'>
                  First
                </button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className='px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300'>
                  Previous
                </button>
                {getPageNumbers().map((pageNum, index) => (
                  <button
                    key={index}
                    onClick={() => typeof pageNum === 'number' && setPage(pageNum)}
                    disabled={typeof pageNum === 'string' || pageNum === page}
                    className={`px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium min-w-[40px] ${
                      pageNum === page
                        ? 'bg-web text-white border-web'
                        : typeof pageNum === 'string'
                        ? 'cursor-default border-transparent'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300'
                    }`}>
                    {pageNum}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className='px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300'>
                  Next
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className='px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300'>
                  Last
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className='bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-slate-900 dark:text-white'>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className='text-slate-600 dark:text-slate-400'>
              This action cannot be undone. This will permanently delete the product from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='border-slate-200 dark:border-slate-700'>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className='bg-red-600 hover:bg-red-700 text-white'>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CommonDialog
        open={!!viewProductId}
        onOpenChange={open => {
          if (!open) {
            setViewProductId(null);
            setViewProductData(null);
          }
        }}
        title='Product Details'
        description={viewProductData?.sku || viewProductData?._id}
        cancelText='Close'
        loading={loadingProductDetails}>
        {viewProductData && (
          <div className='mt-1 space-y-6 text-sm text-gray-700'>
            {viewProductData.mainImage && (
              <div className='flex flex-col'>
                <strong>Primary Image:</strong>
                <img
                  src={viewProductData.mainImage}
                  alt={viewProductData.name}
                  className='mt-2 w-32 h-32 object-cover rounded-lg border shadow-sm'
                />
              </div>
            )}

            <div className='grid grid-cols-1 sm:grid-cols-4 gap-4'>
              <DetailItem label='Name' value={viewProductData.name} />
              <DetailItem label='SKU' value={viewProductData.sku} />
              <DetailItem label='Category' value={viewProductData.category} />
              <DetailItem label='Vendor' value={viewProductData.vendor} />
              <DetailItem label='Product Type' value={viewProductData.product_type} />
              <DetailItem label='Brand' value={viewProductData.brand} />
              <DetailItem label='Status' value={viewProductData.status} />
              <DetailItem label='Visibility' value={viewProductData.visibility} />
              <DetailItem label='Featured' value={viewProductData.featured ? 'Yes' : 'No'} />
            </div>

            {isJewelleryDialogProduct ? (
              <div className='grid grid-cols-1 sm:grid-cols-4 gap-4'>
                <DetailItem label='Jewellery Title' value={viewProductData.name} />
                <DetailItem
                  label='Weight (gm)'
                  value={
                    typeof viewProductData.jewelleryWeight === 'number' && viewProductData.jewelleryWeight > 0
                      ? `${viewProductData.jewelleryWeight} gm`
                      : '-'
                  }
                />
                <DetailItem label='Purity' value={viewProductData.jewelleryPurity || '-'} />
                <DetailItem
                  label='Making Charges'
                  value={
                    typeof viewProductData.jewelleryMakingCharges === 'number' && viewProductData.jewelleryMakingCharges > 0
                      ? formatCurrency(viewProductData.jewelleryMakingCharges)
                      : '-'
                  }
                />
                <DetailItem label='Stone Details' value={viewProductData.jewelleryStoneDetails || '-'} />
                <DetailItem label='Stock' value={viewProductData.stock} />
                <DetailItem label='Allow Reviews' value={viewProductData.allowReviews ? 'Yes' : 'No'} />
                <DetailItem label='Return Policy (days)' value={viewProductData.returnPolicyDays} />
                <DetailItem label='Return Policy' value={viewProductData.return_policy || '-'} />
              </div>
            ) : (
              <div className='grid grid-cols-1 sm:grid-cols-4 gap-4'>
                <DetailItem label='Selling Price' value={formatCurrency(viewProductData.sellingPrice || viewProductData.price)} />
                <DetailItem label='Cost Price' value={formatCurrency(viewProductData.costPrice)} />
                <DetailItem label='Regular Price' value={formatCurrency(viewProductData.regularPrice)} />
                <DetailItem label='Stock' value={viewProductData.stock} />
                <DetailItem label='Low Stock Threshold' value={viewProductData.lowStockThreshold} />
                <DetailItem label='Allow Backorders' value={viewProductData.allowBackorders ? 'Yes' : 'No'} />
                <DetailItem label='Allow Reviews' value={viewProductData.allowReviews ? 'Yes' : 'No'} />
                <DetailItem label='Free Shipping' value={viewProductData.free_shipping ? 'Yes' : 'No'} />
                <DetailItem label='Allow Return' value={viewProductData.allow_return ? 'Yes' : 'No'} />
                <DetailItem label='Return Policy (days)' value={viewProductData.returnPolicyDays} />
                <DetailItem label='Return Policy' value={viewProductData.return_policy || '-'} />
              </div>
            )}

            <div className='grid grid-cols-1 sm:grid-cols-4 gap-4'>
              <DetailItem label='Warranty' value={viewProductData.warrantyPeriod} />
              <DetailItem label='URL Slug' value={viewProductData.urlSlug} />
              <DetailItem label='Focus Keyword' value={viewProductData.focusKeyword} />
              <DetailItem
                label='Tags'
                value={Array.isArray(viewProductData.tags) && viewProductData.tags.length ? viewProductData.tags.join(', ') : '-'}
              />
              <DetailItem label='Created' value={viewProductData.createdAt ? formatIndianDate(viewProductData.createdAt) : '-'} />
              <DetailItem label='Updated' value={viewProductData.updatedAt ? formatIndianDate(viewProductData.updatedAt) : '-'} />
            </div>

            {viewProductData.shortDescription && (
              <div>
                <strong>Short Description:</strong>
                <p className='mt-1 whitespace-pre-line leading-relaxed text-gray-800 dark:text-gray-200'>
                  {viewProductData.shortDescription}
                </p>
              </div>
            )}

            {viewProductData.longDescription && (
              <div>
                <strong>Long Description:</strong>
                <div
                  className='mt-1 whitespace-pre-line leading-relaxed text-gray-800 dark:text-gray-200'
                  dangerouslySetInnerHTML={{ __html: viewProductData.longDescription }}
                />
              </div>
            )}

            {Array.isArray(viewProductData.galleryImages) && viewProductData.galleryImages.length > 0 && (
              <div>
                <strong>Gallery:</strong>
                <div className='mt-2 grid grid-cols-3 gap-3'>
                  {viewProductData.galleryImages.map((media, idx) => {
                    const isVideo = typeof media === 'string' && (media.startsWith('data:video/') || media.includes('video'));
                    return isVideo ? (
                      <video
                        key={`gallery-${idx}`}
                        src={media}
                        className='w-20 h-20 object-cover rounded-md border'
                        controls
                        muted
                      />
                    ) : (
                      <img key={`gallery-${idx}`} src={media} alt='Gallery' className='w-20 h-20 object-cover rounded-md border' />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CommonDialog>
    </>
  );
}
