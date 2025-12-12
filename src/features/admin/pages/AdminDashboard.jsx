import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../shared/ui/card";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { Building2, Users, Calendar, TrendingUp, AlertCircle, Clock, CheckCircle, XCircle, FileText, Shield, BarChart3, UserCog, Repeat, Tag } from "lucide-react";
import { getPendingSalons, getPlatformMetrics } from "../api.js";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [platformMetrics, setPlatformMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [pending, metrics] = await Promise.allSettled([
        getPendingSalons(),
        getPlatformMetrics(),
      ]);
      
      if (pending.status === "fulfilled") {
        setPendingCount(Array.isArray(pending.value) ? pending.value.length : 0);
      } else {
        console.error("Failed to load pending salons:", pending.reason);
        setPendingCount(0);
      }
      
      if (metrics.status === "fulfilled") {
        // Backend returns {message, metrics: {...}}
        const metricsData = metrics.value?.metrics || metrics.value || null;
        setPlatformMetrics(metricsData);
      } else {
        console.error("Failed to load platform metrics:", metrics.reason);
        setPlatformMetrics(null);
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Pending Verifications",
      value: pendingCount,
      icon: Clock,
      color: "bg-yellow-100 text-yellow-800",
      iconColor: "text-yellow-600",
      action: () => navigate("/admin/verify"),
      actionLabel: "Review Applications",
    },
    {
      title: "Total Users",
      value: platformMetrics?.users?.total || platformMetrics?.total_users || "—",
      icon: Users,
      color: "bg-blue-100 text-blue-800",
      iconColor: "text-blue-600",
    },
    {
      title: "Total Salons",
      value: platformMetrics?.salons?.total || platformMetrics?.total_salons || "—",
      icon: Building2,
      color: "bg-indigo-100 text-indigo-800",
      iconColor: "text-indigo-600",
    },
    {
      title: "Total Appointments",
      value: platformMetrics?.appointments?.total || platformMetrics?.total_appointments || "—",
      icon: Calendar,
      color: "bg-green-100 text-green-800",
      iconColor: "text-green-600",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Platform overview and administration</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
            <p className="text-gray-600">Loading dashboard data...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
                    <div className={`p-2 rounded-lg ${stat.color}`}>
                      <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                    {stat.action && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={stat.action}
                        className="mt-3 text-xs"
                      >
                        {stat.actionLabel} →
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Analytics Insights</CardTitle>
              <CardDescription>Quick access to key metrics, trends, and user insights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-auto flex-col items-start p-4 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                  onClick={() => navigate("/admin/analytics?tab=appointments")}
                >
                  <div className="flex items-center gap-3 w-full mb-2">
                    <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">Appointment Trends</div>
                      <div className="text-xs text-gray-500">Peak hours & patterns</div>
                    </div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col items-start p-4 hover:bg-green-50 hover:border-green-300 transition-colors"
                  onClick={() => navigate("/admin/analytics?tab=retention")}
                >
                  <div className="flex items-center gap-3 w-full mb-2">
                    <div className="p-2 rounded-lg bg-green-100 text-green-600">
                      <Repeat className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">Customer Retention</div>
                      <div className="text-xs text-gray-500">Churn & loyalty metrics</div>
                    </div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col items-start p-4 hover:bg-purple-50 hover:border-purple-300 transition-colors"
                  onClick={() => navigate("/admin/analytics?tab=demographics")}
                >
                  <div className="flex items-center gap-3 w-full mb-2">
                    <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                      <UserCog className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">User Demographics</div>
                      <div className="text-xs text-gray-500">User base insights</div>
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/admin/verify")}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Review Pending Applications
                  {pendingCount > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {pendingCount}
                    </Badge>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/admin/analytics")}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Analytics & Metrics
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/admin/health")}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Monitor
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/admin/audit-logs")}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  View Audit Logs
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/admin/product-categories")}
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Manage Product Categories
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform Status</CardTitle>
                <CardDescription>Current system status</CardDescription>
              </CardHeader>
              <CardContent>
                {platformMetrics ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Users</span>
                      <Badge variant="outline">{platformMetrics.users?.total || platformMetrics.total_users || "—"}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Verified Salons</span>
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        {platformMetrics.salons?.verified || platformMetrics.verified_salons || "—"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Pending Salons</span>
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                        {pendingCount}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No platform metrics available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
