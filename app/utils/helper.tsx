export const formatIndianDate = (dateString:string) => {
  if (!dateString) return "";

  const date = new Date(dateString);

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).replace(",", "");
};

/**
 * Get product URL - prefers slug for SEO, falls back to ID
 * @param productId - Product ID (required)
 * @param urlSlug - Product URL slug (optional)
 * @returns Product URL path
 */
export const getProductUrl = (productId: string, urlSlug?: string | null): string => {
  // Use slug if available and not empty, otherwise use ID
  return urlSlug && urlSlug.trim() ? `/products/${urlSlug.trim()}` : `/products/${productId}`;
};