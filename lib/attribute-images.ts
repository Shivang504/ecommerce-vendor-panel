/** Helpers for color / image-style attribute values */

export function isColorAttribute(name?: string, style?: string): boolean {
  const n = (name || '').trim().toLowerCase();
  if (style === 'image' || style === 'circle') return true;
  return n.includes('color') || n.includes('colour');
}

export function sanitizeValueImages(
  values: string[],
  valueImages?: Record<string, string> | null
): Record<string, string> {
  if (!valueImages || typeof valueImages !== 'object') return {};
  const out: Record<string, string> = {};
  for (const v of values) {
    const trimmed = v.trim();
    const url = valueImages[trimmed] || valueImages[v];
    if (typeof url === 'string' && url.trim()) {
      out[trimmed] = url.trim();
    }
  }
  return out;
}

export function getValueImage(
  valueImages: Record<string, string> | undefined,
  value: string
): string | undefined {
  if (!valueImages) return undefined;
  const trimmed = value.trim();
  return valueImages[trimmed] || valueImages[value];
}
