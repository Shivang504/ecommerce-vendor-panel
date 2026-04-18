/** Indian PAN: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F) */
export const INDIAN_PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/**
 * Indian GSTIN: 15 chars — state code, PAN core, entity, Z, checksum.
 * Matches validation used in admin vendor profile API.
 */
export const INDIAN_GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function isValidIndianPan(value: string): boolean {
  return INDIAN_PAN_REGEX.test(value.trim().toUpperCase());
}

export function isValidIndianGstin(value: string): boolean {
  return INDIAN_GSTIN_REGEX.test(value.trim().toUpperCase());
}

export function sanitizePanInput(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10);
}

export function sanitizeGstinInput(raw: string): string {
  return raw.replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(0, 15);
}
