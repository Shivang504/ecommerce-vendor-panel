/**
 * Single source of truth: is Shiprocket integration active?
 * Use true | 1 | yes (case-insensitive). Plain "true" in .env is most common.
 */
export function isShiprocketEnabled(): boolean {
  const v = process.env.SHIPROCKET_ENABLED?.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}
