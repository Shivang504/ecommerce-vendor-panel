'use client';

import { Plus, Ruler, Trash2, X } from 'lucide-react';
import {
  createSizeChart,
  SIZE_CHART_LIMITS,
  SIZE_CHART_TEMPLATES,
  type SizeChart,
  type SizeChartUnit,
} from '@/lib/size-chart';

const cell =
  'h-9 w-full min-w-[88px] rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 dark:border-slate-600 dark:bg-slate-700 dark:text-white';
const smallButton =
  'inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-600 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200';

export function SizeChartEditor({
  value,
  onChange,
  variantSizes = [],
}: {
  value: SizeChart | null | undefined;
  onChange: (next: SizeChart | null) => void;
  variantSizes?: string[];
}) {
  if (!value) {
    return (
      <div className='rounded-lg border border-dashed border-slate-300 p-4 dark:border-slate-600'>
        <p className='flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200'>
          <Ruler className='h-4 w-4 text-emerald-600' /> Add a size chart table
        </p>
        <p className='mt-1 text-xs text-slate-500'>
          Customers see it as a table on the product page.
          {variantSizes.length > 0 && ` Rows start with this product's sizes: ${variantSizes.join(', ')}.`}
        </p>
        <div className='mt-3 flex flex-wrap gap-2'>
          {SIZE_CHART_TEMPLATES.map(template => (
            <button key={template.id} type='button' className={smallButton} onClick={() => onChange(createSizeChart(template.id, variantSizes))}>
              {template.label}
            </button>
          ))}
          <button type='button' className={smallButton} onClick={() => onChange(createSizeChart(null, variantSizes))}>
            Blank table
          </button>
        </div>
      </div>
    );
  }

  const chart = value;
  const update = (patch: Partial<SizeChart>) => onChange({ ...chart, ...patch });
  const setColumn = (index: number, patch: Partial<SizeChart['columns'][number]>) =>
    update({ columns: chart.columns.map((column, i) => (i === index ? { ...column, ...patch } : column)) });
  const removeColumn = (index: number) =>
    update({
      columns: chart.columns.filter((_, i) => i !== index),
      rows: chart.rows.map(row => ({ ...row, values: row.values.filter((_, i) => i !== index) })),
    });
  const addColumn = () =>
    update({
      columns: [...chart.columns, { label: '', measure: true }],
      rows: chart.rows.map(row => ({ ...row, values: [...row.values, ''] })),
    });
  const setRow = (index: number, patch: Partial<SizeChart['rows'][number]>) =>
    update({ rows: chart.rows.map((row, i) => (i === index ? { ...row, ...patch } : row)) });
  const setValue = (rowIndex: number, columnIndex: number, next: string) =>
    setRow(rowIndex, { values: chart.columns.map((_, i) => (i === columnIndex ? next : chart.rows[rowIndex].values[i] || '')) });
  const addRow = () => update({ rows: [...chart.rows, { size: '', values: chart.columns.map(() => '') }] });
  const missingSizes = variantSizes.filter(size => !chart.rows.some(row => row.size.trim().toLowerCase() === size.toLowerCase()));

  return (
    <div className='space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-600'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <label className='flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300'>
          Measurements in
          <select
            value={chart.unit}
            onChange={e => update({ unit: e.target.value as SizeChartUnit })}
            className='h-9 rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-600 dark:bg-slate-700'>
            <option value='in'>Inches (in)</option>
            <option value='cm'>Centimetres (cm)</option>
          </select>
        </label>
        <button
          type='button'
          className={`${smallButton} text-red-600 hover:border-red-500 hover:text-red-600`}
          onClick={() => window.confirm('Remove the size chart table?') && onChange(null)}>
          <Trash2 className='h-3.5 w-3.5' /> Remove table
        </button>
      </div>

      <div className='overflow-x-auto'>
        <table className='w-full border-separate border-spacing-1 text-sm'>
          <thead>
            <tr>
              <th className='w-[110px] px-1 text-left text-xs font-semibold uppercase text-slate-500'>Size</th>
              {chart.columns.map((column, index) => (
                <th key={index} className='px-1 text-left align-top'>
                  <div className='flex items-center gap-1'>
                    <input
                      value={column.label}
                      onChange={e => setColumn(index, { label: e.target.value })}
                      placeholder='e.g. Chest'
                      maxLength={SIZE_CHART_LIMITS.text}
                      aria-label={`Column ${index + 1} name`}
                      className={`${cell} font-semibold`}
                    />
                    <button
                      type='button'
                      onClick={() => removeColumn(index)}
                      disabled={chart.columns.length === 1}
                      aria-label={`Remove column ${column.label || index + 1}`}
                      className='rounded p-1 text-slate-400 hover:text-red-600 disabled:opacity-30'>
                      <X className='h-3.5 w-3.5' />
                    </button>
                  </div>
                  <label className='mt-1 flex items-center gap-1 text-[11px] font-normal text-slate-500'>
                    <input type='checkbox' checked={column.measure} onChange={e => setColumn(index, { measure: e.target.checked })} />
                    Length ({chart.unit})
                  </label>
                </th>
              ))}
              <th className='w-8' />
            </tr>
          </thead>
          <tbody>
            {chart.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td>
                  <input
                    value={row.size}
                    onChange={e => setRow(rowIndex, { size: e.target.value })}
                    placeholder='e.g. M'
                    maxLength={SIZE_CHART_LIMITS.text}
                    aria-label={`Row ${rowIndex + 1} size`}
                    className={`${cell} font-semibold`}
                  />
                </td>
                {chart.columns.map((column, columnIndex) => (
                  <td key={columnIndex}>
                    <input
                      value={row.values[columnIndex] || ''}
                      onChange={e => setValue(rowIndex, columnIndex, e.target.value)}
                      placeholder={column.measure ? '38 or 38-40' : ''}
                      maxLength={SIZE_CHART_LIMITS.text}
                      aria-label={`${row.size || `Row ${rowIndex + 1}`} ${column.label || `column ${columnIndex + 1}`}`}
                      className={cell}
                    />
                  </td>
                ))}
                <td>
                  <button
                    type='button'
                    onClick={() => update({ rows: chart.rows.filter((_, i) => i !== rowIndex) })}
                    disabled={chart.rows.length === 1}
                    aria-label={`Remove size ${row.size || rowIndex + 1}`}
                    className='rounded p-1 text-slate-400 hover:text-red-600 disabled:opacity-30'>
                    <X className='h-4 w-4' />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className='flex flex-wrap gap-2'>
        <button type='button' className={smallButton} onClick={addRow} disabled={chart.rows.length >= SIZE_CHART_LIMITS.rows}>
          <Plus className='h-3.5 w-3.5' /> Add size
        </button>
        <button type='button' className={smallButton} onClick={addColumn} disabled={chart.columns.length >= SIZE_CHART_LIMITS.columns}>
          <Plus className='h-3.5 w-3.5' /> Add measurement
        </button>
        {missingSizes.length > 0 && (
          <button
            type='button'
            className={smallButton}
            onClick={() =>
              update({
                rows: [...chart.rows, ...missingSizes.map(size => ({ size, values: chart.columns.map(() => '') }))].slice(0, SIZE_CHART_LIMITS.rows),
              })
            }>
            <Plus className='h-3.5 w-3.5' /> Add product sizes ({missingSizes.join(', ')})
          </button>
        )}
      </div>

      <textarea
        value={chart.note || ''}
        onChange={e => update({ note: e.target.value })}
        maxLength={SIZE_CHART_LIMITS.note}
        rows={2}
        placeholder='Optional note, e.g. "Body measurements. If you are between sizes, choose the larger size."'
        className='w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700'
      />
    </div>
  );
}
