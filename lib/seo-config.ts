import type { Metadata } from 'next';

/**
 * Canonical public URL. Set in Vercel / env: NEXT_PUBLIC_SITE_URL=https://www.tryvvo.com
 * Used for metadataBase, Open Graph, sitemap, robots, and JSON-LD.
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw && /^https?:\/\//i.test(raw)) {
    return raw.replace(/\/$/, '');
  }
  return 'https://www.tryvvo.com';
}

export const SITE_NAME = 'Tryvvo';

export const DEFAULT_DESCRIPTION =
  'Shop fashion, shoes, bags & lifestyle on Tryvvo (tryvvo.com). Discover trending styles, trusted brands, fast delivery & easy returns across India.';

/** Include brand + common misspellings / searches */
export const DEFAULT_KEYWORDS = [
  'tryvvo',
  'tryvvo.com',
  'www tryvvo',
  'tryvvo online shopping',
  'tryvvo fashion',
  'tryvvo india',
  'online shopping',
  'fashion ecommerce',
  'shoes bags clothing',
  'lifestyle store',
];

export function buildDefaultMetadata(): Metadata {
  const base = getSiteUrl();

  return {
    metadataBase: new URL(base),
    title: {
      default: `${SITE_NAME} — Fashion, Shoes & Lifestyle Shopping Online`,
      template: `%s | ${SITE_NAME}`,
    },
    description: DEFAULT_DESCRIPTION,
    keywords: [...DEFAULT_KEYWORDS],
    authors: [{ name: SITE_NAME, url: base }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    openGraph: {
      type: 'website',
      locale: 'en_IN',
      url: base,
      siteName: SITE_NAME,
      title: `${SITE_NAME} — Shop Fashion & Lifestyle Online`,
      description: DEFAULT_DESCRIPTION,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${SITE_NAME} — Fashion & Lifestyle`,
      description: DEFAULT_DESCRIPTION,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: base,
    },
    category: 'shopping',
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? {
          verification: {
            google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
          },
        }
      : {}),
  };
}
