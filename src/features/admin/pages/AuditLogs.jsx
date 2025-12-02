import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../shared/ui/card";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/ui/select";
import { Clock, RefreshCw, FileText, Database, User, Calendar, Download } from "lucide-react";
import { getAuditLogs, exportAuditLogsCSV } from "../api.js";

export default function AuditLogs() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    limit: 100,
    tableName: "",
    recordId: "",
    action: "",
    changedBy: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await getAuditLogs(
        filters.limit,
        filters.tableName || null,
        filters.recordId || null,
        filters.action || null,
        filters.changedBy || null,
        filters.startDate || null,
        filters.endDate || null
      );
      setAuditLogs(response.logs || []);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      await exportAuditLogsCSV(
        filters.limit,
        filters.tableName || null,
        filters.recordId || null,
        filters.action || null,
        filters.changedBy || null,
        filters.startDate || null,
        filters.endDate || null
      );
    } catch (err) {
      console.error("Failed to export audit logs CSV:", err);
      alert("Failed to export audit logs CSV. Please try again.");
    }
  };

  const getActionBadge = (action) => {
    const colors = {
      INSERT: "bg-green-100 text-green-800",
      UPDATE: "bg-blue-100 text-blue-800",
      DELETE: "bg-red-100 text-red-800",
    };
    return (
      <Badge className={colors[action] || "bg-gray-100 text-gray-800"}>
        {action}
      </Badge>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-600 mt-2">Track all database changes and user actions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Audit Logs</CardTitle>
          <CardDescription>Filter by table, action, user, or date range</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="table-name">Table Name</Label>
              <Input
                id="table-name"
                placeholder="e.g., salons, appointments"
                value={filters.tableName}
                onChange={(e) => setFilters({ ...filters, tableName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="action">Action</Label>
              <Select
                value={filters.action || "all"}
                onValueChange={(value) => setFilters({ ...filters, action: value === "all" ? "" : value })}
              >
                <SelectTrigger id="action">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="INSERT">INSERT</SelectItem>
                  <SelectItem value="UPDATE">UPDATE</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="record-id">Record ID</Label>
              <Input
                id="record-id"
                placeholder="UUID"
                value={filters.recordId}
                onChange={(e) => setFilters({ ...filters, recordId: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="changed-by">Changed By (User ID)</Label>
              <Input
                id="changed-by"
                placeholder="User UUID"
                value={filters.changedBy}
                onChange={(e) => setFilters({ ...filters, changedBy: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={loadAuditLogs} disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Apply Filters
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFilters({
                  limit: 100,
                  tableName: "",
                  recordId: "",
                  action: "",
                  changedBy: "",
                  startDate: "",
                  endDate: "",
                });
                setTimeout(loadAuditLogs, 100);
              }}
            >
              Clear Filters
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={handleExportCSV}
              disabled={loading}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit Log Entries</CardTitle>
          <CardDescription>
            {auditLogs.length} log{auditLogs.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Clock className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : auditLogs.length > 0 ? (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {auditLogs.map((log, index) => (
                <Card key={index} className="border-l-4 border-l-indigo-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getActionBadge(log.action)}
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Database className="h-4 w-4" />
                          <span className="font-medium">{log.table_name}</span>
                        </div>
                        {log.record_id && (
                          <span className="text-xs text-gray-500 font-mono">
                            {log.record_id.substring(0, 8)}...
                          </span>
                        )}
                      </div>
                      {log.changed_at && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          {new Date(log.changed_at).toLocaleString()}
                        </div>
                      )}
                    </div>

                    {log.changed_by && (
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                        <User className="h-4 w-4" />
                        <span className="font-mono text-xs">{log.changed_by}</span>
                      </div>
                    )}

                    {log.ip_address && (
                      <p className="text-xs text-gray-500 mb-2">IP: {log.ip_address}</p>
                    )}

                    <div className="grid md:grid-cols-2 gap-4 mt-3">
                      {log.old_values && Object.keys(log.old_values).length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-700 mb-1">Old Values:</p>
                          <pre className="text-xs bg-red-50 p-2 rounded border border-red-200 overflow-x-auto">
                            {JSON.stringify(log.old_values, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.new_values && Object.keys(log.new_values).length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-700 mb-1">New Values:</p>
                          <pre className="text-xs bg-green-50 p-2 rounded border border-green-200 overflow-x-auto">
                            {JSON.stringify(log.new_values, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No audit logs found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

