/**
 * Vendor login gate: only approved vendors may sign in. Keep identical in the shop and vendor apps.
 */
export const VENDOR_PENDING_CODE = 'VENDOR_PENDING_APPROVAL';

export const VENDOR_PENDING_MESSAGE =
  'Your account registration is successful and is currently pending admin approval. You will receive an email notification once your account has been approved. Thank you for your patience.';

/** Returns the error body for a vendor who must not sign in yet, or null when the vendor is approved. */
export function vendorLoginBlock(status: unknown): { error: string; code?: string } | null {
  if (status === 'approved') return null;
  if (status === 'suspended' || status === 'rejected') {
    return { error: `Your account is ${status}. Please contact administrator.` };
  }
  return { error: VENDOR_PENDING_MESSAGE, code: VENDOR_PENDING_CODE };
}
