import { useState, useEffect, useMemo } from "react";
import { api } from "../../../shared/api/client.js";
import { Loader2, Package, User, Calendar, DollarSign, ChevronDown, ChevronUp, Search, Filter, X, AlertCircle } from "lucide-react";
import { Badge } from "../../../shared/ui/badge.jsx";
import { Button } from "../../../shared/ui/button.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../shared/ui/select.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../shared/ui/dialog.jsx";
import { Input } from "../../../shared/ui/input.jsx";
import { Label } from "../../../shared/ui/label.jsx";
import { Textarea } from "../../../shared/ui/textarea.jsx";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800"
};

const statusOptions = [
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" }
];

export default function OwnerOrders() {
  const [salonId, setSalonId] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState({});
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  
  // Pagination
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersLimit] = useState(100);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadSalonAndOrders();
  }, []);

  const loadSalonAndOrders = async () => {
    try {
      setLoading(true);
      const res = await api("/salons/mine");
      const salon = res.salon;
      if (salon && salon.id) {
        setSalonId(salon.id);
        await loadOrders(salon.id);
      } else {
        setError("No salon found");
      }
    } catch (err) {
      setError(err.error || err.message || "Failed to load salon");
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async (id, pageNum = ordersPage) => {
    try {
      setLoadingOrders(true);
      setError("");
      const offset = (pageNum - 1) * ordersLimit;
      const res = await api(`/orders/salon/${id}?limit=${ordersLimit}&offset=${offset}`);
      setOrders(res.orders || []);
      setOrdersTotal(res.total_count || res.orders?.length || 0);
    } catch (err) {
      setError(err.error || err.message || "Failed to load orders");
      setOrders([]);
      setOrdersTotal(0);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Filter and search orders
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];
    
    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.order_status === statusFilter);
    }
    
    // Filter by customer search
    if (customerSearch.trim()) {
      const searchLower = customerSearch.toLowerCase();
      filtered = filtered.filter(order => {
        const customer = order.customer || {};
        const name = `${customer.first_name || ""} ${customer.last_name || ""}`.trim().toLowerCase();
        const email = (customer.email || "").toLowerCase();
        return name.includes(searchLower) || email.includes(searchLower);
      });
    }
    
    return filtered;
  }, [orders, statusFilter, customerSearch]);

  // Group orders by status
  const groupedOrders = useMemo(() => {
    const groups = {
      pending: [],
      confirmed: [],
      processing: [],
      shipped: [],
      delivered: [],
      cancelled: []
    };
    
    filteredOrders.forEach(order => {
      const status = order.order_status;
      if (groups[status]) {
        groups[status].push(order);
      }
    });
    
    return groups;
  }, [filteredOrders]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      setUpdatingStatus(prev => ({ ...prev, [orderId]: true }));
      await api(`/orders/${orderId}/status`, {
        method: "PATCH",
        body: { status: newStatus }
      });
      
      // Reload orders to get fresh data
      await loadOrders(salonId);
    } catch (err) {
      setError(err.error || err.message || "Failed to update order status");
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!cancelReason.trim()) {
      setError("Please provide a cancellation reason");
      return;
    }
    
    try {
      setCancelling(true);
      await api(`/orders/${orderId}/cancel-owner`, {
        method: "PATCH",
        body: { reason: cancelReason.trim() }
      });
      
      setShowCancelDialog(null);
      setCancelReason("");
      await loadOrders(salonId);
    } catch (err) {
      setError(err.error || err.message || "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  const toggleOrderExpanded = (orderId) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const getCustomerName = (order) => {
    const customer = order.customer || {};
    if (customer.first_name || customer.last_name) {
      return `${customer.first_name || ""} ${customer.last_name || ""}`.trim();
    }
    return customer.email || "Unknown Customer";
  };

  const renderOrderCard = (order) => {
    const isExpanded = expandedOrders.has(order.id);
    const customerName = getCustomerName(order);
    const isCancelled = order.order_status === "cancelled";
    const canCancel = !isCancelled && (order.order_status === "pending" || order.order_status === "confirmed");

    return (
      <div key={order.id} className="border rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow">
        <div className="p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-semibold text-lg">Order #{order.id.slice(0, 8)}</span>
                <Badge className={statusColors[order.order_status] || "bg-gray-100 text-gray-800"}>
                  {order.order_status}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {customerName}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(order.created_at).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  ${parseFloat(order.total_amount || 0).toFixed(2)}
                </span>
              </div>

              {order.items && order.items.length > 0 && (
                <div className="text-sm text-gray-600 mb-2">
                  {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                </div>
              )}
              
              {/* Loyalty points summary */}
              {(order.loyalty_points_earned > 0 || order.loyalty_points_redeemed > 0) && (
                <div className="flex items-center gap-3 text-sm mt-2">
                  {order.loyalty_points_earned > 0 && (
                    <span className="text-green-700 font-medium">
                      +{order.loyalty_points_earned} pts earned
                    </span>
                  )}
                  {order.loyalty_points_redeemed > 0 && (
                    <span className="text-orange-700 font-medium">
                      -{order.loyalty_points_redeemed} pts redeemed
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {!isCancelled && (
                <Select
                  value={order.order_status}
                  onValueChange={(value) => handleStatusUpdate(order.id, value)}
                  disabled={updatingStatus[order.id]}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.filter(opt => opt.value !== "cancelled").map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {canCancel && (
                <Dialog open={showCancelDialog === order.id} onOpenChange={(open) => {
                  if (!open) {
                    setShowCancelDialog(null);
                    setCancelReason("");
                  } else {
                    setShowCancelDialog(order.id);
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      Cancel Order
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cancel Order</DialogTitle>
                      <DialogDescription>
                        Please provide a reason for cancelling this order. The customer will be refunded and any loyalty points will be removed.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="cancel-reason">Cancellation Reason *</Label>
                        <Textarea
                          id="cancel-reason"
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          placeholder="Enter reason for cancellation..."
                          rows={4}
                          className="mt-2"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowCancelDialog(null);
                          setCancelReason("");
                        }}
                        disabled={cancelling}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={cancelling || !cancelReason.trim()}
                      >
                        {cancelling ? "Cancelling..." : "Confirm Cancellation"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleOrderExpanded(order.id)}
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {isExpanded && (
            <div className="mt-4 pt-4 border-t space-y-4">
              {order.items && order.items.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Items:</h3>
                  <div className="space-y-2">
                    {order.items.map((item) => {
                      const product = item.products || {};
                      return (
                        <div key={item.id} className="flex justify-between items-center text-sm bg-gray-50 p-3 rounded">
                          <div>
                            <div className="font-medium">{product.name || "Product"}</div>
                            <div className="text-gray-600">Quantity: {item.quantity}</div>
                          </div>
                          <span className="font-medium">
                            ${parseFloat(item.subtotal || 0).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Subtotal:</span>
                  <span className="ml-2">${parseFloat(order.subtotal || 0).toFixed(2)}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Tax:</span>
                  <span className="ml-2">${parseFloat(order.tax || 0).toFixed(2)}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Shipping:</span>
                  <span className="ml-2">${parseFloat(order.shipping_cost || 0).toFixed(2)}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Total:</span>
                  <span className="ml-2 font-semibold">${parseFloat(order.total_amount || 0).toFixed(2)}</span>
                </div>
              </div>

              {order.shipping_address && order.shipping_address !== "PICKUP" && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Shipping Address:</span>
                  <p className="text-gray-600 mt-1">{order.shipping_address}</p>
                </div>
              )}
              {order.shipping_address === "PICKUP" && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Delivery Method:</span>
                  <span className="ml-2 text-gray-600">Pickup</span>
                </div>
              )}

              {order.customer?.email && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Customer Email:</span>
                  <span className="ml-2 text-gray-600">{order.customer.email}</span>
                </div>
              )}

              {/* Detailed Loyalty Points Information */}
              {(order.loyalty_points_earned > 0 || order.loyalty_points_redeemed > 0) && (
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Loyalty Points</h3>
                  <div className="space-y-1 text-sm">
                    {order.loyalty_points_earned > 0 && (
                      <div className="text-green-700">
                        <span className="font-medium">+{order.loyalty_points_earned}</span> points earned
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
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error && !orders.length) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  const statusGroups = [
    { key: "pending", label: "Pending", color: "yellow" },
    { key: "confirmed", label: "Confirmed", color: "blue" },
    { key: "processing", label: "Processing", color: "purple" },
    { key: "shipped", label: "Shipped", color: "indigo" },
    { key: "delivered", label: "Delivered", color: "green" },
    { key: "cancelled", label: "Cancelled", color: "red" }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Orders</h1>
        <p className="text-gray-600">Manage and update order status</p>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="customer-search" className="mb-2 block">Search Customer</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="customer-search"
                type="text"
                placeholder="Search by name or email..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="pl-10"
              />
              {customerSearch && (
                <button
                  onClick={() => setCustomerSearch("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          
          <div>
            <Label htmlFor="status-filter" className="mb-2 block">Filter by Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statusGroups.map((group) => (
                  <SelectItem key={group.key} value={group.key}>
                    {group.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {(customerSearch || statusFilter !== "all") && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
            <Filter className="h-4 w-4" />
            <span>
              Showing {filteredOrders.length} of {orders.length} orders
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCustomerSearch("");
                setStatusFilter("all");
              }}
              className="h-6 px-2"
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {ordersTotal > ordersLimit && (
        <div className="flex items-center justify-between bg-white p-4 rounded-lg border mb-4">
          <div className="text-sm text-gray-600">
            Showing {(ordersPage - 1) * ordersLimit + 1} to {Math.min(ordersPage * ordersLimit, ordersTotal)} of {ordersTotal} orders
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newPage = ordersPage - 1;
                setOrdersPage(newPage);
                loadOrders(salonId, newPage);
              }}
              disabled={ordersPage === 1 || loadingOrders}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {ordersPage} of {Math.ceil(ordersTotal / ordersLimit)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newPage = ordersPage + 1;
                setOrdersPage(newPage);
                loadOrders(salonId, newPage);
              }}
              disabled={ordersPage >= Math.ceil(ordersTotal / ordersLimit) || loadingOrders}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">
            {orders.length === 0 ? "No orders yet." : "No orders match your filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {statusGroups.map((group) => {
            const groupOrders = groupedOrders[group.key] || [];
            if (groupOrders.length === 0) return null;
            
            return (
              <div key={group.key} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-gray-800">{group.label}</h2>
                  <Badge variant="outline" className="text-gray-600">
                    {groupOrders.length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {groupOrders.map(renderOrderCard)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && orders.length > 0 && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}
    </div>
  );
}
