import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ShoppingCart, Plus, Minus, Trash2, Loader2, Package, Eye, X } from "lucide-react";
import { Button } from "../../../shared/ui/button";
import { api } from "../../../shared/api/client.js";
import * as shopApi from "../api.js";
import { useAuth } from "../../auth/auth-provider.jsx";
import CheckoutModal from "../components/CheckoutModal.jsx";

export default function SalonShop() {
  const { id: salonId } = useParams();
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartLoading, setCartLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCartPanel, setShowCartPanel] = useState(false);
  const [quantityInput, setQuantityInput] = useState({});
  const [imageMap, setImageMap] = useState({});
  const [pendingQuantities, setPendingQuantities] = useState({}); // Local state for quantity changes in cart panel
  const [productCardPendingQuantities, setProductCardPendingQuantities] = useState({}); // Local state for quantity changes in product cards

  useEffect(() => {
    if (salonId) {
      loadShopData();
      loadCart();
    }
  }, [salonId]);

  // Prevent body scroll when cart panel is open and initialize pending quantities
  useEffect(() => {
    if (showCartPanel) {
      // Save current scroll position and prevent scroll without layout shift
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      // Initialize pending quantities with current cart item quantities
      const pending = {};
      cartItems.forEach(item => {
        pending[item.id] = item.quantity;
      });
      setPendingQuantities(pending);
      
      return () => {
        // Restore scroll position
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    } else {
      setPendingQuantities({});
    }
  }, [showCartPanel, cartItems]);

  const loadShopData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, productsRes] = await Promise.all([
        shopApi.listCategories(),
        shopApi.listProducts(salonId)
      ]);
      
      setCategories(categoriesRes.categories || []);
      const prods = productsRes.products || [];
      setProducts(prods);
      await refreshImages(prods);
    } catch (err) {
      console.error("Error loading shop data:", err);
    } finally {
      setLoading(false);
    }
  };

  const refreshImages = async (prods) => {
    const updates = {};
    await Promise.all(
      prods.map(async (p) => {
        const url = p.image_url;
        if (!url) return;
        if (url.startsWith("http")) {
          updates[p.id] = url;
          return;
        }
        try {
          const res = await shopApi.refreshProductImageUrl(url, "salon-products");
          if (res?.signed_url) {
            updates[p.id] = res.signed_url;
          }
        } catch (e) {
          console.error("Failed to refresh product image URL", p.id, e);
        }
      })
    );
    if (Object.keys(updates).length > 0) {
      setImageMap((prev) => ({ ...prev, ...updates }));
    }
  };

  const loadCart = async () => {
    if (!user || !salonId) return;
    
    try {
      setCartLoading(true);
      const res = await api(`/orders/cart?salon_id=${salonId}`);
      console.log("Cart loaded:", res.cart);
      console.log("Cart items:", res.cart?.items);
      setCart(res.cart);
      // Ensure items is an array
      const items = Array.isArray(res.cart?.items) ? res.cart.items : [];
      setCartItems(items);
    } catch (err) {
      // Silently handle "no cart found" - cart will be created automatically on first add
      const errorMessage = err?.error || err?.message || String(err);
      if (errorMessage.includes("No active cart found") || errorMessage.includes("cart not found")) {
        // This is expected - cart will be created when user adds first item
        setCart(null);
        setCartItems([]);
      } else {
        // Log other errors (actual problems)
        console.error("Error loading cart:", err);
        setCart(null);
        setCartItems([]);
      }
    } finally {
      setCartLoading(false);
    }
  };

  const addToCart = async (productId, quantity = 1) => {
    if (!user) {
      alert("Please log in to add items to cart");
      return;
    }

    try {
      await api("/orders/cart/items", {
        method: "POST",
        body: {
          salon_id: salonId,
          product_id: productId,
          quantity
        }
      });
      
      // Reload cart
      await loadCart();
    } catch (err) {
      console.error("Error adding to cart:", err);
      alert(err.error || "Failed to add item to cart");
    }
  };

  const updateQuantity = async (itemId, newQuantity) => {
    if (!cart) return;

    try {
      await api(`/orders/cart/items/${itemId}`, {
        method: "PATCH",
        body: {
          order_id: cart.id,
          quantity: newQuantity
        }
      });
      
      await loadCart();
    } catch (err) {
      console.error("Error updating quantity:", err);
      alert(err.error || "Failed to update quantity");
    }
  };

  const removeFromCart = async (itemId) => {
    if (!cart) return;

    try {
      await api(`/orders/cart/items/${itemId}?order_id=${cart.id}`, {
        method: "DELETE"
      });
      
      await loadCart();
    } catch (err) {
      console.error("Error removing from cart:", err);
      alert(err.error || "Failed to remove item");
    }
  };

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products;

  const cartTotal = cart?.total_amount || 0;
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ width: '100%', maxWidth: '100%' }}>
      {/* Categories */}
      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg border text-sm ${
              selectedCategory === null
                ? "bg-black text-white border-black"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg border text-sm ${
                selectedCategory === cat.id
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Products Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const cartItem = cartItems.find(item => item.product_id === product.id);
            const inCart = !!cartItem;
            const displayUrl = imageMap[product.id] || product.image_url;
            const stock = product.stock_quantity;
            const maxQty = typeof stock === "number" && stock !== null ? stock : 9999;
            const selectedQty = quantityInput[product.id] ?? 1;
            const pendingQty = productCardPendingQuantities[product.id] ?? (cartItem?.quantity || 1);
            const hasPendingChanges = inCart && pendingQty !== cartItem.quantity;

            return (
              <div key={product.id} className="bg-white border rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                {displayUrl ? (
                  <img
                    src={displayUrl}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <Package className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-lg">{product.name}</h3>
                  {product.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">${parseFloat(product.price).toFixed(2)}</span>
                    {stock !== null && stock !== undefined && (
                      <span className="text-xs text-gray-500">
                        {stock > 0 ? `${stock} in stock` : "Out of stock"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="number"
                      min={1}
                      max={maxQty}
                      value={selectedQty}
                      onChange={(e) => {
                        const val = Math.max(1, Math.min(maxQty, parseInt(e.target.value) || 1));
                        setQuantityInput((prev) => ({ ...prev, [product.id]: val }));
                      }}
                      className="w-20 border rounded px-2 py-1 text-sm"
                      disabled={stock === 0}
                    />
                    <Button
                      onClick={() => addToCart(product.id, Math.max(1, Math.min(maxQty, selectedQty)))}
                      className="flex-1 bg-black text-white hover:opacity-90 disabled:opacity-50"
                      disabled={stock === 0 || cartLoading}
                    >
                      Add to Cart
                    </Button>
                  </div>

                  {inCart && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setProductCardPendingQuantities(prev => ({
                            ...prev,
                            [product.id]: Math.max(1, (prev[product.id] || cartItem.quantity) - 1)
                          }))}
                          className="p-1 rounded border hover:bg-gray-50"
                          disabled={cartLoading}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="flex-1 text-center font-medium">{pendingQty}</span>
                        <button
                          onClick={() => setProductCardPendingQuantities(prev => ({
                            ...prev,
                            [product.id]: Math.min(maxQty, (prev[product.id] || cartItem.quantity) + 1)
                          }))}
                          className="p-1 rounded border hover:bg-gray-50"
                          disabled={cartLoading || (stock !== null && stock !== undefined && pendingQty >= stock)}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        {hasPendingChanges && (
                          <button
                            onClick={async () => {
                              await updateQuantity(cartItem.id, pendingQty);
                              setProductCardPendingQuantities(prev => {
                                const newPending = { ...prev };
                                delete newPending[product.id];
                                return newPending;
                              });
                            }}
                            className="px-2 py-1 text-xs bg-black text-white rounded hover:opacity-90"
                            disabled={cartLoading}
                          >
                            Update
                          </button>
                        )}
                        <button
                          onClick={() => removeFromCart(cartItem.id)}
                          className="p-1 rounded border hover:bg-red-50 text-red-600"
                          disabled={cartLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {hasPendingChanges && (
                        <p className="text-xs text-gray-500 text-center">
                          Current: {cartItem.quantity} → New: {pendingQty}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>No products available in this category.</p>
        </div>
      )}

      {/* Cart Summary (Floating) */}
      {user && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ShoppingCart className="h-5 w-5" />
              <div>
                <div className="font-semibold">{cartItemCount} item{cartItemCount !== 1 ? 's' : ''} in cart</div>
                <div className="text-sm text-gray-600">Total: ${cartTotal.toFixed(2)}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCartPanel(true)}>
                <Eye className="h-4 w-4 mr-2" /> View Cart
              </Button>
              <Button
                onClick={() => setShowCheckout(true)}
                className="bg-black text-white hover:opacity-90"
                disabled={cartItemCount === 0}
              >
                Checkout
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Panel */}
      {showCartPanel && (
        <>
          {/* Backdrop that covers everything including header */}
          <div 
            className="fixed bg-black/40 z-[10000]"
            style={{ 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0,
              margin: 0, 
              padding: 0,
              width: '100vw',
              height: '100vh'
            }}
            onClick={() => setShowCartPanel(false)}
          />
          {/* Cart panel */}
          <div 
            className="fixed bg-white w-full max-w-md shadow-xl z-[10001] flex flex-col"
            style={{
              top: 0,
              right: 0,
              bottom: 0,
              height: '100vh',
              maxHeight: '100vh',
              margin: 0,
              padding: 0
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 flex-1 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <h3 className="font-semibold">Your Cart</h3>
              </div>
              <button
                className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                onClick={() => setShowCartPanel(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {cartItems.length === 0 ? (
              <p className="text-sm text-gray-500">Your cart is empty.</p>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item) => {
                  // Backend returns product data joined in item.products (Supabase foreign key join)
                  const productData = item.products || products.find((p) => p.id === item.product_id);
                  const productName = productData?.name || (typeof productData === 'object' && productData?.name) || "Product";
                  const productImageUrl = productData?.image_url || (typeof productData === 'object' && productData?.image_url);
                  const stock = productData?.stock_quantity || (typeof productData === 'object' && productData?.stock_quantity);
                  const maxQty = typeof stock === "number" && stock !== null ? stock : 9999;
                  
                  // Get pending quantity or current quantity
                  const pendingQty = pendingQuantities[item.id] !== undefined ? pendingQuantities[item.id] : item.quantity;
                  const hasPendingChanges = pendingQty !== item.quantity;
                  
                  // Get image URL (refresh if needed)
                  let displayImageUrl = productImageUrl;
                  if (productImageUrl && !productImageUrl.startsWith("http") && imageMap[productImageUrl]) {
                    displayImageUrl = imageMap[productImageUrl];
                  } else if (productImageUrl && !productImageUrl.startsWith("http")) {
                    // Refresh image URL if not already in map
                    shopApi.refreshProductImageUrl(productImageUrl, "salon-products")
                      .then(res => {
                        if (res?.signed_url) {
                          setImageMap(prev => ({ ...prev, [productImageUrl]: res.signed_url }));
                        }
                      })
                      .catch(e => console.error("Failed to refresh product image:", e));
                  }
                  
                  return (
                    <div key={item.id} className="border rounded-lg p-3">
                      <div className="flex gap-3">
                        {displayImageUrl ? (
                          <img 
                            src={displayImageUrl} 
                            alt={productName}
                            className="w-16 h-16 object-cover rounded border"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded border flex items-center justify-center">
                            <Package className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{productName}</div>
                          <div className="text-sm text-gray-600">${parseFloat(item.unit_price || 0).toFixed(2)} each</div>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => setPendingQuantities(prev => ({
                                ...prev,
                                [item.id]: Math.max(1, (prev[item.id] || item.quantity) - 1)
                              }))}
                              className="p-1 rounded border hover:bg-gray-50"
                              disabled={cartLoading}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={maxQty}
                              value={pendingQty}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                setPendingQuantities(prev => ({
                                  ...prev,
                                  [item.id]: Math.max(1, Math.min(maxQty, val))
                                }));
                              }}
                              className="w-12 text-center border rounded px-1"
                            />
                            <button
                              onClick={() => setPendingQuantities(prev => ({
                                ...prev,
                                [item.id]: Math.min(maxQty, (prev[item.id] || item.quantity) + 1)
                              }))}
                              className="p-1 rounded border hover:bg-gray-50"
                              disabled={cartLoading || (stock !== null && stock !== undefined && pendingQty >= stock)}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            {hasPendingChanges && (
                              <button
                                onClick={async () => {
                                  await updateQuantity(item.id, pendingQty);
                                  setPendingQuantities(prev => {
                                    const newPending = { ...prev };
                                    delete newPending[item.id];
                                    return newPending;
                                  });
                                }}
                                className="px-2 py-1 text-xs bg-black text-white rounded hover:opacity-90"
                                disabled={cartLoading}
                              >
                                Update
                              </button>
                            )}
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="p-1 rounded border hover:bg-red-50 text-red-600 ml-auto"
                              disabled={cartLoading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="text-sm text-gray-700 mt-2">
                            Subtotal: ${(parseFloat(item.unit_price || 0) * pendingQty).toFixed(2)}
                            {hasPendingChanges && (
                              <span className="text-xs text-gray-500 ml-2">(Current: ${(item.subtotal || 0).toFixed(2)})</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="border-t pt-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span>${(cart?.subtotal || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Tax</span><span>${(cart?.tax || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Shipping</span><span>${(cart?.shipping_cost || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between font-semibold text-base"><span>Total</span><span>${cartTotal.toFixed(2)}</span></div>
                </div>

                <Button
                  onClick={() => {
                    setShowCartPanel(false);
                    setShowCheckout(true);
                  }}
                  className="w-full bg-black text-white hover:opacity-90"
                  disabled={cartItemCount === 0}
                >
                  Proceed to Checkout
                </Button>
              </div>
            )}
            </div>
          </div>
        </>
      )}

      {showCheckout && cart && (
        <CheckoutModal
          cart={cart}
          cartItems={cartItems}
          onClose={() => setShowCheckout(false)}
          onSuccess={async () => {
            setShowCheckout(false);
            // Reload cart and products to reflect updated stock quantities
            await Promise.all([
              loadCart(),
              loadShopData()
            ]);
            alert("Order placed successfully!");
          }}
        />
      )}
    </div>
  );
}

