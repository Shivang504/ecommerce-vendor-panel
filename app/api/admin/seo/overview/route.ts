import { MOCK_DASHBOARD } from '@/lib/mock-data';

export async function GET() {
  try {
    return Response.json({
      issues: [
        { type: 'missing_meta_description', count: MOCK_DASHBOARD.seoHealth.productsWithoutMeta, severity: 'high' },
        { type: 'missing_alt_text', count: MOCK_DASHBOARD.seoHealth.pagesWithoutAlt, severity: 'medium' },
        { type: 'duplicate_meta_titles', count: MOCK_DASHBOARD.seoHealth.duplicateMetas, severity: 'medium' },
      ],
      scores: [
        { section: 'Products', score: 85 },
        { section: 'Categories', score: 90 },
        { section: 'Pages', score: 75 },
      ],
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: 'Failed to fetch SEO overview' }, { status: 500 });
  }
}
