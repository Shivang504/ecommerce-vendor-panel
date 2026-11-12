/**
 * Structured size chart stored on a product as `sizeChart`.
 * Keep this file identical in the shop, admin and vendor apps.
 */
export type SizeChartUnit = 'in' | 'cm';

export type SizeChartColumn = {
  label: string;
  /** Length measurement that follows the in/cm switch. Off for size systems such as UK/US/EU or age. */
  measure: boolean;
};

export type SizeChartRow = { size: string; values: string[] };

export type SizeChart = {
  unit: SizeChartUnit;
  columns: SizeChartColumn[];
  rows: SizeChartRow[];
  note?: string;
};

export const SIZE_CHART_LIMITS = { columns: 8, rows: 20, text: 40, note: 300 };

export const SIZE_CHART_TEMPLATES: Array<{
  id: string;
  label: string;
  unit: SizeChartUnit;
  columns: SizeChartColumn[];
  sizes: string[];
}> = [
  {
    id: 'topwear',
    label: 'Topwear',
    unit: 'in',
    columns: ['Chest', 'Front Length', 'Shoulder', 'Sleeve Length'].map(label => ({ label, measure: true })),
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
  },
  {
    id: 'bottomwear',
    label: 'Bottomwear',
    unit: 'in',
    columns: ['Waist', 'Hip', 'Inseam Length', 'Outseam Length'].map(label => ({ label, measure: true })),
    sizes: ['28', '30', '32', '34', '36'],
  },
  {
    id: 'dresses',
    label: 'Dresses & Kurtis',
    unit: 'in',
    columns: ['Bust', 'Waist', 'Hip', 'Length'].map(label => ({ label, measure: true })),
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
  },
  {
    id: 'footwear',
    label: 'Footwear',
    unit: 'cm',
    columns: [
      { label: 'UK', measure: false },
      { label: 'US', measure: false },
      { label: 'EU', measure: false },
      { label: 'Foot Length', measure: true },
    ],
    sizes: ['6', '7', '8', '9', '10'],
  },
  {
    id: 'kids',
    label: 'Kids',
    unit: 'in',
    columns: [
      { label: 'Age', measure: false },
      { label: 'Height', measure: true },
      { label: 'Chest', measure: true },
      { label: 'Waist', measure: true },
    ],
    sizes: ['2-3Y', '4-5Y', '6-7Y', '8-9Y', '10-11Y'],
  },
];

const text = (value: unknown, max = SIZE_CHART_LIMITS.text) => (typeof value === 'string' || typeof value === 'number' ? String(value).trim().slice(0, max) : '');

export function createSizeChart(templateId: string | null, sizes: string[] = []): SizeChart {
  const template = SIZE_CHART_TEMPLATES.find(item => item.id === templateId);
  const columns = template ? template.columns.map(column => ({ ...column })) : [{ label: 'Chest', measure: true }];
  const rowSizes = (sizes.length ? sizes : template?.sizes || ['S', 'M', 'L']).slice(0, SIZE_CHART_LIMITS.rows);
  return {
    unit: template?.unit || 'in',
    columns,
    rows: rowSizes.map(size => ({ size, values: columns.map(() => '') })),
    note: '',
  };
}

/** Cleans a size chart from user input. Returns null when there is nothing worth showing. */
export function sanitizeSizeChart(input: unknown): SizeChart | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const columns = (Array.isArray(raw.columns) ? raw.columns : [])
    .slice(0, SIZE_CHART_LIMITS.columns)
    .map(column => {
      const value = column && typeof column === 'object' ? (column as Record<string, unknown>) : { label: column };
      return { label: text(value.label), measure: value.measure !== false };
    });
  const keep = columns.map(column => column.label.length > 0);
  const rows = (Array.isArray(raw.rows) ? raw.rows : [])
    .slice(0, SIZE_CHART_LIMITS.rows)
    .map(row => {
      const value = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
      const values = Array.isArray(value.values) ? value.values : [];
      return { size: text(value.size), values: columns.map((_, index) => text(values[index])).filter((_, index) => keep[index]) };
    })
    .filter(row => row.size || row.values.some(Boolean));
  const cleanColumns = columns.filter((_, index) => keep[index]);
  if (!cleanColumns.length || !rows.length) return null;
  return {
    unit: raw.unit === 'cm' ? 'cm' : 'in',
    columns: cleanColumns,
    rows,
    note: text(raw.note, SIZE_CHART_LIMITS.note),
  };
}

/** Converts every number in a value ("38", "38-40", "38.5") between inches and centimetres. */
export function convertSizeValue(value: string, from: SizeChartUnit, to: SizeChartUnit): string {
  if (from === to || !value) return value;
  const factor = to === 'cm' ? 2.54 : 1 / 2.54;
  return value.replace(/\d+(?:\.\d+)?/g, match => {
    const converted = Math.round(parseFloat(match) * factor * 10) / 10;
    return Number.isInteger(converted) ? String(converted) : converted.toFixed(1);
  });
}

/** Size values used by a product's variants, e.g. { Size: 'L' } → 'L'. */
export function sizesFromVariants(variants: unknown): string[] {
  const sizes: string[] = [];
  for (const variant of Array.isArray(variants) ? variants : []) {
    const combination = (variant as { attributeCombination?: Record<string, unknown> })?.attributeCombination || {};
    for (const [key, value] of Object.entries(combination)) {
      if (/size/i.test(key) && typeof value === 'string' && value.trim() && !sizes.includes(value.trim())) sizes.push(value.trim());
    }
  }
  return sizes;
}
