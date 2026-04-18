'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Product {
  _id: string;
  id?: string;
  name: string;
  sellingPrice?: number;
  price?: number;
  mainImage?: string;
}

interface MonthlyProduct {
  id: number | string;
  name: string;
  price: string;
  image: string;
}

interface MonthlyBannerFormData {
  title: string;
  description: string;
  month: number;
  year: number;
  categories: string[];
  products: MonthlyProduct[];
  order: number;
  status: 'active' | 'inactive';
}

interface MonthlyBannerFormPageProps {
  bannerId?: string;
}

const monthOptions = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export function MonthlyBannerFormPage({ bannerId }: MonthlyBannerFormPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const currentDate = new Date();
  const [formData, setFormData] = useState<MonthlyBannerFormData>({
    title: '',
    description: '',
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
    categories: [],
    products: [],
    order: 0,
    status: 'active',
  });

  useEffect(() => {
    if (bannerId) {
      fetchBanner();
    }
    fetchProducts();
  }, [bannerId]);

  const fetchBanner = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/cms/monthly-banners/${bannerId}`);
      if (response.ok) {
        const data = await response.json();
        setFormData({
          title: data.title || '',
          description: data.description || '',
          month: data.month || currentDate.getMonth() + 1,
          year: data.year || currentDate.getFullYear(),
          categories: data.categories || [],
          products: data.products || [],
          order: data.order || 0,
          status: data.status || 'active',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load monthly banner',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Failed to fetch monthly banner:', error);
      toast({
        title: 'Error',
        description: 'Failed to load monthly banner',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/admin/products');
      if (response.ok) {
        const data = await response.json();
        setAllProducts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('[v0] Failed to fetch products:', error);
    }
  };

  const updateField = (field: keyof MonthlyBannerFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const addCategory = () => {
    if (newCategory.trim() && !formData.categories.includes(newCategory.trim())) {
      updateField('categories', [...formData.categories, newCategory.trim()]);
      setNewCategory('');
    }
  };

  const removeCategory = (category: string) => {
    updateField(
      'categories',
      formData.categories.filter(c => c !== category)
    );
  };

  const addProduct = (product: Product) => {
    const monthlyProduct: MonthlyProduct = {
      id: product._id || product.id || Date.now(),
      name: product.name,
      price: `$${(product.sellingPrice || product.price || 0).toFixed(2)}`,
      image: product.mainImage || '',
    };
    updateField('products', [...formData.products, monthlyProduct]);
    setProductDialogOpen(false);
    setProductSearch('');
  };

  const removeProduct = (id: number | string) => {
    updateField(
      'products',
      formData.products.filter(p => p.id !== id)
    );
  };

  const filteredProducts = allProducts.filter(p => p?.name?.toLowerCase()?.includes(productSearch.toLowerCase()));

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (formData.products.length === 0) {
      newErrors.products = 'At least one product is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the highlighted fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const url = bannerId ? `/api/admin/cms/monthly-banners/${bannerId}` : '/api/admin/cms/monthly-banners';
      const method = bannerId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Monthly banner ${bannerId ? 'updated' : 'created'} successfully`,
          variant: 'success',
        });
        router.push('/admin/cms/monthly-banners');
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || `Failed to ${bannerId ? 'update' : 'create'} monthly banner`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Submit error:', error);
      toast({
        title: 'Error',
        description: 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button variant='outline' onClick={() => router.back()} className='gap-2'>
            <ArrowLeft className='h-4 w-4' />
            Back
          </Button>
          <h1 className='text-3xl font-bold'>{bannerId ? 'Edit Monthly Banner' : 'Add New Monthly Banner'}</h1>
        </div>
      </div>

      <Card className='p-6 shadow-md'>
        <form onSubmit={handleSubmit} className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='space-y-2'>
              <Label htmlFor='title'>
                Title <span className='text-red-500'>*</span>
              </Label>
              <Input
                id='title'
                value={formData.title}
                onChange={e => updateField('title', e.target.value)}
                placeholder='The October Cleaner Fashion'
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && <p className='text-sm text-red-500'>{errors.title}</p>}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='order'>Display Order</Label>
              <Input
                id='order'
                type='number'
                value={formData.order}
                onChange={e => updateField('order', parseInt(e.target.value) || 0)}
                placeholder='0'
              />
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='space-y-2'>
              <Label htmlFor='month'>Month</Label>
              <Select value={formData.month.toString()} onValueChange={value => updateField('month', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(option => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='year'>Year</Label>
              <Input
                id='year'
                type='number'
                value={formData.year}
                onChange={e => updateField('year', parseInt(e.target.value) || currentDate.getFullYear())}
                placeholder={currentDate.getFullYear().toString()}
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='description'>Description</Label>
            <Textarea
              id='description'
              value={formData.description}
              onChange={e => updateField('description', e.target.value)}
              placeholder='We create care products that really work and are designed to make you feel good.'
              rows={3}
            />
          </div>

          <div className='space-y-4'>
            <Label>Categories</Label>
            <div className='flex gap-2'>
              <Input
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                placeholder='Add category (e.g., Outerwear Collection)'
                onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addCategory())}
              />
              <Button type='button' onClick={addCategory} variant='outline'>
                <Plus className='h-4 w-4' />
              </Button>
            </div>
            <div className='flex flex-wrap gap-2'>
              {formData.categories.map(category => (
                <div key={category} className='flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full'>
                  <span className='text-sm'>{category}</span>
                  <button type='button' onClick={() => removeCategory(category)} className='text-red-500 hover:text-red-700'>
                    <X className='h-3 w-3' />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <Label>
                Products <span className='text-red-500'>*</span>
              </Label>
              <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
                <DialogTrigger asChild>
                  <Button type='button' variant='outline' size='sm' className='gap-2'>
                    <Plus className='h-4 w-4' />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className='max-w-2xl max-h-[80vh] overflow-y-auto'>
                  <DialogHeader>
                    <DialogTitle>Select Products</DialogTitle>
                    <DialogDescription>Search and select products to add to this monthly banner</DialogDescription>
                  </DialogHeader>
                  <div className='space-y-4'>
                    <Input placeholder='Search products...' value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                    <div className='space-y-2 max-h-96 overflow-y-auto'>
                      {filteredProducts.map(product => (
                        <div
                          key={product._id || product.id}
                          className='flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer'
                          onClick={() => addProduct(product)}>
                          <img
                            src={product.mainImage || '/placeholder.jpg'}
                            alt={product.name}
                            className='w-16 h-16 object-cover rounded'
                          />
                          <div className='flex-1'>
                            <p className='font-semibold'>{product.name}</p>
                            <p className='text-sm text-gray-500'>${(product.sellingPrice || product.price || 0).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {errors.products && <p className='text-sm text-red-500'>{errors.products}</p>}

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {formData.products.map(product => (
                <Card key={product.id} className='p-4 border border-gray-200'>
                  <div className='flex items-start gap-4'>
                    <img src={product.image || '/placeholder.jpg'} alt={product.name} className='w-20 h-20 object-cover rounded' />
                    <div className='flex-1'>
                      <p className='font-semibold'>{product.name}</p>
                      <p className='text-sm text-gray-600'>{product.price}</p>
                    </div>
                    <Button
                      type='button'
                      onClick={() => removeProduct(product.id)}
                      variant='ghost'
                      size='sm'
                      className='text-red-500 hover:text-red-700'>
                      <X className='h-4 w-4' />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <Switch
              checked={formData.status === 'active'}
              onCheckedChange={checked => updateField('status', checked ? 'active' : 'inactive')}
            />
            <Label>Active</Label>
          </div>

          <div className='flex justify-end gap-4'>
            <Button type='button' variant='outline' onClick={() => router.back()} disabled={loading}>
              Cancel
            </Button>
            <Button type='submit' disabled={loading} className='bg-[#22c55e]'>
              {loading ? 'Saving...' : bannerId ? 'Update Monthly Banner' : 'Create Monthly Banner'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
