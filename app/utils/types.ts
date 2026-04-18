export interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  banner: string;
  canonicalUrl: string;
  commissionRate: number;
  createdAt: string;
  updatedAt: string;
  displayOnHomepage: boolean;
  displayOrder: number;
  featured: boolean;
  focusKeywords: string[];
  image: string;
  metaDescription: string;
  metaTitle: string;
  ogImage: string;
  parentId: string | null;
  position: number;
  showProductCount: boolean;
  status: 'active' | 'inactive';
}


export interface Product {
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
  image?: string;
  seoStatus?: string;
  sku?: string;
  brand?: string;
}

export interface Brand {
  _id: string;
  name: string;
  image: string;
  bannerImage: string;
  metaTitle: string;
  metaDescription: string;
  metaImage: string;
  status: 'active' | 'inactive';
  createdAt?: string;
}

export interface Attribute {
  _id: string;
  name: string;
  style: string;
  values: string[];
  createdAt?: string;
}

export interface ProductType {
  allowBackorders: boolean;
  allowReviews: boolean;
  allow_return: boolean;
  attributes: any[];
  barcode: string;
  brand: string;
  brandDetails: {
    _id: string;
    name: string;
    status: string;
  };
  category: string;
  categoryDetails: {
    _id: string;
    name: string;
    slug: string;
    status: string;
    image: string;
    parent?: string;
  };
  costPrice: number;
  createdAt: string;
  dimensions: string;
  featured: boolean;
  focusKeyword: string;
  free_shipping: boolean;
  galleryImages: string[];
  id: string;
  image: string;
  jewelleryCertification: string;
  jewelleryMakingCharges: number;
  jewelleryPurity: string;
  jewelleryStoneDetails: string;
  jewelleryWeight: number;
  longDescription: string;
  lowStockThreshold: number;
  mainImage: string;
  metaDescription: string;
  metaTitle: string;
  name: string;
  originalPrice: number;
  price: number;
  processingTime: string;
  productVideo: string;
  product_type: string;
  regularPrice: number;
  relatedProducts: any[];
  returnPolicyDays: number;
  return_policy: string;
  sellingPrice: number;
  shippingClass: string;
  shortDescription: string;
  sizeChartImage: string;
  sku: string;
  status: string;
  stock: number;
  subcategory: string;
  tagDetails: any[];
  tags: string[];
  taxRate: number;
  updatedAt: string;
  urlSlug: string;
  attributes: Record<string, string[]>;
  vendor: string;
  visibility: string;
  warrantyPeriod: string;
  weight: number;
  wholesalePriceType: string;
  _id: string;
}
