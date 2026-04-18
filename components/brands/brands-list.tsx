'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import BrandForm from './brand-form';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataTableBody } from '@/components/ui/data-table-body';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Brand {
  id: string;
  name: string;
  image: string;
  bannerImage: string;
  metaTitle: string;
  metaDescription: string;
  metaImage: string;
  status: 'active' | 'inactive';
}

export default function BrandsList() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const response = await fetch('/api/admin/brands');
      const data = await response.json();
      setBrands(data.brands || []);
    } catch (error) {
      console.error('Failed to fetch brands:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (brand: Brand) => {
    setSelectedBrand(brand);
    setShowForm(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/admin/brands/${deleteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setBrands(brands.filter(b => b.id !== deleteId));
      }
    } catch (error) {
      console.error('Failed to delete brand:', error);
    } finally {
      setDeleteId(null);
    }
  };

  const handleSave = (brand: Brand) => {
    if (selectedBrand) {
      setBrands(brands.map(b => b.id === selectedBrand.id ? brand : b));
    } else {
      setBrands([...brands, brand]);
    }
    setShowForm(false);
    setSelectedBrand(null);
    fetchBrands();
  };

  const handleToggleStatus = async (brandId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      const response = await fetch(`/api/admin/brands/${brandId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setBrands(brands.map(b => b.id === brandId ? { ...b, status: newStatus as 'active' | 'inactive' } : b));
      }
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Brands</h1>
        <Button onClick={() => { setSelectedBrand(null); setShowForm(true); }} className="gap-2 bg-[#22c55e]">
          <Plus className="h-4 w-4" />
          Add Brand
        </Button>
      </div>

      {showForm ? (
        <BrandForm
          brand={selectedBrand}
          onClose={() => { setShowForm(false); setSelectedBrand(null); fetchBrands(); }}
          onSave={handleSave}
        />
      ) : (
        <Card className="p-6 shadow-md">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 border-b border-gray-200 hover:bg-gray-50">
                  <TableHead className="font-semibold text-gray-700 py-4">Name</TableHead>
                  <TableHead className="font-semibold text-gray-700 py-4">Status</TableHead>
                  <TableHead className="font-semibold text-gray-700 py-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <DataTableBody
                loading={loading}
                data={brands}
                columns={3}
                loadingText="Loading brands..."
                emptyText="No brands found">
                {brands.map((brand) => (
                  <TableRow key={brand.id} className="border-b border-gray-200 hover:bg-green-50 transition-colors duration-150">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-4">
                        {brand.image ? (
                          <img 
                            src={brand.image} 
                            alt={brand.name} 
                            className="w-12 h-12 object-cover rounded border border-gray-200"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">No Image</span>
                          </div>
                        )}
                        <span className="font-semibold text-gray-900">{brand.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Switch
                        size="md"
                        checked={brand.status === 'active'}
                        onCheckedChange={() => handleToggleStatus(brand.id, brand.status)}
                      />
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex justify-end gap-6">
                        <button
                          onClick={() => handleEdit(brand)}
                          title="Edit brand"
                          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer">
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(brand.id)}
                          title="Delete brand"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer">
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </DataTableBody>
            </Table>
          </div>
        </Card>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the brand.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
