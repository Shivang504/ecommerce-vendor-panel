'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  ArrowLeft,
  X,
  Plus,
  Package,
  Archive,
  Search,
  Settings,
  ImageIcon,
  Loader2,
  Check,
  ChevronDown,
  SlidersHorizontal,
  LucideReceiptIndianRupee,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Dropdown from '../customDropdown/customDropdown';
import FormField from '../formField/formField';
import { MainImageUpload } from '@/components/media/main-image-upload';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { cn, getPlainTextFromHtml } from '@/lib/utils';
import { useSettings } from '@/components/settings/settings-provider';
import { AttributeSelectionMap, sanitizeAttributeSelections } from '@/lib/product-attributes';

const PRODUCT_TYPE_OPTIONS = [
  { label: 'Physical Product', value: 'Physical Product' },
  { label: 'Digital Product', value: 'Digital Product' },
  { label: 'External / Affiliate Product', value: 'External / Affiliate Product' },
  { label: 'Jewellery', value: 'Jewellery' },
] as const;

const WHOLESALE_PRICE_TYPE_OPTIONS = [
  { label: 'Fixed', value: 'Fixed' },
  { label: 'Percentage', value: 'Percentage' },
] as const;

const JEWELLERY_PURITY_OPTIONS = [
  { label: '18k', value: '18k' },
  { label: '22k', value: '22k' },
  { label: '24k', value: '24k' },
] as const;

type ProductType = (typeof PRODUCT_TYPE_OPTIONS)[number]['value'];
type WholesalePriceType = (typeof WHOLESALE_PRICE_TYPE_OPTIONS)[number]['value'];
type JewelleryPurity = (typeof JEWELLERY_PURITY_OPTIONS)[number]['value'];

interface AttributeOption {
  _id: string;
  name: string;
  style?: string;
  values: string[];
}

interface Product {
  _id?: string;
  name: string;
  sku: string;
  shortDescription: string;
  longDescription: string;
  category: string;
  subcategory: string;
  childCategory: string;
  categoryId?: string;
  subcategoryId?: string;
  childCategoryId?: string;
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
  product_type: ProductType;
  free_shipping: boolean;
  allow_return: boolean;
  return_policy: string;
  metaTitle: string;
  metaDescription: string;
  urlSlug: string;
  focusKeyword: string;
  mainImage: string;
  galleryImages: string[];
  sizeChartImage: string;
  productVideo: string;
  wholesalePriceType: WholesalePriceType;
  jewelleryWeight: number;
  jewelleryPurity: JewelleryPurity | '';
  jewelleryMakingCharges: number;
  jewelleryStoneDetails: string;
  jewelleryCertification: string;
  attributes: AttributeSelectionMap;
  specifications?: Record<string, string>; // Key-value pairs for specifications
  variants?: Array<{
    attributeCombination: Record<string, string>; // e.g., { "Size": "L", "Color": "Red" }
    price?: number;
    stock: number;
    sku?: string;
    image?: string;
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
  warehouseId?: string; // Warehouse ID for product
  createdAt?: string; // Added for potential API response
  updatedAt?: string; // Added for potential API response
  // New pricing and GST fields
  productCost?: number; // Product Cost (Actual cost that vendor gets)
  forwardLogisticsCost?: number; // Forward Logistics Cost
  paymentGatewayCost?: number; // Payment Gateway Cost
  expectedLoss?: number; // Expected Loss
  targetProfit?: number; // Target Profit
  basePrice?: number; // Base Price (Excl. GST) - auto calculated
  sellingPriceInclGST?: number; // Selling Price (Incl. GST) - final price shown to customer
  bankSettlementAmount?: number; // Estimation Amount for bank Settlement - auto calculated
  hsnSac?: string; // HSN / SAC per product (visible only to vendor)
  cgst?: number; // CGST (auto-calculated)
  sgst?: number; // SGST (auto-calculated)
  igst?: number; // IGST (auto-calculated)
  vendorState?: string; // Vendor state for GST calculation
}
const INITIAL_PRODUCT: Product = {
  name: '',
  sku: '',
  shortDescription: '',
  longDescription: '',
  category: '',
  subcategory: '',
  childCategory: '',
  categoryId: '',
  subcategoryId: '',
  childCategoryId: '',
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
  sizeChartImage: '',
  productVideo: '',
  wholesalePriceType: 'Fixed',
  jewelleryWeight: 0,
  jewelleryPurity: '',
  jewelleryMakingCharges: 0,
  jewelleryStoneDetails: '',
  jewelleryCertification: '',
  attributes: {},
  specifications: {},
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
  warehouseId: '',
  // New pricing and GST fields
  productCost: 0,
  forwardLogisticsCost: 0,
  paymentGatewayCost: 0,
  expectedLoss: 0,
  targetProfit: 0,
  basePrice: 0,
  sellingPriceInclGST: 0,
  bankSettlementAmount: 0,
  hsnSac: '',
  cgst: 0,
  sgst: 0,
  igst: 0,
  vendorState: '',
};

interface ProductFormPageProps {
  productId?: string;
}

export function ProductFormPage({ productId }: ProductFormPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { settings } = useSettings();

  // Filter product type options based on settings
  const availableProductTypes = settings.productType
    ? PRODUCT_TYPE_OPTIONS.filter(option => option.value !== 'Jewellery')
    : [{ label: 'Jewellery', value: 'Jewellery' }];

  const [formData, setFormData] = useState<Product>({
    ...INITIAL_PRODUCT,
    tags: [],
    galleryImages: [],
    attributes: {},
    relatedProducts: [],
    product_type: settings.productType ? INITIAL_PRODUCT.product_type : 'Jewellery',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fetchingProduct, setFetchingProduct] = useState(!!productId);
  const [vendors, setVendors] = useState<Array<{ _id: string; storeName: string }>>([]);
  const [warehouses, setWarehouses] = useState<Array<{ _id: string; name: string; pincode: string }>>([]);
  const [categories, setCategories] = useState<Array<{ _id: string; name: string; displayLabel?: string; type?: string; value?: string }>>(
    []
  );
  const [brands, setBrands] = useState<Array<{ _id: string; name: string; status?: string }>>([]);
  const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'inventory' | 'attributes' | 'images' | 'seo' | 'other'>('basic');
  const [tabsWithErrors, setTabsWithErrors] = useState<Set<'basic' | 'pricing' | 'inventory' | 'images' | 'attributes' | 'seo' | 'other'>>(
    new Set()
  );
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [loadingTags, setLoadingTags] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);
  const [tagsDropdownOpen, setTagsDropdownOpen] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement | null>(null);
  const [attributeOptions, setAttributeOptions] = useState<AttributeOption[]>([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [attributeError, setAttributeError] = useState<string | null>(null);
  const [attributeSearchTerm, setAttributeSearchTerm] = useState('');
  const [creatingAttribute, setCreatingAttribute] = useState(false);
  const [showCreateAttributeDialog, setShowCreateAttributeDialog] = useState(false);
  const [newAttributeName, setNewAttributeName] = useState('');
  const [newAttributeValues, setNewAttributeValues] = useState<string[]>(['']);
  const [allProducts, setAllProducts] = useState<Array<{ _id: string; name: string; mainImage?: string }>>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [relatedProductsSearch, setRelatedProductsSearch] = useState('');
  const [isVendor, setIsVendor] = useState(false);
  const [currentVendorInfo, setCurrentVendorInfo] = useState<{ storeName: string; _id: string } | null>(null);

  useEffect(() => {
    // Check if current user is a vendor and fetch vendor ID
    const checkVendorStatus = async () => {
      try {
        const adminUserStr = localStorage.getItem('adminUser');
        if (adminUserStr) {
          const adminUser = JSON.parse(adminUserStr);
          if (adminUser?.role === 'vendor') {
            setIsVendor(true);
            
            // Get vendor ID from token (API will use this automatically)
            // Decode token to get vendor ID for GST details fetch
            let vendorId = '';
            try {
              const token = localStorage.getItem('adminToken');
              if (token) {
                const tokenParts = token.split('.');
                if (tokenParts.length === 3) {
                  const payload = JSON.parse(atob(tokenParts[1]));
                  vendorId = payload.id || '';
                }
              }
            } catch (tokenError) {
              console.error('[ProductForm] Error decoding token:', tokenError);
            }

            setCurrentVendorInfo({
              storeName: adminUser.storeName || adminUser.name || '',
              _id: vendorId, // Used for fetching GST details
            });
            return true;
          }
        }
      } catch (error) {
        console.error('[ProductForm] Error checking vendor status:', error);
      }
      return false;
    };

    const init = async () => {
      const isVendorUser = await checkVendorStatus();

    if (productId) {
      fetchProduct();
    }
      
      // Only fetch vendors if not a vendor (admins need the dropdown)
      if (!isVendorUser) {
    fetchVendors();
      }
      
    fetchWarehouses();
    fetchCategories();
    fetchTags();
    fetchBrands();
    fetchAttributes();
    fetchAllProducts();
    };

    init();
  }, [productId]);

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
      const allVendors = Array.isArray(data.vendors) ? data.vendors : [];

      // Filter only approved vendors
      const approvedVendors = allVendors.filter((vendor: any) => vendor.status === 'approved');

      setVendors(approvedVendors);
    } catch (error) {
      console.error('[v0] Failed to fetch vendors:', error);
      setVendors([]);
    }
  };

  // Auto-set vendor when vendor is logged in (only for new products)
  useEffect(() => {
    if (isVendor && currentVendorInfo?.storeName && !productId) {
      // Auto-set vendor for new products (replace 'Main Store' default if vendor is logged in)
      setFormData(prev => {
        if (!prev.vendor || prev.vendor === 'Main Store') {
          return {
            ...prev,
            vendor: currentVendorInfo.storeName,
          };
        }
        return prev;
      });
    }
  }, [isVendor, currentVendorInfo?.storeName, productId]);

  // Fetch GST details from selected vendor
  const fetchGSTDetails = async () => {
    // For vendors, use their own vendor info
    if (isVendor && currentVendorInfo) {
      // Vendor is already set, fetch their GST details using their ID
      try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`/api/admin/vendors/${currentVendorInfo._id}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch vendor GST details');
        }

        const data = await response.json();
        const vendorData = data.vendor;

        // Update form with vendor GST details and recalculate pricing
        setFormData(prev => ({
          ...prev,
          vendorState: vendorData.state || '',
          hsnSac: vendorData.hsnSac || prev.hsnSac,
        }));

        // Recalculate pricing if needed
        // This will trigger the pricing calculations
        return;
      } catch (error) {
        console.error('[ProductForm] Error fetching vendor GST details:', error);
        toast({
          title: 'Warning',
          description: 'Could not fetch vendor GST details. You may need to set GST details manually.',
          variant: 'default',
        });
        return;
      }
    }

    // For admins, require vendor selection
    if (!formData.vendor || formData.vendor === 'Main Store') {
      toast({
        title: 'Error',
        description: 'Please select a vendor first',
        variant: 'destructive',
      });
      return;
    }

    try {
      const selectedVendor = vendors.find(v => v.storeName === formData.vendor);
      if (!selectedVendor) {
        toast({
          title: 'Error',
          description: 'Vendor not found',
          variant: 'destructive',
        });
        return;
      }

      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/vendors/${selectedVendor._id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch vendor GST details');
      }

      const data = await response.json();
      const vendorData = data.vendor;

      // Update form with vendor GST details and recalculate pricing
      setFormData(prev => {
        const updated = {
          ...prev,
          vendorState: vendorData.state || '',
          // Optionally pre-fill HSN/SAC if available in vendor data
          // hsnSac: vendorData.hsnSac || prev.hsnSac,
        };

        // Recalculate pricing with updated vendor state
        const pricing = calculatePricing(updated);
        return {
          ...updated,
          basePrice: pricing.basePrice,
          sellingPriceInclGST: pricing.sellingPriceInclGST,
          bankSettlementAmount: pricing.bankSettlementAmount,
          cgst: pricing.cgst,
          sgst: pricing.sgst,
          igst: pricing.igst,
          sellingPrice: pricing.sellingPriceInclGST,
          regularPrice: pricing.sellingPriceInclGST,
        };
      });

      toast({
        title: 'Success',
        description: 'GST details fetched successfully',
        variant: 'success',
      });
    } catch (error) {
      console.error('[v0] Failed to fetch GST details:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch GST details from vendor',
        variant: 'destructive',
      });
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await fetch('/api/warehouses/active');
      const data = await response.json();
      const allWarehouses = Array.isArray(data.warehouses) ? data.warehouses : [];
      setWarehouses(allWarehouses);
    } catch (error) {
      console.error('[v0] Failed to fetch warehouses:', error);
      setWarehouses([]);
    }
  };

  const fetchCategories = async () => {
    try {
      // Fetch all categories with hierarchy
      const response = await fetch('/api/categories/with-hierarchy?status=active');
      const data = await response.json();
      const allCategories = Array.isArray(data.categories) ? data.categories : [];

      // Build flat list with all options
      const flatCategories: Array<{
        _id: string;
        name: string;
        displayLabel: string;
        type: 'category' | 'subcategory' | 'childCategory';
        value: string;
      }> = [];

      allCategories.forEach((category: any) => {
        // Add main category
        flatCategories.push({
          _id: category._id,
          name: category.name,
          displayLabel: category.name,
          type: 'category',
          value: category._id,
          categoryId: category._id,
        });

        // Add subcategories if they exist
        if (category.subcategories && Array.isArray(category.subcategories)) {
          category.subcategories.forEach((subcategory: any) => {
            // Add subcategory (Category > Subcategory)
            flatCategories.push({
              _id: subcategory._id,
              name: subcategory.name,
              displayLabel: `${category.name} > ${subcategory.name}`,
              type: 'subcategory',
              value: subcategory._id,
              categoryId: category._id,
              subcategoryId: subcategory._id,
            });

            // Add child categories if they exist
            if (subcategory.childCategories && Array.isArray(subcategory.childCategories)) {
              subcategory.childCategories.forEach((childCategory: any) => {
                // Add child category (Category > Subcategory > Child Category)
                flatCategories.push({
                  _id: childCategory._id,
                  name: childCategory.name,
                  displayLabel: `${category.name} > ${subcategory.name} > ${childCategory.name}`,
                  type: 'childCategory',
                  value: childCategory._id,
                  categoryId: category._id,
                  subcategoryId: subcategory._id,
                  childCategoryId: childCategory._id,
                });
              });
            }
          });
        }
      });

      setCategories(flatCategories);
    } catch (error) {
      console.error('[v0] Failed to fetch categories:', error);
      setCategories([]);
    }
  };

  const fetchBrands = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/brands?status=active', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch brands');
      }
      const data = await response.json();
      const activeBrands = Array.isArray(data) ? data.filter((brand: any) => brand?.status !== 'inactive') : [];
      setBrands(
        activeBrands.map((brand: any) => ({
          _id: brand._id,
          name: brand.name,
          status: brand.status,
        }))
      );
    } catch (error) {
      console.error('[v0] Failed to fetch brands:', error);
      setBrands([]);
    }
  };

  const fetchAttributes = async () => {
    setLoadingAttributes(true);
    setAttributeError(null);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/attributes', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch attributes');
      }
      const data = await response.json();
      const attributeList = Array.isArray(data.attributes) ? data.attributes : [];
      setAttributeOptions(
        attributeList.map((attr: any) => ({
          _id:
            typeof attr._id === 'string'
              ? attr._id
              : typeof attr._id?.toString === 'function'
              ? attr._id.toString()
              : typeof attr.id === 'string'
              ? attr.id
              : String(attr.name || ''),
          name: attr.name || 'Untitled Attribute',
          style: attr.style || 'rectangle',
          values: Array.isArray(attr.values) ? attr.values : [],
        }))
      );
    } catch (error) {
      console.error('[v0] Failed to fetch attributes:', error);
      setAttributeOptions([]);
      setAttributeError('Unable to load attributes');
      toast({
        title: 'Error',
        description: 'Unable to load attributes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingAttributes(false);
    }
  };

  const fetchAllProducts = async () => {
    try {
      setLoadingProducts(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/products', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch products');

      const data = await response.json();

      // Normalize API response (handles: [], {products: []}, etc.)
      const products = Array.isArray(data) ? data : Array.isArray(data.products) ? data.products : [];

      // Remove products that have no name AND no image
      const cleanedProducts = products.filter((p: any) => {
        return (p.name && p.name.trim() !== '') || p.mainImage;
      });

      // When editing, filter out current product
      const filteredProducts = productId
        ? cleanedProducts.filter((p: any) => {
            const productIdStr = typeof productId === 'string' ? productId : productId?.toString();

            const pId = p._id?.toString() || p.id?.toString();
            return pId !== productIdStr;
          })
        : cleanedProducts;

      // Final mapping
      const finalList = filteredProducts.map((p: any) => ({
        _id: p._id?.toString() || p.id?.toString() || '',
        name: p.name || 'Unnamed Product',
        mainImage: p.mainImage || p.images?.[0] || '', // fallback if array exists
      }));

      setAllProducts(finalList);
    } catch (error) {
      console.error('[fetchAllProducts] Error:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchTags = async () => {
    setLoadingTags(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/tags?status=active', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch tags');
      }
      const data = await response.json();
      const tagNames = Array.isArray(data)
        ? data.map((tag: any) => (typeof tag?.name === 'string' ? tag.name.trim() : '')).filter((name: string) => !!name)
        : [];
      setAvailableTags(prev => {
        const combined = [...prev, ...tagNames];
        return Array.from(new Set(combined));
      });
    } catch (error) {
      console.error('[v0] Failed to fetch tags:', error);
      toast({
        title: 'Error',
        description: 'Unable to load tag options',
        variant: 'destructive',
      });
    } finally {
      setLoadingTags(false);
    }
  };

  const fetchProduct = async () => {
    try {
      console.log('[v0] Fetching product with ID:', productId);
      const response = await fetch(`/api/admin/products/${productId}`);

      if (response.ok) {
        const data = await response.json();
        console.log('[v0] Fetched product data:', data);

        const safeData = {
          ...INITIAL_PRODUCT,
          ...data,
          tags: Array.isArray(data.tags) ? data.tags : [],
          galleryImages: Array.isArray(data.galleryImages) ? data.galleryImages : [],
          relatedProducts: Array.isArray(data.relatedProducts) ? data.relatedProducts : [],
          attributes: sanitizeAttributeSelections(data.attributes),
          variants: Array.isArray(data.variants) ? data.variants : [],
          specifications: data.specifications || {},
        };

        console.log('[v0] Safe product data:', safeData);
        setFormData(safeData);
        console.log('[v0] Form data set successfully');
      } else {
        const errorData = await response.json();
        console.error('[v0] Failed to fetch product:', errorData);
        toast({
          title: 'Error',
          description: 'Failed to load product',
          variant: 'destructive',
        });
        router.push('/admin/products');
      }
    } catch (error) {
      console.error('[v0] Failed to fetch product:', error);
      toast({
        title: 'Error',
        description: 'Failed to load product',
        variant: 'destructive',
      });
      router.push('/admin/products');
    } finally {
      setFetchingProduct(false);
    }
  };

  // Map field names to their corresponding tabs
  const fieldToTabMap: Record<string, 'basic' | 'pricing' | 'inventory' | 'attributes' | 'images' | 'seo' | 'other'> = {
    product_type: 'basic',
    name: 'basic',
    sku: 'basic',
    shortDescription: 'basic',
    longDescription: 'basic',
    category: 'basic',
    brand: 'basic',
    vendor: 'basic',
    free_shipping: 'basic',
    allow_return: 'basic',
    return_policy: 'basic',
    regularPrice: 'pricing',
    sellingPrice: 'pricing',
    costPrice: 'pricing',
    taxRate: 'pricing',
    wholesalePriceType: 'pricing',
    jewelleryWeight: 'pricing',
    jewelleryPurity: 'pricing',
    jewelleryMakingCharges: 'pricing',
    jewelleryStoneDetails: 'pricing',
    jewelleryCertification: 'pricing',
    stock: 'inventory',
    lowStockThreshold: 'inventory',
    allowBackorders: 'inventory',
    barcode: 'inventory',
    mainImage: 'images',
    galleryImages: 'images',
    sizeChartImage: 'images',
    productVideo: 'images',
    urlSlug: 'seo',
    focusKeyword: 'seo',
    metaTitle: 'seo',
    metaDescription: 'seo',
    attributes: 'attributes',
    // Other fields in 'other' tab don't have validation errors
  };

  useEffect(() => {
    // Hide scroll
    document.body.style.overflowY = 'hidden';

    // Cleanup when leaving page
    return () => {
      document.body.style.overflowY = 'auto';
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setTagsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get which tabs have errors
  const getTabsWithErrors = (
    errorFields: Record<string, string>
  ): Set<'basic' | 'pricing' | 'inventory' | 'attributes' | 'images' | 'seo' | 'other'> => {
    const tabs = new Set<'basic' | 'pricing' | 'inventory' | 'attributes' | 'images' | 'seo' | 'other'>();
    Object.keys(errorFields).forEach(field => {
      const tab = fieldToTabMap[field];
      if (tab) {
        tabs.add(tab);
      }
    });
    return tabs;
  };

  // Check if field belongs to active tab
  const isFieldInActiveTab = (fieldName: string): boolean => {
    const tab = fieldToTabMap[fieldName];
    return tab === activeTab;
  };

  // Filter errors to only show errors for fields in the active tab
  const getFilteredErrors = (): Record<string, string> => {
    const filtered: Record<string, string> = {};
    Object.keys(errors).forEach(field => {
      if (isFieldInActiveTab(field)) {
        filtered[field] = errors[field];
      }
    });
    return filtered;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const isJewelleryProduct = formData.product_type === 'Jewellery';

    if (!formData.product_type?.trim()) newErrors.product_type = 'Product type is required';
    if (!formData.name?.trim()) newErrors.name = 'Product name is required';
    if (!formData.sku?.trim()) newErrors.sku = 'SKU is required';
    if (!formData.shortDescription?.trim()) newErrors.shortDescription = 'Short description is required';
    if (!getPlainTextFromHtml(formData.longDescription)) newErrors.longDescription = 'Long description is required';
    if (!isJewelleryProduct) {
      if (formData.regularPrice <= 0) newErrors.regularPrice = 'Regular price must be greater than 0';
      if (formData.sellingPrice <= 0) newErrors.sellingPrice = 'Selling price must be greater than 0';
      if (formData.sellingPrice > formData.regularPrice) newErrors.sellingPrice = 'Selling price cannot exceed regular price';
    } else {
      if (formData.jewelleryWeight <= 0) newErrors.jewelleryWeight = 'Weight is required for jewellery';
      if (!formData.jewelleryPurity?.trim()) newErrors.jewelleryPurity = 'Purity is required for jewellery';
      if (formData.jewelleryMakingCharges <= 0) newErrors.jewelleryMakingCharges = 'Making charges must be greater than 0';
    }
    if (formData.stock < 0) newErrors.stock = 'Stock cannot be negative';
    if (!formData.urlSlug?.trim()) newErrors.urlSlug = 'URL slug is required';
    if (!formData.metaTitle?.trim()) newErrors.metaTitle = 'Meta title is required';
    if (!formData.metaDescription?.trim()) newErrors.metaDescription = 'Meta description is required';
    if (!formData.mainImage?.trim()) newErrors.mainImage = 'Main image is required';
    if (!formData.category?.trim()) newErrors.category = 'Category is required';
    // Vendor validation only for admins, vendors have it auto-set
    if (!isVendor && !formData.vendor?.trim()) {
      newErrors.vendor = 'Vendor is required';
    }
    if (formData.allow_return && !formData.return_policy?.trim()) {
      newErrors.return_policy = 'Return policy is required when returns are enabled';
    }

    setErrors(newErrors);
    const tabsWithErrorsSet = getTabsWithErrors(newErrors);
    setTabsWithErrors(tabsWithErrorsSet);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix all required fields before submitting',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const method = productId ? 'PUT' : 'POST';
      const url = productId ? `/api/admin/products/${productId}` : '/api/admin/products';

      const { _id, createdAt, updatedAt, ...cleanData } = formData as any;

      // If vendor is logged in, ensure vendor field is set to their store name
      if (isVendor && currentVendorInfo?.storeName) {
        cleanData.vendor = currentVendorInfo.storeName;
      }

      console.log('[v0] Submitting product data:', cleanData);

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanData),
      });

      const responseData = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: productId ? 'Product updated successfully' : 'Product created successfully',
          variant: 'success',
        });
        router.push('/admin/products');
      } else {
        toast({
          title: 'Error',
          description: responseData.error || `Failed to save product`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Network error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Round up to next preferred price (e.g., 699, 749, 799, etc.)
  const roundToNextPreferredPrice = (amount: number): number => {
    if (amount <= 0) return 0;

    const base = Math.floor(amount / 100) * 100; // Get the hundred base (e.g., 600 for 695)
    const remainder = amount % 100; // Get the remainder (e.g., 95 for 695)

    if (remainder === 0) {
      // If exactly on a hundred, return base + 49 (e.g., 600 -> 649)
      return base + 49;
    } else if (remainder <= 49) {
      // If remainder is 1-49, round to base + 49 (e.g., 645 -> 649)
      return base + 49;
    } else if (remainder <= 99) {
      // If remainder is 50-99, round to next hundred - 1 (e.g., 695 -> 699, 750 -> 799)
      return base + 100 - 1;
    }

    return amount;
  };

  // Calculate pricing fields
  const calculatePricing = (data: Product) => {
    const productCost = data.productCost || 0;
    const forwardLogistics = data.forwardLogisticsCost || 0;
    const pgCost = data.paymentGatewayCost || 0;
    const expectedLoss = data.expectedLoss || 0;
    const targetProfit = data.targetProfit || 0;
    const gstRate = data.taxRate || 18; // Default to 18%

    // Calculate base price (sum of all costs) - NO rounding, keep exact value
    const basePrice = productCost + forwardLogistics + pgCost + expectedLoss + targetProfit;

    // Calculate GST amount = Base Price × GST %
    const gstAmount = (basePrice * gstRate) / 100;

    // Calculate selling price (Base Price + GST)
    const sellingPriceBeforeRounding = basePrice + gstAmount;

    // Round up ONLY the final selling price to next preferred price
    const sellingPriceInclGST = roundToNextPreferredPrice(sellingPriceBeforeRounding);

    // Calculate Estimation Amount for bank Settlement
    // Selling Price (Incl. GST) - Logistics - PG Price - Expected Loss
    const bankSettlementAmount = sellingPriceInclGST - forwardLogistics - pgCost - expectedLoss;

    // Calculate CGST/SGST/IGST based on vendor state
    // For now, we'll assume same state = CGST+SGST, different state = IGST
    // This logic can be enhanced based on customer location later
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    // If vendor state is available, we can determine intra-state vs inter-state
    // For now, we'll split GST equally into CGST and SGST (same state scenario)
    // In a real scenario, this would depend on shipping address
    if (data.vendorState) {
      // Same state: Split GST into CGST and SGST
      cgst = gstAmount / 2;
      sgst = gstAmount / 2;
      igst = 0;
    } else {
      // Default: assume intra-state (CGST + SGST)
      cgst = gstAmount / 2;
      sgst = gstAmount / 2;
      igst = 0;
    }

    return {
      basePrice: basePrice, // Base price without rounding
      sellingPriceInclGST: Math.round(sellingPriceInclGST * 100) / 100, // Round to 2 decimal places
      sellingPriceBeforeRounding: Math.round(sellingPriceBeforeRounding * 100) / 100, // Exact total before rounding
      bankSettlementAmount: Math.round(Math.max(0, bankSettlementAmount) * 100) / 100, // Round to 2 decimal places, ensure non-negative
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      igst: Math.round(igst * 100) / 100,
    };
  };

  const handleChange = (field: keyof Product, value: any) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: value,
      };

      // Auto-calculate pricing when relevant fields change
      const pricingFields: (keyof Product)[] = [
        'productCost',
        'forwardLogisticsCost',
        'paymentGatewayCost',
        'expectedLoss',
        'targetProfit',
        'taxRate',
        'vendorState',
      ];

      if (pricingFields.includes(field) || (field === 'vendor' && value)) {
        const pricing = calculatePricing(updated);
        return {
          ...updated,
          basePrice: pricing.basePrice,
          sellingPriceInclGST: pricing.sellingPriceInclGST,
          bankSettlementAmount: pricing.bankSettlementAmount,
          cgst: pricing.cgst,
          sgst: pricing.sgst,
          igst: pricing.igst,
          // Also update sellingPrice and regularPrice for backward compatibility
          sellingPrice: pricing.sellingPriceInclGST,
          regularPrice: pricing.sellingPriceInclGST,
        };
      }

      return updated;
    });

    // Auto-generate SKU when product name changes (for new products only)
    if (field === 'name' && !productId) {
      // If product name is empty, immediately clear the SKU
      if (!value || !value.trim()) {
        setFormData(prev => ({
          ...prev,
          name: value,
          sku: '',
        }));
      } else {
        // Generate SKU after a short delay
        const generateSKU = (productName: string) => {
          // Product name prefix (first 6 characters, uppercase, alphanumeric only)
          const namePrefix = productName
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .substring(0, 6)
            .padEnd(3, 'X'); // Ensure at least 3 characters

          // Timestamp (last 6 digits for uniqueness)
          const timestamp = Date.now().toString().slice(-6);

          // Random alphanumeric (3 characters)
          const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          let randomPart = '';
          for (let i = 0; i < 3; i++) {
            randomPart += characters.charAt(Math.floor(Math.random() * characters.length));
          }

          return `${namePrefix}-${timestamp}-${randomPart}`;
        };

        setTimeout(() => {
          setFormData(prev => {
            // Only update SKU if the name still has value
            if (prev.name && prev.name.trim()) {
              return {
                ...prev,
                sku: generateSKU(prev.name),
              };
            }
            return prev;
          });
        }, 800);
      }
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        // Update tabs with errors when field error is cleared
        const updatedTabsWithErrors = getTabsWithErrors(newErrors);
        setTabsWithErrors(updatedTabsWithErrors);
        return newErrors;
      });
    }
  };

  const addTag = (tag: string) => {
    const currentTags = Array.isArray(formData.tags) ? formData.tags : [];
    if (tag && !currentTags.includes(tag)) {
      handleChange('tags', [...currentTags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    const currentTags = Array.isArray(formData.tags) ? formData.tags : [];
    handleChange(
      'tags',
      currentTags.filter(t => t !== tag)
    );
  };

  const handleCreateTag = async (tagNameParam?: string) => {
    if (creatingTag) return;
    const newTagName = (tagNameParam ?? tagSearchTerm).trim();
    if (!newTagName) return;

    setCreatingTag(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({ name: newTagName, status: 'active' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to create tag');
      }

      const createdTagName = typeof data?.name === 'string' ? data.name : newTagName;
      setAvailableTags(prev => Array.from(new Set([...prev, createdTagName])));
      addTag(createdTagName);
      setTagSearchTerm('');
      toast({
        title: 'Tag added',
        description: `"${createdTagName}" is now available`,
        variant: 'success',
      });
    } catch (error) {
      console.error('[v0] Failed to create tag:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add tag',
        variant: 'destructive',
      });
    } finally {
      setCreatingTag(false);
    }
  };

  const handleAddOrCreateTag = (value?: string) => {
    const candidate = (value ?? tagSearchTerm).trim();
    if (!candidate) return;

    const matchedTag = availableTags.find(tag => tag.toLowerCase() === candidate.toLowerCase());
    if (matchedTag) {
      addTag(matchedTag);
      setTagSearchTerm('');
      return;
    }

    void handleCreateTag(candidate);
  };

  const handleAttributeValueToggle = (attributeId: string, value: string) => {
    const trimmedAttributeId = attributeId?.trim();
    const trimmedValue = value?.trim();
    if (!trimmedAttributeId || !trimmedValue) return;

    setFormData(prev => {
      const currentAttributes: AttributeSelectionMap = { ...(prev.attributes || {}) };
      const currentValues = currentAttributes[trimmedAttributeId] || [];
      const isSelected = currentValues.includes(trimmedValue);

      if (isSelected) {
        const nextValues = currentValues.filter(v => v !== trimmedValue);
        if (nextValues.length) {
          currentAttributes[trimmedAttributeId] = nextValues;
        } else {
          delete currentAttributes[trimmedAttributeId];
        }
      } else {
        currentAttributes[trimmedAttributeId] = [...currentValues, trimmedValue];
      }

      return {
        ...prev,
        attributes: currentAttributes,
      };
    });
  };

  const isAttributeValueSelected = (attributeId: string, value: string) => {
    if (!attributeId || !value) return false;
    const values = formData.attributes?.[attributeId];
    return Array.isArray(values) ? values.includes(value) : false;
  };

  // Filtered attributes based on search
  const filteredAttributes = useMemo(() => {
    if (!attributeSearchTerm.trim()) {
      return attributeOptions;
    }
    const searchLower = attributeSearchTerm.toLowerCase().trim();
    return attributeOptions.filter(attr => attr.name.toLowerCase().includes(searchLower));
  }, [attributeOptions, attributeSearchTerm]);

  // Create new attribute on the fly
  const handleCreateAttribute = async () => {
    if (!newAttributeName.trim()) {
      toast({
        title: 'Error',
        description: 'Attribute name is required',
        variant: 'destructive',
      });
      return;
    }

    const trimmedValues = newAttributeValues.filter(v => v.trim() !== '');
    if (trimmedValues.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one value',
        variant: 'destructive',
      });
      return;
    }

    setCreatingAttribute(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/attributes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newAttributeName.trim(),
          style: 'rectangle',
          values: trimmedValues,
        }),
      });

      if (response.ok) {
        const newAttribute = await response.json();
        // Add to attributeOptions immediately
        setAttributeOptions(prev => [
          {
            _id: newAttribute._id,
            name: newAttribute.name,
            style: newAttribute.style || 'rectangle',
            values: newAttribute.values || [],
          },
          ...prev,
        ]);
        // Reset form
        setNewAttributeName('');
        setNewAttributeValues(['']);
        setShowCreateAttributeDialog(false);
        toast({
          title: 'Success',
          description: 'Attribute created successfully',
          variant: 'success',
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to create attribute',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Failed to create attribute:', error);
      toast({
        title: 'Error',
        description: 'Failed to create attribute',
        variant: 'destructive',
      });
    } finally {
      setCreatingAttribute(false);
    }
  };

  const autoGenerateSlug = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    handleChange('urlSlug', slug);
  };

  // Generate all combinations from selected attributes
  const generateAttributeCombinations = (): Array<Record<string, string>> => {
    const selectedAttributes = formData.attributes || {};
    const attributeNames: string[] = [];
    const attributeValues: string[][] = [];

    // Get attribute names and their selected values
    Object.entries(selectedAttributes).forEach(([attributeId, values]) => {
      if (Array.isArray(values) && values.length > 0) {
        const attribute = attributeOptions.find(attr => attr._id === attributeId);
        if (attribute) {
          attributeNames.push(attribute.name);
          attributeValues.push(values);
        }
      }
    });

    if (attributeNames.length === 0 || attributeValues.length === 0) {
      return [];
    }

    // Generate cartesian product of all attribute combinations
    const combinations: Array<Record<string, string>> = [];

    const generateCombinations = (index: number, current: Record<string, string>) => {
      if (index === attributeNames.length) {
        combinations.push({ ...current });
        return;
      }

      attributeValues[index].forEach(value => {
        current[attributeNames[index]] = value;
        generateCombinations(index + 1, current);
      });
    };

    generateCombinations(0, {});
    return combinations;
  };

  // Get existing variant or create new one for a combination
  const getVariantForCombination = (combination: Record<string, string>) => {
    const existingVariants = formData.variants || [];
    const combinationKey = JSON.stringify(combination);

    return existingVariants.find(v => JSON.stringify(v.attributeCombination) === combinationKey);
  };

  // Update variant price/stock
  const updateVariant = (combination: Record<string, string>, field: 'price' | 'stock' | 'sku', value: number | string) => {
    const existingVariants = [...(formData.variants || [])];
    const combinationKey = JSON.stringify(combination);
    const existingIndex = existingVariants.findIndex(v => JSON.stringify(v.attributeCombination) === combinationKey);

    if (existingIndex >= 0) {
      existingVariants[existingIndex] = {
        ...existingVariants[existingIndex],
        [field]: value,
      };
    } else {
      existingVariants.push({
        attributeCombination: combination,
        [field]: value,
        stock: field === 'stock' ? (value as number) : 0,
        price: field === 'price' ? (value as number) : formData.sellingPrice || 0,
      });
    }

    handleChange('variants', existingVariants);
  };

  // Auto-generate variants when attributes change
  useEffect(() => {
    // Only generate if we have attribute options loaded
    if (attributeOptions.length === 0) return;

    const combinations = generateAttributeCombinations();
    if (combinations.length > 0) {
      const existingVariants = formData.variants || [];
      const existingCombinations = new Set(existingVariants.map(v => JSON.stringify(v.attributeCombination)));

      // Add new combinations that don't exist yet
      const newVariants = combinations
        .filter(comb => !existingCombinations.has(JSON.stringify(comb)))
        .map(comb => ({
          attributeCombination: comb,
          price: formData.sellingPrice || formData.regularPrice || 0,
          stock: 0,
          sku: '',
        }));

      // Remove variants that no longer have valid combinations
      const validCombinations = new Set(combinations.map(c => JSON.stringify(c)));
      const filteredVariants = existingVariants.filter(v => validCombinations.has(JSON.stringify(v.attributeCombination)));

      if (newVariants.length > 0 || filteredVariants.length !== existingVariants.length) {
        setFormData(prev => ({
          ...prev,
          variants: [...filteredVariants, ...newVariants],
        }));
      }
    } else if (formData.variants && formData.variants.length > 0) {
      // Clear variants if no attributes selected
      setFormData(prev => ({
        ...prev,
        variants: [],
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(formData.attributes), attributeOptions.length]);

  const trimmedTagInput = tagSearchTerm.trim();
  const normalizedTagQuery = trimmedTagInput.toLowerCase();
  const filteredTags = normalizedTagQuery ? availableTags.filter(tag => tag.toLowerCase().includes(normalizedTagQuery)) : availableTags;
  const tagExists = trimmedTagInput ? availableTags.some(tag => tag.toLowerCase() === trimmedTagInput.toLowerCase()) : false;
  const isJewellery = formData.product_type === 'Jewellery';

  if (fetchingProduct) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <p className='text-lg'>Loading product...</p>
      </div>
    );
  }

  const tabs = [
    { id: 'basic', label: 'Basic Information', icon: Package },
    { id: 'pricing', label: 'Pricing & Tax', icon: LucideReceiptIndianRupee },
    { id: 'inventory', label: 'Inventory', icon: Archive },
    { id: 'attributes', label: 'Attributes', icon: SlidersHorizontal },
    { id: 'images', label: 'Images', icon: ImageIcon },
    { id: 'seo', label: 'SEO', icon: Search },
    { id: 'other', label: 'Other Details', icon: Settings },
  ];

  return (
    <div className='min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8'>
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <div className='bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6'>
          <div className='flex items-center gap-4'>
            <button
              type='button'
              onClick={() => router.push('/admin/products')}
              className='inline-flex items-center justify-center cursor-pointer bg-white p-2 text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200'>
              <ArrowLeft className='h-5 w-5' />
            </button>
            <h1 className='text-2xl md:text-3xl font-bold text-slate-900 dark:text-white'>
              {productId ? 'Edit Product' : 'Add New Product'}
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className='space-y-6'>
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
            <aside className='lg:col-span-3'>
              <div className='bg-white rounded-lg shadow-sm p-2 space-y-1'>
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const hasError = tabsWithErrors.has(tab.id);
                  return (
                    <button
                      type='button'
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex cursor-pointer items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                        activeTab === tab.id ? 'bg-gray-100 text-primary font-medium' : 'text-gray-700 hover:bg-gray-50'
                      }`}>
                      <Icon className='w-5 h-5' />
                      <span className={cn('text-sm md:text-base', hasError && 'text-red-600')}>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Tab Content */}
            <section className='lg:col-span-9 space-y-6'>
              <Card className='bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'>
                <div className='space-y-6 px-6 py-6'>
                  {activeTab === 'basic' && (
                    <div className='space-y-6'>
                      <h3 className='text-xl font-semibold text-slate-900 dark:text-white'>Basic Information</h3>

                      <Dropdown
                        options={
                          settings.productType
                            ? [{ label: 'Select Product Type', value: '' }, ...availableProductTypes]
                            : availableProductTypes
                        }
                        placeholder='Select product type'
                        labelMain='Product Type *'
                        value={formData.product_type}
                        onChange={option => handleChange('product_type', option.value as ProductType)}
                        error={isFieldInActiveTab('product_type') ? errors.product_type : undefined}
                      />

                      {!isVendor ? (
                      <Dropdown
                        labelMain='Vendor *'
                        options={[
                          { label: 'Select Vendor', value: '' },
                          ...(vendors || []).map(vendor => ({
                            label: vendor.storeName,
                            value: vendor.storeName,
                          })),
                        ]}
                        value={formData.vendor}
                        onChange={option => handleChange('vendor', option.value)}
                        placeholder='Select vendor'
                        error={isFieldInActiveTab('vendor') ? errors.vendor : undefined}
                      />
                      ) : (
                        <div>
                          <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'>
                            Vendor
                          </label>
                          <div className='px-4 py-2 rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300'>
                            {currentVendorInfo?.storeName || formData.vendor || 'Your Store'}
                          </div>
                          <p className='mt-1 text-xs text-slate-500 dark:text-slate-400'>
                            This product will be associated with your vendor account.
                          </p>
                        </div>
                      )}

                      <FormField
                        label='Product Name'
                        required
                        placeholder='Enter product name'
                        value={formData.name}
                        onChange={e => handleChange('name', e.target.value)}
                        error={getFilteredErrors().name}
                      />

                      <FormField
                        label='SKU'
                        required
                        value={formData.sku}
                        onChange={e => handleChange('sku', e.target.value)}
                        placeholder='Auto-generated from product name'
                        error={getFilteredErrors().sku}
                        helperText={productId ? 'You can edit the SKU if needed' : 'SKU auto-generates as you type product name'}
                      />

                      <Dropdown
                        options={[
                          { label: 'Select Brand', value: '' },
                          ...brands.map(brand => ({
                            label: brand.name,
                            value: brand.name,
                          })),
                        ]}
                        placeholder='Select Brand'
                        withSearch={true}
                        labelMain='Brand'
                        value={formData.brand}
                        onChange={option => handleChange('brand', option.value)}
                        disabled={isVendor}
                      />

                      <Dropdown
                        options={categories.map(cat => ({
                          label: cat.displayLabel || cat.name,
                          value: cat._id,
                          type: cat.type,
                          categoryId: cat.categoryId,
                          subcategoryId: cat.subcategoryId,
                          childCategoryId: cat.childCategoryId,
                        }))}
                        placeholder='Select Category / Subcategory / Child Category'
                        withSearch={true}
                        labelMain='Category / Subcategory / Child Category *'
                        error={isFieldInActiveTab('category') ? errors.category : undefined}
                        value={formData.childCategory || formData.subcategory || formData.category}
                        onChange={val => {
                          const selected = categories.find(c => c._id === val.value);
                          if (!selected) {
                            handleChange('category', val.value);
                            handleChange('subcategory', '');
                            handleChange('childCategory', '');
                            handleChange('categoryId', val.value);
                            handleChange('subcategoryId', '');
                            handleChange('childCategoryId', '');
                            return;
                          }

                          if (selected.type === 'childCategory') {
                            handleChange('category', selected.categoryId || '');
                            handleChange('subcategory', selected.subcategoryId || '');
                            handleChange('childCategory', selected._id);
                            handleChange('categoryId', selected.categoryId || '');
                            handleChange('subcategoryId', selected.subcategoryId || '');
                            handleChange('childCategoryId', selected.childCategoryId || selected._id);
                          } else if (selected.type === 'subcategory') {
                            handleChange('category', selected.categoryId || '');
                            handleChange('subcategory', selected._id);
                            handleChange('childCategory', '');
                            handleChange('categoryId', selected.categoryId || '');
                            handleChange('subcategoryId', selected._id);
                            handleChange('childCategoryId', '');
                          } else {
                            handleChange('category', selected._id);
                            handleChange('subcategory', '');
                            handleChange('childCategory', '');
                            handleChange('categoryId', selected._id);
                            handleChange('subcategoryId', '');
                            handleChange('childCategoryId', '');
                          }
                        }}
                        disabled={isVendor}
                      />

                      <FormField
                        label='Short Description'
                        required
                        textarea
                        rows={2}
                        placeholder='Brief product description'
                        value={formData.shortDescription}
                        onChange={e => handleChange('shortDescription', e.target.value)}
                        error={isFieldInActiveTab('shortDescription') ? errors.shortDescription : undefined}
                      />

                      <RichTextEditor
                        label='Long Description'
                        required
                        value={formData.longDescription}
                        onChange={val => handleChange('longDescription', val)}
                        placeholder='Detailed product description'
                        error={isFieldInActiveTab('longDescription') ? errors.longDescription : undefined}
                      />

                      {/* Specifications */}
                      <div className='space-y-3'>
                        <label className='block text-sm font-medium text-slate-700 dark:text-slate-300'>
                          Specifications (Key-Value Pairs)
                        </label>
                        <div className='space-y-3 border border-slate-200 dark:border-slate-600 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50'>
                          {Object.entries(formData.specifications || {}).map(([key, value], index) => (
                            <div key={index} className='flex gap-2 items-start'>
                              <Input
                                placeholder='Key (e.g., Material, Size, Color)'
                                value={key}
                                onChange={e => {
                                  const newSpecs = { ...formData.specifications };
                                  delete newSpecs[key];
                                  newSpecs[e.target.value] = value;
                                  handleChange('specifications', newSpecs);
                                }}
                                className='flex-1 bg-white dark:bg-slate-700'
                              />
                              <Input
                                placeholder='Value (e.g., Cotton, M, Red)'
                                value={value}
                                onChange={e => {
                                  const newSpecs = { ...formData.specifications };
                                  newSpecs[key] = e.target.value;
                                  handleChange('specifications', newSpecs);
                                }}
                                className='flex-1 bg-white dark:bg-slate-700'
                              />
                              <Button
                                type='button'
                                variant='outline'
                                size='icon'
                                onClick={() => {
                                  const newSpecs = { ...formData.specifications };
                                  delete newSpecs[key];
                                  handleChange('specifications', newSpecs);
                                }}
                                className='shrink-0'>
                                <X className='w-4 h-4' />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type='button'
                            variant='outline'
                            onClick={() => {
                              const newSpecs = { ...formData.specifications, '': '' };
                              handleChange('specifications', newSpecs);
                            }}
                            className='w-full'>
                            <Plus className='w-4 h-4 mr-2' />
                            Add Specification
                          </Button>
                        </div>
                      </div>

                      <div className='space-y-3' ref={tagDropdownRef}>
                        <label className='block text-sm font-medium text-slate-700 dark:text-slate-300'>Tags (Multi-select)</label>
                        <div className='relative'>
                          <button
                            type='button'
                            onClick={() => setTagsDropdownOpen(prev => !prev)}
                            className='flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'>
                            <span>
                              {(formData.tags || []).length
                                ? `${formData.tags.length} tag${formData.tags.length > 1 ? 's' : ''} selected`
                                : 'Select tags'}
                            </span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${tagsDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {tagsDropdownOpen && (
                            <div className='absolute z-30 mt-2 w-full rounded-lg border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-800 space-y-3'>
                              <div className='flex gap-2'>
                                <Input
                                  value={tagSearchTerm}
                                  onChange={e => setTagSearchTerm(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddOrCreateTag();
                                    }
                                  }}
                                  placeholder='Search or create tags'
                                  className='flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600'
                                />
                                <Button
                                  type='button'
                                  onClick={() => handleAddOrCreateTag()}
                                  disabled={!trimmedTagInput || creatingTag}
                                  className='bg-green-600 hover:bg-green-700 text-white flex items-center gap-2'>
                                  {creatingTag ? <Loader2 className='w-4 h-4 animate-spin' /> : <Plus className='w-4 h-4' />}
                                  {tagExists ? 'Add' : 'Create'}
                                </Button>
                              </div>
                              <p className='text-xs text-slate-500 dark:text-slate-400'>Select existing tags or create a new one.</p>
                              <div className='max-h-56 overflow-y-auto rounded-md border border-slate-100 dark:border-slate-700'>
                                {loadingTags ? (
                                  <div className='flex items-center justify-center py-6 text-sm text-slate-500 gap-2'>
                                    <Loader2 className='w-4 h-4 animate-spin' />
                                    Loading tags...
                                  </div>
                                ) : filteredTags.length ? (
                                  filteredTags.map(tag => {
                                    const isSelected = (formData.tags || []).includes(tag);
                                    return (
                                      <button
                                        type='button'
                                        key={tag}
                                        onClick={() => handleAddOrCreateTag(tag)}
                                        disabled={isSelected}
                                        className={`w-full flex items-center justify-between px-4 py-2 text-left text-sm transition ${
                                          isSelected
                                            ? 'text-green-600 cursor-not-allowed bg-green-50 dark:bg-green-900/10'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                                        }`}>
                                        <span>{tag}</span>
                                        {isSelected ? <Check className='w-4 h-4' /> : <Plus className='w-4 h-4' />}
                                      </button>
                                    );
                                  })
                                ) : (
                                  <div className='px-4 py-4 text-sm text-slate-500'>No tags found. Create a new one above.</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className='flex flex-wrap gap-2'>
                          {(formData.tags || []).map(tag => (
                            <span
                              key={tag}
                              className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm'>
                              {tag}
                              <button
                                type='button'
                                onClick={() => removeTag(tag)}
                                className='hover:text-green-900 dark:hover:text-green-100'>
                                <X className='w-4 h-4' />
                              </button>
                            </span>
                          ))}
                          {!(formData.tags || []).length && <span className='text-xs text-slate-500'>No tags selected yet.</span>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pricing & Tax */}
                  {activeTab === 'pricing' && (
                    <div className='space-y-6'>
                      <h3 className='text-xl font-semibold text-slate-900 dark:text-white'>Pricing & Tax</h3>
                      {!isJewellery ? (
                        <>
                          {/* Fetch GST Details Button */}
                          <div className='flex justify-end'>
                            <Button type='button' variant='outline' onClick={fetchGSTDetails} className='flex items-center gap-2'>
                              <Search className='w-4 h-4' />
                              Fetch GST Details
                            </Button>
                          </div>

                          {/* Cost Components */}
                          <div className='space-y-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700'>
                            <h4 className='text-lg font-semibold text-slate-900 dark:text-white'>Cost Components</h4>

                            <FormField
                              label='Product Cost (Actual cost that vendor gets)'
                              type='number'
                              value={formData.productCost || 0}
                              onChange={e => handleChange('productCost', parseFloat(e.target.value) || 0)}
                              placeholder='0.00'
                            />

                            <FormField
                              label='Forward Logistics Cost'
                              type='number'
                              value={formData.forwardLogisticsCost || 0}
                              onChange={e => handleChange('forwardLogisticsCost', parseFloat(e.target.value) || 0)}
                              placeholder='0.00'
                            />

                            <FormField
                              label='Payment Gateway Cost'
                              type='number'
                              value={formData.paymentGatewayCost || 0}
                              onChange={e => handleChange('paymentGatewayCost', parseFloat(e.target.value) || 0)}
                              placeholder='0.00'
                            />

                            <FormField
                              label='Expected Loss'
                              type='number'
                              value={formData.expectedLoss || 0}
                              onChange={e => handleChange('expectedLoss', parseFloat(e.target.value) || 0)}
                              placeholder='0.00'
                            />

                            <FormField
                              label='Target Profit'
                              type='number'
                              value={formData.targetProfit || 0}
                              onChange={e => handleChange('targetProfit', parseFloat(e.target.value) || 0)}
                              placeholder='0.00'
                            />
                          </div>

                          {/* Base Price Display */}
                          <div className='space-y-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'>
                            <h4 className='text-lg font-semibold text-slate-900 dark:text-white'>Base Price Calculation</h4>

                            <div>
                              <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'>
                                Base Price (Excl. GST) - Auto Calculated
                              </label>
                              <div className='flex items-center gap-2'>
                                <Input
                                  type='number'
                                  value={formData.basePrice || 0}
                                  readOnly
                                  className='bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-semibold'
                                />
                                <span className='text-sm text-slate-500 dark:text-slate-400'>₹</span>
                              </div>
                              <p className='text-xs text-slate-500 dark:text-slate-400 mt-1'>
                                Product Cost + Logistics + PG Cost + Expected Loss + Target Profit
                              </p>
                            </div>
                          </div>

                          {/* GST Calculation */}
                          <div className='space-y-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700'>
                            <h4 className='text-lg font-semibold text-slate-900 dark:text-white'>GST Calculation</h4>

                            <FormField
                              label='HSN / SAC (visible only to vendor)'
                              type='text'
                              value={formData.hsnSac || ''}
                              onChange={e => handleChange('hsnSac', e.target.value)}
                              placeholder='Enter HSN or SAC code'
                            />

                            <Dropdown
                              labelMain='GST Rate (%)'
                              options={[
                                { label: '5%', value: '5' },
                                { label: '9%', value: '9' },
                                { label: '12%', value: '12' },
                                { label: '18%', value: '18' },
                                { label: '28%', value: '28' },
                              ]}
                              value={String(formData.taxRate || 18)}
                              onChange={option => handleChange('taxRate', parseFloat(option.value))}
                              placeholder='Select GST rate'
                            />

                            {/* Display GST Amount */}

                            {/* GST Breakdown - CGST/SGST/IGST */}
                            {/* {(formData.cgst || formData.sgst || formData.igst) && (formData.cgst! > 0 || formData.sgst! > 0 || formData.igst! > 0) && (
                              <div className='space-y-2 p-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600'>
                                <p className='text-sm font-medium text-slate-700 dark:text-slate-300'>GST Breakdown (Auto Calculated):</p>
                                {formData.cgst && formData.cgst > 0 && (
                                  <div className='flex justify-between text-sm'>
                                    <span className='text-slate-600 dark:text-slate-400'>CGST:</span>
                                    <span className='font-semibold text-slate-900 dark:text-white'>₹{formData.cgst.toFixed(2)}</span>
                                  </div>
                                )}
                                {formData.sgst && formData.sgst > 0 && (
                                  <div className='flex justify-between text-sm'>
                                    <span className='text-slate-600 dark:text-slate-400'>SGST:</span>
                                    <span className='font-semibold text-slate-900 dark:text-white'>₹{formData.sgst.toFixed(2)}</span>
                                  </div>
                                )}
                                {formData.igst && formData.igst > 0 && (
                                  <div className='flex justify-between text-sm'>
                                    <span className='text-slate-600 dark:text-slate-400'>IGST:</span>
                                    <span className='font-semibold text-slate-900 dark:text-white'>₹{formData.igst.toFixed(2)}</span>
                                  </div>
                                )}
                              </div>
                            )} */}
                          </div>

                          {/* Final Selling Price and Bank Settlement - In One Row */}
                          <div className='space-y-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700'>
                            <h4 className='text-lg font-semibold text-slate-900 dark:text-white'>Final Pricing Summary</h4>

                            {/* Display calculation breakdown */}
                            {formData.basePrice && formData.basePrice > 0 && (
                              <div className='p-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 mb-4'>
                                <div className='space-y-2 text-sm'>
                                  <div className='flex justify-between'>
                                    <span className='text-slate-600 dark:text-slate-400'>Base Price:</span>
                                    <span className='font-medium text-slate-900 dark:text-white'>₹{formData.basePrice.toFixed(2)}</span>
                                  </div>
                                  <div className='flex justify-between'>
                                    <span className='text-slate-600 dark:text-slate-400'>
                                      GST ({formData.taxRate || 18}%): Base Price × {formData.taxRate || 18}% = ₹
                                      {((formData.basePrice * (formData.taxRate || 18)) / 100).toFixed(2)}
                                    </span>
                                    <span className='font-medium text-slate-900 dark:text-white'>
                                      ₹{((formData.basePrice * (formData.taxRate || 18)) / 100).toFixed(2)}
                                    </span>
                                  </div>
                                  <div className='flex justify-between items-center'>
                                    <span className='text-slate-600 dark:text-slate-400'>Total Before Rounding:</span>
                                    <span className='font-medium text-slate-900 dark:text-white'>
                                      ₹{((formData.basePrice || 0) + ((formData.basePrice || 0) * (formData.taxRate || 18)) / 100).toFixed(2)}
                                    </span>
                                  </div>
                                  <div className='border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between items-center'>
                                    <span className='font-bold text-slate-900 dark:text-white'>Final Selling Price (Rounded Up):</span>
                                    <span className='font-bold text-lg text-green-600 dark:text-green-400'>
                                      ₹{formData.sellingPriceInclGST || 0}
                                    </span>
                                  </div>
                                  <p className='text-xs text-slate-500 dark:text-slate-400 mt-2'>
                                    Total: ₹{((formData.basePrice || 0) + ((formData.basePrice || 0) * (formData.taxRate || 18)) / 100).toFixed(2)} → Rounded up to ₹{formData.sellingPriceInclGST || 0}
                                  </p>
                                </div>
                              </div>
                            )}

                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                              {/* Final Selling Price */}
                              <div>
                                <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'>
                                  Selling Price (Incl. GST) - Shown to Customer
                                </label>
                                <div className='flex items-center gap-2'>
                                  <Input
                                    type='number'
                                    value={formData.sellingPriceInclGST || 0}
                                    readOnly
                                    className='bg-green-100 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-700 font-bold text-lg'
                                  />
                                  <span className='text-lg font-semibold text-green-700 dark:text-green-300'>₹</span>
                                </div>
                                <p className='text-xs text-slate-500 dark:text-slate-400 mt-1'>
                                  Base Price + GST Amount (rounded up) - This price will be displayed on the website
                                </p>
                              </div>

                              {/* Bank Settlement Amount */}
                              <div>
                                <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'>
                                  Bank Settlement Estimation (Auto Calculated)
                                </label>
                                <div className='flex items-center gap-2'>
                                  <Input
                                    type='number'
                                    value={formData.bankSettlementAmount || 0}
                                    readOnly
                                    className='bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-300 dark:border-purple-700 font-bold text-lg'
                                  />
                                  <span className='text-lg font-semibold text-purple-700 dark:text-purple-300'>₹</span>
                                </div>
                                <p className='text-xs text-slate-500 dark:text-slate-400 mt-1'>
                                  Selling Price - Logistics - PG Cost - Expected Loss
                                </p>
                              </div>
                            </div>
                            {/* <p className='text-xs text-slate-600 dark:text-slate-300 mt-2 font-medium'>
                              The Bank Settlement Amount is automatically calculated and represents the estimated amount that will be
                              settled to the bank account after deducting logistics, payment gateway charges, and expected losses.
                            </p> */}
                          </div>

                          {/* Regular Price (MRP) - Editable by Vendor */}
                          <div className='space-y-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700'>
                            <h4 className='text-lg font-semibold text-slate-900 dark:text-white'>Regular Price (MRP)</h4>

                            <FormField
                              label='Regular Price (MRP) - Enter the original/marked price'
                              type='number'
                              value={formData.regularPrice || 0}
                              onChange={e => handleChange('regularPrice', parseFloat(e.target.value) || 0)}
                              placeholder='0.00'
                            />
                            <p className='text-xs text-slate-500 dark:text-slate-400'>
                              This is the original marked price (MRP) that vendors can set. This is separate from the calculated selling
                              price.
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className='text-sm text-slate-600 dark:text-slate-400'>
                            Jewellery pricing replaces standard price fields. Provide the attributes below.
                          </p>

                          <FormField
                            label='Weight (grams)'
                            required
                            type='number'
                            value={formData.jewelleryWeight}
                            onChange={e => handleChange('jewelleryWeight', parseFloat(e.target.value) || 0)}
                            placeholder='0.00'
                            error={isFieldInActiveTab('jewelleryWeight') ? errors.jewelleryWeight : undefined}
                          />

                          <Dropdown
                            labelMain='Purity'
                            options={JEWELLERY_PURITY_OPTIONS}
                            value={formData.jewelleryPurity}
                            onChange={option => handleChange('jewelleryPurity', option.value as JewelleryPurity)}
                            placeholder='Select purity'
                            error={isFieldInActiveTab('jewelleryPurity') ? errors.jewelleryPurity : undefined}
                          />

                          <FormField
                            label='Making Charges'
                            required
                            type='number'
                            value={formData.jewelleryMakingCharges}
                            onChange={e => handleChange('jewelleryMakingCharges', parseFloat(e.target.value) || 0)}
                            placeholder='0.00'
                            error={isFieldInActiveTab('jewelleryMakingCharges') ? errors.jewelleryMakingCharges : undefined}
                          />

                          <FormField
                            label='Stone Details (optional)'
                            textarea
                            rows={2}
                            value={formData.jewelleryStoneDetails}
                            onChange={e => handleChange('jewelleryStoneDetails', e.target.value)}
                            placeholder='Describe stone quality, type, cut, etc.'
                          />

                          <FormField
                            label='Certification (optional)'
                            value={formData.jewelleryCertification}
                            onChange={e => handleChange('jewelleryCertification', e.target.value)}
                            placeholder='e.g., BIS Hallmark, GIA, IGI'
                          />
                        </>
                      )}
                    </div>
                  )}

                  {/* Inventory */}
                  {activeTab === 'inventory' && (
                    <div className='space-y-6'>
                      <h3 className='text-xl font-semibold text-slate-900 dark:text-white'>Inventory</h3>

                      <FormField
                        label='Stock Quantity'
                        required
                        type='number'
                        value={formData.stock}
                        onChange={e => handleChange('stock', parseInt(e.target.value) || 0)}
                        placeholder='0'
                        error={isFieldInActiveTab('stock') ? errors.stock : undefined}
                      />

                      <FormField
                        label='Low Stock Threshold'
                        type='number'
                        value={formData.lowStockThreshold}
                        onChange={e => handleChange('lowStockThreshold', parseInt(e.target.value) || 0)}
                        placeholder='10'
                      />

                      <div className='flex items-center gap-2'>
                        <input
                          type='checkbox'
                          id='backorders'
                          checked={formData.allowBackorders}
                          onChange={e => handleChange('allowBackorders', e.target.checked)}
                          className='w-4 h-4 rounded border-slate-300 dark:border-slate-600'
                        />
                        <label htmlFor='backorders' className='text-sm font-medium text-slate-700 dark:text-slate-300'>
                          Allow Backorders
                        </label>
                      </div>

                      <FormField
                        label='Barcode/UPC'
                        value={formData.barcode}
                        onChange={e => handleChange('barcode', e.target.value)}
                        placeholder='Enter barcode or UPC'
                      />

                      <Dropdown
                        options={[
                          { label: 'Select Warehouse', value: '' },
                          ...warehouses.map(wh => ({
                            label: `${wh.name} (${wh.pincode})`,
                            value: wh._id,
                          })),
                        ]}
                        placeholder='Select warehouse'
                        labelMain='Warehouse'
                        value={formData.warehouseId || ''}
                        onChange={option => handleChange('warehouseId', option.value)}
                        error={isFieldInActiveTab('warehouseId') ? errors.warehouseId : undefined}
                      />
                    </div>
                  )}

                  {/* Attributes */}
                  {activeTab === 'attributes' && (
                    <div className='space-y-6'>
                      <div>
                        <h3 className='text-xl font-semibold text-slate-900 dark:text-white'>Attributes</h3>
                        <p className='text-sm text-slate-600 dark:text-slate-400'>
                          Select attribute values to capture material, color, size, and other key descriptors. These selections are saved
                          with the product record and can be reused anywhere else in the platform.
                        </p>
                      </div>

                      {/* Search and Actions */}
                      <div className='space-y-3'>
                        <div className='flex flex-wrap items-center gap-3'>
                          <div className='flex-1 min-w-[200px] relative'>
                            <Input
                              type='text'
                              placeholder='Search attributes...'
                              value={attributeSearchTerm}
                              onChange={e => setAttributeSearchTerm(e.target.value)}
                              className='bg-white dark:bg-slate-800 pr-10'
                            />
                            <Search className='absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
                          </div>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='gap-2 border-slate-200 dark:border-slate-700'
                            onClick={() => fetchAttributes()}
                            disabled={loadingAttributes}>
                            {loadingAttributes && <Loader2 className='w-4 h-4 animate-spin' />}
                            Refresh
                          </Button>
                          <Button
                            type='button'
                            className='gap-2 bg-green-600 hover:bg-green-700 text-white'
                            onClick={() => {
                              setNewAttributeName('');
                              setNewAttributeValues(['']);
                              setShowCreateAttributeDialog(true);
                            }}>
                            <Plus className='w-4 h-4' />
                            Create Attribute
                          </Button>
                        </div>
                        {attributeError && <p className='text-sm text-red-500'>{attributeError}</p>}
                        {attributeSearchTerm && (
                          <p className='text-sm text-slate-600 dark:text-slate-400'>
                            Showing {filteredAttributes.length} of {attributeOptions.length} attributes
                          </p>
                        )}
                      </div>

                      {loadingAttributes ? (
                        <div className='flex items-center gap-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-4 py-6 text-slate-600 dark:text-slate-300'>
                          <Loader2 className='w-5 h-5 animate-spin text-green-600' />
                          Loading attributes...
                        </div>
                      ) : attributeOptions.length === 0 ? (
                        <div className='rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/30 p-6 text-center space-y-3'>
                          <p className='text-base font-semibold text-slate-900 dark:text-white'>No attributes available yet</p>
                          <p className='text-sm text-slate-600 dark:text-slate-400'>
                            Create attribute groups from the Attributes module to start tagging products.
                          </p>
                          <Button
                            type='button'
                            className='bg-green-600 hover:bg-green-700 text-white'
                            onClick={() => router.push('/admin/attributes/add')}>
                            Add Attribute
                          </Button>
                        </div>
                      ) : (
                        <div className='space-y-5'>
                          {filteredAttributes.length === 0 ? (
                            <div className='rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/30 p-6 text-center space-y-3'>
                              <p className='text-base font-semibold text-slate-900 dark:text-white'>
                                {attributeSearchTerm ? 'No attributes found' : 'No attributes available yet'}
                              </p>
                              <p className='text-sm text-slate-600 dark:text-slate-400'>
                                {attributeSearchTerm
                                  ? `No attributes match "${attributeSearchTerm}"`
                                  : 'Create attribute groups from the Attributes module to start tagging products.'}
                              </p>
                              {!attributeSearchTerm && (
                                <Button
                                  type='button'
                                  className='bg-green-600 hover:bg-green-700 text-white'
                                  onClick={() => {
                                    setNewAttributeName('');
                                    setNewAttributeValues(['']);
                                    setShowCreateAttributeDialog(true);
                                  }}>
                                  Create Attribute
                                </Button>
                              )}
                            </div>
                          ) : (
                            filteredAttributes.map(attribute => {
                              const selectedValues = formData.attributes?.[attribute._id] || [];
                              return (
                                <div
                                  key={attribute._id}
                                  className='space-y-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-5 shadow-sm'>
                                  <div className='flex flex-wrap items-center justify-between gap-2'>
                                    <div>
                                      <p className='text-base font-semibold text-slate-900 dark:text-white'>{attribute.name}</p>
                                      <p className='text-xs text-slate-500 dark:text-slate-400'>
                                        {attribute.values.length} value{attribute.values.length !== 1 ? 's' : ''}
                                      </p>
                                    </div>
                                    {selectedValues.length > 0 && (
                                      <span className='text-xs font-medium text-green-600'>{selectedValues.length} selected</span>
                                    )}
                                  </div>
                                  {attribute.values.length ? (
                                    <div className='flex flex-wrap gap-3'>
                                      {attribute.values.map(value => {
                                        const trimmedValue = value.trim();
                                        const selected = isAttributeValueSelected(attribute._id, trimmedValue);
                                        return (
                                          <button
                                            type='button'
                                            key={`${attribute._id}-${trimmedValue}`}
                                            onClick={() => handleAttributeValueToggle(attribute._id, trimmedValue)}
                                            className={cn(
                                              'px-4 py-2 rounded-full border text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500',
                                              selected
                                                ? 'bg-green-600 text-white border-green-600 shadow-sm'
                                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-green-400 hover:text-green-600'
                                            )}>
                                            {value}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className='text-sm text-slate-500 dark:text-slate-400'>This attribute does not have values yet.</p>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}

                      {/* Variant Pricing & Stock */}
                      {generateAttributeCombinations().length > 0 && (
                        <div className='mt-8 space-y-6'>
                          <div className='border-t border-slate-200 dark:border-slate-700 pt-6'>
                            <h3 className='text-lg font-semibold text-slate-900 dark:text-white mb-2'>
                              Set Price & Stock for Attribute Combinations
                            </h3>
                            <p className='text-sm text-slate-500 dark:text-slate-400 mb-4'>
                              Configure individual price and stock for each attribute combination. If not set, base product price/stock will
                              be used.
                            </p>

                            <div className='space-y-4'>
                              {generateAttributeCombinations().map((combination, idx) => {
                                const variant = getVariantForCombination(combination);
                                const combinationLabel = Object.entries(combination)
                                  .map(([key, value]) => `${key}: ${value}`)
                                  .join(' | ');

                                return (
                                  <div
                                    key={idx}
                                    className='rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4'>
                                    <div className='mb-3'>
                                      <p className='font-medium text-slate-900 dark:text-white text-sm'>{combinationLabel}</p>
                                    </div>
                                    <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                                      <div>
                                        <label className='block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1'>
                                          Price (₹)
                                        </label>
                                        <Input
                                          type='number'
                                          placeholder={`${formData.sellingPrice || formData.regularPrice || 0}`}
                                          value={variant?.price || ''}
                                          onChange={e => {
                                            const val = parseFloat(e.target.value) || 0;
                                            updateVariant(combination, 'price', val);
                                          }}
                                          className='bg-white dark:bg-slate-800'
                                        />
                                        {!variant?.price && (
                                          <p className='text-xs text-slate-500 mt-1'>
                                            Default: ₹{formData.sellingPrice || formData.regularPrice || 0}
                                          </p>
                                        )}
                                      </div>
                                      <div>
                                        <label className='block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1'>Stock *</label>
                                        <Input
                                          type='number'
                                          placeholder='0'
                                          value={variant?.stock ?? ''}
                                          onChange={e => {
                                            const val = parseInt(e.target.value) || 0;
                                            updateVariant(combination, 'stock', val);
                                          }}
                                          className='bg-white dark:bg-slate-800'
                                          required
                                        />
                                      </div>
                                      <div>
                                        <label className='block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1'>
                                          SKU (Optional)
                                        </label>
                                        <Input
                                          type='text'
                                          placeholder={`${formData.sku}-${Object.values(combination).join('-')}`}
                                          value={variant?.sku || ''}
                                          onChange={e => updateVariant(combination, 'sku', e.target.value)}
                                          className='bg-white dark:bg-slate-800'
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Images */}
                  {activeTab === 'images' && (
                    <div className='space-y-6'>
                      <h3 className='text-xl font-semibold text-slate-900 dark:text-white'>Images & Media</h3>

                      <div className='space-y-4'>
                        <MainImageUpload
                          label='Main Image'
                          required
                          value={formData.mainImage}
                          onChange={val => handleChange('mainImage', val)}
                          error={isFieldInActiveTab('mainImage') ? errors.mainImage : undefined}
                        />

                        <div className='space-y-2'>
                          <label className='block text-sm font-medium text-slate-700 dark:text-slate-300'>
                            Gallery Images & Videos
                          </label>
                          <p className='text-xs text-slate-500 dark:text-slate-400 mb-2'>
                            Upload images or videos. Videos must be 10MB or less.
                          </p>
                          <Input
                            type='file'
                            accept='image/*,video/*'
                            multiple
                            onChange={e => {
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
                                    reader.onload = event => {
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
                            className='bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600'
                          />
                          <div className='grid grid-cols-3 gap-2 mt-4'>
                            {(formData.galleryImages || []).map((media, idx) => {
                              const isVideo = typeof media === 'string' && (media.startsWith('data:video/') || media.includes('video'));
                              return (
                                <div key={`gallery-${idx}`} className='relative'>
                                  {isVideo ? (
                                    <video
                                      src={media || '/placeholder.svg'}
                                      className='h-24 w-full object-cover rounded'
                                      controls
                                      muted
                                    />
                                  ) : (
                                    <img
                                      src={media || '/placeholder.svg'}
                                      alt={`Gallery ${idx}`}
                                      className='h-24 w-full object-cover rounded'
                                    />
                                  )}
                                  <button
                                    type='button'
                                    onClick={() => {
                                      const currentImages = Array.isArray(formData.galleryImages) ? formData.galleryImages : [];
                                      handleChange(
                                        'galleryImages',
                                        currentImages.filter((_, i) => i !== idx)
                                      );
                                    }}
                                    className='absolute top-1 right-1 bg-red-600 text-white p-1 rounded hover:bg-red-700'>
                                    <X className='w-3 h-3' />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className='space-y-2'>
                          <label className='block text-sm font-medium text-slate-700 dark:text-slate-300'>Size Chart (Image)</label>
                          <Input
                            type='file'
                            accept='image/*'
                            onChange={e => {
                              if (e.target.files?.[0]) {
                                const file = e.target.files[0];
                                const reader = new FileReader();
                                reader.onload = event => {
                                  handleChange('sizeChartImage', event.target?.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className='bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600'
                          />
                          {formData.sizeChartImage && (
                            <div className='relative mt-3 w-32 h-32'>
                              <img
                                src={formData.sizeChartImage || '/placeholder.svg'}
                                alt='Size chart preview'
                                className='w-full h-full object-cover rounded'
                              />
                              <button
                                type='button'
                                onClick={() => handleChange('sizeChartImage', '')}
                                className='absolute top-1 right-1 bg-red-600 text-white p-1 rounded'>
                                <X className='w-3 h-3' />
                              </button>
                            </div>
                          )}
                        </div>

                        <FormField
                          label='Product Video URL'
                          value={formData.productVideo}
                          onChange={e => handleChange('productVideo', e.target.value)}
                          placeholder='https://youtube.com/watch?v=...'
                        />
                      </div>
                    </div>
                  )}

                  {/* SEO */}
                  {activeTab === 'seo' && (
                    <div className='space-y-6'>
                      <h3 className='text-xl font-semibold text-slate-900 dark:text-white'>SEO Settings</h3>

                      <div className='space-y-2'>
                        <label className='block text-sm font-medium text-slate-700 dark:text-slate-300'>
                          URL Slug <span className='text-red-500'>*</span>
                        </label>
                        <div className='flex gap-2'>
                          <FormField
                            label='URL Slug'
                            required
                            hideLabel
                            value={formData.urlSlug}
                            onChange={e => handleChange('urlSlug', e.target.value)}
                            placeholder='product-name'
                            error={isFieldInActiveTab('urlSlug') ? errors.urlSlug : undefined}
                            containerClassName='flex-1'
                          />
                          <Button
                            type='button'
                            onClick={autoGenerateSlug}
                            className='bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white'>
                            Auto
                          </Button>
                        </div>
                      </div>

                      <FormField
                        label='Focus Keyword'
                        value={formData.focusKeyword}
                        onChange={e => handleChange('focusKeyword', e.target.value)}
                        placeholder='Main keyword to optimize for'
                      />

                      <FormField
                        label={`Meta Title (${formData.metaTitle.length}/60)`}
                        required
                        value={formData.metaTitle}
                        onChange={e => handleChange('metaTitle', e.target.value.slice(0, 60))}
                        placeholder='SEO title'
                        maxLength={60}
                        error={isFieldInActiveTab('metaTitle') ? errors.metaTitle : undefined}
                      />

                      <FormField
                        label={`Meta Description (${formData.metaDescription.length}/160)`}
                        required
                        textarea
                        rows={3}
                        value={formData.metaDescription}
                        onChange={e => handleChange('metaDescription', e.target.value.slice(0, 160))}
                        placeholder='SEO description'
                        maxLength={160}
                        error={isFieldInActiveTab('metaDescription') ? errors.metaDescription : undefined}
                      />

                      <div className='p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700'>
                        <p className='text-sm font-medium text-slate-700 dark:text-white mb-2'>Google Preview Snippet</p>
                        <div className='text-sm'>
                          <p className='text-blue-600 dark:text-blue-400 truncate'>{formData.urlSlug || 'product-url'}</p>
                          <p className='font-medium text-slate-900 dark:text-white truncate'>{formData.metaTitle || 'Your page title'}</p>
                          <p className='text-slate-600 dark:text-slate-400 line-clamp-2'>
                            {formData.metaDescription || 'Your description will appear here'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Other Details */}
                  {activeTab === 'other' && (
                    <div className='space-y-8'>
                      {/* Shipping */}
                      <div className='space-y-4'>
                        <h3 className='text-xl font-semibold text-slate-900 dark:text-white'>Shipping Details</h3>

                        <FormField
                          label='Weight (kg)'
                          type='number'
                          value={formData.weight}
                          onChange={e => handleChange('weight', parseFloat(e.target.value) || 0)}
                          placeholder='0.00'
                        />

                        <FormField
                          label='Dimensions (L × W × H in cm)'
                          value={formData.dimensions}
                          onChange={e => handleChange('dimensions', e.target.value)}
                          placeholder='e.g., 10 × 10 × 10'
                        />
                      </div>

                      {/* Additional Settings */}
                      <div className='space-y-4'>
                        <h3 className='text-xl font-semibold text-slate-900 dark:text-white'>Additional Settings</h3>

                        <Dropdown
                          labelMain='Product Status'
                          options={[
                            { label: 'Active', value: 'active' },
                            { label: 'Inactive', value: 'inactive' },
                          ]}
                          value={formData.status}
                          onChange={option => handleChange('status', option.value)}
                          placeholder='Select status'
                        />

                        <div className='flex items-center justify-between p-4 border rounded-lg'>
                          <div>
                            <p className='text-sm font-medium text-slate-700 dark:text-slate-300'>Featured Product</p>
                            <p className='text-xs text-muted-foreground'>Highlight this product across the store</p>
                          </div>
                          <Switch
                            id='featured'
                            checked={formData.featured}
                            onCheckedChange={checked => handleChange('featured', checked)}
                          />
                        </div>

                        <div className='flex items-center justify-between p-4 border rounded-lg'>
                          <div>
                            <p className='text-sm font-medium text-slate-700 dark:text-slate-300'>Trending Product</p>
                            <p className='text-xs text-muted-foreground'>Mark this product as trending</p>
                          </div>
                          <Switch
                            id='trending'
                            checked={formData.trending}
                            onCheckedChange={checked => handleChange('trending', checked)}
                          />
                        </div>

                        <div className='flex items-center justify-between p-4 border rounded-lg'>
                          <div>
                            <p className='text-sm font-medium text-slate-700 dark:text-slate-300'>Best Seller</p>
                            <p className='text-xs text-muted-foreground'>Mark this product as best seller</p>
                          </div>
                          <Switch
                            id='bestSeller'
                            checked={formData.bestSeller}
                            onCheckedChange={checked => handleChange('bestSeller', checked)}
                          />
                        </div>

                        <div className='flex items-center justify-between p-4 border rounded-lg'>
                          <div>
                            <p className='text-sm font-medium text-slate-700 dark:text-slate-300'>Allow Reviews</p>
                            <p className='text-xs text-muted-foreground'>Let customers review this product</p>
                          </div>
                          <Switch
                            id='reviews'
                            checked={formData.allowReviews}
                            onCheckedChange={checked => handleChange('allowReviews', checked)}
                          />
                        </div>

                        <FormField
                          label='Return Policy (Days)'
                          type='number'
                          value={formData.returnPolicyDays}
                          onChange={e => handleChange('returnPolicyDays', parseInt(e.target.value) || 0)}
                          placeholder='30'
                        />

                        <FormField
                          label='Warranty Period'
                          value={formData.warrantyPeriod}
                          onChange={e => handleChange('warrantyPeriod', e.target.value)}
                          placeholder='e.g., 1 year'
                        />
                      </div>

                      {/* Related Products */}
                      <div className='space-y-4'>
                        <h3 className='text-xl font-semibold text-slate-900 dark:text-white'>Related Products</h3>
                        <p className='text-sm text-slate-500 dark:text-slate-400'>
                          Select products that are related to this product. These will be shown on the product details page.
                        </p>

                        {/* Search Input */}
                        <div className='relative'>
                          <Input
                            type='text'
                            placeholder='Search products by name...'
                            value={relatedProductsSearch}
                            onChange={e => setRelatedProductsSearch(e.target.value)}
                            className='bg-white dark:bg-slate-800'
                          />
                          <Search className='absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
                        </div>

                        {/* Products List */}
                        {loadingProducts ? (
                          <div className='flex items-center justify-center py-8'>
                            <Loader2 className='w-6 h-6 animate-spin text-slate-400' />
                          </div>
                        ) : (
                          <div className='max-h-[400px] overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-2'>
                            {allProducts
                              .filter(p => p.name.toLowerCase().includes(relatedProductsSearch.toLowerCase()))
                              .map(product => {
                                const isSelected = formData.relatedProducts?.includes(product._id);
                                return (
                                  <div
                                    key={product._id}
                                    onClick={() => {
                                      const currentRelated = formData.relatedProducts || [];
                                      if (isSelected) {
                                        handleChange(
                                          'relatedProducts',
                                          currentRelated.filter(id => id !== product._id)
                                        );
                                      } else {
                                        handleChange('relatedProducts', [...currentRelated, product._id]);
                                      }
                                    }}
                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                                      isSelected
                                        ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-green-400'
                                    }`}>
                                    <div className='flex-shrink-0'>
                                      <div
                                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                          isSelected ? 'bg-green-600 border-green-600' : 'border-slate-300 dark:border-slate-600'
                                        }`}>
                                        {isSelected && <Check className='w-3 h-3 text-white' />}
                                      </div>
                                    </div>
                                    {product.mainImage && (
                                      <img src={product.mainImage} alt={product.name} className='w-12 h-12 object-cover rounded' />
                                    )}
                                    <div className='flex-1 min-w-0'>
                                      <p className='text-sm font-medium text-slate-900 dark:text-white truncate'>{product.name}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            {allProducts.filter(p => p.name.toLowerCase().includes(relatedProductsSearch.toLowerCase())).length === 0 && (
                              <div className='text-center py-8 text-slate-500 dark:text-slate-400'>
                                {relatedProductsSearch ? 'No products found' : 'No products available'}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Selected Products Count */}
                        {formData.relatedProducts && formData.relatedProducts.length > 0 && (
                          <div className='flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800'>
                            <span className='text-sm font-medium text-green-700 dark:text-green-300'>
                              {formData.relatedProducts.length} product{formData.relatedProducts.length !== 1 ? 's' : ''} selected
                            </span>
                            <Button
                              type='button'
                              onClick={() => handleChange('relatedProducts', [])}
                              variant='ghost'
                              size='sm'
                              className='text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20'>
                              Clear All
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Form Actions */}
              <div className='flex flex-col sm:flex-row gap-3 justify-end pt-4'>
                <Button
                  type='button'
                  onClick={() => router.push('/admin/products')}
                  variant='outline'
                  className='border-slate-200 dark:border-slate-700'>
                  Cancel
                </Button>
                <Button
                  type='submit'
                  disabled={loading}
                  className='bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white'>
                  {loading ? 'Saving...' : productId ? 'Update Product' : 'Create Product'}
                </Button>
              </div>
            </section>
          </div>
        </form>
      </div>

      {/* Create Attribute Dialog */}
      <Dialog open={showCreateAttributeDialog} onOpenChange={setShowCreateAttributeDialog}>
        <DialogContent className='sm:max-w-[600px]'>
          <DialogHeader>
            <DialogTitle>Create New Attribute</DialogTitle>
            <DialogDescription>Create a new attribute that can be used across all products</DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            <div>
              <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'>Attribute Name *</label>
              <Input
                placeholder='e.g., Color, Size, Material'
                value={newAttributeName}
                onChange={e => setNewAttributeName(e.target.value)}
                className='bg-white dark:bg-slate-800'
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'>Attribute Values *</label>
              <div className='space-y-2'>
                {newAttributeValues.map((value, index) => (
                  <div key={index} className='flex gap-2'>
                    <Input
                      placeholder={`Value ${index + 1}`}
                      value={value}
                      onChange={e => {
                        const newValues = [...newAttributeValues];
                        newValues[index] = e.target.value;
                        setNewAttributeValues(newValues);
                      }}
                      className='bg-white dark:bg-slate-800'
                    />
                    {newAttributeValues.length > 1 && (
                      <Button
                        type='button'
                        variant='outline'
                        size='icon'
                        onClick={() => {
                          const newValues = newAttributeValues.filter((_, i) => i !== index);
                          setNewAttributeValues(newValues);
                        }}>
                        <X className='w-4 h-4' />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setNewAttributeValues([...newAttributeValues, ''])}
                  className='w-full'>
                  <Plus className='w-4 h-4 mr-2' />
                  Add Value
                </Button>
              </div>
            </div>
          </div>

          <div className='flex justify-end gap-3 pt-4 border-t'>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                setShowCreateAttributeDialog(false);
                setNewAttributeName('');
                setNewAttributeValues(['']);
              }}>
              Cancel
            </Button>
            <Button
              type='button'
              onClick={handleCreateAttribute}
              disabled={creatingAttribute || !newAttributeName.trim()}
              className='bg-green-600 hover:bg-green-700 text-white'>
              {creatingAttribute ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  Creating...
                </>
              ) : (
                'Create Attribute'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
