'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { downloadExcel, downloadPdf, type ReportRow, type ReportSheet } from '@/lib/report-export';

type Tab = 'sales' | 'revenue' | 'traffic' | 'vendors';

type Report = {
  from: string;
  to: string;
  summary: { orders: number; units: number; delivered: number; cancelled: number; revenue: number; visits: number };
  sales: Array<{ date: string; orders: number; units: number; delivered: number; cancelled: number; revenue: number }>;
  payments: Array<{ method: string; orders: number; revenue: number }>;
  vendors: Array<{ vendor: string; orders: number; units: number; revenue: number }>;
  traffic: { hidden: boolean; days: Array<{ date: string; visits: number }>; topPaths: Array<{ path: string; visits: number }> };
};

const TAB_LABEL: Record<Tab, string> = {
  sales: 'Sales',
  revenue: 'Revenue',
  traffic: 'Traffic',
  vendors: 'Vendor performance',
};

function dateKey(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function inr(value: number) {
  return `INR ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('sales');
  const [from, setFrom] = useState(dateKey(-29));
  const [to, setTo] = useState(dateKey(0));
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (start = from, end = to) => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/reports?from=${start}&to=${end}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Failed to load reports');
      setReport(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sheets = useMemo(() => buildSheets(tab, report), [tab, report]);
  const summaryRow: ReportRow[] = report
    ? [
        {
          Orders: report.summary.orders,
          Units: report.summary.units,
          Delivered: report.summary.delivered,
          Cancelled: report.summary.cancelled,
          Revenue: inr(report.summary.revenue),
          Visits: report.traffic.hidden ? 'Admin only' : report.summary.visits,
        },
      ]
    : [];
  const canExport = sheets.some(sheet => sheet.rows.length > 0);
  const exportName = `tryvvo-${tab}-${from}-to-${to}`;

  const exportFile = (kind: 'excel' | 'pdf') => {
    if (kind === 'excel') {
      downloadExcel(exportName, sheets);
      return;
    }
    downloadPdf(exportName, {
      title: `${TAB_LABEL[tab]} report`,
      range: `${from} to ${to}`,
      summary: summaryRow,
      sheets,
    });
  };

  return (
    <AdminLayout>
      <div className='space-y-6'>
        <div className='flex flex-wrap items-end justify-between gap-3'>
          <div>
            <h1 className='text-2xl font-bold text-slate-900'>Reports</h1>
            <p className='mt-1 text-sm text-slate-500'>Sales, revenue, traffic, and vendor performance.</p>
          </div>
          <div className='flex flex-wrap items-end gap-2'>
            <label className='text-xs text-slate-500'>
              From
              <input className='mt-1 block rounded-md border px-2 py-1 text-sm' type='date' value={from} onChange={e => setFrom(e.target.value)} />
            </label>
            <label className='text-xs text-slate-500'>
              To
              <input className='mt-1 block rounded-md border px-2 py-1 text-sm' type='date' value={to} onChange={e => setTo(e.target.value)} />
            </label>
            <Button onClick={() => load()}>Apply</Button>
            <Button variant='outline' disabled={!canExport} onClick={() => exportFile('excel')}>
              Export Excel
            </Button>
            <Button variant='outline' disabled={!canExport} onClick={() => exportFile('pdf')}>
              Export PDF
            </Button>
          </div>
        </div>

        <div className='flex flex-wrap gap-2'>
          {(Object.keys(TAB_LABEL) as Tab[]).map(id => (
            <Button key={id} variant={tab === id ? 'default' : 'outline'} onClick={() => setTab(id)}>
              {TAB_LABEL[id]}
            </Button>
          ))}
        </div>

        {report && (
          <div className='grid gap-3 sm:grid-cols-3 lg:grid-cols-6'>
            {Object.entries(summaryRow[0] || {}).map(([label, value]) => (
              <div key={label} className='rounded-xl border border-slate-200 bg-white p-3'>
                <p className='text-xs text-slate-500'>{label}</p>
                <p className='mt-1 text-lg font-semibold text-slate-900'>{value}</p>
              </div>
            ))}
          </div>
        )}

        {error && <p className='text-sm text-red-600'>{error}</p>}
        {loading ? (
          <p className='text-sm text-slate-500'>Loading reports...</p>
        ) : (
          <div className='space-y-6'>
            {sheets.map(sheet => (
              <section key={sheet.name}>
                <h2 className='mb-2 text-sm font-semibold text-slate-700'>{sheet.name}</h2>
                <ReportTable rows={sheet.rows} />
              </section>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function buildSheets(tab: Tab, report: Report | null): ReportSheet[] {
  if (!report) return [];
  if (tab === 'sales') {
    return [
      {
        name: 'Sales',
        rows: report.sales.map(row => ({
          Date: row.date,
          Orders: row.orders,
          Units: row.units,
          Delivered: row.delivered,
          Cancelled: row.cancelled,
          Revenue: inr(row.revenue),
        })),
      },
    ];
  }
  if (tab === 'revenue') {
    const paymentRows = report.payments.map(row => ({
      Method: row.method,
      Orders: row.orders,
      Revenue: inr(row.revenue),
    }));
    return [
      {
        name: 'Revenue',
        rows: paymentRows.length
          ? paymentRows
          : report.sales.map(row => ({ Date: row.date, Orders: row.orders, Revenue: inr(row.revenue) })),
      },
    ];
  }
  if (tab === 'traffic') {
    if (report.traffic.hidden) return [{ name: 'Traffic', rows: [{ Note: 'Store traffic is visible to admin only' }] }];
    return [
      { name: 'Visits by day', rows: report.traffic.days.map(row => ({ Date: row.date, Visits: row.visits })) },
      { name: 'Top pages', rows: report.traffic.topPaths.map(row => ({ Page: row.path, Visits: row.visits })) },
    ];
  }
  return [
    {
      name: 'Vendor performance',
      rows: report.vendors.map(row => ({
        Vendor: row.vendor,
        Orders: row.orders,
        Units: row.units,
        Revenue: inr(row.revenue),
      })),
    },
  ];
}

function ReportTable({ rows }: { rows: ReportRow[] }) {
  const headers = Object.keys(rows[0] || {});
  return (
    <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white'>
      <table className='min-w-full text-sm'>
        <thead className='bg-[#E8F7F1] text-left text-[#0B8A6A]'>
          <tr>
            {headers.map(header => (
              <th key={header} className='px-4 py-3 font-medium'>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className='px-4 py-8 text-slate-500' colSpan={Math.max(headers.length, 1)}>
                No rows in this date range.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} className='border-t border-slate-100'>
                {headers.map(header => (
                  <td key={header} className='px-4 py-3 text-slate-800'>
                    {row[header]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
