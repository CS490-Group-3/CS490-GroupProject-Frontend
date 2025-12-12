import { lazy } from "react";
import { RoleGate } from "../../shared/routing/RoleGate.jsx";

const AdminDashboard = lazy(() => import("./pages/AdminDashboard.jsx"));
const PlatformHealth = lazy(() => import("./pages/PlatformHealth.jsx"));
const AdminVerify = lazy(() => import("./pages/AdminVerify.jsx"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics.jsx"));
const AdminRevenue = lazy(() => import("./pages/AdminRevenue.jsx"));
const AuditLogs = lazy(() => import("./pages/AuditLogs.jsx"));
const ProductCategories = lazy(() => import("./pages/ProductCategories.jsx"));

export default [
  { 
    path: "/admin/dashboard", 
    element: <RoleGate allow={["admin"]}><AdminDashboard /></RoleGate> 
  },
  { 
    path: "/admin/verify", 
    element: <RoleGate allow={["admin"]}><AdminVerify /></RoleGate> 
  },
  { 
    path: "/admin/analytics", 
    element: <RoleGate allow={["admin"]}><AdminAnalytics /></RoleGate> 
  },
  { 
    path: "/admin/revenue", 
    element: <RoleGate allow={["admin"]}><AdminRevenue /></RoleGate> 
  },
  { 
    path: "/admin/health", 
    element: <RoleGate allow={["admin"]}><PlatformHealth /></RoleGate> 
  },
  { 
    path: "/admin/audit-logs", 
    element: <RoleGate allow={["admin"]}><AuditLogs /></RoleGate> 
  },
  { 
    path: "/admin/product-categories", 
    element: <RoleGate allow={["admin"]}><ProductCategories /></RoleGate> 
  },
];
