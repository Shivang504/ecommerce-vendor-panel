/**
 * Shared duplicate-email rule for every registration flow (customer, vendor, admin users).
 * Keep this file identical in the shop, admin and vendor apps.
 */
export const DUPLICATE_EMAIL_CODE = 'EMAIL_EXISTS';

export const DUPLICATE_EMAIL_MESSAGE =
  'This email address is already registered. Please use a different email address or log in with your existing account.';

export const duplicateEmailBody = () => ({ error: DUPLICATE_EMAIL_MESSAGE, code: DUPLICATE_EMAIL_CODE });

/** Case-insensitive exact match, so Name@Mail.com and name@mail.com count as the same address. */
export function emailMatcher(email: string) {
  const escaped = email.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return { $regex: `^${escaped}$`, $options: 'i' };
}

export function isDuplicateEmailResponse(status: number, data: unknown) {
  return status === 409 && (data as { code?: string } | null)?.code === DUPLICATE_EMAIL_CODE;
}
