import { useEffect, useState } from "react";
import { api } from "../../../shared/api/client.js";
import { Calendar, DollarSign, TrendingUp, ShoppingBag, Scissors, Loader2, Search, Filter } from "lucide-react";
import { Button } from "../../../shared/ui/button.jsx";
import { Input } from "../../../shared/ui/input.jsx";
import { Label } from "../../../shared/ui/label.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/ui/table.jsx";

export default function Revenue() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [error, setError] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [customRange, setCustomRange] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all"); // all, appointment, order

  useEffect(() => {
    loadRevenue();
    loadPayments();
  }, []);

  const loadRevenue = async (startDate = null, endDate = null) => {
    try {
      setLoading(true);
      setError("");
      
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      
      const url = `/owner/revenue${params.toString() ? `?${params.toString()}` : ""}`;
      const data = await api(url);
      
      setAnalytics(data);
    } catch (err) {
      setError(err.message || "Failed to load revenue analytics");
      console.error("Revenue load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async (startDate = null, endDate = null) => {
    try {
      setLoadingPayments(true);
      
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      
      const url = `/owner/payments${params.toString() ? `?${params.toString()}` : ""}`;
      const data = await api(url);
      
      setPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Payments load error:", err);
      setPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleQuickFilter = (period) => {
    setCustomRange(false);
    setDateRange({ start: "", end: "" });
    
    const now = new Date();
    let startDate = null;
    let endDate = null;
    
    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "quarter":
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case "all":
        startDate = null;
        endDate = null;
        break;
      default:
        return;
    }
    
    if (startDate) {
      loadRevenue(startDate.toISOString(), now.toISOString());
      loadPayments(startDate.toISOString(), now.toISOString());
    } else {
      loadRevenue();
      loadPayments();
    }
  };

  const handleCustomRange = () => {
    if (dateRange.start && dateRange.end) {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999); // End of day
      loadRevenue(start.toISOString(), end.toISOString());
      loadPayments(start.toISOString(), end.toISOString());
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filter payments based on search and type filter
  const filteredPayments = payments.filter((payment) => {
    const matchesSearch = !searchQuery || 
      payment.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.amount.toString().includes(searchQuery);
    
    const matchesType = paymentFilter === "all" || 
      (paymentFilter === "appointment" && payment.type === "appointment") ||
      (paymentFilter === "order" && payment.type === "order");
    
    return matchesSearch && matchesType;
  });

  if (loading && !analytics) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white border rounded-2xl p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <div className="text-gray-600 mt-4">Loading revenue analytics...</div>
        </div>
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white border rounded-2xl p-8 text-center">
          <div className="text-red-600">{error}</div>
          <Button onClick={() => loadRevenue()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const maxMonthlyRevenue = analytics.monthly_breakdown.length > 0
    ? Math.max(...analytics.monthly_breakdown.map(m => m.revenue))
    : 0;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Revenue Dashboard</h1>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-500" />
          <span className="text-sm text-gray-600">
            {analytics.date_range.start || analytics.date_range.end
              ? "Custom Range"
              : "All Time"}
          </span>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="bg-white border rounded-2xl p-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Label className="text-sm font-medium text-gray-700">Quick Filters:</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickFilter("week")}
          >
            Past Week
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickFilter("month")}
          >
            This Month
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickFilter("quarter")}
          >
            This Quarter
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickFilter("year")}
          >
            This Year
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickFilter("all")}
          >
            All Time
          </Button>
        </div>

        {/* Custom Date Range */}
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label htmlFor="start-date" className="text-sm font-medium text-gray-700">
              Custom Date Range
            </Label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                id="start-date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="flex-1"
              />
              <span className="text-gray-500">to</span>
              <Input
                id="end-date"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="flex-1"
              />
              <Button onClick={handleCustomRange} disabled={!dateRange.start || !dateRange.end}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Total Revenue</div>
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {formatCurrency(analytics.total_revenue)}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {analytics.total_payments} transactions
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Average Transaction</div>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {formatCurrency(analytics.average_transaction)}
          </div>
          <div className="text-sm text-gray-500 mt-1">Per payment</div>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Past 7 Days</div>
            <Calendar className="h-5 w-5 text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {formatCurrency(analytics.weekly_revenue)}
          </div>
          <div className="text-sm text-gray-500 mt-1">Recent revenue</div>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Total Payments</div>
            <ShoppingBag className="h-5 w-5 text-orange-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {analytics.total_payments}
          </div>
          <div className="text-sm text-gray-500 mt-1">Completed</div>
        </div>
      </div>

      {/* Revenue by Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Revenue by Type</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Scissors className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-gray-700">Appointments</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                {formatCurrency(analytics.revenue_by_type.appointments)}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <ShoppingBag className="h-5 w-5 text-green-600" />
                <span className="font-medium text-gray-700">Product Orders</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                {formatCurrency(analytics.revenue_by_type.orders)}
              </span>
            </div>
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    analytics.revenue_by_type.appointments + analytics.revenue_by_type.orders
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Breakdown Chart */}
        <div className="bg-white border rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Breakdown</h2>
          {analytics.monthly_breakdown.length > 0 ? (
            <div className="space-y-3">
              {analytics.monthly_breakdown.map((month) => {
                const percentage = maxMonthlyRevenue > 0
                  ? (month.revenue / maxMonthlyRevenue) * 100
                  : 0;
                return (
                  <div key={month.month} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">
                        {formatMonth(month.month)}
                      </span>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">
                          {formatCurrency(month.revenue)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {month.count} payments · Avg: {formatCurrency(month.average)}
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              No monthly data available
            </div>
          )}
        </div>
      </div>

      {/* Detailed Monthly Table */}
      {analytics.monthly_breakdown.length > 0 && (
        <div className="bg-white border rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Details</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Month</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Revenue</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Payments</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Average</th>
                </tr>
              </thead>
              <tbody>
                {analytics.monthly_breakdown.map((month) => (
                  <tr key={month.month} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {formatMonth(month.month)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">
                      {formatCurrency(month.revenue)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {month.count}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {formatCurrency(month.average)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment History Table */}
      <div className="bg-white border rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Payment History</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by customer, service, or amount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="all">All Payments</option>
                <option value="appointment">Appointments Only</option>
                <option value="order">Orders Only</option>
              </select>
            </div>
          </div>
        </div>

        {loadingPayments ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
            <div className="text-gray-600 mt-2">Loading payments...</div>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No payments found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Service/Order</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {formatDate(payment.date)}
                    </TableCell>
                    <TableCell>{payment.customer}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        payment.type === "appointment"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {payment.type === "appointment" ? "Appointment" : "Order"}
                      </span>
                    </TableCell>
                    <TableCell>{payment.service}</TableCell>
                    <TableCell className="capitalize">
                      {payment.paymentMethod?.replace("_", " ") || "N/A"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        payment.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : payment.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {payment.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

