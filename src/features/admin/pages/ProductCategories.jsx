import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../shared/ui/card";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Textarea } from "../../../shared/ui/textarea";
import { Plus, Edit2, Trash2, Save, X, Loader2, Tag } from "lucide-react";
import * as shopApi from "../../shop/api.js";

export default function ProductCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    parent_category_id: "",
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await shopApi.listCategories();
      setCategories(res.categories || []);
    } catch (err) {
      console.error("Error loading categories:", err);
      setError(err.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Category name is required");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const categoryData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        parent_category_id: formData.parent_category_id || null,
      };
      
      await shopApi.createCategory(categoryData);
      await loadCategories();
      setFormData({ name: "", description: "", parent_category_id: "" });
      setShowCreateForm(false);
    } catch (err) {
      console.error("Error creating category:", err);
      setError(err.message || "Failed to create category");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (categoryId) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;

    if (!formData.name.trim()) {
      setError("Category name is required");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const updates = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        parent_category_id: formData.parent_category_id || null,
      };
      
      await shopApi.updateCategory(categoryId, updates);
      await loadCategories();
      setEditingId(null);
      setFormData({ name: "", description: "", parent_category_id: "" });
    } catch (err) {
      console.error("Error updating category:", err);
      setError(err.message || "Failed to update category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (categoryId) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;

    if (!confirm(`Are you sure you want to delete "${category.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await shopApi.deleteCategory(categoryId);
      await loadCategories();
    } catch (err) {
      console.error("Error deleting category:", err);
      setError(err.message || "Failed to delete category");
      alert(err.message || "Failed to delete category");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (category) => {
    setEditingId(category.id);
    setFormData({
      name: category.name || "",
      description: category.description || "",
      parent_category_id: category.parent_category_id || "",
    });
    setShowCreateForm(false);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: "", description: "", parent_category_id: "" });
    setError(null);
  };

  const cancelCreate = () => {
    setShowCreateForm(false);
    setFormData({ name: "", description: "", parent_category_id: "" });
    setError(null);
  };

  const getCategoryName = (categoryId) => {
    if (!categoryId) return null;
    const category = categories.find((c) => c.id === categoryId);
    return category ? category.name : categoryId;
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Product Categories</h1>
          <p className="text-gray-600 mt-2">Manage global product categories for all salons</p>
        </div>
        <Button
          onClick={() => {
            setShowCreateForm(true);
            setEditingId(null);
            setFormData({ name: "", description: "", parent_category_id: "" });
            setError(null);
          }}
          disabled={showCreateForm || editingId !== null}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Category</CardTitle>
            <CardDescription>Add a new product category</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="create-name">Name *</Label>
                <Input
                  id="create-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Hair Care"
                  maxLength={100}
                  required
                />
              </div>
              <div>
                <Label htmlFor="create-description">Description</Label>
                <Textarea
                  id="create-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Category description"
                  maxLength={500}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="create-parent">Parent Category (optional)</Label>
                <select
                  id="create-parent"
                  value={formData.parent_category_id}
                  onChange={(e) => setFormData({ ...formData, parent_category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">None</option>
                  {categories
                    .filter((c) => c.id !== editingId)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={cancelCreate} disabled={saving}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
                <p className="text-gray-600">Loading categories...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Tag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No categories yet. Create your first category to get started.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Categories</CardTitle>
            <CardDescription>{categories.length} {categories.length === 1 ? "category" : "categories"} total</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  {editingId === category.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleUpdate(category.id);
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <Label htmlFor={`edit-name-${category.id}`}>Name *</Label>
                        <Input
                          id={`edit-name-${category.id}`}
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          maxLength={100}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit-description-${category.id}`}>Description</Label>
                        <Textarea
                          id={`edit-description-${category.id}`}
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          maxLength={500}
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit-parent-${category.id}`}>Parent Category (optional)</Label>
                        <select
                          id={`edit-parent-${category.id}`}
                          value={formData.parent_category_id}
                          onChange={(e) => setFormData({ ...formData, parent_category_id: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">None</option>
                          {categories
                            .filter((c) => c.id !== category.id)
                            .map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={saving}>
                          {saving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save
                            </>
                          )}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={cancelEdit} disabled={saving}>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                          {category.parent_category_id && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              Child of: {getCategoryName(category.parent_category_id)}
                            </span>
                          )}
                        </div>
                        {category.description && (
                          <p className="text-sm text-gray-600 mb-2">{category.description}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          Created: {new Date(category.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(category)}
                          disabled={editingId !== null || showCreateForm}
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(category.id)}
                          disabled={saving || editingId !== null || showCreateForm}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

