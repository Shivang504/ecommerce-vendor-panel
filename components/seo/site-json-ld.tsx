import { getSiteUrl, SITE_NAME, DEFAULT_DESCRIPTION } from '@/lib/seo-config';

/**
 * Organization + WebSite schema for Google rich results / brand association with "tryvvo".
 */
export function SiteJsonLd() {
  const url = getSiteUrl();

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url,
    description: DEFAULT_DESCRIPTION,
    sameAs: [] as string[],
  };

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url,
    description: DEFAULT_DESCRIPTION,
    publisher: { '@type': 'Organization', name: SITE_NAME, url },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${url}/products?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
      <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
    </>
  );
}
