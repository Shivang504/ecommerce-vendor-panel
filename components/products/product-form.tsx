'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ArrowLeft, X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Product {
  _id?: string;
  name: string;
  sku: string;
  shortDescription: string;
  longDescription: string;
  category: string;
  subcategory: string;
  brand: string;
  tags: string[];
  regularPrice: number;
  sellingPrice: number;
  costPrice: number;
  taxRate: number;
  stock: number;
  lowStockThreshold: number;
  allowBackorders: boolean;
  barcode: string;
  weight: number;
  dimensions: string;
  shippingClass: string;
  processingTime: string;
  product_type: 'Physical Product' | 'Digital Product' | 'External / Affiliate Product';
  free_shipping: boolean;
  allow_return: boolean;
  return_policy: string;
  metaTitle: string;
  metaDescription: string;
  urlSlug: string;
  focusKeyword: string;
  mainImage: string;
  galleryImages: string[];
  productVideo: string;
  variants: Array<{
    id: string;
    type: string;
    options: Array<{
      name: string;
      sku: string;
      price: number;
      stock: number;
      image: string;
    }>;
  }>;
  relatedProducts: string[];
  status: string;
  visibility: string;
  featured: boolean;
  trending: boolean;
  bestSeller: boolean;
  allowReviews: boolean;
  returnPolicyDays: number;
  warrantyPeriod: string;
  vendor: string;
}

const INITIAL_PRODUCT: Product = {
  name: '',
  sku: '',
  shortDescription: '',
  longDescription: '',
  category: 'Electronics',
  subcategory: '',
  brand: '',
  tags: [],
  regularPrice: 0,
  sellingPrice: 0,
  costPrice: 0,
  taxRate: 18,
  stock: 0,
  lowStockThreshold: 10,
  allowBackorders: false,
  barcode: '',
  weight: 0,
  dimensions: '',
  shippingClass: 'Standard',
  processingTime: '1-2 days',
  product_type: 'Physical Product',
  free_shipping: false,
  allow_return: false,
  return_policy: '',
  metaTitle: '',
  metaDescription: '',
  urlSlug: '',
  focusKeyword: '',
  mainImage: '',
  galleryImages: [],
  productVideo: '',
  variants: [],
  relatedProducts: [],
  status: 'active',
  visibility: 'Public',
  featured: false,
  trending: false,
  bestSeller: false,
  allowReviews: true,
  returnPolicyDays: 30,
  warrantyPeriod: '1 year',
  vendor: 'Main Store',
};

interface ProductFormProps {
  product?: Product | null;
  onSave: () => void;
  onCancel: () => void;
}

export function ProductForm({ product, onSave, onCancel }: ProductFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Product>(() => {
    if (!product) return INITIAL_PRODUCT;
    return {
      ...INITIAL_PRODUCT,
      ...product,
      tags: product.tags || [],
      galleryImages: product.galleryImages || [],
      variants: product.variants || [],
      relatedProducts: product.relatedProducts || [],
    };
  });
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  // Fetch categories and vendors on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all categories with hierarchy
        const categoriesResponse = await fetch('/api/categories/with-hierarchy?status=active');
        const categoriesData = await categoriesResponse.json();
        const allCategories = Array.isArray(categoriesData.categories) ? categoriesData.categories : [];

        // Build flat list with all options
        const flatCategories: any[] = [];

        allCategories.forEach((category: any) => {
          // Add main category
          flatCategories.push({
            _id: category._id,
            name: category.name,
            displayLabel: category.name,
            value: category.name,
          });

          // Add subcategories if they exist
          if (category.subcategories && Array.isArray(category.subcategories)) {
            category.subcategories.forEach((subcategory: any) => {
              // Add subcategory (Category > Subcategory)
              flatCategories.push({
                _id: subcategory._id,
                name: subcategory.name,
                displayLabel: `${category.name} > ${subcategory.name}`,
                value: `${category.name} > ${subcategory.name}`,
              });

              // Add child categories if they exist
              if (subcategory.childCategories && Array.isArray(subcategory.childCategories)) {
                subcategory.childCategories.forEach((childCategory: any) => {
                  // Add child category (Category > Subcategory > Child Category)
                  flatCategories.push({
                    _id: childCategory._id,
                    name: childCategory.name,
                    displayLabel: `${category.name} > ${subcategory.name} > ${childCategory.name}`,
                    value: `${category.name} > ${subcategory.name} > ${childCategory.name}`,
                  });
                });
              }
            });
          }
        });
        
        setCategories(flatCategories);

        // Fetch vendors
        const vendorsResponse = await fetch('/api/admin/vendors');
        const vendorsData = await vendorsResponse.json();
        const allVendors = Array.isArray(vendorsData.vendors) ? vendorsData.vendors : [];
        
        // Filter only approved vendors
        const approvedVendors = allVendors.filter((vendor: any) => vendor.status === 'approved');
        
        setVendors(approvedVendors);
      } catch (error) {
        console.error('[v0] Failed to fetch categories or vendors:', error);
      }
    };
    fetchData();
  }, []);

  const tabs = [
    { id: 'basic', label: 'Basic Information' },
    { id: 'pricing', label: 'Pricing & Tax' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'images', label: 'Images' },
    { id: 'variants', label: 'Variants' },
    { id: 'shipping', label: 'Shipping' },
    { id: 'seo', label: 'SEO' },
    { id: 'settings', label: 'Additional Settings' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const errors: string[] = [];

      if (!formData.product_type?.trim()) errors.push('Product type');
      if (!formData.name?.trim()) errors.push('Product name');
      if (!formData.sku?.trim()) errors.push('SKU');
      if (!formData.shortDescription?.trim()) errors.push('Short description');
      if (!formData.longDescription?.trim()) errors.push('Long description');
      if (formData.regularPrice <= 0) errors.push('Regular price (must be > 0)');
      if (formData.sellingPrice <= 0) errors.push('Selling price (must be > 0)');
      if (formData.sellingPrice > formData.regularPrice) errors.push('Selling price cannot exceed regular price');
      if (formData.stock < 0) errors.push('Stock cannot be negative');
      if (!formData.urlSlug?.trim()) errors.push('URL slug');
      if (!formData.metaTitle?.trim()) errors.push('Meta title');
      if (!formData.metaDescription?.trim()) errors.push('Meta description');
      if (!formData.mainImage?.trim()) errors.push('Main image');
      if (!formData.category?.trim()) errors.push('Category');
      if (!formData.vendor?.trim()) errors.push('Vendor');
      if (formData.allow_return && !formData.return_policy?.trim()) {
        errors.push('Return policy (required when returns are enabled)');
      }

      if (errors.length > 0) {
        const errorMessage = `Missing or invalid required fields:\n${errors.map(e => `• ${e}`).join('\n')}`;
        toast({
          title: 'Validation Error',
          description: errorMessage,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const method = product?._id ? 'PUT' : 'POST';
      const url = product?._id ? `/api/admin/products/${product._id}` : '/api/admin/products';

      const dataToSubmit = {
        ...formData,
        ...(product?._id && { _id: product._id }),
      };

      console.log('[v0] Submitting product:', { method, url, productId: product?._id });

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit),
      });

      const responseData = await response.json();
      
      console.log('[v0] Response:', { status: response.status, ok: response.ok });

      if (response.ok) {
        toast({
          title: 'Success',
          description: product ? 'Product updated successfully' : 'Product created successfully',
          variant: 'default',
        });
        onSave();
      } else {
        console.error('[v0] API error:', responseData);
        toast({
          title: 'Error',
          description: responseData.error || `Failed to save product (${response.status})`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Submit error:', error);
      toast({
        title: 'Error',
        description: 'Network error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof Product, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      handleChange('tags', [...formData.tags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    handleChange('tags', formData.tags.filter(t => t !== tag));
  };

  const autoGenerateSlug = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    handleChange('urlSlug', slug);
  };

  return (
    <div className="space-y-6 w-full">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {product ? 'Edit Product' : 'Add New Product'}
        </h2>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-green-600 text-green-600 dark:text-green-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Product Type *
                  </label>
                  <select
                    value={formData.product_type}
                    onChange={(e) => handleChange('product_type', e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    required
                  >
                    <option value="">Select Product Type</option>
                    <option value="Physical Product">Physical Product</option>
                    <option value="Digital Product">Digital Product</option>
                    <option value="External / Affiliate Product">External / Affiliate Product</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Vendor *
                  </label>
                  <select
                    value={formData.vendor}
                    onChange={(e) => handleChange('vendor', e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    required
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map((vendor: any) => (
                      <option key={vendor._id} value={vendor.storeName || vendor.name}>
                        {vendor.storeName || vendor.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Product Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter product name"
                  className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">SKU *</label>
                  <Input
                    value={formData.sku}
                    onChange={(e) => handleChange('sku', e.target.value)}
                    placeholder="Auto-generate or enter SKU"
                    className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Brand</label>
                  <Input
                    value={formData.brand}
                    onChange={(e) => handleChange('brand', e.target.value)}
                    placeholder="Product brand"
                    className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    required
                  >
                    <option value="">Select Category / Subcategory / Child Category</option>
                    {categories.map((cat: any) => (
                      <option key={cat._id} value={cat.value || cat.name}>
                        {cat.displayLabel || cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Short Description *
                </label>
                <textarea
                  value={formData.shortDescription}
                  onChange={(e) => handleChange('shortDescription', e.target.value)}
                  placeholder="Brief product description"
                  className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  rows={2}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Long Description *
                </label>
                <textarea
                  value={formData.longDescription}
                  onChange={(e) => handleChange('longDescription', e.target.value)}
                  placeholder="Detailed product description"
                  className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  rows={4}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Tags (Multi-select)
                </label>
                <div className="flex gap-2 mb-2">
                  <Input
                    id="tagInput"
                    placeholder="Enter tag and press Add"
                    className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('tagInput') as HTMLInputElement;
                      if (input) {
                        addTag(input.value);
                        input.value = '';
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(formData.tags || []).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-green-900 dark:hover:text-green-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* Pricing & Tax Tab */}
          {activeTab === 'pricing' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Regular Price (MRP) *
                  </label>
                  <Input
                    type="number"
                    value={formData.regularPrice}
                    onChange={(e) => handleChange('regularPrice', parseFloat(e.target.value))}
                    placeholder="0.00"
                    className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Selling Price *
                  </label>
                  <Input
                    type="number"
                    value={formData.sellingPrice}
                    onChange={(e) => handleChange('sellingPrice', parseFloat(e.target.value))}
                    placeholder="0.00"
                    className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Cost Price (optional)
                  </label>
                  <Input
                    type="number"
                    value={formData.costPrice}
                    onChange={(e) => handleChange('costPrice', parseFloat(e.target.value))}
                    placeholder="0.00"
                    className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Tax/GST Rate * (%)
                </label>
                <select
                  value={formData.taxRate}
                  onChange={(e) => handleChange('taxRate', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  required
                >
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                  <option value={28}>28%</option>
                </select>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Discount: <span className="font-semibold text-slate-900 dark:text-white">
                    {formData.regularPrice > 0
                      ? (((formData.regularPrice - formData.sellingPrice) / formData.regularPrice) * 100).toFixed(1)
                      : 0}
                    %
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Stock Status *
                </label>
                <select
                  value={formData.stock > 0 ? 'In Stock' : 'Out of Stock'}
                  onChange={(e) => handleChange('stock', e.target.value === 'In Stock' ? formData.stock || 1 : 0)}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  required
                >
                  <option value="In Stock">In Stock</option>
                  <option value="Out of Stock">Out of Stock</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Stock Quantity *
                </label>
                <Input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => handleChange('stock', parseInt(e.target.value))}
                  placeholder="0"
                  className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Low Stock Threshold (alert)
                </label>
                <Input
                  type="number"
                  value={formData.lowStockThreshold}
                  onChange={(e) => handleChange('lowStockThreshold', parseInt(e.target.value))}
                  placeholder="10"
                  className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="backorders"
                  checked={formData.allowBackorders}
                  onChange={(e) => handleChange('allowBackorders', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                />
                <label htmlFor="backorders" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Allow Backorders
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Barcode/UPC (optional)
                </label>
                <Input
                  value={formData.barcode}
                  onChange={(e) => handleChange('barcode', e.target.value)}
                  placeholder="Enter barcode or UPC"
                  className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                />
              </div>
            </div>
          )}

          {activeTab === 'images' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Main Image * (Drag & drop)
                </label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          handleChange('mainImage', event.target?.result as string);
                        };
                        reader.readAsDataURL(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    id="mainImage"
                  />
                  <label htmlFor="mainImage" className="cursor-pointer">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">Recommended: 800×800px, JPG/PNG</p>
                  </label>
                  {formData.mainImage && (
                    <div className="mt-4">
                      <img src={formData.mainImage || "/placeholder.svg"} alt="Main" className="h-32 mx-auto rounded" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Gallery Images & Videos (Multiple upload)
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  Upload images or videos. Videos must be 10MB or less.
                </p>
                <Input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      const files = Array.from(e.target.files);
                      const validFiles: File[] = [];
                      const errors: string[] = [];

                      // Validate each file
                      files.forEach(file => {
                        const isVideo = file.type.startsWith('video/');
                        const isImage = file.type.startsWith('image/');

                        if (!isImage && !isVideo) {
                          errors.push(`${file.name} is not a valid image or video file`);
                          return;
                        }

                        // Check file size for videos (10MB limit)
                        if (isVideo && file.size > 10 * 1024 * 1024) {
                          errors.push(`${file.name} is too large. Videos must be 10MB or less.`);
                          return;
                        }

                        validFiles.push(file);
                      });

                      // Show errors if any
                      if (errors.length > 0) {
                        errors.forEach(error => {
                          toast({
                            title: 'Upload Error',
                            description: error,
                            variant: 'destructive',
                          });
                        });
                      }

                      // Process valid files
                      if (validFiles.length > 0) {
                        const newMedia: string[] = [];
                        let processedCount = 0;

                        validFiles.forEach(file => {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            newMedia.push(event.target?.result as string);
                            processedCount++;
                            if (processedCount === validFiles.length) {
                              handleChange('galleryImages', [...formData.galleryImages, ...newMedia]);
                            }
                          };
                          reader.readAsDataURL(file);
                        });
                      }
                    }
                  }}
                  className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                />
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {(formData.galleryImages || []).map((media, idx) => {
                    const isVideo = typeof media === 'string' && (media.startsWith('data:video/') || media.includes('video'));
                    return (
                      <div key={`gallery-${idx}`} className="relative">
                        {isVideo ? (
                          <video
                            src={media || '/placeholder.svg'}
                            className="h-24 w-full object-cover rounded"
                            controls
                            muted
                          />
                        ) : (
                          <img
                            src={media || '/placeholder.svg'}
                            alt={`Gallery ${idx}`}
                            className="h-24 w-full object-cover rounded"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => handleChange('galleryImages', (formData.galleryImages || []).filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded hover:bg-red-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Product Video URL (optional)
                </label>
                <Input
                  value={formData.productVideo}
                  onChange={(e) => handleChange('productVideo', e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                />
              </div>
            </div>
          )}

          {activeTab === 'variants' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Add product variants like different sizes or colors
              </p>
              <Button
                type="button"
                onClick={() => {
                  const newVariant = {
                    id: Date.now().toString(),
                    type: 'Color',
                    options: [],
                  };
                  handleChange('variants', [...formData.variants, newVariant]);
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Variant Type
              </Button>

              {(formData.variants || []).map((variant, variantIdx) => (
                <div key={variant.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <input
                      type="text"
                      value={variant.type}
                      onChange={(e) => {
                        const newVariants = [...formData.variants];
                        newVariants[variantIdx].type = e.target.value;
                        handleChange('variants', newVariants);
                      }}
                      placeholder="e.g., Color, Size"
                      className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        handleChange('variants', formData.variants.filter((_, i) => i !== variantIdx));
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Add options for the variant */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Options</p>
                    {(variant.options || []).map((option, optionIdx) => (
                      <div key={`option-${variantIdx}-${optionIdx}`} className="grid grid-cols-4 gap-4 items-center">
                        <Input
                          value={option.name}
                          onChange={(e) => {
                            const newVariants = [...formData.variants];
                            newVariants[variantIdx].options[optionIdx].name = e.target.value;
                            handleChange('variants', newVariants);
                          }}
                          placeholder="Option Name (e.g., Red)"
                          className="col-span-1"
                        />
                        <Input
                          value={option.sku}
                          onChange={(e) => {
                            const newVariants = [...formData.variants];
                            newVariants[variantIdx].options[optionIdx].sku = e.target.value;
                            handleChange('variants', newVariants);
                          }}
                          placeholder="Option SKU"
                          className="col-span-1"
                        />
                        <Input
                          type="number"
                          value={option.price}
                          onChange={(e) => {
                            const newVariants = [...formData.variants];
                            newVariants[variantIdx].options[optionIdx].price = parseFloat(e.target.value);
                            handleChange('variants', newVariants);
                          }}
                          placeholder="Price"
                          className="col-span-1"
                        />
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={option.stock}
                            onChange={(e) => {
                              const newVariants = [...formData.variants];
                              newVariants[variantIdx].options[optionIdx].stock = parseInt(e.target.value);
                              handleChange('variants', newVariants);
                            }}
                            placeholder="Stock"
                            className="w-16"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newVariants = [...formData.variants];
                              newVariants[variantIdx].options.splice(optionIdx, 1);
                              handleChange('variants', newVariants);
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      onClick={() => {
                        const newVariants = [...formData.variants];
                        newVariants[variantIdx].options.push({
                          id: Date.now().toString(),
                          name: '',
                          sku: '',
                          price: 0,
                          stock: 0,
                          image: '',
                        });
                        handleChange('variants', newVariants);
                      }}
                      className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/50"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Option
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Shipping Tab */}
          {activeTab === 'shipping' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Weight (kg)
                </label>
                <Input
                  type="number"
                  value={formData.weight}
                  onChange={(e) => handleChange('weight', parseFloat(e.target.value))}
                  placeholder="0.00"
                  className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Dimensions (L × W × H in cm)
                </label>
                <Input
                  value={formData.dimensions}
                  onChange={(e) => handleChange('dimensions', e.target.value)}
                  placeholder="e.g., 10 × 10 × 10"
                  className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                />
              </div>
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  URL Slug * (auto from name)
                </label>
                <div className="flex gap-2">
                  <Input
                    value={formData.urlSlug}
                    onChange={(e) => handleChange('urlSlug', e.target.value)}
                    placeholder="product-name"
                    className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                    required
                  />
                  <Button
                    type="button"
                    onClick={autoGenerateSlug}
                    className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white"
                  >
                    Auto
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Focus Keyword
                </label>
                <Input
                  value={formData.focusKeyword}
                  onChange={(e) => handleChange('focusKeyword', e.target.value)}
                  placeholder="Main keyword to optimize for"
                  className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Meta Title * <span className="text-slate-500">{formData.metaTitle.length}/60</span>
                </label>
                <Input
                  value={formData.metaTitle}
                  onChange={(e) => handleChange('metaTitle', e.target.value.slice(0, 60))}
                  placeholder="SEO title"
                  className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                  maxLength={60}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Meta Description * <span className="text-slate-500">{formData.metaDescription.length}/160</span>
                </label>
                <textarea
                  value={formData.metaDescription}
                  onChange={(e) => handleChange('metaDescription', e.target.value.slice(0, 160))}
                  placeholder="SEO description"
                  className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  maxLength={160}
                  rows={3}
                  required
                />
              </div>

              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Google Preview Snippet</p>
                <div className="text-sm">
                  <p className="text-blue-600 dark:text-blue-400 truncate">{formData.urlSlug}</p>
                  <p className="font-medium text-slate-900 dark:text-white truncate">{formData.metaTitle || 'Your page title'}</p>
                  <p className="text-slate-600 dark:text-slate-400 line-clamp-2">{formData.metaDescription || 'Your description will appear here'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Product Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  required
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>


              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formData.featured}
                  onChange={(e) => handleChange('featured', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                />
                <label htmlFor="featured" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Featured Product
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="trending"
                  checked={formData.trending}
                  onChange={(e) => handleChange('trending', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                />
                <label htmlFor="trending" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Trending Product
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="bestSeller"
                  checked={formData.bestSeller}
                  onChange={(e) => handleChange('bestSeller', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                />
                <label htmlFor="bestSeller" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Best Seller
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="reviews"
                  checked={formData.allowReviews}
                  onChange={(e) => handleChange('allowReviews', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                />
                <label htmlFor="reviews" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Allow Reviews
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Return Policy (Days)
                </label>
                <Input
                  type="number"
                  value={formData.returnPolicyDays}
                  onChange={(e) => handleChange('returnPolicyDays', parseInt(e.target.value))}
                  placeholder="30"
                  className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Warranty Period
                </label>
                <Input
                  value={formData.warrantyPeriod}
                  onChange={(e) => handleChange('warrantyPeriod', e.target.value)}
                  placeholder="e.g., 1 year"
                  className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Related Products (Select)
                </label>
                <Input
                  placeholder="Search and select related products..."
                  className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                  disabled
                />
                <p className="text-xs text-slate-500 mt-1">Feature coming soon</p>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              className="border-slate-200 dark:border-slate-700"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white">
              {loading ? 'Saving...' : product ? 'Update Product' : 'Add Product'}
            </Button>
            {product && (
              <Button type="button" className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white">
                Preview
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
