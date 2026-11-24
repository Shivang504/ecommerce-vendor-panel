import XLSX from 'xlsx';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { MongoClient } from 'mongodb';
import { pathToFileURL } from 'url';

// Load compiled-on-the-fly via tsx register isn't available in plain mjs.
// Duplicate minimal helpers by importing from built path using dynamic import of ts via npx is heavy —
// instead spawn through path that re-exports. We'll inline map using same column names.

const require = createRequire(import.meta.url);

async function loadImportLib() {
  // Prefer tsx loader path when parent runs via tsx; fallback dynamic import of .ts fails in node.
  // Use child process? Simpler: read TEMPLATE from known JSON we write after parsing with node -e.
  return null;
}

const TEMPLATE_ROWS = [
  {
    Name: 'Cotton T-Shirt',
    SKU: 'TSH-001',
    Category: 'Men',
    Subcategory: 'T-Shirts',
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
    Subcategory: 'Rings',
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

function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildDoc(row, { vendorName, vendorId }) {
  return {
    name: row.Name,
    sku: row.SKU,
    shortDescription: row['Short Description'],
    longDescription: row['Long Description'],
    category: row.Category,
    subcategory: row.Subcategory || '',
    childCategory: '',
    brand: row.Brand || '',
    tags: String(row.Tags || '')
      .split(/[,;|]/)
      .map(t => t.trim())
      .filter(Boolean),
    regularPrice: Number(row['Regular Price'] || 0),
    sellingPrice: Number(row['Selling Price'] || 0),
    costPrice: 0,
    taxRate: Number(row['Tax Rate'] || 18),
    stock: Number(row.Stock || 0),
    lowStockThreshold: 10,
    allowBackorders: false,
    barcode: row.Barcode || '',
    dimensions: '',
    shippingClass: 'Standard',
    processingTime: '1-2 days',
    product_type: row['Product Type'],
    free_shipping: String(row['Free Shipping']).toLowerCase() === 'true',
    allow_return: String(row['Allow Return']).toLowerCase() === 'true',
    return_policy: '',
    metaTitle: row['Meta Title'] || row.Name,
    metaDescription: row['Meta Description'] || row['Short Description'],
    urlSlug: row['URL Slug'] || slugify(row.Name),
    focusKeyword: '',
    mainImage: row['Main Image URL'] || '',
    galleryImages: [],
    sizeChartImage: '',
    productVideo: '',
    wholesalePriceType: 'Fixed',
    jewelleryWeight: Number(row['Weight (gm)'] || 0),
    jewelleryPurity: row.Purity || '',
    jewelleryMakingCharges: Number(row['Making Charges'] || 0),
    jewelleryStoneDetails: '',
    jewelleryCertification: '',
    attributes: {},
    specifications: {},
    variants: [],
    relatedProducts: [],
    status: row.Status || 'draft',
    visibility: row.Visibility || 'Public',
    featured: false,
    trending: false,
    bestSeller: false,
    allowReviews: true,
    returnPolicyDays: 30,
    warrantyPeriod: '1 year',
    vendor: vendorName,
    vendorId,
    createdAt: new Date(),
    updatedAt: new Date(),
    _importTest: true,
  };
}

async function main() {
  const stamp = Date.now().toString().slice(-6);
  const sampleRows = [
    {
      Name: 'Import Test Cotton Tee',
      SKU: `IMP-TEE-${stamp}`,
      Category: 'Men',
      Subcategory: '',
      Brand: 'UrbanStyle',
      Vendor: 'Kevin Stores',
      'Product Type': 'Physical Product',
      Status: 'draft',
      'Short Description': 'Soft cotton tee for daily wear',
      'Long Description': 'Bulk-import sample physical product. Round neck, regular fit.',
      'Regular Price': 999,
      'Selling Price': 799,
      Stock: 25,
      'Tax Rate': 18,
      Barcode: `8901${stamp}01`,
      'Main Image URL': 'https://www.tryvvo.com/home/trendy-men.jpg',
      'URL Slug': `import-test-cotton-tee-${stamp}`,
      'Meta Title': 'Import Test Cotton Tee',
      'Meta Description': 'Sample product created via Excel bulk import test.',
      Tags: 'import,test,men,cotton',
      'Free Shipping': 'false',
      'Allow Return': 'true',
      Visibility: 'Public',
      'Weight (gm)': '',
      Purity: '',
      'Making Charges': '',
    },
    {
      Name: 'Import Test Women Kurti',
      SKU: `IMP-KUR-${stamp}`,
      Category: 'Women',
      Subcategory: '',
      Brand: 'Allen Solly',
      Vendor: 'Kevin Stores',
      'Product Type': 'Physical Product',
      Status: 'draft',
      'Short Description': 'Printed cotton kurti',
      'Long Description': 'Bulk-import sample women ethnic wear product.',
      'Regular Price': 1499,
      'Selling Price': 1199,
      Stock: 15,
      'Tax Rate': 18,
      Barcode: `8901${stamp}02`,
      'Main Image URL': 'https://www.tryvvo.com/home/trendy-women.jpg',
      'URL Slug': `import-test-women-kurti-${stamp}`,
      'Meta Title': 'Import Test Women Kurti',
      'Meta Description': 'Sample kurti via Excel bulk import.',
      Tags: 'import,test,women,kurti',
      'Free Shipping': 'true',
      'Allow Return': 'true',
      Visibility: 'Public',
      'Weight (gm)': '',
      Purity: '',
      'Making Charges': '',
    },
    {
      Name: 'Import Test Gold Ring',
      SKU: `IMP-JWL-${stamp}`,
      Category: 'Jewellery',
      Subcategory: 'Rings',
      Brand: 'Rolex',
      Vendor: 'Kevin Stores',
      'Product Type': 'Jewellery',
      Status: 'draft',
      'Short Description': '22k gold ring sample',
      'Long Description': 'Bulk-import jewellery sample with weight purity making charges.',
      'Regular Price': 0,
      'Selling Price': 0,
      Stock: 3,
      'Tax Rate': 3,
      Barcode: '',
      'Main Image URL': 'https://www.tryvvo.com/home/beauty-products.jpg',
      'URL Slug': `import-test-gold-ring-${stamp}`,
      'Meta Title': 'Import Test Gold Ring 22k',
      'Meta Description': 'Sample jewellery product via Excel import.',
      Tags: 'import,test,jewellery,gold',
      'Free Shipping': 'false',
      'Allow Return': 'false',
      Visibility: 'Public',
      'Weight (gm)': 4.5,
      Purity: '22k',
      'Making Charges': 2500,
    },
  ];

  const outDirs = [
    '/home/nstack-softech-llp/e commrce/public/samples',
    '/home/nstack-softech-llp/ecommerce-vendor-panel/public/samples',
    '/home/nstack-softech-llp/e commrce/docs/product-import',
    '/home/nstack-softech-llp/ecommerce-vendor-panel/docs/product-import',
  ];
  for (const d of outDirs) mkdirSync(d, { recursive: true });

  const wbTpl = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbTpl, XLSX.utils.json_to_sheet(TEMPLATE_ROWS), 'Products');
  const wbSample = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbSample, XLSX.utils.json_to_sheet(sampleRows), 'Products');

  for (const d of outDirs) {
    XLSX.writeFile(wbTpl, `${d}/product-import-template.xlsx`);
    XLSX.writeFile(wbSample, `${d}/product-import-sample-3rows.xlsx`);
  }

  // validate round-trip
  const parsed = XLSX.utils.sheet_to_json(wbSample.Sheets.Products, { defval: '' });
  console.log('excel_rows', parsed.length, 'skus', parsed.map(r => r.SKU));

  const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const uri = env.match(/MONGODB_URI=(.*)/)[1].trim();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('admin_panel');
  const vendor = await db.collection('vendors').findOne({ storeName: 'Kevin Stores' });
  if (!vendor) throw new Error('Kevin Stores vendor not found');
  const vendorId = vendor._id.toString();
  let created = 0;
  const ids = [];
  for (const row of sampleRows) {
    const doc = buildDoc(row, { vendorName: vendor.storeName, vendorId });
    const res = await db.collection('products').insertOne(doc);
    created += 1;
    ids.push({ sku: row.SKU, id: String(res.insertedId), type: row['Product Type'] });
  }
  await client.close();

  const report = {
    stamp,
    created,
    vendor: 'Kevin Stores',
    vendorId,
    products: ids,
    files: [
      'public/samples/product-import-template.xlsx',
      'public/samples/product-import-sample-3rows.xlsx',
    ],
  };
  writeFileSync(
    '/home/nstack-softech-llp/e commrce/docs/product-import/LAST_IMPORT_TEST.json',
    JSON.stringify(report, null, 2)
  );
  console.log(JSON.stringify(report, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
