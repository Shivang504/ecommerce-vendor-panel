import type { DashboardAnalytics } from '@/lib/dashboard-data';

const BRAND = '#401d5d';

function formatInr(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function barChart(
  items: Array<{ label: string; value: number; color: string }>,
  maxValue: number
) {
  if (items.length === 0) {
    return '<p class="empty">No data for this period</p>';
  }
  return items
    .map((item) => {
      const width = maxValue > 0 ? Math.max(4, (item.value / maxValue) * 100) : 0;
      return `
        <div class="bar-row">
          <span class="bar-label">${escapeHtml(item.label)}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width:${width}%;background:${item.color}"></div>
          </div>
          <span class="bar-value">${formatInr(item.value)}</span>
        </div>`;
    })
    .join('');
}

function pieLegend(items: Array<{ name: string; value: number; color: string }>) {
  if (items.length === 0) {
    return '<p class="empty">No category data</p>';
  }
  return items
    .map(
      (item) => `
      <div class="legend-item">
        <span class="dot" style="background:${item.color}"></span>
        <span class="legend-name">${escapeHtml(item.name)}</span>
        <span class="legend-pct">${item.value}%</span>
      </div>`
    )
    .join('');
}

export function generateDashboardReportHTML(
  data: DashboardAnalytics,
  siteName: string
): string {
  const periodLabel = data.period.label;
  const generatedAt = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const maxRevenue = Math.max(...data.revenueData.map((r) => r.income), 1);
  const revenueBars = data.revenueData.map((r) => ({
    label: r.month,
    value: r.income,
    color: '#10b981',
  }));

  const maxExpense = Math.max(...data.revenueData.map((r) => r.expense), 1);
  const expenseBars = data.revenueData.map((r) => ({
    label: r.month,
    value: r.expense,
    color: '#f59e0b',
  }));

  const kpiCards = [
    { label: 'Total orders', stat: data.stats.totalOrders },
    { label: 'Pending', stat: data.stats.pendingOrders },
    { label: 'Cancelled', stat: data.stats.cancelledOrders },
    { label: 'Returns', stat: data.stats.returnedItems },
  ];

  const vendorRows = data.topProducts
    .map(
      (v) => `
      <tr>
        <td>${escapeHtml(v.supplier)}</td>
        <td>${escapeHtml(v.products)}</td>
        <td>${typeof v.revenue === 'number' && v.revenue > 0 ? formatInr(Math.round(v.revenue)) : '—'}</td>
        <td>${escapeHtml(v.contact)}</td>
      </tr>`
    )
    .join('');

  const productRows = data.topDeals
    .map(
      (p) => `
      <tr>
        <td>${escapeHtml(p.name)}</td>
        <td>${p.sales != null ? `${p.sales} sold` : escapeHtml(p.category)}</td>
        <td class="text-right">${escapeHtml(p.price)}</td>
      </tr>`
    )
    .join('');

  const orderRows = data.recentOrders
    .map(
      (o) => `
      <tr>
        <td>${escapeHtml(o.id)}</td>
        <td>${escapeHtml(o.customer)}</td>
        <td>${escapeHtml(o.product)}</td>
        <td>${formatInr(o.price)}</td>
        <td>${escapeHtml(o.status)}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Dashboard Report — ${escapeHtml(periodLabel)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    margin: 0;
    padding: 32px;
    color: #1e293b;
    background: #fff;
    font-size: 13px;
    line-height: 1.5;
  }
  .header {
    border-bottom: 3px solid ${BRAND};
    padding-bottom: 16px;
    margin-bottom: 28px;
  }
  .header h1 {
    margin: 0 0 6px;
    color: ${BRAND};
    font-size: 26px;
    font-weight: 700;
  }
  .header .meta { color: #64748b; font-size: 12px; }
  .section {
    margin-bottom: 28px;
    page-break-inside: avoid;
  }
  .section h2 {
    font-size: 16px;
    color: ${BRAND};
    margin: 0 0 14px;
    padding-bottom: 6px;
    border-bottom: 1px solid #e2e8f0;
  }
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
  }
  .kpi-card {
    border: 1px solid #e2e8f0;
    border-top: 3px solid ${BRAND};
    border-radius: 8px;
    padding: 14px;
    background: #fafafa;
  }
  .kpi-card .label { color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase; }
  .kpi-card .value { font-size: 28px; font-weight: 700; margin: 8px 0 4px; }
  .kpi-card .change { font-size: 11px; color: #059669; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .chart-box {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px;
    background: #fff;
  }
  .chart-box h3 { margin: 0 0 12px; font-size: 14px; color: #334155; }
  .bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .bar-label { width: 52px; font-size: 11px; color: #64748b; flex-shrink: 0; }
  .bar-track { flex: 1; height: 14px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; }
  .bar-value { width: 72px; text-align: right; font-size: 11px; font-weight: 600; }
  .legend { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
  .legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .legend-name { flex: 1; }
  .legend-pct { font-weight: 700; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th {
    background: #f8fafc;
    text-align: left;
    padding: 10px 12px;
    border-bottom: 2px solid ${BRAND};
    color: #475569;
    font-weight: 600;
  }
  td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
  tr:nth-child(even) td { background: #fafafa; }
  .text-right { text-align: right; }
  .summary-row {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }
  .summary-pill {
    background: #f1f5f9;
    padding: 8px 14px;
    border-radius: 6px;
    font-size: 12px;
  }
  .summary-pill strong { color: ${BRAND}; }
  .empty { color: #94a3b8; font-style: italic; padding: 12px 0; }
  .footer {
    margin-top: 32px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    font-size: 11px;
    color: #94a3b8;
    text-align: center;
  }
</style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(siteName)} — Dashboard Report</h1>
    <p class="meta">Period: <strong>${escapeHtml(periodLabel)}</strong> · Generated ${escapeHtml(generatedAt)}</p>
  </div>

  <div class="summary-row">
    <div class="summary-pill"><strong>${data.summary.totalProducts.toLocaleString('en-IN')}</strong> products</div>
    <div class="summary-pill"><strong>${data.summary.totalCustomers.toLocaleString('en-IN')}</strong> customers</div>
    <div class="summary-pill"><strong>${data.summary.totalVendors.toLocaleString('en-IN')}</strong> vendors</div>
    <div class="summary-pill"><strong>${data.summary.totalOrders.toLocaleString('en-IN')}</strong> orders (period)</div>
  </div>

  <div class="section">
    <h2>Key metrics</h2>
    <div class="kpi-grid">
      ${kpiCards
        .map(
          (k) => `
        <div class="kpi-card">
          <div class="label">${escapeHtml(k.label)}</div>
          <div class="value">${escapeHtml(k.stat.value)}</div>
          <div class="change">${escapeHtml(k.stat.change)}</div>
        </div>`
        )
        .join('')}
    </div>
  </div>

  <div class="section two-col">
    <div class="chart-box">
      <h3>Revenue — order value (7 months)</h3>
      ${barChart(revenueBars, maxRevenue)}
    </div>
    <div class="chart-box">
      <h3>Shipping & fees (7 months)</h3>
      ${barChart(expenseBars, maxExpense)}
    </div>
  </div>

  <div class="section">
    <h2>Sales by category</h2>
    <div class="legend">
      ${pieLegend(data.categoryDistribution)}
    </div>
  </div>

  <div class="section two-col">
    <div>
      <h2>Top vendors</h2>
      <table>
        <thead><tr><th>Vendor</th><th>Orders</th><th>Revenue</th><th>Contact</th></tr></thead>
        <tbody>${vendorRows || '<tr><td colspan="4" class="empty">No vendor activity</td></tr>'}</tbody>
      </table>
    </div>
    <div>
      <h2>Best selling products</h2>
      <table>
        <thead><tr><th>Product</th><th>Sales</th><th class="text-right">Avg. price</th></tr></thead>
        <tbody>${productRows || '<tr><td colspan="3" class="empty">No sales data</td></tr>'}</tbody>
      </table>
    </div>
  </div>

  <div class="section">
    <h2>Recent orders</h2>
    <table>
      <thead>
        <tr><th>Order ID</th><th>Customer</th><th>Product</th><th>Price</th><th>Status</th></tr>
      </thead>
      <tbody>${orderRows || '<tr><td colspan="5" class="empty">No orders in this period</td></tr>'}</tbody>
    </table>
  </div>

  <div class="footer">Confidential — ${escapeHtml(siteName)} admin dashboard export</div>
</body>
</html>`;
}

export async function renderDashboardPdf(html: string): Promise<Buffer> {
  const { launchPuppeteerBrowser } = await import('@/lib/launch-puppeteer-browser');
  const browser = await launchPuppeteerBrowser();

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '16mm', right: '14mm', bottom: '16mm', left: '14mm' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
