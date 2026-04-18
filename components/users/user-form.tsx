'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import FormField from '@/components/formField/formField';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, ArrowLeft, User, Lock, Shield } from 'lucide-react';

interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  status: 'active' | 'inactive' | 'suspended';
  role: 'user' | 'admin';
}

export function UserForm({ initialData }: { initialData?: UserFormData & { _id?: string } }) {
  const [formData, setFormData] = useState<UserFormData>(initialData || {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    status: 'active',
    role: 'user',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'basic' | 'security' | 'status'>('basic');
  const router = useRouter();
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value as any }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.firstName || !formData.lastName || !formData.email) {
      setError('First name, last name, and email are required');
      setLoading(false);
      return;
    }

    if (!initialData && !formData.password) {
      setError('Password is required for new users');
      setLoading(false);
      return;
    }

    try {
      const url = initialData?._id 
        ? `/api/admin/users/${initialData._id}`
        : '/api/admin/users';
      
      const method = initialData ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save user');
      }

      toast({
        title: "Success",
        description: initialData ? 'User updated successfully' : 'User created successfully',
      });

      router.push('/admin/users');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      console.error('[v0] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Information', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'status', label: 'Status & Role', icon: Shield },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push('/admin/users')}
            className="inline-flex items-center justify-center cursor-pointer bg-white p-2 text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              {initialData ? 'Edit User' : 'Add New User'}
            </h1>
            <p className="text-sm text-slate-500">Create and manage user accounts with a clean tabbed layout.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <aside className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow-sm p-2 space-y-1">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      type="button"
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition cursor-pointer ${
                        activeTab === tab.id ? 'bg-gray-100 text-primary font-medium' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm md:text-base">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="lg:col-span-9 space-y-6">
              <Card className="bg-white border border-slate-200">
                <div className="space-y-6 px-6 py-6">
                  {error && (
                    <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  {activeTab === 'basic' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">Basic Information</h3>
                        <p className="text-sm text-slate-500">Provide the user’s profile details.</p>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            label="First Name"
                            required
                            id="firstName"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            placeholder="John"
                            disabled={loading}
                          />
                          <FormField
                            label="Last Name"
                            required
                            id="lastName"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            placeholder="Doe"
                            disabled={loading}
                          />
                        </div>

                        <FormField
                          label="Email"
                          required
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="john@example.com"
                          disabled={loading || !!initialData}
                          helperText={initialData ? 'Email cannot be changed' : undefined}
                        />

                        <FormField
                          label="Phone Number"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="+1 (555) 000-0000"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'security' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">Security</h3>
                        <p className="text-sm text-slate-500">Manage password requirements for this user.</p>
                      </div>
                      <FormField
                        label={initialData ? 'New Password (leave empty to keep current)' : 'Password'}
                        required={!initialData}
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        disabled={loading}
                      />
                    </div>
                  )}

                  {activeTab === 'status' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">Status & Role</h3>
                        <p className="text-sm text-slate-500">Control account availability and permissions.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Status</label>
                          <Select value={formData.status} onValueChange={value => handleSelectChange('status', value)}>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="suspended">Suspended</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Role</label>
                          <Select value={formData.role} onValueChange={value => handleSelectChange('role', value)}>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-200"
                  onClick={() => router.push('/admin/users')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : initialData ? 'Update User' : 'Create User'}
                </Button>
              </div>
            </section>
          </div>
        </form> 
      </div>
    </div>
  );
}
