/**
 * Single source of truth: is Shiprocket integration active?
 * Use true | 1 | yes (case-insensitive). Plain "true" in .env is most common.
 */
export function isShiprocketEnabled(): boolean {
  const raw = process.env.SHIPROCKET_ENABLED;
  const v = raw?.trim().toLowerCase();
  const enabled = v === 'true' || v === '1' || v === 'yes';
  if (process.env.NODE_ENV !== 'test') {
    console.log('[Shiprocket] [env] SHIPROCKET_ENABLED check', {
      raw: raw ?? '(unset)',
      enabled,
      hasEmail: !!process.env.SHIPROCKET_EMAIL?.trim(),
      hasApiKey: !!process.env.SHIPROCKET_API_KEY?.trim(),
      baseUrl: process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external',
    });
  }
  return enabled;
}
