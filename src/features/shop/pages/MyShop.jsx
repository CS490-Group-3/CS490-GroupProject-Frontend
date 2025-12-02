import { useEffect, useState } from "react";
import { api } from "../../../shared/api/client.js";
import { Plus, Edit2, X, Save, Trash2, Loader2, Upload, Image as ImageIcon, Calendar, Tag, Package } from "lucide-react";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Textarea } from "../../../shared/ui/textarea";

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
    sku: "",
    is_active: true,
    image_url: null,
  });
  const [savingProduct, setSavingProduct] = useState(false);
  const [productImageFile, setProductImageFile] = useState(null);
  const [productImagePreview, setProductImagePreview] = useState(null);
  
  // Promotions state
  const [promotions, setPromotions] = useState([]);
  const [showPromotionForm, setShowPromotionForm] = useState(false);
  const [newPromotion, setNewPromotion] = useState({
    product_id: "",
    discount_percent: "",
    start_date: "",
    end_date: "",
    description: "",
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
        setSalonId(salonData.id);
        // TODO: Load products when endpoint is available
        // const productsRes = await api(`/salons/${salonData.id}/products`);
        // setProducts(productsRes.products || []);
        
        // Mock data for now
        setProducts([
          {
            id: 1,
            name: "Premium Hair Pomade",
            description: "High-hold styling pomade for all hair types",
            price: 24.99,
            stock_quantity: 45,
            sku: "POM-001",
            is_active: true,
            image_url: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400",
          },
          {
            id: 2,
            name: "Beard Oil - Sandalwood",
            description: "Nourishing beard oil with natural sandalwood scent",
            price: 18.99,
            stock_quantity: 32,
            sku: "BO-002",
            is_active: true,
            image_url: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400",
          },
        ]);
      }
    } catch (err) {
      console.error("Error loading salon:", err);
    } finally {
      setLoading(false);
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
    
    const price = parseFloat(newProduct.price);
    const stock = parseInt(newProduct.stock_quantity);
    
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
      // TODO: Upload image first if productImageFile exists
      // const imageUrl = await uploadProductImage(productImageFile);
      
      // TODO: Create product when endpoint is available
      // const productData = {
      //   salon_id: salonId,
      //   name: newProduct.name,
      //   description: newProduct.description || "",
      //   price: price,
      //   stock_quantity: stock,
      //   sku: newProduct.sku || "",
      //   is_active: newProduct.is_active,
      //   image_url: imageUrl || productImagePreview,
      // };
      // const created = await api(`/salons/${salonId}/products`, {
      //   method: "POST",
      //   body: JSON.stringify(productData),
      // });
      
      // Mock: Add to local state
      const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
      const createdProduct = {
        id: newId,
        ...newProduct,
        price: price,
        stock_quantity: stock,
        image_url: productImagePreview || newProduct.image_url,
      };
      setProducts([...products, createdProduct]);
      
      setNewProduct({
        name: "",
        description: "",
        price: "",
        stock_quantity: "",
        sku: "",
        is_active: true,
        image_url: null,
      });
      setProductImageFile(null);
      setProductImagePreview(null);
      setShowProductForm(false);
      alert("Product added successfully!");
    } catch (error) {
      alert("Failed to add product: " + (error.message || "Unknown error"));
    } finally {
      setSavingProduct(false);
    }
  };

  const handleUpdateProduct = async (productId) => {
    if (!salonId || !editingProduct) return;
    setSavingProduct(true);
    try {
      const price = parseFloat(editingProduct.price);
      const stock = parseInt(editingProduct.stock_quantity);
      
      // TODO: Update product when endpoint is available
      // const productData = {
      //   name: editingProduct.name,
      //   description: editingProduct.description || "",
      //   price: price,
      //   stock_quantity: stock,
      //   sku: editingProduct.sku || "",
      //   is_active: editingProduct.is_active,
      // };
      // if (productImageFile) {
      //   productData.image_url = await uploadProductImage(productImageFile);
      // }
      // await api(`/salons/${salonId}/products/${productId}`, {
      //   method: "PATCH",
      //   body: JSON.stringify(productData),
      // });
      
      // Mock: Update local state
      setProducts(products.map(p => 
        p.id === productId 
          ? { 
              ...p, 
              ...editingProduct, 
              price: price, 
              stock_quantity: stock,
              image_url: productImagePreview || editingProduct.image_url || p.image_url,
            }
          : p
      ));
      
      setEditingProduct(null);
      setProductImageFile(null);
      setProductImagePreview(null);
      alert("Product updated successfully!");
    } catch (error) {
      alert("Failed to update product: " + (error.message || "Unknown error"));
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!salonId) return;
    if (!confirm("Are you sure you want to delete this product?")) return;
    
    setSavingProduct(true);
    try {
      // TODO: Delete product when endpoint is available
      // await api(`/salons/${salonId}/products/${productId}`, {
      //   method: "DELETE",
      // });
      
      // Mock: Remove from local state
      setProducts(products.filter(p => p.id !== productId));
      alert("Product deleted successfully!");
    } catch (error) {
      alert("Failed to delete product: " + (error.message || "Unknown error"));
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
      // TODO: Update stock when endpoint is available
      // await api(`/salons/${salonId}/products/${productId}/stock`, {
      //   method: "PATCH",
      //   body: JSON.stringify({ stock_quantity: stock }),
      // });
      
      // Mock: Update local state
      setProducts(products.map(p => 
        p.id === productId ? { ...p, stock_quantity: stock } : p
      ));
      alert("Stock updated successfully!");
    } catch (error) {
      alert("Failed to update stock: " + (error.message || "Unknown error"));
    }
  };

  const handleAddPromotion = async (e) => {
    e.preventDefault();
    if (!salonId) return;
    
    const discount = parseFloat(newPromotion.discount_percent);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      alert("Please enter a valid discount percentage (0-100)");
      return;
    }
    
    if (!newPromotion.start_date || !newPromotion.end_date) {
      alert("Please select start and end dates");
      return;
    }
    
    if (new Date(newPromotion.start_date) >= new Date(newPromotion.end_date)) {
      alert("End date must be after start date");
      return;
    }
    
    setSavingPromotion(true);
    try {
      // TODO: Create promotion when endpoint is available
      // const promotionData = {
      //   product_id: newPromotion.product_id,
      //   discount_percent: discount,
      //   start_date: newPromotion.start_date,
      //   end_date: newPromotion.end_date,
      //   description: newPromotion.description || "",
      // };
      // await api(`/salons/${salonId}/promotions`, {
      //   method: "POST",
      //   body: JSON.stringify(promotionData),
      // });
      
      // Mock: Add to local state
      const newId = promotions.length > 0 ? Math.max(...promotions.map(p => p.id)) + 1 : 1;
      const createdPromotion = {
        id: newId,
        ...newPromotion,
        discount_percent: discount,
        product_name: products.find(p => p.id === parseInt(newPromotion.product_id))?.name || "Unknown",
      };
      setPromotions([...promotions, createdPromotion]);
      
      setNewPromotion({
        product_id: "",
        discount_percent: "",
        start_date: "",
        end_date: "",
        description: "",
      });
      setShowPromotionForm(false);
      alert("Promotion created successfully!");
    } catch (error) {
      alert("Failed to create promotion: " + (error.message || "Unknown error"));
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
              <div>
                <Label>SKU</Label>
                <Input
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                  placeholder="Optional"
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
                  sku: "",
                  is_active: true,
                  image_url: null,
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
          {products.map((product) => (
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
                    <Label>SKU</Label>
                    <Input
                      value={editingProduct.sku || ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    />
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
                  {product.image_url && (
                    <img src={product.image_url} alt={product.name} className="w-full h-48 object-cover rounded-lg mb-3" />
                  )}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{product.name}</h3>
                      {product.sku && <p className="text-xs text-gray-500">SKU: {product.sku}</p>}
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
              <Label>Product *</Label>
              <select
                value={newPromotion.product_id}
                onChange={(e) => setNewPromotion({ ...newPromotion, product_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Select a product</option>
                {products.filter(p => p.is_active).map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - ${Number(product.price).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount (%) *</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={newPromotion.discount_percent}
                  onChange={(e) => setNewPromotion({ ...newPromotion, discount_percent: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={newPromotion.start_date}
                  onChange={(e) => setNewPromotion({ ...newPromotion, start_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label>End Date *</Label>
              <Input
                type="date"
                value={newPromotion.end_date}
                onChange={(e) => setNewPromotion({ ...newPromotion, end_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newPromotion.description}
                onChange={(e) => setNewPromotion({ ...newPromotion, description: e.target.value })}
                rows={2}
                placeholder="Promotion description (optional)"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={savingPromotion}>
                {savingPromotion ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calendar className="h-4 w-4 mr-2" />}
                Create Promotion
              </Button>
              <Button type="button" variant="outline" onClick={() => {
                setShowPromotionForm(false);
                setNewPromotion({
                  product_id: "",
                  discount_percent: "",
                  start_date: "",
                  end_date: "",
                  description: "",
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
              const startDate = new Date(promo.start_date);
              const endDate = new Date(promo.end_date);
              const now = new Date();
              const isActive = now >= startDate && now <= endDate;
              const isUpcoming = now < startDate;
              
              return (
                <div key={promo.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{promo.product_name}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          isActive ? "bg-green-100 text-green-800" :
                          isUpcoming ? "bg-blue-100 text-blue-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {isActive ? "Active" : isUpcoming ? "Upcoming" : "Expired"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {promo.discount_percent}% off
                      </p>
                      {promo.description && (
                        <p className="text-xs text-gray-500 mb-2">{promo.description}</p>
                      )}
                      <div className="text-xs text-gray-500">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
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
