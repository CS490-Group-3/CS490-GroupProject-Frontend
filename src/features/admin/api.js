import { api } from "../../shared/api/client.js";

// Salon Verification
export async function getPendingSalons() {
  return api("/salons/pending");
}

export async function approveSalon(salonId) {
  return api(`/salons/${salonId}/approve`, {
    method: "PATCH",
  });
}

export async function rejectSalon(salonId, reason) {
  return api(`/salons/${salonId}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });
}

export async function getSalonStatusHistory(salonId) {
  return api(`/salons/${salonId}/status-history`);
}

// Analytics
export async function getDemographics(segment = null, value = null) {
  const params = new URLSearchParams();
  if (segment) params.append("segment", segment);
  if (value) params.append("value", value);
  const query = params.toString();
  return api(`/admin/demographics${query ? `?${query}` : ""}`);
}

export async function getEngagementMetrics(startDate, endDate) {
  return api(`/admin/metrics/engagement?start_date=${startDate}&end_date=${endDate}`);
}

export async function getAppointmentMetrics(startDate, endDate) {
  return api(`/admin/metrics/appointments?start_date=${startDate}&end_date=${endDate}`);
}

export async function getRevenueMetrics(startDate, endDate) {
  return api(`/admin/metrics/revenue?start_date=${startDate}&end_date=${endDate}`);
}

export async function getLoyaltyMetrics(startDate, endDate) {
  return api(`/admin/metrics/loyalty?start_date=${startDate}&end_date=${endDate}`);
}

export async function getRevenueAnalytics(startDate = null, endDate = null) {
  const params = new URLSearchParams();
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);
  return api(`/admin/revenue/analytics${params.toString() ? `?${params.toString()}` : ""}`);
}

export async function getLoyaltyUsage(startDate = null, endDate = null) {
  const params = new URLSearchParams();
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);
  return api(`/admin/loyalty/usage${params.toString() ? `?${params.toString()}` : ""}`);
}

export async function getRetentionMetrics(startDate, endDate) {
  return api(`/admin/metrics/retention?start_date=${startDate}&end_date=${endDate}`);
}

export async function getPlatformMetrics() {
  return api("/admin/metrics/platform");
}

export async function exportMetricsCSV(metricsType, startDate = null, endDate = null) {
  const token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);
  const query = params.toString();
  
  const response = await fetch(`${import.meta.env.VITE_API}/admin/metrics/${metricsType}/export/csv${query ? `?${query}` : ""}`, {
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
  a.download = `metrics_${metricsType}_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// Platform Health
export async function getHealthStatus() {
  return api("/health");
}

// Error Logs
export async function getErrorLogs(limit = 100, severity = null, startDate = null, endDate = null) {
  const params = new URLSearchParams();
  params.append("limit", limit);
  if (severity) params.append("severity", severity);
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);
  return api(`/admin/error-logs?${params.toString()}`);
}

export async function exportErrorLogsCSV(limit = 1000, severity = null, startDate = null, endDate = null) {
  const token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  params.append("limit", limit);
  if (severity) params.append("severity", severity);
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);
  const query = params.toString();

  const response = await fetch(
    `${import.meta.env.VITE_API}/admin/error-logs/export/csv?${query}`,
    {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `error_logs_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// Audit Logs
export async function getAuditLogs(limit = 100, tableName = null, recordId = null, action = null, changedBy = null, startDate = null, endDate = null) {
  const params = new URLSearchParams();
  params.append("limit", limit);
  if (tableName) params.append("table_name", tableName);
  if (recordId) params.append("record_id", recordId);
  if (action) params.append("action", action);
  if (changedBy) params.append("changed_by", changedBy);
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);
  return api(`/admin/audit-logs?${params.toString()}`);
}

export async function exportAuditLogsCSV(limit = 1000, tableName = null, recordId = null, action = null, changedBy = null, startDate = null, endDate = null) {
  const token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  params.append("limit", limit);
  if (tableName) params.append("table_name", tableName);
  if (recordId) params.append("record_id", recordId);
  if (action) params.append("action", action);
  if (changedBy) params.append("changed_by", changedBy);
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);
  const query = params.toString();

  const response = await fetch(
    `${import.meta.env.VITE_API}/admin/audit-logs/export/csv?${query}`,
    {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit_logs_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// Platform Metrics Calculation
export async function calculatePlatformMetrics(date = null) {
  const body = date ? JSON.stringify({ date }) : null;
  return api("/admin/platform-metrics/calculate", {
    method: "POST",
    body: body,
  });
}

export async function calculateDailyStatistics(date = null) {
  const body = date ? JSON.stringify({ date }) : null;
  return api("/admin/metrics/daily-statistics/calculate", {
    method: "POST",
    body: body,
  });
}

export async function getDailyStatistics(startDate, endDate) {
  return api(
    `/admin/daily-statistics?start_date=${startDate}&end_date=${endDate}`
  );
}

export async function exportDailyStatisticsCSV(startDate, endDate) {
  const token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);
  const query = params.toString();

  const response = await fetch(
    `${import.meta.env.VITE_API}/admin/daily-statistics/export/csv?${query}`,
    {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `daily_statistics_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
