'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { MainImageUpload } from '@/components/media/main-image-upload';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Product {
  _id: string;
  id?: string;
  name: string;
  brand?: string;
  sellingPrice?: number;
  price?: number;
  mainImage?: string;
}

interface SeasonalProduct {
  id: number | string;
  brand?: string;
  name: string;
  price: number;
  image: string;
}

interface SeasonalBannerFormData {
  title: string;
  heroImage: string;
  products: SeasonalProduct[];
  order: number;
  status: 'active' | 'inactive';
}

interface SeasonalBannerFormPageProps {
  bannerId?: string;
}

export function SeasonalBannerFormPage({ bannerId }: SeasonalBannerFormPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const [formData, setFormData] = useState<SeasonalBannerFormData>({
    title: '',
    heroImage: '',
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
      const response = await fetch(`/api/admin/cms/seasonal-banners/${bannerId}`);
      if (response.ok) {
        const data = await response.json();
        setFormData({
          title: data.title || '',
          heroImage: data.heroImage || '',
          products: data.products || [],
          order: data.order || 0,
          status: data.status || 'active',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load seasonal banner',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Failed to fetch seasonal banner:', error);
      toast({
        title: 'Error',
        description: 'Failed to load seasonal banner',
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

  const uploadImage = async (file: File) => {
    try {
      const payload = new FormData();
      payload.append('file', file);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: payload,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Upload failed');
      }
      return data.url as string;
    } catch (error) {
      console.error('[v0] Image upload error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload image',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateField = (field: keyof SeasonalBannerFormData, value: any) => {
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

  const addProduct = (product: Product) => {
    const seasonalProduct: SeasonalProduct = {
      id: product._id || product.id || Date.now(),
      brand: product.brand || '',
      name: product.name,
      price: product.sellingPrice || product.price || 0,
      image: product.mainImage || '',
    };
    updateField('products', [...formData.products, seasonalProduct]);
    setProductDialogOpen(false);
    setProductSearch('');
  };

  const removeProduct = (id: number | string) => {
    updateField(
      'products',
      formData.products.filter(p => p.id !== id)
    );
  };

  const filteredProducts = allProducts.filter(p => p?.name?.toLowerCase().includes(productSearch.toLowerCase()));

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.heroImage.trim()) {
      newErrors.heroImage = 'Hero image is required';
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
      const url = bannerId ? `/api/admin/cms/seasonal-banners/${bannerId}` : '/api/admin/cms/seasonal-banners';
      const method = bannerId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Seasonal banner ${bannerId ? 'updated' : 'created'} successfully`,
          variant: 'success',
        });
        router.push('/admin/cms/seasonal-banners');
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || `Failed to ${bannerId ? 'update' : 'create'} seasonal banner`,
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
          <h1 className='text-3xl font-bold'>{bannerId ? 'Edit Seasonal Banner' : 'Add New Seasonal Banner'}</h1>
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
                placeholder='Summer Glow Essentials'
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

          <div className='space-y-2'>
            <Label htmlFor='heroImage'>
              Hero Image <span className='text-red-500'>*</span>
            </Label>
            <MainImageUpload
              value={formData.heroImage}
              onChange={val => updateField('heroImage', val)}
              uploadHandler={uploadImage}
              hideLabel
              recommendedText='Recommended: 800×1000px, JPG/PNG'
            />
            {errors.heroImage && <p className='text-sm text-red-500'>{errors.heroImage}</p>}
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
                    <DialogDescription>Search and select products to add to this seasonal banner</DialogDescription>
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
                            <p className='text-sm text-gray-500'>₹{(product.sellingPrice || product.price || 0).toFixed(2)}</p>
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
                      {product.brand && <p className='text-xs text-gray-500 uppercase'>{product.brand}</p>}
                      <p className='font-semibold'>{product.name}</p>
                      <p className='text-sm text-gray-600'>₹{product.price.toFixed(2)}</p>
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
              {loading ? 'Saving...' : bannerId ? 'Update Seasonal Banner' : 'Create Seasonal Banner'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
