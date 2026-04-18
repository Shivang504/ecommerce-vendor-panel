'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ChevronDown, ChevronRight, Folder, Edit2, X, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Category {
  _id: string;
  name: string;
  parentId?: string | null;
  children?: Category[];
}

interface CategoryTreeProps {
  onCategorySelect: (categoryId: string) => void;
  selectedCategoryId?: string;
  onCategoryUpdate?: () => void;
}

export function CategoryTree({ onCategorySelect, selectedCategoryId, onCategoryUpdate }: CategoryTreeProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/categories');
      if (response.ok) {
        const data = await response.json();
        const allCategories = Array.isArray(data) ? data : (Array.isArray(data.categories) ? data.categories : []);
        
        // Build tree structure
        const categoryMap = new Map<string, Category>();
        const rootCategories: Category[] = [];

        // First pass: create map
        allCategories.forEach((cat: any) => {
          categoryMap.set(cat._id, {
            _id: cat._id,
            name: cat.name,
            parentId: cat.parentId || null,
            children: [],
          });
        });

        // Second pass: build tree
        categoryMap.forEach((category) => {
          if (!category.parentId) {
            rootCategories.push(category);
          } else {
            const parent = categoryMap.get(category.parentId);
            if (parent) {
              if (!parent.children) parent.children = [];
              parent.children.push(category);
            } else {
              rootCategories.push(category);
            }
          }
        });

        setCategories(rootCategories);
      }
    } catch (error) {
      console.error('[v0] Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleEdit = (category: Category) => {
    setEditingId(category._id);
    setEditValue(category.name);
  };

  const handleSaveEdit = async (categoryId: string) => {
    if (!editValue.trim()) {
      toast({
        title: 'Error',
        description: 'Category name cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    // Auto-generate slug from name
    const slug = editValue.trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '');

    try {
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: editValue.trim(),
          slug: slug,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Category name updated',
        });
        setEditingId(null);
        setEditValue('');
        fetchCategories();
        if (onCategoryUpdate) onCategoryUpdate();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to update category',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Failed to update category:', error);
      toast({
        title: 'Error',
        description: 'Failed to update category',
        variant: 'destructive',
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const filterCategories = (cats: Category[], term: string): Category[] => {
    if (!term) return cats;
    
    const result: Category[] = [];
    
    for (const cat of cats) {
      const matches = cat.name.toLowerCase().includes(term.toLowerCase());
      const filteredChildren = cat.children ? filterCategories(cat.children, term) : [];
      
      if (matches || filteredChildren.length > 0) {
        result.push({
          ...cat,
          children: filteredChildren.length > 0 ? filteredChildren : cat.children,
        });
      }
    }
    
    return result;
  };

  const renderCategory = (category: Category, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category._id);
    const isSelected = selectedCategoryId === category._id;
    const isEditing = editingId === category._id;
    const filteredChildren = searchTerm && category.children 
      ? filterCategories(category.children, searchTerm)
      : category.children || [];

    return (
      <div key={category._id} className="select-none">
        <div
          className={`flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-100 cursor-pointer group ${
            isSelected ? 'bg-blue-50' : ''
          }`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => !isEditing && onCategorySelect(category._id)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(category._id);
              }}
              className="p-0.5 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}
          
          <Folder className="w-4 h-4 text-gray-400 flex-shrink-0" />
          
          {isEditing ? (
            <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveEdit(category._id);
                  } else if (e.key === 'Escape') {
                    handleCancelEdit();
                  }
                }}
                className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveEdit(category._id);
                }}
                className="p-1 text-green-600 hover:bg-green-50 rounded"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelEdit();
                }}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <span className="flex-1 text-sm text-gray-700">{category.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(category);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition"
              >
                <Edit2 className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {filteredChildren.map((child) => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredCategories = searchTerm ? filterCategories(categories, searchTerm) : categories;

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">Category</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search Node"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="text-center text-sm text-gray-500 py-8">Loading categories...</div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center text-sm text-gray-500 py-8">No categories found</div>
        ) : (
          <div>
            {filteredCategories.map((category) => renderCategory(category))}
          </div>
        )}
      </div>
    </div>
  );
}

