import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/auth-provider.jsx";

export function RoleGate({ allow, children }) {
  try {
    const { user } = useAuth();
    const loc = useLocation();
    
    // Validate allow prop
    if (!Array.isArray(allow) || allow.length === 0) {
      console.error("RoleGate: 'allow' must be a non-empty array");
      return <Navigate to="/" replace />;
    }
    
    // Redirect to sign-in if not logged in
    if (!user) {
      return <Navigate to="/auth/sign-in" replace state={{ from: loc }} />;
    }
    
    // Check if user has allowed role
    if (!user.role || !allow.includes(user.role)) {
      // Redirect to appropriate page based on their actual role
      const roleRedirects = {
        customer: "/browse",
        owner: "/salon-dashboard",
        salon_owner: "/salon-dashboard",
        barber: "/schedule",
        admin: "/admin/dashboard",
      };
      return <Navigate to={roleRedirects[user.role] || "/"} replace />;
    }
    
    return children;
  } catch (error) {
    console.error("RoleGate error:", error);
    return <Navigate to="/" replace />;
  }
}
