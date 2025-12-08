import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Loader2, Image as ImageIcon, Plus, Minus } from "lucide-react";
import { api } from "../../../shared/api/client.js";
import * as shopApi from "../api.js";
import { useAuth } from "../../auth/auth-provider.jsx";

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

export default function CustomerStore() {
  const { salonId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [salon, setSalon] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [addingToCart, setAddingToCart] = useState({});
  const [cartItemCount, setCartItemCount] = useState(0);

  // Load salon info
  useEffect(() => {
    if (!salonId) return;
    
    let alive = true;
    (async () => {
      try {
        const salonData = await api(`/salons/${salonId}`);
        if (alive) setSalon(salonData);
      } catch (err) {
        console.error("Error loading salon:", err);
      }
    })();
    return () => { alive = false; };
  }, [salonId]);

  // Load products and categories
  useEffect(() => {
    if (!salonId) return;
    
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          shopApi.listProducts(salonId, selectedCategories),
          shopApi.listCategories(),
        ]);
        
        if (!alive) return;
        
        setProducts(productsRes.products || []);
        setCategories(categoriesRes.categories || []);
      } catch (err) {
        console.error("Error loading products:", err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [salonId, selectedCategories]);

  // Load or create cart
  useEffect(() => {
    if (!salonId || !user) return;
    
    let alive = true;
    (async () => {
      try {
        // Try to get existing cart for this salon
        let cartData;
        try {
          cartData = await shopApi.getCart(salonId);
          if (cartData.cart) {
            setCart(cartData.cart);
            // Load cart items
            const itemsRes = await shopApi.getCartItems(cartData.cart.id);
            if (alive) {
              setCartItems(itemsRes.items || []);
              setCartItemCount(itemsRes.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0);
            }
          } else if (cartData.carts && cartData.carts.length > 0) {
            // Find cart for this salon
            const salonCart = cartData.carts.find(c => c.salon_id === salonId);
            if (salonCart) {
              setCart(salonCart);
              const itemsRes = await shopApi.getCartItems(salonCart.id);
              if (alive) {
                setCartItems(itemsRes.items || []);
                setCartItemCount(itemsRes.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0);
              }
            }
          }
        } catch (err) {
          // No cart exists yet, that's fine
          console.log("No existing cart found");
        }
      } catch (err) {
        console.error("Error loading cart:", err);
      }
    })();
    return () => { alive = false; };
  }, [salonId, user]);

  const toggleCategory = (categoryId) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleAddToCart = async (product) => {
    if (!user) {
      navigate("/auth/sign-in");
      return;
    }

    if (!cart) {
      // Create a new order (cart) first
      try {
        const newOrder = await shopApi.createOrder({ salon_id: salonId });
        setCart(newOrder.order);
        
        // Add item to the new cart
        setAddingToCart({ [product.id]: true });
        const item = await shopApi.addCartItem(newOrder.order.id, product.id, 1);
        setAddingToCart({});
        
        // Refresh cart items
        const itemsRes = await shopApi.getCartItems(newOrder.order.id);
        setCartItems(itemsRes.items || []);
        setCartItemCount(itemsRes.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0);
      } catch (err) {
        console.error("Error creating cart:", err);
        setAddingToCart({});
        alert("Failed to add item to cart: " + (err.message || "Unknown error"));
      }
    } else {
      // Check if item already exists in cart
      const existingItem = cartItems.find(item => item.product_id === product.id);
      
      if (existingItem) {
        // Update quantity
        try {
          setAddingToCart({ [product.id]: true });
          await shopApi.updateCartItem(cart.id, existingItem.id, {
            quantity: (existingItem.quantity || 0) + 1
          });
          setAddingToCart({});
          
          // Refresh cart items
          const itemsRes = await shopApi.getCartItems(cart.id);
          setCartItems(itemsRes.items || []);
          setCartItemCount(itemsRes.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0);
        } catch (err) {
          console.error("Error updating cart item:", err);
          setAddingToCart({});
          alert("Failed to update cart: " + (err.message || "Unknown error"));
        }
      } else {
        // Add new item
        try {
          setAddingToCart({ [product.id]: true });
          await shopApi.addCartItem(cart.id, product.id, 1);
          setAddingToCart({});
          
          // Refresh cart items
          const itemsRes = await shopApi.getCartItems(cart.id);
          setCartItems(itemsRes.items || []);
          setCartItemCount(itemsRes.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0);
        } catch (err) {
          console.error("Error adding to cart:", err);
          setAddingToCart({});
          alert("Failed to add item to cart: " + (err.message || "Unknown error"));
        }
      }
    }
  };

  const activeProducts = useMemo(() => {
    return products.filter(p => p.is_active !== false);
  }, [products]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-red-600">Salon not found.</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/browse" className="text-sm text-gray-600 hover:text-gray-900">
            &larr; Back to salons
          </Link>
          <h1 className="text-3xl font-bold mt-2">{salon.name} Store</h1>
          {salon.address && (
            <p className="text-gray-600 mt-1">📍 {salon.address}</p>
          )}
        </div>
        {user && (
          <Link
            to={`/store/${salonId}/cart`}
            className="relative flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:opacity-90"
          >
            <ShoppingCart className="h-5 w-5" />
            <span>Cart</span>
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </Link>
        )}
      </div>

      {/* Categories Filter */}
      {categories.length > 0 && (
        <div className="bg-white border rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">Filter by Category</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => toggleCategory(category.id)}
                className={`px-3 py-1 rounded-full text-sm border transition ${
                  selectedCategories.includes(category.id)
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
          {selectedCategories.length > 0 && (
            <button
              onClick={() => setSelectedCategories([])}
              className="mt-3 text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Products Grid */}
      <div>
        {activeProducts.length === 0 ? (
          <div className="bg-white border rounded-xl p-12 text-center">
            <p className="text-gray-600">No products available at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeProducts.map((product) => {
              const isAdding = addingToCart[product.id];
              const cartItem = cartItems.find(item => item.product_id === product.id);
              const inCart = !!cartItem;
              
              return (
                <div
                  key={product.id}
                  className="bg-white border rounded-xl overflow-hidden hover:shadow-lg transition"
                >
                  <ProductImage
                    imageUrl={product.image_url}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4 space-y-2">
                    <h3 className="font-semibold text-lg">{product.name}</h3>
                    {product.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-lg font-bold">
                        ${Number(product.price || 0).toFixed(2)}
                      </span>
                      {product.stock_quantity !== null && product.stock_quantity !== undefined && (
                        <span className="text-xs text-gray-500">
                          {product.stock_quantity > 0
                            ? `${product.stock_quantity} in stock`
                            : "Out of stock"}
                        </span>
                      )}
                    </div>
                    {user ? (
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={isAdding || (product.stock_quantity !== null && product.stock_quantity <= 0)}
                        className={`w-full mt-3 py-2 px-4 rounded-lg font-medium transition ${
                          isAdding || (product.stock_quantity !== null && product.stock_quantity <= 0)
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : inCart
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-black text-white hover:opacity-90"
                        }`}
                      >
                        {isAdding ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Adding...
                          </span>
                        ) : inCart ? (
                          <span className="flex items-center justify-center gap-2">
                            <span>✓</span> In Cart ({cartItem?.quantity || 0})
                          </span>
                        ) : (
                          "Add to Cart"
                        )}
                      </button>
                    ) : (
                      <Link
                        to="/auth/sign-in"
                        className="block w-full mt-3 py-2 px-4 rounded-lg font-medium bg-black text-white hover:opacity-90 text-center"
                      >
                        Sign in to Add to Cart
                      </Link>
                    )}
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

