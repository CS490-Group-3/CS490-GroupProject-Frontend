import { useEffect, useState } from "react";
import { api } from "../../../shared/api/client.js";
import { Calendar, DollarSign, TrendingUp, ShoppingBag, Scissors, Loader2, Trophy, Building2, Download } from "lucide-react";
import { Button } from "../../../shared/ui/button.jsx";
import { Input } from "../../../shared/ui/input.jsx";
import { Label } from "../../../shared/ui/label.jsx";

export default function AdminRevenue() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  useEffect(() => {
    loadRevenue();
  }, []);

  const loadRevenue = async (startDate = null, endDate = null) => {
    try {
      setLoading(true);
      setError("");
      
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      
      const url = `/admin/revenue/analytics${params.toString() ? `?${params.toString()}` : ""}`;
      const data = await api(url);
      
      setAnalytics(data);
    } catch (err) {
      setError(err.message || "Failed to load revenue analytics");
      console.error("Revenue load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFilter = (period) => {
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
    } else {
      loadRevenue();
    }
  };

  const handleCustomRange = () => {
    if (dateRange.start && dateRange.end) {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);
      loadRevenue(start.toISOString(), end.toISOString());
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

  const topPerformer = analytics.salon_breakdown && analytics.salon_breakdown.length > 0
    ? analytics.salon_breakdown[0]
    : null;

  const maxMonthlyRevenue = analytics.monthly_breakdown && analytics.monthly_breakdown.length > 0
    ? Math.max(...analytics.monthly_breakdown.map(m => m.revenue))
    : 0;

  const maxSalonRevenue = analytics.salon_breakdown && analytics.salon_breakdown.length > 0
    ? Math.max(...analytics.salon_breakdown.map(s => s.revenue))
    : 0;

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const params = new URLSearchParams();
      if (dateRange.start) params.append("start_date", dateRange.start);
      if (dateRange.end) params.append("end_date", dateRange.end);
      const query = params.toString();
      
      const response = await fetch(`${import.meta.env.VITE_API}/admin/revenue/analytics/export/csv${query ? `?${query}` : ""}`, {
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `revenue_analytics_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to export CSV:", error);
      alert("Failed to export CSV. Please try again.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Revenue Analytics - All Salons</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <span className="text-sm text-gray-600">
              {analytics.date_range.start || analytics.date_range.end
                ? "Custom Range"
                : "All Time"}
            </span>
          </div>
          <Button onClick={handleExportCSV} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
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
            <div className="text-sm font-medium text-gray-600">Total Payments</div>
            <ShoppingBag className="h-5 w-5 text-orange-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {analytics.total_payments}
          </div>
          <div className="text-sm text-gray-500 mt-1">Completed</div>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Active Salons</div>
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {analytics.salon_breakdown?.length || 0}
          </div>
          <div className="text-sm text-gray-500 mt-1">With revenue</div>
        </div>

        {topPerformer && (
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-700">Top Performer</div>
              <Trophy className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="text-lg font-bold text-gray-900 truncate">
              {topPerformer.salon_name}
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(topPerformer.revenue)}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {topPerformer.count} transactions
            </div>
          </div>
        )}
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
        {analytics.monthly_breakdown && analytics.monthly_breakdown.length > 0 && (
          <div className="bg-white border rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Breakdown</h2>
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
          </div>
        )}
      </div>

      {/* Salon Breakdown */}
      {analytics.salon_breakdown && analytics.salon_breakdown.length > 0 && (
        <div className="bg-white border rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Revenue by Salon</h2>
          <div className="space-y-3">
            {analytics.salon_breakdown.map((salon, index) => {
              const percentage = maxSalonRevenue > 0
                ? (salon.revenue / maxSalonRevenue) * 100
                : 0;
              const isTopPerformer = index === 0;
              
              return (
                <div
                  key={salon.salon_id}
                  className={`space-y-1 p-3 rounded-lg ${
                    isTopPerformer ? "bg-yellow-50 border border-yellow-200" : ""
                  }`}
                >
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {isTopPerformer && <Trophy className="h-4 w-4 text-yellow-600" />}
                      <span className={`font-medium ${isTopPerformer ? "text-gray-900" : "text-gray-700"}`}>
                        {salon.salon_name}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${isTopPerformer ? "text-gray-900" : "text-gray-900"}`}>
                        {formatCurrency(salon.revenue)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {salon.count} payments · Avg: {formatCurrency(salon.average)}
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isTopPerformer ? "bg-yellow-600" : "bg-blue-600"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed Salon Table */}
      {analytics.salon_breakdown && analytics.salon_breakdown.length > 0 && (
        <div className="bg-white border rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Salon Details</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Salon</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Revenue</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Payments</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Average</th>
                </tr>
              </thead>
              <tbody>
                {analytics.salon_breakdown.map((salon, index) => (
                  <tr
                    key={salon.salon_id}
                    className={`border-b hover:bg-gray-50 ${
                      index === 0 ? "bg-yellow-50" : ""
                    }`}
                  >
                    <td className="py-3 px-4 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        {index === 0 && <Trophy className="h-4 w-4 text-yellow-600" />}
                        {salon.salon_name}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">
                      {formatCurrency(salon.revenue)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {salon.count}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {formatCurrency(salon.average)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

