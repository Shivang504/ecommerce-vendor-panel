/** Shared store name cleanup for vendor-facing UI (login, dashboard). */
export function displayNameForVendorPanel(siteName: string): string {
  const raw = (siteName || 'E-commerce').trim();
  const fixedTypo = raw.replace(/commrce/gi, 'commerce');
  if (/\s+admin\s*$/i.test(fixedTypo)) {
    const base = fixedTypo.replace(/\s+admin\s*$/i, '').trim();
    return base ? `${base} Vendor` : 'Vendor';
  }
  return fixedTypo;
}
