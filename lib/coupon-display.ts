export type CouponApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type CouponWorkflowStatus = 'draft' | 'pending' | 'active' | 'rejected';
export type CouponScopeType = 'product' | 'sitewide';

export interface CouponListItem {
  _id: string;
  title: string;
  code: string;
  type: 'percentage' | 'fixed';
  amount: number;
  endDate?: string | Date | null;
  createdAt?: string | Date | null;
  status: boolean;
  applyToAllProducts?: boolean;
  isDraft?: boolean;
  approvalStatus?: CouponApprovalStatus;
  vendorId?: string | null;
  vendorName?: string;
}

export function resolveApprovalStatus(coupon: Pick<CouponListItem, 'isDraft' | 'approvalStatus' | 'vendorId'>): CouponApprovalStatus {
  if (coupon.isDraft) return 'draft';
  if (coupon.approvalStatus) return coupon.approvalStatus;
  return 'approved';
}

export function getWorkflowStatus(coupon: CouponListItem): CouponWorkflowStatus | null {
  if (coupon.isDraft) return 'draft';
  const approval = resolveApprovalStatus(coupon);
  if (approval === 'rejected') return 'rejected';
  if (approval === 'pending') return 'pending';
  if (approval === 'approved' && coupon.status) return 'active';
  return null;
}

export function getCouponScopeType(coupon: Pick<CouponListItem, 'applyToAllProducts'>): CouponScopeType {
  return coupon.applyToAllProducts ? 'sitewide' : 'product';
}

export function formatCouponDiscount(coupon: Pick<CouponListItem, 'type' | 'amount'>): string {
  if (coupon.type === 'percentage') return `${coupon.amount}% OFF`;
  return `₹${coupon.amount} OFF`;
}

export function formatCouponDate(dateValue?: string | Date | null, includeTime = false): string {
  if (!dateValue) return 'N/A';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function canActivateCoupon(coupon: CouponListItem): boolean {
  return resolveApprovalStatus(coupon) === 'approved';
}
