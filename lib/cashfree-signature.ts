/**
 * Cashfree X-CF-Signature (public-key RSA OAEP) — alternative to IP whitelisting for dynamic hosts (e.g. Vercel).
 * RSA PKCS#1 OAEP with SHA-1 (matches Cashfree Secure ID PHP/Java samples). Timestamp must be whole seconds, not a float.
 *
 * Production: set `CASHFREE_VERIFICATION_PUBLIC_KEY_PEM` or `CASHFREE_VERIFICATION_PUBLIC_KEY_B64` to the **exact**
 * public key from Merchant → Secure ID → Developers → Two-Factor Authentication → Public Key (download once).
 * If the PEM in code/env does not match that key pair, Cashfree cannot verify the signature and you get
 * `ip_validation_failed` even with a header present. Dashboard 2FA must be **Public Key**, not IP Whitelist.
 */

import crypto from 'crypto';

/** Fallback only — prefer env so it always matches your Secure ID dashboard key. */
const DEFAULT_VERIFICATION_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA7sZJbkkaHYK8tgdKWQbE
cz+iNVDrQrEZKetisM9eOc8Nt4hgInE9boIZz1ox0/dGnOXBoF98qZ3DD7YjGcPp
leVEgpaNJws/z9s5MdcK2QN3Mt6Ip8+BsDkFYqnkWarJBryvjPhSDXbJCbDDH3Zl
kCmnhN4tObIlAK2DeDuBOL7nQPl/TUmqQGANWP7xrou+Eybe7astjyEAM1NTf4+0
S/kgzr1lRqLN3pX7VzaLReL4BqBY3Szi52EQUbS5s7UbN1FlsinlY9BaVMdZSchN
IKlBIXtCSgzgm+T9JhcPN4qnS59FYizTK1Hb1SXQo8Oy2hAcWuA8H8BYFb2dIUAd
jwIDAQAB
-----END PUBLIC KEY-----`;

function getVerificationPublicKeyPem(): string {
  const b64 = process.env.CASHFREE_VERIFICATION_PUBLIC_KEY_B64?.trim();
  if (b64) {
    try {
      return Buffer.from(b64, 'base64').toString('utf8').trim();
    } catch {
      /* fall through */
    }
  }
  const pem = process.env.CASHFREE_VERIFICATION_PUBLIC_KEY_PEM?.trim();
  if (pem) {
    return pem.replace(/\\n/g, '\n').trim();
  }
  return DEFAULT_VERIFICATION_PUBLIC_KEY_PEM;
}

/**
 * Plaintext: `${clientId}.${epochSeconds}` — integer Unix seconds only (Cashfree Secure ID docs / PHP `strtotime`, Java `getEpochSecond()`).
 * A float timestamp breaks validation and Cashfree falls back to IP whitelist.
 */
export function generateCashfreeXCFSignature(clientId: string): string | null {
  if (!clientId?.trim()) return null;

  try {
    const epochSec = Math.floor(Date.now() / 1000);
    const plainText = `${clientId.trim()}.${epochSec}`;
    const encrypted = crypto.publicEncrypt(
      {
        key: getVerificationPublicKeyPem(),
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha1',
      },
      Buffer.from(plainText, 'utf8')
    );
    return encrypted.toString('base64');
  } catch (e) {
    console.error('[Cashfree] Failed to generate X-CF-Signature:', e);
    return null;
  }
}

export type WithCashfreeSignatureOptions = {
  /** If true, throws when signature cannot be built (avoid silent requests without x-cf-signature). */
  requireSignature?: boolean;
};

export function withCashfreeSignature(
  headers: Record<string, string>,
  clientIdForSignature: string,
  options?: WithCashfreeSignatureOptions
): Record<string, string> {
  const signature = generateCashfreeXCFSignature(clientIdForSignature);
  if (!signature) {
    if (options?.requireSignature) {
      throw new Error(
        'Cashfree x-cf-signature could not be generated. Set CASHFREE_VERIFICATION_PUBLIC_KEY_PEM or CASHFREE_VERIFICATION_PUBLIC_KEY_B64 to the public key from Secure ID → Developers → Two-Factor Authentication (Public Key). Use the same Client ID as in x-client-id.'
      );
    }
    return headers;
  }
  return { ...headers, 'x-cf-signature': signature };
}
