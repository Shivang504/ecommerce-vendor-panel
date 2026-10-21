'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Tab = 'low' | 'history' | 'orders';

type LowRow = {
  productId: string;
  name: string;
  sku: string;
  stock: number;
  threshold: number;
  reorderLevel: number;
  variant: string;
};

type Movement = {
  _id: string;
  productName: string;
  sku: string;
  previousStock: number;
  newStock: number;
  delta: number;
  reason: string;
  variantKey?: string;
  createdAt?: string;
};

type PurchaseOrder = {
  _id: string;
  poNumber: string;
  productName: string;
  sku: string;
  quantity: number;
  currentStock: number;
  reorderLevel: number;
  status: 'draft' | 'ordered' | 'received';
  variantKey?: string;
  createdAt?: string;
};

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>('low');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lowStock, setLowStock] = useState<LowRow[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [busyId, setBusyId] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/inventory', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Failed to load inventory');
      setLowStock(data.lowStock || []);
      setMovements(data.movements || []);
      setPurchaseOrders(data.purchaseOrders || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updatePo = async (id: string, status: 'ordered' | 'received') => {
    try {
      setBusyId(id);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/inventory/purchase-orders/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Could not update purchase order');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Could not update purchase order');
    } finally {
      setBusyId('');
    }
  };

  return (
    <AdminLayout>
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-bold text-slate-900'>Inventory</h1>
          <p className='text-sm text-slate-500 mt-1'>Low stock, stock history, and purchase orders.</p>
        </div>

        <div className='flex gap-2'>
          {(
            [
              ['low', 'Low stock'],
              ['history', 'History'],
              ['orders', 'Purchase orders'],
            ] as Array<[Tab, string]>
          ).map(([id, label]) => (
            <Button key={id} variant={tab === id ? 'default' : 'outline'} onClick={() => setTab(id)}>
              {label}
            </Button>
          ))}
        </div>

        {error && <p className='text-sm text-red-600'>{error}</p>}
        {loading ? (
          <p className='text-sm text-slate-500'>Loading inventory...</p>
        ) : tab === 'low' ? (
          <StockTable
            empty='No products are at or below the low stock threshold.'
            headers={['Product', 'SKU', 'Variant', 'Stock', 'Threshold', 'Reorder']}
            rows={lowStock.map(row => [
              row.name,
              row.sku || '—',
              row.variant || '—',
              String(row.stock),
              String(row.threshold),
              row.reorderLevel > 0 ? String(row.reorderLevel) : 'Off',
            ])}
          />
        ) : tab === 'history' ? (
          <StockTable
            empty='No stock changes yet.'
            headers={['When', 'Product', 'Change', 'Reason']}
            rows={movements.map(row => [
              row.createdAt ? new Date(row.createdAt).toLocaleString() : '—',
              `${row.productName || 'Product'}${row.variantKey ? ` (${row.variantKey})` : ''}`,
              `${row.previousStock} → ${row.newStock} (${row.delta > 0 ? '+' : ''}${row.delta})`,
              row.reason,
            ])}
          />
        ) : (
          <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white'>
            <table className='min-w-full text-sm'>
              <thead className='bg-slate-50 text-left text-slate-500'>
                <tr>
                  {['PO', 'Product', 'Qty', 'Status', 'Action'].map(header => (
                    <th key={header} className='px-4 py-3 font-medium'>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className='px-4 py-8 text-slate-500'>
                      No purchase orders yet. Set a reorder level on a product. A draft is created when stock falls to that level.
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map(po => (
                    <tr key={po._id} className='border-t border-slate-100'>
                      <td className='px-4 py-3 font-medium'>{po.poNumber}</td>
                      <td className='px-4 py-3'>
                        {po.productName}
                        {po.variantKey ? <span className='block text-xs text-slate-500'>{po.variantKey}</span> : null}
                      </td>
                      <td className='px-4 py-3'>{po.quantity}</td>
                      <td className='px-4 py-3'>
                        <Badge variant='outline'>{po.status}</Badge>
                      </td>
                      <td className='px-4 py-3'>
                        {po.status === 'draft' && (
                          <Button size='sm' disabled={busyId === po._id} onClick={() => updatePo(po._id, 'ordered')}>
                            Mark ordered
                          </Button>
                        )}
                        {po.status === 'ordered' && (
                          <Button size='sm' disabled={busyId === po._id} onClick={() => updatePo(po._id, 'received')}>
                            Receive stock
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function StockTable({ headers, rows, empty }: { headers: string[]; rows: string[][]; empty: string }) {
  return (
    <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white'>
      <table className='min-w-full text-sm'>
        <thead className='bg-slate-50 text-left text-slate-500'>
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
              <td colSpan={headers.length} className='px-4 py-8 text-slate-500'>
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} className='border-t border-slate-100'>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className='px-4 py-3 text-slate-800'>
                    {cell}
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
