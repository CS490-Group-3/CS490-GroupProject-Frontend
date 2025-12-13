import { useEffect, useState } from "react";
import { api } from "../../../shared/api/client.js";
import { Plus, Edit2, X, Save, Trash2, Loader2, Upload, Image as ImageIcon, Package, RotateCcw } from "lucide-react";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Textarea } from "../../../shared/ui/textarea";
import * as shopApi from "../api.js";

// Component to display product image - refreshes signed URL from filepath
function ProductImage({ imageUrl, alt, className }) {
  const [displayUrl, setDisplayUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!imageUrl) {
      setLoading(false);
      return;
    }
    
    // If it's already a signed URL (starts with http), use it directly
    if (imageUrl.startsWith("http")) {
      setDisplayUrl(imageUrl);
      setLoading(false);
      return;
    }
    
    // It's a filepath, refresh it to get signed URL
    setLoading(true);
    shopApi.refreshProductImageUrl(imageUrl, "salon-products")
      .then(res => {
        setDisplayUrl(res.signed_url);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error refreshing product image URL:", err);
        setDisplayUrl(null);
        setLoading(false);
      });
  }, [imageUrl]);
  
  if (loading) {
    return (
      <div className={`${className} bg-gray-200 flex items-center justify-center`}>
        <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
      </div>
    );
  }
  
  if (!displayUrl) {
    return (
      <div className={`${className} bg-gray-200 flex items-center justify-center`}>
        <ImageIcon className="h-12 w-12 text-gray-400" />
      </div>
    );
  }
  
  return (
    <img src={displayUrl} alt={alt} className={className} />
  );
}

export default function MyShop() {
  const [salonId, setSalonId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Products state
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
    stock_quantity: "",
    category_id: "",
    is_active: true,
  });
  const [savingProduct, setSavingProduct] = useState(false);
  const [productImageFile, setProductImageFile] = useState(null);
  const [productImagePreview, setProductImagePreview] = useState(null);
  
  // Categories state
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  useEffect(() => {
    loadSalonData();
  }, []);

  const loadSalonData = async () => {
    try {
      setLoading(true);
      const res = await api("/salons/mine");
      const salonData = res.salon || null;
      
      if (salonData && salonData.id) {
        const currentSalonId = salonData.id;
        setSalonId(currentSalonId);
        
        // Load from localStorage first for instant display
        const cachedProducts = loadProductsFromStorage(currentSalonId);
        // Don't filter - show all products including inactive for owners
        if (cachedProducts.length > 0) {
          // Use cached products directly - ProductImage component will refresh filepaths when displaying
          setProducts(cachedProducts);
        }
        
        // Then try to load from server (will update localStorage if successful)
        await loadProducts(currentSalonId);
        await loadCategories();
      }
    } catch (err) {
      console.error("Error loading salon:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load products from localStorage for a salon
  const loadProductsFromStorage = (salonId) => {
    try {
      const storageKey = `products_${salonId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed;
      }
    } catch (err) {
      console.error("Error loading products from storage:", err);
    }
    return [];
  };

  // Save products to localStorage for a salon
  const saveProductsToStorage = (salonId, productsList) => {
    try {
      const storageKey = `products_${salonId}`;
      localStorage.setItem(storageKey, JSON.stringify(productsList));
    } catch (err) {
      console.error("Error saving products to storage:", err);
    }
  };

  const loadProducts = async (salonId) => {
    try {
      console.log("Loading products for salon:", salonId);
      // Include inactive products for salon owners
      const res = await shopApi.listProducts(salonId, [], true);
      console.log("Products response:", res);
      const productsList = res.products || [];
      console.log("Products list:", productsList);
      
      // Don't filter - show all products including inactive for owners
      const activeProducts = productsList;
      
      // IMPORTANT: Save raw products with filepaths to localStorage (never signed URLs)
      // The backend returns filepaths in image_url - store them as-is
      // Save all products (including inactive) for owners
      saveProductsToStorage(salonId, activeProducts);
      
      // For display, we'll use ProductImage component which refreshes filepaths automatically
      // So we can just use the products as-is (the component will handle refreshing)
      console.log("Active products loaded:", activeProducts);
      setProducts(activeProducts);
    } catch (err) {
      console.error("Error loading products:", err);
      console.error("Error details:", err.message, err.stack);
      // If server fails, keep cached products (already loaded above)
      // If no cached products, keep existing state
    }
  };

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const res = await shopApi.listCategories();
      setCategories(res.categories || []);
    } catch (err) {
      console.error("Error loading categories:", err);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProductImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!salonId) return;
    
    // Validate field lengths
    if (newProduct.name.length > 100) {
      alert("Product name must be 100 characters or less");
      return;
    }
    if (newProduct.description && newProduct.description.length > 500) {
      alert("Product description must be 500 characters or less");
      return;
    }
    
    const price = parseFloat(newProduct.price);
    const stock = parseInt(newProduct.stock_quantity) || 0;
    
    if (isNaN(price) || price < 0) {
      alert("Please enter a valid price");
      return;
    }
    if (isNaN(stock) || stock < 0) {
      alert("Please enter a valid stock quantity");
      return;
    }
    
    setSavingProduct(true);
    try {
      // Prepare product data (DO NOT include salon_id - backend adds it automatically)
      const productData = {
        name: newProduct.name.trim(),
        price: String(price), // Backend expects string
        stock_quantity: stock,
        is_active: newProduct.is_active !== undefined ? newProduct.is_active : true,
      };
      
      // Add optional fields only if they have values
      if (newProduct.description && newProduct.description.trim()) {
        productData.description = newProduct.description.trim();
      }
      
      if (newProduct.category_id) {
        productData.category_id = newProduct.category_id;
      }
      
      // Add image file if provided - backend will handle upload via multipart/form-data
      if (productImageFile) {
        productData.image = productImageFile;
      }
      
      // Create product with multipart/form-data (handles image upload automatically)
      console.log("Creating product with data:", productData);
      const created = await shopApi.createProduct(productData);
      console.log("Product created response:", created);
      
      // Clear form first
      setNewProduct({
        name: "",
        description: "",
        price: "",
        stock_quantity: "",
        category_id: "",
        is_active: true,
      });
      setProductImageFile(null);
      setProductImagePreview(null);
      setShowProductForm(false);
      
      // Optimistically add the created product to the list immediately
      // IMPORTANT: Keep the filepath (image_url) as-is, don't convert to signed URL here
      // The signed URL will be generated when displaying in loadProducts
      let optimisticProduct = null;
      if (created.product) {
        // Keep the filepath from backend - it will be refreshed when displaying
        optimisticProduct = {
          ...created.product,
          // image_url is already the filepath from backend, keep it as-is
        };
        console.log("Adding product optimistically:", optimisticProduct);
        
        setProducts(prev => {
          // Avoid duplicates
          const exists = prev.some(p => p.id === optimisticProduct.id);
          let updated;
          if (exists) {
            updated = prev.map(p => p.id === optimisticProduct.id ? optimisticProduct : p);
          } else {
            updated = [...prev, optimisticProduct];
          }
          // Save to localStorage immediately (with filepath, not signed URL)
          saveProductsToStorage(salonId, updated);
          return updated;
        });
      }
      
      alert("Product added successfully!");
      
      // Try to reload products from server, but keep optimistic update if it fails
      try {
        await loadProducts(salonId);
      } catch (reloadError) {
        console.error("Error reloading products, keeping optimistic update:", reloadError);
        // Product is already saved to localStorage, so it will persist
      }
    } catch (error) {
      console.error("Error adding product:", error);
      let errorMessage = "Unknown error";
      if (typeof error === "string") {
        errorMessage = error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = typeof error.error === "string" ? error.error : JSON.stringify(error.error);
      } else if (error) {
        errorMessage = JSON.stringify(error);
      }
      alert("Failed to add product: " + errorMessage);
    } finally {
      setSavingProduct(false);
    }
  };

  const handleUpdateProduct = async (productId) => {
    if (!salonId || !editingProduct) return;
    
    // Validate field lengths
    if (editingProduct.name && editingProduct.name.length > 100) {
      alert("Product name must be 100 characters or less");
      return;
    }
    if (editingProduct.description && editingProduct.description.length > 500) {
      alert("Product description must be 500 characters or less");
      return;
    }
    
    setSavingProduct(true);
    try {
      const updates = {};
      
      // Only include fields that are being updated
      if (editingProduct.name !== undefined) updates.name = editingProduct.name;
      if (editingProduct.description !== undefined) updates.description = editingProduct.description || "";
      if (editingProduct.price !== undefined) updates.price = String(parseFloat(editingProduct.price));
      if (editingProduct.stock_quantity !== undefined) updates.stock_quantity = parseInt(editingProduct.stock_quantity);
      if (editingProduct.category_id !== undefined) updates.category_id = editingProduct.category_id || null;
      if (editingProduct.is_active !== undefined) updates.is_active = editingProduct.is_active;
      
      // If new image uploaded, include it (PR #62)
      if (productImageFile) {
        updates.image = productImageFile;
      }
      
      await shopApi.updateProduct(productId, updates);
      
      // Reload products to get updated data
      await loadProducts(salonId);
      
      setEditingProduct(null);
      setProductImageFile(null);
      setProductImagePreview(null);
      alert("Product updated successfully!");
    } catch (error) {
      console.error("Error updating product:", error);
      let errorMessage = "Unknown error";
      if (typeof error === "string") {
        errorMessage = error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = typeof error.error === "string" ? error.error : JSON.stringify(error.error);
      } else if (error) {
        errorMessage = JSON.stringify(error);
      }
      alert("Failed to update product: " + errorMessage);
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!salonId) return;
    if (!confirm("Are you sure you want to delete this product?")) return;
    
    setSavingProduct(true);
    try {
      // Backend doesn't have DELETE endpoint, so we deactivate instead
      await shopApi.updateProduct(productId, { is_active: false });
      
      // Optimistically remove product from UI immediately
      setProducts(prev => {
        const filtered = prev.filter(p => p.id !== productId);
        // Update localStorage to exclude the deleted product
        saveProductsToStorage(salonId, filtered);
        return filtered;
      });
      
      alert("Product deleted successfully!");
      
      // Reload products from server to ensure sync
      try {
        await loadProducts(salonId);
      } catch (reloadError) {
        console.error("Error reloading products after delete, but product already removed from UI:", reloadError);
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      let errorMessage = "Unknown error";
      if (typeof error === "string") {
        errorMessage = error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = typeof error.error === "string" ? error.error : JSON.stringify(error.error);
      } else if (error) {
        errorMessage = JSON.stringify(error);
      }
      alert("Failed to delete product: " + errorMessage);
    } finally {
      setSavingProduct(false);
    }
  };

  const handleRestoreProduct = async (productId) => {
    if (!salonId) return;
    
    setSavingProduct(true);
    try {
      await shopApi.updateProduct(productId, { is_active: true });
      
      // Update product in state
      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, is_active: true } : p
      ));
      
      // Reload products from server to ensure sync
      await loadProducts(salonId);
      
      alert("Product restored successfully!");
    } catch (error) {
      console.error("Error restoring product:", error);
      let errorMessage = "Unknown error";
      if (typeof error === "string") {
        errorMessage = error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = typeof error.error === "string" ? error.error : JSON.stringify(error.error);
      } else if (error) {
        errorMessage = JSON.stringify(error);
      }
      alert("Failed to restore product: " + errorMessage);
    } finally {
      setSavingProduct(false);
    }
  };

  const handleUpdateStock = async (productId, newStock) => {
    if (!salonId) return;
    const stock = parseInt(newStock);
    if (isNaN(stock) || stock < 0) {
      alert("Please enter a valid stock quantity");
      return;
    }
    
    try {
      await shopApi.updateProduct(productId, { stock_quantity: stock });
      
      // Reload products to get updated data
      await loadProducts(salonId);
    } catch (error) {
      console.error("Error updating stock:", error);
      let errorMessage = "Unknown error";
      if (typeof error === "string") {
        errorMessage = error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = typeof error.error === "string" ? error.error : JSON.stringify(error.error);
      } else if (error) {
        errorMessage = JSON.stringify(error);
      }
      alert("Failed to update stock: " + errorMessage);
    }
  };


  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600 mb-4" />
          <p className="text-gray-600">Loading shop data...</p>
        </div>
      </div>
    );
  }

  if (!salonId) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="p-6 bg-white border rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-2">No salon found</h3>
          <p className="text-sm text-gray-600">Please register a salon first to manage your shop.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Shop & Catalog</h1>
      </div>

      {/* Products Section */}
      <div className="bg-white border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Products</h2>
          {!showProductForm && !editingProduct && (
            <Button onClick={() => setShowProductForm(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          )}
        </div>

        {showProductForm && (
          <form onSubmit={handleAddProduct} className="mb-4 p-4 border rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Product Name *</Label>
                <Input
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                rows={3}
                placeholder="Product description..."
              />
            </div>
            <div>
              <Label>Category</Label>
              <select
                value={newProduct.category_id}
                onChange={(e) => setNewProduct({ ...newProduct, category_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price ($) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Stock Quantity *</Label>
                <Input
                  type="number"
                  min="0"
                  value={newProduct.stock_quantity}
                  onChange={(e) => setNewProduct({ ...newProduct, stock_quantity: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label>Product Image</Label>
              <div className="mt-2">
                {productImagePreview && (
                  <img src={productImagePreview} alt="Preview" className="h-32 w-32 object-cover rounded-lg border mb-2" />
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="new-product-active"
                checked={newProduct.is_active}
                onChange={(e) => setNewProduct({ ...newProduct, is_active: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="new-product-active" className="cursor-pointer">Active (visible to customers)</Label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={savingProduct}>
                {savingProduct ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Product
              </Button>
              <Button type="button" variant="outline" onClick={() => {
                setShowProductForm(false);
                setNewProduct({
                  name: "",
                  description: "",
                  price: "",
                  stock_quantity: "",
                  category_id: "",
                  is_active: true,
                });
                setProductImageFile(null);
                setProductImagePreview(null);
              }}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Active Products */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Products</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.filter(p => p.is_active !== false).length === 0 && !showProductForm && (
              <div className="col-span-full rounded-xl border bg-gray-50 text-gray-600 p-4 text-sm text-center">
                No active products yet. Add your first product above.
              </div>
            )}
            {products.filter(p => p.is_active !== false).map((product) => (
            <div key={product.id} className="border rounded-xl p-4 bg-white">
              {editingProduct?.id === product.id ? (
                <div className="space-y-3">
                  <div>
                    <Label>Product Name</Label>
                    <Input
                      value={editingProduct.name}
                      onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={editingProduct.description || ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Price ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editingProduct.price}
                        onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Stock</Label>
                      <Input
                        type="number"
                        value={editingProduct.stock_quantity}
                        onChange={(e) => setEditingProduct({ ...editingProduct, stock_quantity: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <select
                      value={editingProduct.category_id || ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, category_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">No category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Product Image</Label>
                    {productImagePreview && (
                      <img src={productImagePreview} alt="Preview" className="h-24 w-24 object-cover rounded-lg border mb-2" />
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingProduct.is_active}
                      onChange={(e) => setEditingProduct({ ...editingProduct, is_active: e.target.checked })}
                      className="rounded"
                    />
                    <Label className="text-sm">Active</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleUpdateProduct(product.id)} size="sm" disabled={savingProduct}>
                      {savingProduct ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                    <Button onClick={() => {
                      setEditingProduct(null);
                      setProductImageFile(null);
                      setProductImagePreview(null);
                    }} variant="outline" size="sm">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <ProductImage
                    imageUrl={product.image_url}
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-lg mb-3"
                  />
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{product.name}</h3>
                      {product.category_id && categories.find(c => c.id === product.category_id) && (
                        <p className="text-xs text-indigo-600 mt-1">
                          {categories.find(c => c.id === product.category_id).name}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        onClick={() => setEditingProduct({ ...product })}
                        variant="ghost"
                        size="sm"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteProduct(product.id)}
                        variant="ghost"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                  {product.description && (
                    <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold text-gray-900">${Number(product.price).toFixed(2)}</div>
                      <div className="text-xs text-gray-500">
                        Stock: <span className={product.stock_quantity > 0 ? "text-green-600" : "text-red-600"}>
                          {product.stock_quantity}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        value={product.stock_quantity}
                        onChange={(e) => {
                          const newStock = e.target.value;
                          if (newStock !== String(product.stock_quantity)) {
                            handleUpdateStock(product.id, newStock);
                          }
                        }}
                        className="w-20 h-8 text-sm"
                        onBlur={(e) => {
                          if (e.target.value !== String(product.stock_quantity)) {
                            handleUpdateStock(product.id, e.target.value);
                          }
                        }}
                      />
                      <Package className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
          </div>
        </div>

        {/* Inactive Products */}
        {products.filter(p => p.is_active === false).length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Inactive Products</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.filter(p => p.is_active === false).map((product) => (
                <div key={product.id} className="border rounded-xl p-4 bg-white opacity-75">
                  {editingProduct?.id === product.id ? (
                    <div className="space-y-3">
                      <div>
                        <Label>Product Name</Label>
                        <Input
                          value={editingProduct.name}
                          onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={editingProduct.description || ""}
                          onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Price ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={editingProduct.price}
                            onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Stock</Label>
                          <Input
                            type="number"
                            value={editingProduct.stock_quantity}
                            onChange={(e) => setEditingProduct({ ...editingProduct, stock_quantity: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Category</Label>
                        <select
                          value={editingProduct.category_id || ""}
                          onChange={(e) => setEditingProduct({ ...editingProduct, category_id: e.target.value })}
                          className="w-full px-3 py-2 border rounded-md"
                        >
                          <option value="">No category</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Product Image</Label>
                        {productImagePreview && (
                          <img src={productImagePreview} alt="Preview" className="h-24 w-24 object-cover rounded-lg border mb-2" />
                        )}
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editingProduct.is_active}
                          onChange={(e) => setEditingProduct({ ...editingProduct, is_active: e.target.checked })}
                          className="rounded"
                        />
                        <Label className="text-sm">Active</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleUpdateProduct(product.id)} size="sm" disabled={savingProduct}>
                          {savingProduct ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        </Button>
                        <Button onClick={() => {
                          setEditingProduct(null);
                          setProductImageFile(null);
                          setProductImagePreview(null);
                        }} variant="outline" size="sm">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <ProductImage
                        imageUrl={product.image_url}
                        alt={product.name}
                        className="w-full h-48 object-cover rounded-lg mb-3"
                      />
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{product.name}</h3>
                          {product.category_id && categories.find(c => c.id === product.category_id) && (
                            <p className="text-xs text-indigo-600 mt-1">
                              {categories.find(c => c.id === product.category_id).name}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            onClick={() => setEditingProduct({ ...product })}
                            variant="ghost"
                            size="sm"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleRestoreProduct(product.id)}
                            variant="ghost"
                            size="sm"
                            disabled={savingProduct}
                            title="Restore product to active"
                          >
                            <RotateCcw className="h-4 w-4 text-green-600" />
                          </Button>
                        </div>
                      </div>
                      {product.description && (
                        <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-semibold text-gray-900">${Number(product.price).toFixed(2)}</div>
                          <div className="text-xs text-gray-500">
                            Stock: <span className={product.stock_quantity > 0 ? "text-green-600" : "text-red-600"}>
                              {product.stock_quantity}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            value={product.stock_quantity}
                            onChange={(e) => {
                              const newStock = e.target.value;
                              if (newStock !== String(product.stock_quantity)) {
                                handleUpdateStock(product.id, newStock);
                              }
                            }}
                            className="w-20 h-8 text-sm"
                            onBlur={(e) => {
                              if (e.target.value !== String(product.stock_quantity)) {
                                handleUpdateStock(product.id, e.target.value);
                              }
                            }}
                          />
                          <Package className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-amber-600 font-medium">Inactive</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
