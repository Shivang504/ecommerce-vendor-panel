"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface CategoryFormData {
  _id?: string;
  name: string;
  slug: string;
  parentId?: string | null;
  description: string;
  shortDescription: string;
  image: string;
  banner: string;
  displayOnHomepage: boolean;
  displayOrder: number;
  position: number;
  status: "active" | "inactive";
  metaTitle: string;
  metaDescription: string;
  focusKeywords: string[];
  canonicalUrl: string;
  ogImage: string;
  commissionRate: number;
  featured: boolean;
  showProductCount: boolean;
}

interface CategoryFormProps {
  category?: CategoryFormData | null;
  onSave: (data: CategoryFormData) => Promise<void>;
  onCancel: () => void;
  parentCategories?: CategoryFormData[];
}

export function CategoryForm({
  category,
  onSave,
  onCancel,
  parentCategories = [],
}: CategoryFormProps) {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    slug: "",
    parentId: null,
    description: "",
    shortDescription: "",
    image: "",
    banner: "",
    displayOnHomepage: true,
    displayOrder: 0,
    position: 0,
    status: "active",
    metaTitle: "",
    metaDescription: "",
    focusKeywords: [],
    canonicalUrl: "",
    ogImage: "",
    commissionRate: 0,
    featured: false,
    showProductCount: true,
  });

  const [keywordInput, setKeywordInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (category) {
      setFormData(category);
    }
  }, [category]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "name" && !category) {
      setFormData((prev) => ({
        ...prev,
        slug: value
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^\w\-]+/g, ""),
      }));
    }
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        focusKeywords: [...prev.focusKeywords, keywordInput.trim()],
      }));
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      focusKeywords: prev.focusKeywords.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      alert("Please fill in category name and slug");
      return;
    }
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {category ? "Edit Category" : "Add New Category"}
        </h1>
        <Button variant="outline" onClick={onCancel}>
          Back
        </Button>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* BASIC TAB */}
        <TabsContent value="basic" className="space-y-4">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Category Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Electronics, Fashion"
                  />
                </div>
                <div>
                  <Label htmlFor="slug">URL Slug *</Label>
                  <Input
                    id="slug"
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    placeholder="auto-generated"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="parentId">Parent Category</Label>
                <Select
                  value={formData.parentId || "none"}
                  onValueChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      parentId: val === "none" ? null : val,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Main Category)</SelectItem>
                    {parentCategories.map((cat) => (
                      <SelectItem key={cat._id} value={cat._id || ""}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Category Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Add detailed category information"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="shortDescription">Short Description</Label>
                <Input
                  id="shortDescription"
                  name="shortDescription"
                  value={formData.shortDescription}
                  onChange={handleInputChange}
                  placeholder="Brief description for listing"
                />
              </div>

              <div>
                <Label htmlFor="position">Position *</Label>
                <Input
                  id="position"
                  name="position"
                  type="number"
                  min="0"
                  value={formData.position}
                  onChange={handleInputChange}
                  placeholder="Position order (lower numbers appear first)"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Lower numbers appear first in lists
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* MEDIA TAB */}
        <TabsContent value="media" className="space-y-4">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="image">Category Image/Icon (500×500px)</Label>
                <Input
                  id="image"
                  name="image"
                  value={formData.image}
                  onChange={handleInputChange}
                  placeholder="Image URL"
                />
              </div>

              <div>
                <Label htmlFor="banner">Category Banner (1920×400px)</Label>
                <Input
                  id="banner"
                  name="banner"
                  value={formData.banner}
                  onChange={handleInputChange}
                  placeholder="Banner image URL"
                />
              </div>

              <div>
                <Label htmlFor="ogImage">
                  Open Graph Image (for social sharing)
                </Label>
                <Input
                  id="ogImage"
                  name="ogImage"
                  value={formData.ogImage}
                  onChange={handleInputChange}
                  placeholder="OG image URL"
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* SEO TAB */}
        <TabsContent value="seo" className="space-y-4">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="metaTitle">
                  Meta Title ({formData.metaTitle.length}/60)
                </Label>
                <Input
                  id="metaTitle"
                  name="metaTitle"
                  value={formData.metaTitle}
                  onChange={handleInputChange}
                  placeholder="Page title for search engines"
                  maxLength={60}
                />
              </div>

              <div>
                <Label htmlFor="metaDescription">
                  Meta Description ({formData.metaDescription.length}/160)
                </Label>
                <Textarea
                  id="metaDescription"
                  name="metaDescription"
                  value={formData.metaDescription}
                  onChange={handleInputChange}
                  placeholder="Description for search engines"
                  maxLength={160}
                  rows={3}
                />
              </div>

              <div>
                <Label>Focus Keywords</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    placeholder="Add keyword and press button"
                    onKeyPress={(e) => e.key === "Enter" && handleAddKeyword()}
                  />
                  <Button onClick={handleAddKeyword} type="button">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.focusKeywords.map((keyword, index) => (
                    <div
                      key={index}
                      className="bg-primary/10 px-3 py-1 rounded-full flex items-center gap-2"
                    >
                      <span>{keyword}</span>
                      <button
                        onClick={() => handleRemoveKeyword(index)}
                        className="text-sm text-destructive hover:text-destructive/80"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="canonicalUrl">Canonical URL (optional)</Label>
                <Input
                  id="canonicalUrl"
                  name="canonicalUrl"
                  value={formData.canonicalUrl}
                  onChange={handleInputChange}
                  placeholder="https://example.com/category"
                />
              </div>

              <Card className="p-4 bg-muted">
                <h4 className="font-semibold mb-2">Google Search Preview</h4>
                <div className="text-sm space-y-1">
                  <div className="text-blue-600">
                    {formData.metaTitle || formData.name}
                  </div>
                  <div className="text-green-600 text-xs">
                    https://store.com/{formData.slug}
                  </div>
                  <div className="text-gray-600 text-sm line-clamp-2">
                    {formData.metaDescription}
                  </div>
                </div>
              </Card>
            </div>
          </Card>
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="space-y-4">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val) =>
                      setFormData((prev) => ({ ...prev, status: val as any }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="displayOrder">Display Order/Priority</Label>
                  <Input
                    id="displayOrder"
                    name="displayOrder"
                    type="number"
                    value={formData.displayOrder}
                    onChange={handleInputChange}
                    placeholder="1, 2, 3... (lower = higher priority)"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="commissionRate">
                  Commission Rate (%) for Vendors
                </Label>
                <Input
                  id="commissionRate"
                  name="commissionRate"
                  type="number"
                  value={formData.commissionRate}
                  onChange={handleInputChange}
                  placeholder="0"
                  step="0.1"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="displayOnHomepage"
                    checked={formData.displayOnHomepage}
                    onCheckedChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        displayOnHomepage: !!val,
                      }))
                    }
                  />
                  <Label htmlFor="displayOnHomepage">Display on Homepage</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="featured"
                    checked={formData.featured}
                    onCheckedChange={(val) =>
                      setFormData((prev) => ({ ...prev, featured: !!val }))
                    }
                  />
                  <Label htmlFor="featured">Mark as Featured Category</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="showProductCount"
                    checked={formData.showProductCount}
                    onCheckedChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        showProductCount: !!val,
                      }))
                    }
                  />
                  <Label htmlFor="showProductCount">Show Product Count</Label>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving} className='!bg-[#22c55e]'>
          {saving
            ? "Saving..."
            : category
            ? "Update Category"
            : "Create Category"}
        </Button>
      </div>
    </div>
  );
}
