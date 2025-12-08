import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Loader2, Trash2, Plus, Minus, ArrowLeft, Check } from "lucide-react";
import * as shopApi from "../api.js";
import { useAuth } from "../../auth/auth-provider.jsx";
import PaymentModal from "../../payments/components/PaymentModal.jsx";

// Component to display product image - refreshes signed URL from filepath
function ProductImage({ imageUrl, alt, className }) {
  const [displayUrl, setDisplayUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!imageUrl) {
      setLoading(false);
      return;
    }
    
    if (imageUrl.startsWith("http")) {
      setDisplayUrl(imageUrl);
      setLoading(false);
      return;
    }
    
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
        <div className="text-gray-400 text-xs">No Image</div>
      </div>
    );
  }
  
  return (
    <img src={displayUrl} alt={alt} className={className} />
  );
}

export default function Cart() {
  const { salonId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [cart, setCart] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [products, setProducts] = useState({}); // product_id -> product data
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  // Load cart and items
  useEffect(() => {
    if (!salonId || !user) {
      navigate("/auth/sign-in");
      return;
    }
    
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        // Get cart for this salon
        const cartData = await shopApi.getCart(salonId);
        
        if (!alive) return;
        
        if (cartData.cart) {
          setCart(cartData.cart);
          // Load cart items
          const itemsRes = await shopApi.getCartItems(cartData.cart.id);
          setCartItems(itemsRes.items || []);
          
          // Load product details for each item
          const productPromises = (itemsRes.items || []).map(item =>
            shopApi.getProduct(item.product_id)
              .then(res => ({ id: item.product_id, product: res.product }))
              .catch(err => {
                console.error(`Error loading product ${item.product_id}:`, err);
                return null;
              })
          );
          
          const productResults = await Promise.all(productPromises);
          const productsMap = {};
          productResults.forEach(result => {
            if (result) {
              productsMap[result.id] = result.product;
            }
          });
          setProducts(productsMap);
        } else if (cartData.carts && cartData.carts.length > 0) {
          // Find cart for this salon
          const salonCart = cartData.carts.find(c => c.salon_id === salonId);
          if (salonCart) {
            setCart(salonCart);
            const itemsRes = await shopApi.getCartItems(salonCart.id);
            setCartItems(itemsRes.items || []);
            
            // Load product details
            const productPromises = (itemsRes.items || []).map(item =>
              shopApi.getProduct(item.product_id)
                .then(res => ({ id: item.product_id, product: res.product }))
                .catch(err => {
                  console.error(`Error loading product ${item.product_id}:`, err);
                  return null;
                })
            );
            
            const productResults = await Promise.all(productPromises);
            const productsMap = {};
            productResults.forEach(result => {
              if (result) {
                productsMap[result.id] = result.product;
              }
            });
            setProducts(productsMap);
          }
        }
      } catch (err) {
        console.error("Error loading cart:", err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [salonId, user, navigate]);

  const handleUpdateQuantity = async (item, newQuantity) => {
    if (newQuantity < 1) {
      handleRemoveItem(item);
      return;
    }
    
    setUpdating({ [item.id]: true });
    try {
      await shopApi.updateCartItem(cart.id, item.id, {
        quantity: newQuantity
      });
      
      // Refresh cart items
      const itemsRes = await shopApi.getCartItems(cart.id);
      setCartItems(itemsRes.items || []);
    } catch (err) {
      console.error("Error updating cart item:", err);
      alert("Failed to update quantity: " + (err.message || "Unknown error"));
    } finally {
      setUpdating({});
    }
  };

  const handleRemoveItem = async (item) => {
    setUpdating({ [item.id]: true });
    try {
      await shopApi.removeCartItem(cart.id, item.id);
      
      // Refresh cart items
      const itemsRes = await shopApi.getCartItems(cart.id);
      setCartItems(itemsRes.items || []);
    } catch (err) {
      console.error("Error removing cart item:", err);
      alert("Failed to remove item: " + (err.message || "Unknown error"));
    } finally {
      setUpdating({});
    }
  };

  const handleCheckout = () => {
    if (!cart || cartItems.length === 0) return;
    // First checkout the cart (changes status to pending/confirmed)
    // Then show payment modal
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (paymentResult) => {
    try {
      // After payment succeeds, checkout the cart if not already done
      await shopApi.checkoutCart(cart.id);
      setCheckoutSuccess(true);
      setShowPaymentModal(false);
      
      // Redirect after a moment
      setTimeout(() => {
        navigate("/orders");
      }, 2000);
    } catch (err) {
      console.error("Error completing checkout:", err);
      // Payment succeeded but checkout failed - still show success
      setCheckoutSuccess(true);
      setShowPaymentModal(false);
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => {
      const product = products[item.product_id];
      const price = product ? Number(product.price || 0) : Number(item.unit_price || 0);
      return sum + (price * (item.quantity || 0));
    }, 0);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (!cart || cartItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Link
          to={`/store/${salonId}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Store
        </Link>
        
        <div className="bg-white border rounded-xl p-12 text-center">
          <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Add some products to get started!</p>
          <Link
            to={`/store/${salonId}`}
            className="inline-block px-6 py-2 bg-black text-white rounded-lg hover:opacity-90"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (checkoutSuccess) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-12 text-center">
          <Check className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2 text-green-900">Order Placed Successfully!</h2>
          <p className="text-gray-600">Redirecting to your orders...</p>
        </div>
      </div>
    );
  }

  const total = calculateTotal();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Link
        to={`/store/${salonId}`}
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Store
      </Link>

      <h1 className="text-3xl font-bold">Shopping Cart</h1>

      {/* Cart Items */}
      <div className="bg-white border rounded-xl divide-y">
        {cartItems.map((item) => {
          const product = products[item.product_id];
          const isUpdating = updating[item.id];
          const price = product ? Number(product.price || 0) : Number(item.unit_price || 0);
          const itemTotal = price * (item.quantity || 0);
          
          return (
            <div key={item.id} className="p-4 flex gap-4">
              <ProductImage
                imageUrl={product?.image_url}
                alt={product?.name || "Product"}
                className="w-24 h-24 object-cover rounded-lg"
              />
              
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  {product?.name || "Product"}
                </h3>
                {product?.description && (
                  <p className="text-sm text-gray-600 line-clamp-1">
                    {product.description}
                  </p>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateQuantity(item, (item.quantity || 0) - 1)}
                      disabled={isUpdating}
                      className="p-1 rounded border hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="px-3 py-1 border rounded min-w-[3rem] text-center">
                      {isUpdating ? (
                        <Loader2 className="h-4 w-4 animate-spin inline" />
                      ) : (
                        item.quantity || 0
                      )}
                    </span>
                    <button
                      onClick={() => handleUpdateQuantity(item, (item.quantity || 0) + 1)}
                      disabled={isUpdating}
                      className="p-1 rounded border hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-semibold">
                      ${itemTotal.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">
                      ${price.toFixed(2)} each
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleRemoveItem(item)}
                    disabled={isUpdating}
                    className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Order Summary */}
      <div className="bg-white border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Tax</span>
            <span>Calculated at checkout</span>
          </div>
          <div className="border-t pt-2 flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
        
        <button
          onClick={handleCheckout}
          disabled={cartItems.length === 0}
          className="w-full py-3 bg-black text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Proceed to Payment
        </button>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && cart && (
        <PaymentModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          orderId={cart.id}
          amount={total}
          salonId={salonId}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

