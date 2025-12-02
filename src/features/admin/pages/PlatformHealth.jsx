import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../shared/ui/card";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../shared/ui/tabs";
import { Activity, Server, Database, CheckCircle, Clock, AlertCircle, RefreshCw, FileText } from "lucide-react";
import { getHealthStatus, getErrorLogs } from "../api.js";

export default function PlatformHealth() {
  const [healthStatus, setHealthStatus] = useState(null);
  const [errorLogs, setErrorLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorLogsLoading, setErrorLogsLoading] = useState(false);
  const [errorFilters, setErrorFilters] = useState({
    limit: 100,
    severity: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    loadHealthStatus();
    loadErrorLogs();
  }, []);

  const loadHealthStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const health = await getHealthStatus();
      setHealthStatus(health);
    } catch (err) {
      console.error("Failed to load health status:", err);
      setError(err.error || "Failed to load health status");
      // Set unhealthy status on error
      setHealthStatus({
        status: "unhealthy",
        flask: "unknown",
        supabase: "error",
        database: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadErrorLogs = async () => {
    try {
      setErrorLogsLoading(true);
      const response = await getErrorLogs(
        errorFilters.limit,
        errorFilters.severity || null,
        errorFilters.startDate || null,
        errorFilters.endDate || null
      );
      setErrorLogs(response.logs || []);
    } catch (err) {
      console.error("Failed to load error logs:", err);
      setErrorLogs([]);
    } finally {
      setErrorLogsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    if (status === "healthy" || status === "connected" || status === "accessible" || status === "running") {
      return <Badge className="bg-green-100 text-green-800">Healthy</Badge>;
    } else if (status === "degraded") {
      return <Badge className="bg-yellow-100 text-yellow-800">Degraded</Badge>;
    } else {
      return <Badge variant="destructive">Unhealthy</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
            <p className="text-gray-600">Loading health status...</p>
          </div>
        </div>
      </div>
    );
  }

  const overallStatus = healthStatus?.status || "unknown";
  const isHealthy = overallStatus === "healthy";

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Platform Health</h1>
        <p className="text-gray-600 mt-2">Monitor system health and performance metrics</p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Error loading health status: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flask Application</CardTitle>
            <Activity className="h-5 w-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              {getStatusBadge(healthStatus?.flask || "unknown")}
            </div>
            <p className="text-sm text-gray-600">Status: {healthStatus?.flask || "Unknown"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            <Database className="h-5 w-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              {getStatusBadge(healthStatus?.database || healthStatus?.supabase || "unknown")}
            </div>
            <p className="text-sm text-gray-600">
              {healthStatus?.supabase === "connected" ? "Connected" : healthStatus?.database || "Unknown"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Status</CardTitle>
            <Server className="h-5 w-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              {getStatusBadge(overallStatus)}
            </div>
            <p className="text-sm text-gray-600">System: {overallStatus}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Overall platform health indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {isHealthy ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">All systems operational</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-gray-700">System issues detected</span>
              </>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {isHealthy
              ? "All critical services are running normally. No issues detected."
              : healthStatus?.error || "Some services may be experiencing issues."}
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="errors" className="w-full">
        <TabsList>
          <TabsTrigger value="errors">Error Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Logs</CardTitle>
              <CardDescription>Monitor and filter application errors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="severity">Severity</Label>
                  <Select
                    value={errorFilters.severity || "all"}
                    onValueChange={(value) => setErrorFilters({ ...errorFilters, severity: value === "all" ? "" : value })}
                  >
                    <SelectTrigger id="severity">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={errorFilters.startDate}
                    onChange={(e) => setErrorFilters({ ...errorFilters, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={errorFilters.endDate}
                    onChange={(e) => setErrorFilters({ ...errorFilters, endDate: e.target.value })}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={loadErrorLogs} disabled={errorLogsLoading} className="w-full">
                    {errorLogsLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {errorLogsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Clock className="h-6 w-6 animate-spin text-indigo-600" />
                </div>
              ) : errorLogs.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {errorLogs.map((log, index) => (
                    <Card key={index} className="border-l-4 border-l-red-500">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge
                                className={
                                  log.severity === "critical"
                                    ? "bg-red-600 text-white border-red-700"
                                    : log.severity === "high"
                                    ? "bg-red-500 text-white border-red-600"
                                    : log.severity === "medium"
                                    ? "bg-yellow-500 text-white border-yellow-600"
                                    : log.severity === "low"
                                    ? "bg-blue-500 text-white border-blue-600"
                                    : "bg-gray-500 text-white border-gray-600"
                                }
                              >
                                {(log.severity || "unknown").toUpperCase()}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {log.error_type || "Unknown Error"}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mb-1">{log.error_message}</p>
                            {log.endpoint && (
                              <p className="text-xs text-gray-500">Endpoint: {log.endpoint}</p>
                            )}
                            {log.created_at && (
                              <p className="text-xs text-gray-500">
                                {new Date(log.created_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                        {log.stack_trace && (
                          <details className="mt-2">
                            <summary className="text-xs text-gray-500 cursor-pointer">
                              View Stack Trace
                            </summary>
                            <pre className="text-xs bg-gray-100 p-2 mt-2 rounded overflow-x-auto">
                              {log.stack_trace}
                            </pre>
                          </details>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No error logs found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
