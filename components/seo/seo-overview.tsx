'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SeoData {
  issues: any[];
  scores: any[];
  lastUpdated: string;
}

export function SeoOverview() {
  const [data, setData] = useState<SeoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSeoOverview = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
        const response = await fetch('/api/admin/seo/overview', {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          credentials: 'include',
        });
        const seoData = await response.json();
        setData(seoData);
      } catch (error) {
        console.error('[v0] Failed to fetch SEO overview:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSeoOverview();
  }, []);

  if (loading) {
    return <div className="text-center py-12">Loading SEO overview...</div>;
  }

  if (!data) {
    return <div className="text-center py-12 text-destructive">Failed to load SEO data</div>;
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      default:
        return '🟢';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">SEO Management</h1>
        <p className="text-muted-foreground">Manage and optimize SEO across your platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Issues Found</h2>
          <div className="space-y-3">
            {data.issues.map((issue, idx) => (
              <div key={idx} className="flex items-start gap-3 pb-3 border-b last:border-0">
                <div className="mt-1 text-xl">{getSeverityIcon(issue.severity)}</div>
                <div className="flex-1">
                  <p className="font-medium text-sm capitalize">{issue.type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground">{issue.count} found</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">SEO Scores by Section</h2>
          <div className="space-y-3">
            {data.scores.map((score, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">{score.section}</span>
                  <span className="text-muted-foreground">{score.score}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      score.score >= 80
                        ? 'bg-green-500'
                        : score.score >= 60
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${score.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
