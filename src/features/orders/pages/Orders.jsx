import { useState, useEffect } from "react";
import { api } from "../../../shared/api/client.js";
import { Loader2, Package, MapPin, Calendar, DollarSign, X, Image as ImageIcon, Gift } from "lucide-react";
import { Badge } from "../../../shared/ui/badge.jsx";
import { Button } from "../../../shared/ui/button.jsx";
import * as shopApi from "../../shop/api.js";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800"
};

// Component to display product image
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
        <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
      </div>
    );
  }
  
  if (!displayUrl) {
    return (
      <div className={`${className} bg-gray-200 flex items-center justify-center`}>
        <ImageIcon className="h-6 w-6 text-gray-400" />
      </div>
    );
  }
  
  return (
    <img src={displayUrl} alt={alt} className={className} />
  );
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingOrderId, setCancellingOrderId] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api("/orders");
      // Backend already sorts by date (most recent first)
      setOrders(res.orders || []);
    } catch (err) {
      setError(err.error || err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!confirm("Are you sure you want to cancel this order? Your payment will be refunded and any loyalty points earned will be removed.")) {
      return;
    }

    try {
      setCancellingOrderId(orderId);
      await api(`/orders/${orderId}/cancel`, {
        method: "PATCH",
        body: { reason: "Customer requested cancellation" }
      });
      
      // Reload orders
      await loadOrders();
    } catch (err) {
      alert(err.error || err.message || "Failed to cancel order");
    } finally {
      setCancellingOrderId(null);
    }
  };

  // Separate orders into active and cancelled
  const activeOrders = orders.filter(order => order.order_status !== "cancelled");
  const cancelledOrders = orders.filter(order => order.order_status === "cancelled");

  // Group orders by salon
  const groupOrdersBySalon = (ordersList) => {
    return ordersList.reduce((acc, order) => {
      const salonId = order.salon_id;
      const salonName = order.salon?.name || "Unknown Salon";
      
      if (!acc[salonId]) {
        acc[salonId] = {
          salon: order.salon || { id: salonId, name: salonName },
          orders: []
        };
      }
      acc[salonId].orders.push(order);
      return acc;
    }, {});
  };

  const activeOrdersBySalon = groupOrdersBySalon(activeOrders);
  const cancelledOrdersBySalon = groupOrdersBySalon(cancelledOrders);

  const canCancelOrder = (order) => {
    return order.order_status === "pending" || order.order_status === "confirmed";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  const renderOrderCard = (order) => {
    return (
      <div key={order.id} className="p-6 hover:bg-gray-50 transition-colors border-b last:border-b-0">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-semibold text-lg">Order #{order.id.slice(0, 8)}</span>
              <Badge className={statusColors[order.order_status] || "bg-gray-100 text-gray-800"}>
                {order.order_status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                ${parseFloat(order.total_amount || 0).toFixed(2)}
              </span>
            </div>
          </div>
          {canCancelOrder(order) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCancelOrder(order.id)}
              disabled={cancellingOrderId === order.id}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {cancellingOrderId === order.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </>
              )}
            </Button>
          )}
        </div>

        {order.items && order.items.length > 0 && (
          <div className="mt-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Items:</h3>
            {order.items.map((item) => {
              const product = item.products || {};
              const productImageUrl = product.image_url;
              
              return (
                <div key={item.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                  <ProductImage
                    imageUrl={productImageUrl}
                    alt={product.name || "Product"}
                    className="w-16 h-16 object-cover rounded border"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{product.name || "Product"}</div>
                    <div className="text-xs text-gray-600">Quantity: {item.quantity}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm">${parseFloat(item.subtotal || 0).toFixed(2)}</div>
                    <div className="text-xs text-gray-500">${parseFloat(item.unit_price || 0).toFixed(2)} each</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {order.shipping_address && order.shipping_address !== "PICKUP" && (
          <div className="mt-4 text-sm text-gray-600">
            <span className="font-medium">Shipping:</span> {order.shipping_address}
          </div>
        )}
        {order.shipping_address === "PICKUP" && (
          <div className="mt-4 text-sm text-gray-600">
            <span className="font-medium">Delivery Method:</span> Pickup
          </div>
        )}

        {/* Loyalty Points Information */}
        {(order.loyalty_points_earned > 0 || order.loyalty_points_redeemed > 0 || order.loyalty_points_pending > 0) && (
          <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="h-4 w-4 text-indigo-600" />
              <span className="font-medium text-sm text-indigo-900">Loyalty Points</span>
            </div>
            <div className="space-y-1 text-sm">
              {order.loyalty_points_earned > 0 && (
                <div className="text-green-700">
                  <span className="font-medium">+{order.loyalty_points_earned}</span> points earned
                </div>
              )}
              {order.loyalty_points_pending > 0 && (
                <div className="text-amber-700">
                  <span className="font-medium">{order.loyalty_points_pending}</span> points pending (on delivery)
                </div>
              )}
              {order.loyalty_points_redeemed > 0 && (
                <div className="text-orange-700">
                  <span className="font-medium">-{order.loyalty_points_redeemed}</span> points redeemed
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSalonSection = (salon, salonOrders, title) => (
    <div key={salon.id} className="border rounded-lg overflow-hidden mb-6">
      <div className="bg-gray-50 px-6 py-4 border-b">
        <h2 className="text-xl font-semibold">{salon.name}</h2>
        {salon.address && (
          <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {salon.address}
            {salon.city && salon.state && `, ${salon.city}, ${salon.state}`}
          </p>
        )}
      </div>
      
      <div className="divide-y">
        {salonOrders.map(renderOrderCard)}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">My Orders</h1>
        <p className="text-gray-600">View all your orders organized by salon</p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">You haven't placed any orders yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Orders */}
          {Object.keys(activeOrdersBySalon).length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Active Orders</h2>
              {Object.values(activeOrdersBySalon).map(({ salon, orders: salonOrders }) =>
                renderSalonSection(salon, salonOrders, "Active")
              )}
            </div>
          )}

          {/* Cancelled Orders */}
          {Object.keys(cancelledOrdersBySalon).length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-gray-600">Cancelled Orders</h2>
              {Object.values(cancelledOrdersBySalon).map(({ salon, orders: salonOrders }) =>
                renderSalonSection(salon, salonOrders, "Cancelled")
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
