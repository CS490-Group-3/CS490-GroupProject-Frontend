import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../shared/ui/card";
import { Button } from "../../../shared/ui/button";
import { Label } from "../../../shared/ui/label";
import { Input } from "../../../shared/ui/input";
import { Badge } from "../../../shared/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../shared/ui/tabs";
import {
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  Award,
  RefreshCw,
  Download,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  getEngagementMetrics,
  getAppointmentMetrics,
  getRevenueMetrics,
  getLoyaltyMetrics,
  getRetentionMetrics,
  getPlatformMetrics,
  getDemographics,
  calculateDailyStatistics,
  getDailyStatistics,
  exportMetricsCSV,
  exportDailyStatisticsCSV,
} from "../api.js";

export default function AdminAnalytics() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") || "platform";
  
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState({
    engagement: null,
    appointments: null,
    revenue: null,
    loyalty: null,
    retention: null,
    platform: null,
    demographics: null,
    daily: null,
  });

  // Sync activeTab with URL param
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.startDate, dateRange.endDate, activeTab]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = dateRange;
      const metricsPromises = [];

      if (activeTab === "platform") {
        metricsPromises.push(
          getPlatformMetrics()
            .then((data) => {
              // Backend returns {message, metrics: {...}}
              const metricsData = data?.metrics || data;
              return { key: "platform", data: metricsData };
            })
            .catch((err) => {
              console.error("Failed to load platform metrics:", err);
              return { key: "platform", data: null };
            })
        );
      } else if (activeTab === "demographics") {
        metricsPromises.push(
          getDemographics()
            .then((data) => {
              const demographicsData = data?.demographics || data;
              console.log("Demographics data:", demographicsData);
              console.log("Top cities:", demographicsData?.top_cities);
              console.log("Top states:", demographicsData?.top_states);
              console.log("Top services:", demographicsData?.top_services);
              return {
                key: "demographics",
                data: demographicsData,
              };
            })
            .catch((err) => {
              console.error("Failed to load demographics:", err);
              return { key: "demographics", data: null };
            })
        );
      } else if (activeTab === "daily") {
        metricsPromises.push(
          getDailyStatistics(startDate, endDate)
            .then((data) => ({
              key: "daily",
              data: data?.daily_statistics?.rows || data?.rows || [],
            }))
            .catch((err) => {
              console.error("Failed to load daily statistics:", err);
              return { key: "daily", data: [] };
            })
        );
      } else {
        if (activeTab === "engagement" || activeTab === "all") {
          metricsPromises.push(
            getEngagementMetrics(startDate, endDate)
              .then((data) => ({
                key: "engagement",
                data: data?.metrics || data,
              }))
              .catch((err) => {
                console.error("Failed to load engagement metrics:", err);
                return { key: "engagement", data: null };
              })
          );
        }
        if (activeTab === "appointments" || activeTab === "all") {
          metricsPromises.push(
            getAppointmentMetrics(startDate, endDate)
              .then((data) => ({
                key: "appointments",
                data: data?.metrics || data,
              }))
              .catch((err) => {
                console.error("Failed to load appointment metrics:", err);
                return { key: "appointments", data: null };
              })
          );
        }
        if (activeTab === "revenue" || activeTab === "all") {
          metricsPromises.push(
            getRevenueMetrics(startDate, endDate)
              .then((data) => ({
                key: "revenue",
                data: data?.metrics || data,
              }))
              .catch((err) => {
                console.error("Failed to load revenue metrics:", err);
                return { key: "revenue", data: null };
              })
          );
        }
        if (activeTab === "loyalty" || activeTab === "all") {
          metricsPromises.push(
            getLoyaltyMetrics(startDate, endDate)
              .then((data) => ({
                key: "loyalty",
                data: data?.metrics || data,
              }))
              .catch((err) => {
                console.error("Failed to load loyalty metrics:", err);
                return { key: "loyalty", data: null };
              })
          );
        }
        if (activeTab === "retention" || activeTab === "all") {
          metricsPromises.push(
            getRetentionMetrics(startDate, endDate)
              .then((data) => ({
                key: "retention",
                data: data?.metrics || data,
              }))
              .catch((err) => {
                console.error("Failed to load retention metrics:", err);
                return { key: "retention", data: null };
              })
          );
        }
      }

      const results = await Promise.all(metricsPromises);
      const newMetrics = { ...metrics };
      results.forEach(({ key, data }) => {
        newMetrics[key] = data;
      });
      setMetrics(newMetrics);
    } catch (error) {
      console.error("Failed to load metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const { startDate, endDate } = dateRange;
      if (activeTab === "daily") {
        await exportDailyStatisticsCSV(startDate, endDate);
      } else {
        // Map current tab to a valid backend metrics_type
        const exportableTabs = [
          "platform",
          "engagement",
          "appointments",
          "revenue",
          "loyalty",
          "retention",
          "demographics",
        ];
        const metricsType = exportableTabs.includes(activeTab)
          ? activeTab
          : "engagement";
        await exportMetricsCSV(metricsType, startDate, endDate);
      }
    } catch (error) {
      console.error("Failed to export CSV:", error);
      alert("Failed to export CSV. Please try again.");
    }
  };

  const renderMetricCard = (title, value, icon, subtitle = null) => {
    const Icon = icon;
    // Check if value is already a string with % or $, otherwise format it
    let displayValue = value;
    if (value !== null && value !== undefined && value !== "—") {
      if (typeof value === "number") {
        // If it's a rate (title contains "Rate" or "Churn"), add %
        if (title.toLowerCase().includes("rate") || title.toLowerCase().includes("churn")) {
          displayValue = `${value.toFixed(2)}%`;
        }
      } else if (typeof value === "string" && !value.includes("%") && !value.includes("$")) {
        // If it's a string that looks like a number, check if it should have %
        if (title.toLowerCase().includes("rate") || title.toLowerCase().includes("churn")) {
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            displayValue = `${numValue.toFixed(2)}%`;
          }
        }
      }
    }
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{displayValue || "—"}</div>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Metrics</h1>
          <p className="text-gray-600 mt-2">Platform performance and user engagement analytics</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const targetDate = dateRange.endDate;
                await calculateDailyStatistics(targetDate || undefined);
                alert("Daily statistics recalculated successfully.");
              } catch (err) {
                console.error("Failed to recalculate daily statistics:", err);
                alert("Failed to recalculate daily statistics.");
              }
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Recalculate Daily Stats
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {activeTab !== "platform" && (
        <Card>
          <CardHeader>
            <CardTitle>Date Range</CardTitle>
            <CardDescription>Select the time period for metrics analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <Button onClick={loadMetrics} className="mt-4" disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Metrics
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs 
        value={activeTab} 
        onValueChange={(value) => {
          setActiveTab(value);
          setSearchParams({ tab: value });
        }}
      >
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="platform">Platform</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
          <TabsTrigger value="daily">Daily Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="platform" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Clock className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : metrics.platform ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {renderMetricCard("Total Users", metrics.platform?.users?.total || metrics.platform?.total_users, Users)}
              {renderMetricCard("Total Salons", metrics.platform?.salons?.total || metrics.platform?.total_salons, TrendingUp)}
              {renderMetricCard("Total Appointments", metrics.platform?.appointments?.total || metrics.platform?.total_appointments, Calendar)}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No platform metrics available.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Clock className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : metrics.engagement ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {renderMetricCard(
                "Total New Customers", 
                metrics.engagement.summary?.total_new_customers || metrics.engagement.total_new_customers || 0, 
                Users,
                "(Past 30d)"
              )}
              {renderMetricCard("Total Appointments", metrics.engagement.summary?.total_appointments || metrics.engagement.total_appointments, TrendingUp)}
              {renderMetricCard("Avg Daily Appointments", metrics.engagement.summary?.avg_daily_appointments || metrics.engagement.avg_daily_appointments, Calendar)}
              {renderMetricCard("Engagement Rate", metrics.engagement.summary?.engagement_rate || metrics.engagement.engagement_rate, TrendingUp)}
              {renderMetricCard("Total Revenue", metrics.engagement.summary?.total_revenue ? `$${metrics.engagement.summary.total_revenue.toLocaleString()}` : metrics.engagement.total_revenue, DollarSign)}
              {renderMetricCard("Returning Customers", metrics.engagement.summary?.total_returning_customers || metrics.engagement.total_returning_customers, Users)}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No engagement metrics available for the selected date range.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="appointments" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Clock className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : metrics.appointments ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {renderMetricCard("Total Appointments", metrics.appointments.total_appointments, Calendar)}
                {renderMetricCard("Completion Rate", metrics.appointments.completion_rate, CheckCircle)}
                {renderMetricCard("Cancellation Rate", metrics.appointments.cancellation_rate, XCircle)}
                {metrics.appointments.peak_hour !== null && metrics.appointments.peak_hour !== undefined && (
                  renderMetricCard("Peak Hour", `${metrics.appointments.peak_hour}:00 (${metrics.appointments.peak_hour_count} appointments)`, Clock)
                )}
              </div>
              
              {metrics.appointments.peak_hours && metrics.appointments.peak_hours.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Appointments by Hour of Day</CardTitle>
                    <CardDescription>Distribution of appointments throughout the day</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {metrics.appointments.peak_hours.map(({ hour, count }) => {
                        const maxCount = Math.max(...metrics.appointments.peak_hours.map(h => h.count));
                        const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                        return (
                          <div key={hour} className="flex items-center gap-4">
                            <div className="w-16 text-sm font-medium">{hour}:00</div>
                            <div className="flex-1">
                              <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-indigo-600 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                            <div className="w-16 text-sm text-right">{count}</div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {metrics.appointments.day_of_week_trends && metrics.appointments.day_of_week_trends.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Appointments by Day of Week</CardTitle>
                    <CardDescription>Weekly appointment distribution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {metrics.appointments.day_of_week_trends.map(({ day, count }) => {
                        const maxCount = Math.max(...metrics.appointments.day_of_week_trends.map(d => d.count));
                        const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                        return (
                          <div key={day} className="flex items-center gap-4">
                            <div className="w-24 text-sm font-medium">{day}</div>
                            <div className="flex-1">
                              <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-indigo-600 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                            <div className="w-16 text-sm text-right">{count}</div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No appointment metrics available for the selected date range.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="daily" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Clock className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : metrics.daily && metrics.daily.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Daily Statistics</CardTitle>
                <CardDescription>
                  Raw per-day metrics for the selected period (platform-wide)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Date</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Total Appointments</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Completed</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Cancelled</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">New Customers</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Returning Customers</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Total Revenue</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Avg Rating</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Last Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.daily.map((row) => (
                        <tr key={row.date} className="border-b last:border-b-0">
                          <td className="px-3 py-2 whitespace-nowrap">
                            {row.date ? new Date(row.date).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-3 py-2">{row.total_appointments ?? "—"}</td>
                          <td className="px-3 py-2">{row.completed_appointments ?? "—"}</td>
                          <td className="px-3 py-2">{row.cancelled_appointments ?? "—"}</td>
                          <td className="px-3 py-2">{row.new_customers ?? "—"}</td>
                          <td className="px-3 py-2">{row.returning_customers ?? "—"}</td>
                          <td className="px-3 py-2">
                            {row.total_revenue != null ? `$${Number(row.total_revenue).toFixed(2)}` : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {row.average_rating != null ? Number(row.average_rating).toFixed(2) : "—"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                            {row.created_at
                              ? new Date(row.created_at).toLocaleString()
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No daily statistics found for the selected date range.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Clock className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : metrics.revenue ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {renderMetricCard("Total Revenue", `$${metrics.revenue.total_revenue?.toLocaleString() || "—"}`, DollarSign)}
              {renderMetricCard("Avg Transaction", `$${metrics.revenue.avg_transaction_value || "—"}`, TrendingUp)}
              {renderMetricCard("Platform Fees", `$${metrics.revenue.platform_fee_revenue?.toLocaleString() || "—"}`, DollarSign)}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No revenue metrics available for the selected date range.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="demographics" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Clock className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : metrics.demographics ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {renderMetricCard("Total Users", metrics.demographics.total_users || 0, Users)}
                {renderMetricCard("Total Cities", metrics.demographics.location_distribution?.length || 0, TrendingUp)}
                {renderMetricCard("Total States", metrics.demographics.state_distribution?.length || 0, TrendingUp)}
              </div>

              {metrics.demographics.role_distribution && metrics.demographics.role_distribution.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>User Distribution by Role</CardTitle>
                    <CardDescription>Breakdown of users by their role on the platform</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {metrics.demographics.role_distribution.map(({ role, count }) => {
                        const total = metrics.demographics.total_users || 1;
                        const percentage = ((count / total) * 100).toFixed(1);
                        return (
                          <div key={role} className="flex items-center gap-4">
                            <div className="w-24 text-sm font-medium capitalize">{role}</div>
                            <div className="flex-1">
                              <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-600 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                            <div className="w-20 text-sm text-right">{count}</div>
                            <div className="w-16 text-sm text-gray-500 text-right">{percentage}%</div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {metrics.demographics.gender_distribution && metrics.demographics.gender_distribution.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Gender Distribution</CardTitle>
                    <CardDescription>User distribution by gender</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {metrics.demographics.gender_distribution.map(({ gender, count }) => {
                        const total = metrics.demographics.gender_percentages
                          ? Object.values(metrics.demographics.gender_percentages).reduce((a, b) => a + b, 0)
                          : count;
                        const percentage = metrics.demographics.gender_percentages?.[gender] || 
                          ((count / (total || 1)) * 100).toFixed(1);
                        return (
                          <div key={gender} className="flex items-center gap-4">
                            <div className="w-24 text-sm font-medium capitalize">{gender || "Not Specified"}</div>
                            <div className="flex-1">
                              <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-600 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                            <div className="w-20 text-sm text-right">{count}</div>
                            <div className="w-16 text-sm text-gray-500 text-right">{percentage}%</div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {metrics.demographics.age_distribution && metrics.demographics.age_distribution.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Age Distribution</CardTitle>
                    <CardDescription>User distribution by age bracket</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {metrics.demographics.age_distribution.map(({ age_bracket, count }) => {
                        const total = metrics.demographics.age_percentages
                          ? Object.values(metrics.demographics.age_percentages).reduce((a, b) => a + b, 0)
                          : count;
                        const percentage = metrics.demographics.age_percentages?.[age_bracket] || 
                          ((count / (total || 1)) * 100).toFixed(1);
                        return (
                          <div key={age_bracket} className="flex items-center gap-4">
                            <div className="w-32 text-sm font-medium">{age_bracket || "Not Specified"}</div>
                            <div className="flex-1">
                              <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-600 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                            <div className="w-20 text-sm text-right">{count}</div>
                            <div className="w-16 text-sm text-gray-500 text-right">{percentage}%</div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Top Cities</CardTitle>
                  <CardDescription>Cities with the most users</CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const citiesData = (metrics.demographics.top_cities && metrics.demographics.top_cities.length > 0) ? 
                      metrics.demographics.top_cities : 
                      (metrics.demographics.location_distribution || []).slice(0, 10);
                    
                    if (!citiesData || citiesData.length === 0) {
                      return <p className="text-sm text-gray-500 text-center py-4">No city data available</p>;
                    }
                    
                    const maxCount = Math.max(...citiesData.map(c => c.count || 0));
                    
                    return (
                      <div className="space-y-2">
                        {citiesData.map((item, index) => {
                          const city = item.city || item.name || 'Unknown';
                          const count = item.count || 0;
                          const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                          return (
                            <div key={`city-${index}-${city}-${count}`} className="flex items-center gap-4">
                              <div className="w-8 text-sm font-medium text-gray-500">#{index + 1}</div>
                              <div className="w-32 text-sm font-medium">{city}</div>
                              <div className="flex-1">
                                <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-purple-600 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                              <div className="w-20 text-sm text-right">{count}</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top States</CardTitle>
                  <CardDescription>States with the most users</CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const statesData = (metrics.demographics.top_states && metrics.demographics.top_states.length > 0) ? 
                      metrics.demographics.top_states : 
                      (metrics.demographics.state_distribution || []).slice(0, 10);
                    
                    if (!statesData || statesData.length === 0) {
                      return <p className="text-sm text-gray-500 text-center py-4">No state data available</p>;
                    }
                    
                    const maxCount = Math.max(...statesData.map(s => s.count || 0));
                    
                    return (
                      <div className="space-y-2">
                        {statesData.map((item, index) => {
                          const state = item.state || item.name || 'Unknown';
                          const count = item.count || 0;
                          const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                          return (
                            <div key={`state-${index}-${state}-${count}`} className="flex items-center gap-4">
                              <div className="w-8 text-sm font-medium text-gray-500">#{index + 1}</div>
                              <div className="w-32 text-sm font-medium">{state}</div>
                              <div className="flex-1">
                                <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-orange-600 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                              <div className="w-20 text-sm text-right">{count}</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Preferred Services</CardTitle>
                  <CardDescription>Most popular services among users</CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const servicesData = (metrics.demographics.top_services && metrics.demographics.top_services.length > 0) ? 
                      metrics.demographics.top_services : 
                      (metrics.demographics.service_distribution || []).slice(0, 10);
                    
                    if (!servicesData || servicesData.length === 0) {
                      return <p className="text-sm text-gray-500 text-center py-4">No service data available</p>;
                    }
                    
                    const maxCount = Math.max(...servicesData.map(s => s.count || 0));
                    
                    return (
                      <div className="space-y-2">
                        {servicesData.map((item, index) => {
                          const service = item.service || item.name || 'Unknown';
                          const count = item.count || 0;
                          const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                          return (
                            <div key={`service-${index}-${service}-${count}`} className="flex items-center gap-4">
                              <div className="w-8 text-sm font-medium text-gray-500">#{index + 1}</div>
                              <div className="w-48 text-sm font-medium">{service}</div>
                              <div className="flex-1">
                                <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-teal-600 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                              <div className="w-20 text-sm text-right">{count}</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No demographic data available.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="loyalty" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Clock className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : metrics.loyalty ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {renderMetricCard("Active Members", metrics.loyalty.active_members, Users)}
              {renderMetricCard("Points Earned", metrics.loyalty.points_earned?.toLocaleString() || "—", Award)}
              {renderMetricCard("Points Redeemed", metrics.loyalty.points_redeemed?.toLocaleString() || "—", Award)}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No loyalty metrics available for the selected date range.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="retention" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Clock className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : metrics.retention ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {renderMetricCard("Retention Rate", metrics.retention.retention_rate, TrendingUp)}
              {renderMetricCard("Churn Rate", metrics.retention.churn_rate || (metrics.retention.total_customers > 0 ? (100 - (metrics.retention.retention_rate || 0)).toFixed(2) : 0), AlertCircle)}
              {renderMetricCard("Repeat Customers", metrics.retention.repeat_customers || metrics.retention.returning_customers || 0, Users)}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No retention metrics available for the selected date range.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
