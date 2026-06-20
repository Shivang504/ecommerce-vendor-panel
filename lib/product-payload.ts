import { sanitizeAttributeSelections } from '@/lib/product-attributes';

/** Empty urlSlug breaks unique sparse index (only one "" allowed). Omit when blank. */
export function sanitizeUrlSlugForDb(urlSlug: unknown): string | undefined {
  if (typeof urlSlug !== 'string') return undefined;
  const trimmed = urlSlug.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeProductPayload(payload: Record<string, unknown> | null | undefined) {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const slug = sanitizeUrlSlugForDb(payload.urlSlug);
  const normalized: Record<string, unknown> = {
    ...payload,
    wholesalePriceType: payload.wholesalePriceType || 'Fixed',
    sizeChartImage: payload.sizeChartImage ?? '',
    jewelleryWeight: typeof payload.jewelleryWeight === 'number' ? payload.jewelleryWeight : 0,
    jewelleryPurity: payload.jewelleryPurity ?? '',
    jewelleryMakingCharges:
      typeof payload.jewelleryMakingCharges === 'number' ? payload.jewelleryMakingCharges : 0,
    jewelleryStoneDetails: payload.jewelleryStoneDetails ?? '',
    jewelleryCertification: payload.jewelleryCertification ?? '',
    attributes: sanitizeAttributeSelections(payload.attributes as Record<string, string[]> | undefined),
  };

  if (slug) {
    normalized.urlSlug = slug;
  } else {
    delete normalized.urlSlug;
  }

  return normalized;
}

export function mongoWriteErrorMessage(error: unknown): string | null {
  const err = error as { code?: number; keyPattern?: Record<string, unknown>; keyValue?: Record<string, unknown> };
  if (err?.code !== 11000) return null;
  if (err.keyPattern?.urlSlug !== undefined) {
    const val = err.keyValue?.urlSlug;
    if (val === '' || val === undefined) {
      return 'Could not save product: URL slug is missing. Open the SEO tab, enter a unique URL slug, then save again.';
    }
    return `URL slug "${val}" is already used by another product. Please choose a different slug in the SEO tab.`;
  }
  if (err.keyPattern?.sku !== undefined) {
    return `SKU "${err.keyValue?.sku ?? ''}" is already used. Please use a unique SKU.`;
  }
  return 'A product with the same unique identifier already exists.';
}
