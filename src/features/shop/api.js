import { api } from "../../shared/api/client.js";

/**
 * Product API functions
 * Based on backend PRs #57 and #62
 */

/**
 * List products for a salon
 * Uses query parameters: /api/products?salon_id=<salon_id>&category_id=<category_id1>&category_id=<category_id2>
 * @param {string} salonId - Salon ID (required)
 * @param {string[]} categoryIds - Optional category IDs to filter by
 * @param {boolean} includeInactive - If true, includes inactive products (for salon owners)
 * @returns {Promise<{products: Array}>}
 */
export async function listProducts(salonId, categoryIds = [], includeInactive = false) {
  // Build query string with salon_id (required)
  const params = new URLSearchParams();
  params.append("salon_id", salonId);
  
  // Add category_id parameters only if provided
  // Format: category_id=cat1&category_id=cat2 (multiple params with same name)
  if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
    categoryIds.forEach(categoryId => {
      if (categoryId) {
        params.append("category_id", categoryId);
      }
    });
  }
  
  // Add include_inactive parameter for salon owners
  if (includeInactive) {
    params.append("include_inactive", "true");
  }
  
  // Use standard api() function with query parameters
  return api(`/products?${params.toString()}`);
}

/**
 * Get a single product by ID
 * @param {string} productId - Product ID
 * @returns {Promise<{product: Object}>}
 */
export async function getProduct(productId) {
  return api(`/products/${productId}`);
}

/**
 * Create a new product
 * Note: Backend automatically adds salon_id - DO NOT send it
 * Uses multipart/form-data to support image uploads
 * @param {Object} productData - Product data
 * @param {string} productData.name - Product name
 * @param {string} productData.description - Product description (optional)
 * @param {string|number} productData.price - Product price (as string)
 * @param {number} productData.stock_quantity - Stock quantity (optional)
 * @param {string} productData.category_id - Category ID (optional, UUID or null)
 * @param {File} productData.image - Image file (optional)
 * @param {boolean} productData.is_active - Is active (optional, default: true)
 * @returns {Promise<{product: Object, message: string}>}
 */
export async function createProduct(productData) {
  const formData = new FormData();
  
  // Add all fields to form data
  if (productData.name) formData.append("name", productData.name);
  if (productData.description) formData.append("description", productData.description);
  if (productData.price !== undefined) formData.append("price", String(productData.price));
  if (productData.stock_quantity !== undefined) formData.append("stock_quantity", String(productData.stock_quantity));
  if (productData.category_id) formData.append("category_id", productData.category_id);
  if (productData.is_active !== undefined) formData.append("is_active", String(productData.is_active));
  
  // Add image file if provided
  // Backend expects field name "file" (same as upload endpoint)
  if (productData.image) {
    formData.append("file", productData.image);
  }
  
  const token = localStorage.getItem("access_token");
  const apiUrl = import.meta.env.VITE_API;
  
  const response = await fetch(`${apiUrl}/products/`, {
    method: "POST",
    headers: {
      "Authorization": token ? `Bearer ${token}` : "",
      // Don't set Content-Type - browser will set it with boundary for FormData
    },
    body: formData,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorJson.message || errorText;
    } catch {
      // If not JSON, use the text as-is
    }
    throw new Error(errorMessage);
  }
  
  return response.json();
}

/**
 * Update a product
 * Send only the fields you want to update (all fields optional)
 * If updates.image is a File object, sends as multipart/form-data
 * Otherwise sends as JSON
 * @param {string} productId - Product ID
 * @param {Object} updates - Product updates (all fields optional)
 * @param {File} updates.image - Image file (optional, if provided uses multipart/form-data)
 * @returns {Promise<{product: Object, message: string}>}
 */
export async function updateProduct(productId, updates) {
  // Check if there's an image file to upload
  const hasImage = updates.image && updates.image instanceof File;
  
  if (hasImage) {
    // Use FormData for multipart/form-data
    const formData = new FormData();
    
    // Add all fields except image
    Object.keys(updates).forEach(key => {
      if (key !== 'image' && updates[key] !== undefined && updates[key] !== null) {
        formData.append(key, String(updates[key]));
      }
    });
    
    // Add image file (backend expects field name "file")
    formData.append("file", updates.image);
    
    const token = localStorage.getItem("access_token");
    const apiUrl = import.meta.env.VITE_API;
    
    const response = await fetch(`${apiUrl}/products/${productId}`, {
      method: "PATCH",
      headers: {
        "Authorization": token ? `Bearer ${token}` : "",
        // Don't set Content-Type - browser will set it with boundary for FormData
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorText;
      } catch {
        // If not JSON, use the text as-is
      }
      throw new Error(errorMessage);
    }
    
    return response.json();
  } else {
    // Use regular JSON API call
    return api(`/products/${productId}`, {
      method: "PATCH",
      body: updates, // api() will stringify it
    });
  }
}

/**
 * Refresh signed URL for product image
 * Based on PR #62: Product create returns a filepath that /refresh can use
 * @param {string} filepath - File path returned from product create (e.g., "salon_id/uuid.jpg")
 * @param {string} fileType - File type (default: "salon-products" for products)
 * @returns {Promise<{signed_url: string, message: string}>}
 */
export async function refreshProductImageUrl(filepath, fileType = "salon-products") {
  return api("/uploads/refresh", {
    method: "POST",
    body: {
      filepath,
      file_type: fileType,
    },
  });
}

/**
 * Product Category API functions
 */

/**
 * List all product categories
 * @returns {Promise<{categories: Array}>}
 */
export async function listCategories() {
  return api("/products/categories");
}

/**
 * Create a product category
 * @param {Object} categoryData - Category data
 * @param {string} categoryData.name - Category name
 * @param {string} categoryData.description - Category description (optional)
 * @param {string} categoryData.parent_category_id - Parent category ID (optional, UUID or null)
 * @returns {Promise<{category: Object, message: string}>}
 */
export async function createCategory(categoryData) {
  return api("/products/categories", {
    method: "POST",
    body: categoryData, // api() will stringify it
  });
}

/**
 * Get a product category by ID
 * @param {string} categoryId - Category ID
 * @returns {Promise<{data: Object}>}
 */
export async function getCategory(categoryId) {
  return api(`/products/categories/${categoryId}`);
}

/**
 * Update a product category (admin only)
 * @param {string} categoryId - Category ID
 * @param {Object} updates - Category updates (all fields optional)
 * @param {string} updates.name - Category name
 * @param {string} updates.description - Category description
 * @param {string} updates.parent_category_id - Parent category ID (optional)
 * @returns {Promise<{category: Object, message: string}>}
 */
export async function updateCategory(categoryId, updates) {
  return api(`/products/categories/${categoryId}`, {
    method: "PATCH",
    body: updates,
  });
}

/**
 * Delete a product category (admin only)
 * @param {string} categoryId - Category ID
 * @returns {Promise<{message: string}>}
 */
export async function deleteCategory(categoryId) {
  return api(`/products/categories/${categoryId}`, {
    method: "DELETE",
  });
}

/**
 * Promotion API functions
 */

/**
 * Create a promotional offer for a salon
 * @param {string} salonId - Salon ID
 * @param {Object} promotionData - Promotion data
 * @param {string} promotionData.title - Promotion title
 * @param {string} promotionData.description - Promotion description
 * @param {string} promotionData.discount_type - Discount type ("percentage")
 * @param {number} promotionData.discount_value - Discount value
 * @param {string} promotionData.valid_from - Valid from date (ISO string)
 * @param {string} promotionData.valid_until - Valid until date (ISO string)
 * @param {number} promotionData.min_purchase_amount - Minimum purchase amount (optional)
 * @param {string} promotionData.target_audience - Target audience ("existing_customers" | "all_users")
 * @returns {Promise<{offer_id: string, message: string}>}
 */
export async function createPromotion(salonId, promotionData) {
  return api(`/salons/${salonId}/promotions`, {
    method: "POST",
    body: promotionData, // api() will stringify it
  });
}

/**
 * Order/Cart API functions
 */

/**
 * Get the user's cart for a salon
 * @param {string} salonId - Salon ID
 * @returns {Promise<{cart: Object}>}
 */
export async function getCart(salonId) {
  return api(`/orders/cart?salon_id=${salonId}`);
}

/**
 * Add an item to the cart
 * @param {string} salonId - Salon ID
 * @param {string} productId - Product ID
 * @param {number} quantity - Quantity to add
 * @returns {Promise<{item: Object, message: string}>}
 */
export async function addToCart(salonId, productId, quantity = 1) {
  return api("/orders/cart/items", {
    method: "POST",
    body: {
      salon_id: salonId,
      product_id: productId,
      quantity
    }
  });
}

/**
 * Update cart item quantity
 * @param {string} itemId - Order item ID
 * @param {string} orderId - Order ID
 * @param {number} quantity - New quantity
 * @returns {Promise<{item: Object, message: string}>}
 */
export async function updateCartItem(itemId, orderId, quantity) {
  return api(`/orders/cart/items/${itemId}`, {
    method: "PATCH",
    body: {
      order_id: orderId,
      quantity
    }
  });
}

/**
 * Remove an item from the cart
 * @param {string} itemId - Order item ID
 * @param {string} orderId - Order ID
 * @returns {Promise<{message: string}>}
 */
export async function removeFromCart(itemId, orderId) {
  return api(`/orders/cart/items/${itemId}?order_id=${orderId}`, {
    method: "DELETE"
  });
}

/**
 * Checkout and process payment
 * @param {Object} checkoutData - Checkout data
 * @returns {Promise<{order: Object, payment: Object, message: string}>}
 */
export async function checkout(checkoutData) {
  return api("/orders/checkout", {
    method: "POST",
    body: checkoutData
  });
}

/**
 * Get active promotions for a salon
 * @param {string} salonId - Salon ID
 * @param {number} purchaseAmount - Purchase amount to filter by min_purchase_amount
 * @returns {Promise<{promotions: Array}>}
 */
export async function getActivePromotions(salonId, purchaseAmount = 0, context = null) {
  let url = `/salons/${salonId}/promotions/active?purchase_amount=${purchaseAmount}`;
  if (context) {
    url += `&context=${context}`;
  }
  return api(url);
}