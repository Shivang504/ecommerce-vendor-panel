'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import FormField from '@/components/formField/formField';
import { ArrowLeft, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RoleFormData {
  _id?: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

interface RoleFormPageProps {
  roleId?: string;
}

export function RoleFormPage({ roleId }: RoleFormPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [formData, setFormData] = useState<RoleFormData>({ name: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(!!roleId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (roleId) {
      fetchRole();
    }
  }, [roleId]);

  const fetchRole = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/roles/${roleId}`);
      if (response.ok) {
        const data = await response.json();
        setFormData(data);
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to load role details',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Failed to fetch role:', error);
      toast({
        title: 'Error',
        description: 'Failed to load role details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Role name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in the required fields',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const method = roleId ? 'PUT' : 'POST';
      const url = roleId ? `/api/admin/roles/${roleId}` : '/api/admin/roles';

      const { _id, createdAt, updatedAt, ...dataToSend } = formData as any;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: roleId ? 'Role updated successfully' : 'Role created successfully',
          variant:'success'
        });
        router.push('/admin/roles');
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to save role',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Save role error:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while saving the role',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center py-8'>
        <div className='text-center'>
          <p className='text-muted-foreground'>Loading role...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6 pb-8 max-w-3xl mx-auto'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => router.push('/admin/roles')}>
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div className='flex items-center gap-2'>
            <Shield className='h-6 w-6 text-[#22c55e]' />
            <div>
              <h1 className='text-3xl font-bold'>{roleId ? 'Edit Role' : 'Add New Role'}</h1>
              <p className='text-muted-foreground'>Manage role name (permissions will be added later)</p>
            </div>
          </div>
        </div>
      </div>

      <Card className='p-6 w-full'>
        <form onSubmit={handleSubmit} className='space-y-6'>
          <FormField
            label='Role Name'
            required
            id='name'
            name='name'
            value={formData.name}
            onChange={handleInputChange}
            placeholder='e.g., Admin, Manager, Support'
            disabled={saving}
            error={errors.name}
          />

          <div className='flex justify-end gap-3 pt-4 border-t'>
            <Button
              type='button'
              variant='outline'
              onClick={() => router.push('/admin/roles')}
              disabled={saving}>
              Cancel
            </Button>
            <Button type='submit' disabled={saving} className='bg-[#22c55e] hover:bg-[#22c55e]'>
              {saving ? 'Saving...' : roleId ? 'Update Role' : 'Create Role'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}


