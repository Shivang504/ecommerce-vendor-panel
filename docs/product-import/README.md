# Product Excel Import — Research + Sample

## Status today

| Panel | Import | Export |
|-------|--------|--------|
| **Vendor panel** (`ecommerce-vendor-panel`) | Yes — Products → **Bulk Import** | CSV (basic columns) |
| **Admin / storefront** (`e-commrce`) | Yes — Admin Products → **Bulk Import** (same columns; set Vendor) | CSV (basic columns) |

Shared MongoDB collection: `admin_panel.products`.

Vendor code:
- `lib/product-bulk-import.ts`
- `components/products/product-bulk-import-dialog.tsx`
- `POST /api/admin/products/bulk-import`

Limits: `.xlsx` / `.xls` / `.csv`, max **5 MB**, max **500** rows.

---

## Excel columns (current import)

### Required (every row)

| Column | Example | Notes |
|--------|---------|-------|
| Name | Import Test Cotton Tee | |
| SKU | IMP-TEE-123456 | Unique per vendor |
| Category | Men | **Name string** (not ObjectId) |
| Short Description | Soft cotton tee… | |
| Long Description | Full HTML/text… | |
| Regular Price | 999 | > 0 unless Jewellery |
| Selling Price | 799 | > 0 and ≤ Regular (unless Jewellery) |

### Defaults if blank

| Column | Default |
|--------|---------|
| Product Type | Physical Product |
| Status | draft |
| Stock | 0 |
| Tax Rate | 18 |
| Visibility | Public |

### Recommended / optional

| Column | Example |
|--------|---------|
| Subcategory | T-Shirts |
| Brand | UrbanStyle |
| Vendor | Kevin Stores *(admin import only; vendor user ignored)* |
| Status | draft / active / inactive |
| Barcode | 8901… |
| Main Image URL | https://… *(required if Status=active)* |
| URL Slug | import-test-cotton-tee *(required if active)* |
| Meta Title / Meta Description | *(required if active)* |
| Tags | cotton,men,tshirt |
| Free Shipping | true / false |
| Allow Return | true / false |

### Jewellery-only (when Product Type = Jewellery)

| Column | Example |
|--------|---------|
| Weight (gm) | 4.5 |
| Purity | 22k |
| Making Charges | 2500 |

---

## Not in Excel yet (form-only gaps)

- Variants / attributes (Size, Color) + per-variant stock/SKU
- Gallery image URLs
- Child category
- `vendorPickupAddressId` (vendor ship-from — needed to publish physical on supplier panel)
- Size chart object
- HSN / GST calculator fields

Import creates **simple products** (`variants: []`).

---

## Sample files

| File | Purpose |
|------|---------|
| `public/samples/product-import-template.xlsx` | Empty-ish template (2 example rows) |
| `public/samples/product-import-sample-3rows.xlsx` | 3 real test rows (2 physical + 1 jewellery) |
| Same copies under `docs/product-import/` | Offline docs |

How to use in UI:
1. Supplier → Products → **Bulk Import**
2. Download template or upload `product-import-sample-3rows.xlsx`
3. Preview → Import (as draft by default)

---

## Live test (done)

Script: `ecommerce-vendor-panel/scripts/make-product-import-sample.mjs`  
Inserted **3 draft** products under vendor **Kevin Stores**. See `LAST_IMPORT_TEST.json`.

---

## Admin panel

Same stack now in `e-commrce`:
- `lib/product-bulk-import.ts`
- `components/products/product-bulk-import-dialog.tsx`
- `POST /api/admin/products/bulk-import`
- Admin Products list → **Bulk Import**

Admin must set **Vendor** column to an existing `storeName` (e.g. `Kevin Stores`).
