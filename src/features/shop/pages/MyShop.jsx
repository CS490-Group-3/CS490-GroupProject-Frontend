import { useEffect, useState } from "react";
import { api } from "../../../shared/api/client.js";
import { Plus, Edit2, X, Save, Trash2, Loader2, Upload, Image as ImageIcon, Calendar, Tag, Package } from "lucide-react";
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
  
  // Promotions state
  const [promotions, setPromotions] = useState([]);
  const [showPromotionForm, setShowPromotionForm] = useState(false);
  const [newPromotion, setNewPromotion] = useState({
    title: "",
    description: "",
    discount_type: "percentage",
    discount_value: "",
    valid_from: "",
    valid_until: "",
    min_purchase_amount: "",
    target_audience: "existing_customers",
  });
  const [savingPromotion, setSavingPromotion] = useState(false);

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
        // Filter out inactive products from cache
        const activeCachedProducts = cachedProducts.filter(p => p.is_active !== false);
        if (activeCachedProducts.length > 0) {
          // Use cached products directly - ProductImage component will refresh filepaths when displaying
          setProducts(activeCachedProducts);
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
      const res = await shopApi.listProducts(salonId);
      console.log("Products response:", res);
      const productsList = res.products || [];
      console.log("Products list:", productsList);
      
      // Filter out inactive products (is_active: false)
      const activeProducts = productsList.filter(p => p.is_active !== false);
      
      // IMPORTANT: Save raw products with filepaths to localStorage (never signed URLs)
      // The backend returns filepaths in image_url - store them as-is
      // Only save active products to localStorage
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

  const handleAddPromotion = async (e) => {
    e.preventDefault();
    if (!salonId) return;
    
    const discount = parseFloat(newPromotion.discount_value);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      alert("Please enter a valid discount percentage (0-100)");
      return;
    }
    
    if (!newPromotion.valid_from || !newPromotion.valid_until) {
      alert("Please select start and end dates");
      return;
    }
    
    if (new Date(newPromotion.valid_from) >= new Date(newPromotion.valid_until)) {
      alert("End date must be after start date");
      return;
    }
    
    if (!newPromotion.title || !newPromotion.description) {
      alert("Please provide a title and description for the promotion");
      return;
    }
    
    setSavingPromotion(true);
    try {
      // Convert dates to ISO strings
      const promotionData = {
        title: newPromotion.title,
        description: newPromotion.description,
        discount_type: newPromotion.discount_type,
        discount_value: discount,
        valid_from: new Date(newPromotion.valid_from).toISOString(),
        valid_until: new Date(newPromotion.valid_until).toISOString(),
        target_audience: newPromotion.target_audience,
      };
      
      if (newPromotion.min_purchase_amount) {
        promotionData.min_purchase_amount = parseFloat(newPromotion.min_purchase_amount);
      }
      
      const result = await shopApi.createPromotion(salonId, promotionData);
      
      // Reload promotions (when endpoint is available)
      // For now, add to local state
      const createdPromotion = {
        id: result.offer_id,
        ...newPromotion,
        discount_value: discount,
      };
      setPromotions([...promotions, createdPromotion]);
      
      setNewPromotion({
        title: "",
        description: "",
        discount_type: "percentage",
        discount_value: "",
        valid_from: "",
        valid_until: "",
        min_purchase_amount: "",
        target_audience: "existing_customers",
      });
      setShowPromotionForm(false);
      alert("Promotion created successfully!");
    } catch (error) {
      console.error("Error creating promotion:", error);
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
      alert("Failed to create promotion: " + errorMessage);
    } finally {
      setSavingPromotion(false);
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.length === 0 && !showProductForm && (
            <div className="col-span-full rounded-xl border bg-gray-50 text-gray-600 p-4 text-sm text-center">
              No products yet. Add your first product above.
            </div>
          )}
          {products.filter(product => product.is_active !== false).map((product) => (
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
                  {!product.is_active && (
                    <div className="mt-2 text-xs text-amber-600">Inactive</div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Promotions Section */}
      <div className="bg-white border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Promotions & Discounts</h2>
          {!showPromotionForm && (
            <Button onClick={() => setShowPromotionForm(true)} size="sm">
              <Tag className="h-4 w-4 mr-2" />
              Schedule Promotion
            </Button>
          )}
        </div>

        {showPromotionForm && (
          <form onSubmit={handleAddPromotion} className="mb-4 p-4 border rounded-lg space-y-4">
            <div>
              <Label>Promotion Title *</Label>
              <Input
                value={newPromotion.title}
                onChange={(e) => setNewPromotion({ ...newPromotion, title: e.target.value })}
                placeholder="e.g., Holiday Blowout Sale"
                required
              />
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea
                value={newPromotion.description}
                onChange={(e) => setNewPromotion({ ...newPromotion, description: e.target.value })}
                rows={3}
                placeholder="e.g., 20% off all services this weekend!"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount (%) *</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={newPromotion.discount_value}
                  onChange={(e) => setNewPromotion({ ...newPromotion, discount_value: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Min Purchase Amount ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newPromotion.min_purchase_amount}
                  onChange={(e) => setNewPromotion({ ...newPromotion, min_purchase_amount: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={newPromotion.valid_from}
                  onChange={(e) => setNewPromotion({ ...newPromotion, valid_from: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>End Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={newPromotion.valid_until}
                  onChange={(e) => setNewPromotion({ ...newPromotion, valid_until: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label>Target Audience *</Label>
              <select
                value={newPromotion.target_audience}
                onChange={(e) => setNewPromotion({ ...newPromotion, target_audience: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="existing_customers">Existing Customers</option>
                <option value="all_users">All Users</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={savingPromotion}>
                {savingPromotion ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calendar className="h-4 w-4 mr-2" />}
                Create Promotion
              </Button>
              <Button type="button" variant="outline" onClick={() => {
                setShowPromotionForm(false);
                setNewPromotion({
                  title: "",
                  description: "",
                  discount_type: "percentage",
                  discount_value: "",
                  valid_from: "",
                  valid_until: "",
                  min_purchase_amount: "",
                  target_audience: "existing_customers",
                });
              }}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {promotions.length === 0 && !showPromotionForm ? (
          <div className="text-center py-8 text-gray-600">
            <Tag className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No promotions scheduled yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {promotions.map((promo) => {
              const startDate = new Date(promo.valid_from);
              const endDate = new Date(promo.valid_until);
              const now = new Date();
              const isActive = now >= startDate && now <= endDate;
              const isUpcoming = now < startDate;
              
              return (
                <div key={promo.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{promo.title || "Promotion"}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          isActive ? "bg-green-100 text-green-800" :
                          isUpcoming ? "bg-blue-100 text-blue-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {isActive ? "Active" : isUpcoming ? "Upcoming" : "Expired"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {promo.discount_value}% off
                        {promo.min_purchase_amount && ` (min $${Number(promo.min_purchase_amount).toFixed(2)})`}
                      </p>
                      {promo.description && (
                        <p className="text-xs text-gray-500 mb-2">{promo.description}</p>
                      )}
                      <div className="text-xs text-gray-500 mb-1">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {startDate.toLocaleString()} - {endDate.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        Target: {promo.target_audience === "existing_customers" ? "Existing Customers" : "All Users"}
                      </div>
                    </div>
                    <Button
                      onClick={() => setPromotions(promotions.filter(p => p.id !== promo.id))}
                      variant="ghost"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
