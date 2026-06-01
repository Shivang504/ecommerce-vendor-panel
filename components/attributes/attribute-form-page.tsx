'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ImageIcon, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isColorAttribute, sanitizeValueImages } from '@/lib/attribute-images';

const ATTRIBUTE_STYLES = [
  { label: 'Rectangle', value: 'rectangle' },
  { label: 'Circle', value: 'circle' },
  { label: 'Radio', value: 'radio' },
  { label: 'Dropdown', value: 'dropdown' },
  { label: 'Image', value: 'image' },
];

interface AttributeFormPageProps {
  attributeId?: string;
}

export function AttributeFormPage({ attributeId }: AttributeFormPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [style, setStyle] = useState(ATTRIBUTE_STYLES[0].value);
  const [values, setValues] = useState<string[]>([]);
  const [valueImages, setValueImages] = useState<Record<string, string>>({});
  const [uploadingValue, setUploadingValue] = useState<string | null>(null);
  const [valueInput, setValueInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!attributeId);

  useEffect(() => {
    if (!attributeId) return;

    const fetchAttribute = async () => {
      try {
        const response = await fetch(`/api/admin/attributes/${attributeId}`);
        if (response.ok) {
          const data = await response.json();
          setName(data.name || '');
          setStyle(data.style || ATTRIBUTE_STYLES[0].value);
          const loadedValues = Array.isArray(data.values) ? data.values : [];
          setValues(loadedValues);
          setValueImages(sanitizeValueImages(loadedValues, data.valueImages));
        } else {
          toast({
            title: 'Error',
            description: 'Failed to load attribute',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('[v0] Failed to fetch attribute:', error);
        toast({
          title: 'Error',
          description: 'Failed to load attribute',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAttribute();
  }, [attributeId, toast]);

  const addValue = () => {
    if (!valueInput.trim()) {
      setErrors(prev => ({ ...prev, valueInput: 'Please enter a value' }));
      return;
    }
    if (values.includes(valueInput.trim())) {
      setErrors(prev => ({ ...prev, valueInput: 'Value already exists' }));
      return;
    }
    setValues(prev => [...prev, valueInput.trim()]);
    setValueInput('');
    setErrors(prev => ({ ...prev, valueInput: '' }));
  };

  const removeValue = (value: string) => {
    setValues(prev => prev.filter(v => v !== value));
    setValueImages(prev => {
      const next = { ...prev };
      delete next[value];
      return next;
    });
  };

  const showValueImages = isColorAttribute(name, style);

  const uploadValueImage = async (value: string, file: File) => {
    setUploadingValue(value);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Upload failed');
      }
      setValueImages(prev => ({ ...prev, [value]: data.url }));
      toast({ title: 'Image uploaded', description: `Image set for "${value}"` });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Could not upload image',
        variant: 'destructive',
      });
    } finally {
      setUploadingValue(null);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!style) newErrors.style = 'Style is required';
    if (values.length === 0) newErrors.values = 'Add at least one value';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast({
        title: 'Validation error',
        description: 'Please fix the highlighted fields',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        style,
        values,
        valueImages: sanitizeValueImages(values, valueImages),
      };
      const url = attributeId ? `/api/admin/attributes/${attributeId}` : '/api/admin/attributes';
      const method = attributeId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: attributeId ? 'Attribute updated' : 'Attribute created',
          variant: 'success'
        });
        router.push('/supplier/attributes');
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to save attribute',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Save attribute error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save attribute',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <p className='text-muted-foreground'>Loading attribute...</p>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8'>
      <div className='max-w-5xl mx-auto space-y-6'>
        {/* Header */}
        <div className='bg-white rounded-lg shadow-sm p-4 md:p-6 flex items-center gap-4'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => router.push('/supplier/attributes')}
            className='border border-slate-200'
          >
            <ArrowLeft className='h-5 w-5' />
          </Button>
          <div>
            <h1 className='text-2xl md:text-3xl font-bold text-slate-900'>
              {attributeId ? 'Edit Attribute' : 'Add New Attribute'}
            </h1>
            <p className='text-sm text-slate-500'>Define attribute styles and values for product variants.</p>
          </div>
        </div>

        {/* Form */}
        <form className='space-y-6' onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
          <Card className='bg-white border border-slate-200 p-6 space-y-6'>
            {/* Name */}
            <div className='space-y-2'>
              <label htmlFor='name' className='text-sm font-medium text-gray-700'>
                Name <span className='text-red-500'>*</span>
              </label>
              <Input
                id='name'
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder='Enter Attribute Name'
                className='h-[48px]'
                disabled={saving}
              />
              {errors.name && <p className='text-sm text-red-500'>{errors.name}</p>}
            </div>

            {/* Style */}
            <div className='space-y-2'>
              <label htmlFor='style' className='text-sm font-medium text-gray-700'>
                Style <span className='text-red-500'>*</span>
              </label>
              <Select value={style} onValueChange={setStyle} disabled={saving}>
                <SelectTrigger id='style' className='h-[48px]'>
                  <SelectValue placeholder='Select style' />
                </SelectTrigger>
                <SelectContent>
                  {ATTRIBUTE_STYLES.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className='text-xs text-muted-foreground mt-1'>
                *Choose the desired shape style, such as rectangle or circle. Based on your selection, variant options will be displayed on product page.
              </p>
              {errors.style && <p className='text-sm text-red-500'>{errors.style}</p>}
            </div>

            {/* Values */}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-gray-700'>
                Values <span className='text-red-500'>*</span>
              </label>
              <div className='flex gap-2'>
                <Input
                  value={valueInput}
                  onChange={e => setValueInput(e.target.value)}
                  placeholder='Enter Value'
                  className='h-[48px]'
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addValue();
                    }
                  }}
                  disabled={saving}
                />
                <Button type='button' onClick={addValue} className='bg-primary text-white'>
                  Add Value
                </Button>
              </div>
              {errors.valueInput && <p className='text-sm text-red-500'>{errors.valueInput}</p>}
              {showValueImages && values.length > 0 && (
                <p className='text-xs text-muted-foreground'>
                  Upload a swatch image for each color (shown on product page next to the color name).
                </p>
              )}
              {values.length > 0 && (
                <div className='space-y-3 mt-2'>
                  {values.map(value => (
                    <div
                      key={value}
                      className='flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3'>
                      {showValueImages && (
                        <label className='relative flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-slate-200 bg-white'>
                          {valueImages[value] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={valueImages[value]} alt={value} className='h-full w-full object-cover' />
                          ) : (
                            <ImageIcon className='h-5 w-5 text-slate-400' />
                          )}
                          <input
                            type='file'
                            accept='image/*'
                            className='absolute inset-0 cursor-pointer opacity-0'
                            disabled={saving || uploadingValue === value}
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) void uploadValueImage(value, file);
                              e.target.value = '';
                            }}
                          />
                          {uploadingValue === value && (
                            <span className='absolute inset-0 flex items-center justify-center bg-white/80'>
                              <Loader2 className='h-4 w-4 animate-spin text-primary' />
                            </span>
                          )}
                        </label>
                      )}
                      <span className='min-w-[4rem] font-medium text-slate-800'>{value}</span>
                      {showValueImages && valueImages[value] && (
                        <button
                          type='button'
                          className='text-xs text-red-600 hover:underline'
                          onClick={() =>
                            setValueImages(prev => {
                              const next = { ...prev };
                              delete next[value];
                              return next;
                            })
                          }>
                          Remove image
                        </button>
                      )}
                      <button
                        type='button'
                        onClick={() => removeValue(value)}
                        className='ml-auto text-slate-500 hover:text-slate-700'>
                        <X className='w-4 h-4' />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {errors.values && <p className='text-sm text-red-500'>{errors.values}</p>}
            </div>
          </Card>

          {/* Buttons */}
          <div className='flex justify-end gap-3'>
            <Button
              type='button'
              variant='outline'
              onClick={() => router.push('/supplier/attributes')}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={saving} className='bg-primary text-white'>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
