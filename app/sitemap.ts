import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001').replace(/\/$/, '');
  const lastModified = new Date();
  return [{ url: `${base}/login`, lastModified, changeFrequency: 'monthly', priority: 0.3 }];
}
