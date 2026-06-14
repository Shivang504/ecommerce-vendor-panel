import { z } from 'zod';

export const MAX_IMPORT_ROWS = 500;
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMPORT_EXTENSIONS = ['.xlsx', '.xls', '.csv'] as const;

export const PRODUCT_TYPE_VALUES = [
  'Physical Product',
  'Digital Product',
  'External / Affiliate Product',
  'Jewellery',
] as const;

export type ProductImportRow = {
  rowNumber: number;
  name: string;
  sku: string;
  category: string;
  subcategory?: string;
  brand?: string;
  vendor?: string;
  product_type: (typeof PRODUCT_TYPE_VALUES)[number];
  status: 'active' | 'inactive' | 'draft';
  shortDescription: string;
  longDescription: string;
  regularPrice: number;
  sellingPrice: number;
  stock: number;
  taxRate: number;
  barcode?: string;
  mainImage?: string;
  urlSlug?: string;
  metaTitle?: string;
  metaDescription?: string;
  tags?: string[];
  free_shipping?: boolean;
  allow_return?: boolean;
  visibility?: string;
  jewelleryWeight?: number;
  jewelleryPurity?: string;
  jewelleryMakingCharges?: number;
};

export const ProductImportRowSchema = z
  .object({
    rowNumber: z.number().int().positive(),
    name: z.string().trim().min(1, 'Name is required'),
    sku: z.string().trim().min(1, 'SKU is required'),
    category: z.string().trim().min(1, 'Category is required'),
    subcategory: z.string().trim().optional().or(z.literal('')).transform(v => (v ? v : undefined)),
    brand: z.string().trim().optional().or(z.literal('')).transform(v => (v ? v : undefined)),
    vendor: z.string().trim().optional().or(z.literal('')).transform(v => (v ? v : undefined)),
    product_type: z.enum(PRODUCT_TYPE_VALUES).default('Physical Product'),
    status: z.enum(['active', 'inactive', 'draft']).default('draft'),
    shortDescription: z.string().trim().min(1, 'Short Description is required'),
    longDescription: z.string().trim().min(1, 'Long Description is required'),
    regularPrice: z.number().nonnegative().default(0),
    sellingPrice: z.number().nonnegative().default(0),
    stock: z.number().int().nonnegative().default(0),
    taxRate: z.number().nonnegative().default(18),
    barcode: z.string().trim().optional().or(z.literal('')).transform(v => (v ? v : undefined)),
    mainImage: z.string().trim().optional().or(z.literal('')).transform(v => (v ? v : undefined)),
    urlSlug: z.string().trim().optional().or(z.literal('')).transform(v => (v ? v : undefined)),
    metaTitle: z.string().trim().optional().or(z.literal('')).transform(v => (v ? v : undefined)),
    metaDescription: z.string().trim().optional().or(z.literal('')).transform(v => (v ? v : undefined)),
    tags: z.array(z.string()).optional(),
    free_shipping: z.boolean().optional(),
    allow_return: z.boolean().optional(),
    visibility: z.string().trim().optional().or(z.literal('')).transform(v => (v ? v : undefined)),
    jewelleryWeight: z.number().nonnegative().optional(),
    jewelleryPurity: z.string().trim().optional().or(z.literal('')).transform(v => (v ? v : undefined)),
    jewelleryMakingCharges: z.number().nonnegative().optional(),
  })
  .superRefine((row, ctx) => {
    if (row.product_type === 'Jewellery') {
      if (!(row.jewelleryWeight && row.jewelleryWeight > 0)) {
        ctx.addIssue({ code: 'custom', message: 'Weight (gm) is required for Jewellery products', path: ['jewelleryWeight'] });
      }
      if (!row.jewelleryPurity?.trim()) {
        ctx.addIssue({ code: 'custom', message: 'Purity is required for Jewellery products', path: ['jewelleryPurity'] });
      }
      if (!(row.jewelleryMakingCharges && row.jewelleryMakingCharges > 0)) {
        ctx.addIssue({ code: 'custom', message: 'Making Charges is required for Jewellery products', path: ['jewelleryMakingCharges'] });
      }
    } else {
      if (row.regularPrice <= 0) {
        ctx.addIssue({ code: 'custom', message: 'Regular Price must be greater than 0', path: ['regularPrice'] });
      }
      if (row.sellingPrice <= 0) {
        ctx.addIssue({ code: 'custom', message: 'Selling Price must be greater than 0', path: ['sellingPrice'] });
      }
      if (row.sellingPrice > row.regularPrice) {
        ctx.addIssue({ code: 'custom', message: 'Selling Price cannot exceed Regular Price', path: ['sellingPrice'] });
      }
    }

    if (row.status === 'active') {
      if (!row.urlSlug?.trim()) {
        ctx.addIssue({ code: 'custom', message: 'URL Slug is required for active products', path: ['urlSlug'] });
      }
      if (!row.metaTitle?.trim()) {
        ctx.addIssue({ code: 'custom', message: 'Meta Title is required for active products', path: ['metaTitle'] });
      }
      if (!row.metaDescription?.trim()) {
        ctx.addIssue({ code: 'custom', message: 'Meta Description is required for active products', path: ['metaDescription'] });
      }
      if (!row.mainImage?.trim()) {
        ctx.addIssue({ code: 'custom', message: 'Main Image URL is required for active products', path: ['mainImage'] });
      }
    }
  });

export function normalizeHeader(h: unknown): string {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function toNumberOrZero(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v).trim();
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function toOptionalNumber(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export function toBooleanOrUndefined(v: unknown): boolean | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  if (!s) return undefined;
  if (['1', 'true', 'yes', 'y'].includes(s)) return true;
  if (['0', 'false', 'no', 'n'].includes(s)) return false;
  return undefined;
}

export function toStatusOrUndefined(v: unknown): 'active' | 'inactive' | 'draft' | undefined {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return undefined;
  if (s === 'active') return 'active';
  if (s === 'inactive') return 'inactive';
  if (s === 'draft') return 'draft';
  return undefined;
}

export function toProductTypeOrDefault(v: unknown): (typeof PRODUCT_TYPE_VALUES)[number] {
  const s = String(v ?? '').trim();
  if ((PRODUCT_TYPE_VALUES as readonly string[]).includes(s)) {
    return s as (typeof PRODUCT_TYPE_VALUES)[number];
  }
  return 'Physical Product';
}

export function parseTags(v: unknown): string[] | undefined {
  if (v === null || v === undefined) return undefined;
  const raw = String(v).trim();
  if (!raw) return undefined;
  const tags = raw
    .split(/[,;|]/)
    .map(t => t.trim())
    .filter(Boolean);
  return tags.length ? tags : undefined;
}

export function mapRawRowToImportRow(source: Record<string, unknown>, rowNumber: number): ProductImportRow {
  const normalized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(source)) {
    normalized[normalizeHeader(k)] = v;
  }

  return {
    rowNumber,
    name: String(normalized['name'] ?? '').trim(),
    sku: String(normalized['sku'] ?? '').trim(),
    category: String(normalized['category'] ?? '').trim(),
    subcategory: String(normalized['subcategory'] ?? '').trim() || undefined,
    brand: String(normalized['brand'] ?? '').trim() || undefined,
    vendor: String(normalized['vendor'] ?? '').trim() || undefined,
    product_type: toProductTypeOrDefault(normalized['product type']),
    status: toStatusOrUndefined(normalized['status']) ?? 'draft',
    shortDescription: String(normalized['short description'] ?? '').trim(),
    longDescription: String(normalized['long description'] ?? '').trim(),
    regularPrice: toNumberOrZero(normalized['regular price']),
    sellingPrice: toNumberOrZero(normalized['selling price']),
    stock: Math.max(0, Math.floor(toNumberOrZero(normalized['stock']))),
    taxRate: toNumberOrZero(normalized['tax rate']) || 18,
    barcode: String(normalized['barcode'] ?? '').trim() || undefined,
    mainImage: String(normalized['main image url'] ?? normalized['main image'] ?? '').trim() || undefined,
    urlSlug: String(normalized['url slug'] ?? '').trim() || undefined,
    metaTitle: String(normalized['meta title'] ?? '').trim() || undefined,
    metaDescription: String(normalized['meta description'] ?? '').trim() || undefined,
    tags: parseTags(normalized['tags']),
    free_shipping: toBooleanOrUndefined(normalized['free shipping']),
    allow_return: toBooleanOrUndefined(normalized['allow return']),
    visibility: String(normalized['visibility'] ?? '').trim() || undefined,
    jewelleryWeight: toOptionalNumber(normalized['weight (gm)'] ?? normalized['jewellery weight']),
    jewelleryPurity: String(normalized['purity'] ?? normalized['jewellery purity'] ?? '').trim() || undefined,
    jewelleryMakingCharges: toOptionalNumber(normalized['making charges'] ?? normalized['jewellery making charges']),
  };
}

export function validateFileMeta(file: File): string | null {
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_IMPORT_EXTENSIONS.includes(ext as (typeof ALLOWED_IMPORT_EXTENSIONS)[number])) {
    return `Invalid file type. Allowed: ${ALLOWED_IMPORT_EXTENSIONS.join(', ')}`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File is too large. Maximum size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`;
  }
  return null;
}

export const PRODUCT_IMPORT_TEMPLATE_ROWS = [
  {
    Name: 'Cotton T-Shirt',
    SKU: 'TSH-001',
    Category: 'Men',
    'Subcategory': 'T-Shirts',
    Brand: 'Sample Brand',
    Vendor: 'Main Store',
    'Product Type': 'Physical Product',
    Status: 'draft',
    'Short Description': 'Comfortable cotton t-shirt',
    'Long Description': 'Premium quality cotton t-shirt suitable for everyday wear.',
    'Regular Price': 999,
    'Selling Price': 799,
    Stock: 50,
    'Tax Rate': 18,
    Barcode: '8901234567890',
    'Main Image URL': 'https://example.com/images/tshirt.jpg',
    'URL Slug': 'cotton-t-shirt',
    'Meta Title': 'Cotton T-Shirt - Buy Online',
    'Meta Description': 'Shop premium cotton t-shirts at great prices.',
    Tags: 'cotton,men,tshirt',
    'Free Shipping': 'false',
    'Allow Return': 'true',
    Visibility: 'Public',
    'Weight (gm)': '',
    Purity: '',
    'Making Charges': '',
  },
  {
    Name: 'Gold Ring',
    SKU: 'JWL-001',
    Category: 'Jewellery',
    'Subcategory': 'Rings',
    Brand: 'Sample Jeweller',
    Vendor: 'Main Store',
    'Product Type': 'Jewellery',
    Status: 'draft',
    'Short Description': '22k gold ring',
    'Long Description': 'Elegant 22k gold ring with fine craftsmanship.',
    'Regular Price': 0,
    'Selling Price': 0,
    Stock: 5,
    'Tax Rate': 3,
    Barcode: '',
    'Main Image URL': 'https://example.com/images/gold-ring.jpg',
    'URL Slug': 'gold-ring',
    'Meta Title': 'Gold Ring - 22k',
    'Meta Description': 'Buy authentic 22k gold rings online.',
    Tags: 'gold,jewellery,ring',
    'Free Shipping': 'false',
    'Allow Return': 'false',
    Visibility: 'Public',
    'Weight (gm)': 4.5,
    Purity: '22k',
    'Making Charges': 2500,
  },
];

export function buildProductDocument(
  row: ProductImportRow,
  options: {
    vendorName: string;
    vendorId?: string;
  }
) {
  const urlSlug = row.urlSlug?.trim() || slugify(row.name);
  const metaTitle = row.metaTitle?.trim() || row.name;
  const metaDescription = row.metaDescription?.trim() || row.shortDescription;

  return {
    name: row.name,
    sku: row.sku,
    shortDescription: row.shortDescription,
    longDescription: row.longDescription,
    category: row.category,
    subcategory: row.subcategory ?? '',
    childCategory: '',
    brand: row.brand ?? '',
    tags: row.tags ?? [],
    regularPrice: row.regularPrice,
    sellingPrice: row.sellingPrice,
    costPrice: 0,
    taxRate: row.taxRate,
    stock: row.stock,
    lowStockThreshold: 10,
    allowBackorders: false,
    barcode: row.barcode ?? '',
    dimensions: '',
    shippingClass: 'Standard',
    processingTime: '1-2 days',
    product_type: row.product_type,
    free_shipping: row.free_shipping ?? false,
    allow_return: row.allow_return ?? false,
    return_policy: '',
    metaTitle,
    metaDescription,
    urlSlug,
    focusKeyword: '',
    mainImage: row.mainImage ?? '',
    galleryImages: [],
    sizeChartImage: '',
    productVideo: '',
    wholesalePriceType: 'Fixed',
    jewelleryWeight: row.jewelleryWeight ?? 0,
    jewelleryPurity: row.jewelleryPurity ?? '',
    jewelleryMakingCharges: row.jewelleryMakingCharges ?? 0,
    jewelleryStoneDetails: '',
    jewelleryCertification: '',
    attributes: {},
    specifications: {},
    variants: [],
    relatedProducts: [],
    status: row.status,
    visibility: row.visibility ?? 'Public',
    featured: false,
    trending: false,
    bestSeller: false,
    allowReviews: true,
    returnPolicyDays: 30,
    warrantyPeriod: '1 year',
    vendor: options.vendorName,
    vendorId: options.vendorId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
