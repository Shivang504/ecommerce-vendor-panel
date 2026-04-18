'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { GripVertical, Save } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Category {
  _id: string;
  name: string;
  position: number;
  status: 'active' | 'inactive';
}

interface Subcategory {
  _id: string;
  name: string;
  position: number;
  status: 'active' | 'inactive';
  categoryId?: string;
  categoryName?: string;
}

interface ChildCategory {
  _id: string;
  name: string;
  position: number;
  status: 'active' | 'inactive';
  categoryId?: string;
  categoryName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
}

// Sortable Item Component
function SortableItem({
  item,
  type,
  onView,
}: {
  item: Category | Subcategory | ChildCategory;
  type: 'category' | 'subcategory' | 'child';
  onView?: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getTypeLabel = () => {
    if (type === 'subcategory' && 'categoryName' in item) {
      return `(${item.categoryName})`;
    }
    if (type === 'child' && 'subcategoryName' in item) {
      return `(${item.subcategoryName})`;
    }
    return '';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors ${
        isDragging ? 'shadow-lg' : ''
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className='cursor-grab active:cursor-grabbing flex items-center justify-center'
      >
        <GripVertical className='h-5 w-5 text-gray-400' />
      </div>
      <div className='flex-1'>
        <div className='flex items-center gap-2'>
          <span className='font-medium text-gray-900'>{item.name}</span>
          {getTypeLabel() && (
            <span className='text-sm text-gray-500'>{getTypeLabel()}</span>
          )}
        </div>
        <div className='flex items-center gap-4 mt-1'>
          <span className='text-xs text-gray-500'>Position: {item.position}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              item.status === 'active'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {item.status}
          </span>
        </div>
      </div>
    </div>
  );
}

export function PositionManagement() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [childCategories, setChildCategories] = useState<ChildCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('categories');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [catRes, subcatRes, childRes] = await Promise.all([
        fetch('/api/admin/categories'),
        fetch('/api/admin/subcategories'),
        fetch('/api/admin/child-categories'),
      ]);

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(
          (Array.isArray(catData.categories) ? catData.categories : []).sort(
            (a: Category, b: Category) => (a.position || 0) - (b.position || 0)
          )
        );
      }

      if (subcatRes.ok) {
        const subcatData = await subcatRes.json();
        setSubcategories(
          (Array.isArray(subcatData.subcategories) ? subcatData.subcategories : []).sort(
            (a: Subcategory, b: Subcategory) => (a.position || 0) - (b.position || 0)
          )
        );
      }

      if (childRes.ok) {
        const childData = await childRes.json();
        setChildCategories(
          (Array.isArray(childData.childCategories) ? childData.childCategories : []).sort(
            (a: ChildCategory, b: ChildCategory) => (a.position || 0) - (b.position || 0)
          )
        );
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent, type: 'category' | 'subcategory' | 'child') => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    let oldIndex = -1;
    let newIndex = -1;
    let items: any[] = [];
    let setItems: any = null;

    if (type === 'category') {
      oldIndex = categories.findIndex((cat) => cat._id === active.id);
      newIndex = categories.findIndex((cat) => cat._id === over.id);
      items = categories;
      setItems = setCategories;
    } else if (type === 'subcategory') {
      oldIndex = subcategories.findIndex((subcat) => subcat._id === active.id);
      newIndex = subcategories.findIndex((subcat) => subcat._id === over.id);
      items = subcategories;
      setItems = setSubcategories;
    } else {
      oldIndex = childCategories.findIndex((child) => child._id === active.id);
      newIndex = childCategories.findIndex((child) => child._id === over.id);
      items = childCategories;
      setItems = setChildCategories;
    }

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Update local state optimistically
    const newItems = arrayMove(items, oldIndex, newIndex);
    setItems(newItems);
  };

  const handleSave = async (type: 'category' | 'subcategory' | 'child') => {
    try {
      setSaving(true);
      let items: any[] = [];
      let endpoint = '';

      if (type === 'category') {
        items = categories;
        endpoint = '/api/admin/categories/update-positions';
      } else if (type === 'subcategory') {
        items = subcategories;
        endpoint = '/api/admin/subcategories/update-positions';
      } else {
        items = childCategories;
        endpoint = '/api/admin/child-categories/update-positions';
      }

      const positions = items.map((item, index) => ({
        id: item._id,
        position: index,
      }));

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} positions updated successfully`,
          variant: 'success',
        });
        // Update local positions
        const updatedItems = items.map((item, index) => ({
          ...item,
          position: index,
        }));
        if (type === 'category') {
          setCategories(updatedItems);
        } else if (type === 'subcategory') {
          setSubcategories(updatedItems);
        } else {
          setChildCategories(updatedItems);
        }
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update positions',
          variant: 'destructive',
        });
        // Reload data on error
        fetchAllData();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while updating positions',
        variant: 'destructive',
      });
      fetchAllData();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <Spinner className='h-8 w-8' />
        <span className='ml-2'>Loading...</span>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Position Management</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Drag and drop items to reorder their positions
          </p>
        </div>
      </div>

      <Card className='p-6'>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className='grid w-full grid-cols-3'>
            <TabsTrigger value='categories'>
              Categories ({categories.length})
            </TabsTrigger>
            <TabsTrigger value='subcategories'>
              Subcategories ({subcategories.length})
            </TabsTrigger>
            <TabsTrigger value='child'>
              Child Categories ({childCategories.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value='categories' className='mt-6'>
            <div className='flex justify-end mb-4'>
              <Button
                onClick={() => handleSave('category')}
                disabled={saving}
                className='gap-2'
              >
                {saving ? (
                  <>
                    <Spinner className='h-4 w-4' />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className='h-4 w-4' />
                    Save Positions
                  </>
                )}
              </Button>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => handleDragEnd(e, 'category')}
            >
              <SortableContext
                items={categories.map((cat) => cat._id)}
                strategy={verticalListSortingStrategy}
              >
                <div className='space-y-3'>
                  {categories.map((category) => (
                    <SortableItem
                      key={category._id}
                      item={category}
                      type='category'
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {categories.length === 0 && (
              <div className='text-center py-8 text-gray-500'>
                No categories found
              </div>
            )}
          </TabsContent>

          <TabsContent value='subcategories' className='mt-6'>
            <div className='flex justify-end mb-4'>
              <Button
                onClick={() => handleSave('subcategory')}
                disabled={saving}
                className='gap-2'
              >
                {saving ? (
                  <>
                    <Spinner className='h-4 w-4' />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className='h-4 w-4' />
                    Save Positions
                  </>
                )}
              </Button>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => handleDragEnd(e, 'subcategory')}
            >
              <SortableContext
                items={subcategories.map((subcat) => subcat._id)}
                strategy={verticalListSortingStrategy}
              >
                <div className='space-y-3'>
                  {subcategories.map((subcategory) => (
                    <SortableItem
                      key={subcategory._id}
                      item={subcategory}
                      type='subcategory'
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {subcategories.length === 0 && (
              <div className='text-center py-8 text-gray-500'>
                No subcategories found
              </div>
            )}
          </TabsContent>

          <TabsContent value='child' className='mt-6'>
            <div className='flex justify-end mb-4'>
              <Button
                onClick={() => handleSave('child')}
                disabled={saving}
                className='gap-2'
              >
                {saving ? (
                  <>
                    <Spinner className='h-4 w-4' />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className='h-4 w-4' />
                    Save Positions
                  </>
                )}
              </Button>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => handleDragEnd(e, 'child')}
            >
              <SortableContext
                items={childCategories.map((child) => child._id)}
                strategy={verticalListSortingStrategy}
              >
                <div className='space-y-3'>
                  {childCategories.map((childCategory) => (
                    <SortableItem
                      key={childCategory._id}
                      item={childCategory}
                      type='child'
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {childCategories.length === 0 && (
              <div className='text-center py-8 text-gray-500'>
                No child categories found
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

