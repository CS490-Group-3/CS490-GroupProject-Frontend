import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../features/auth/auth-provider.jsx";
import { api } from "../../shared/api/client.js";
import { checkSetupStatus } from "../../features/salon-reg/api.js";
import NotificationDrawer from "../../features/notifications/components/NotificationDrawer.jsx";
import salonicaLogo from "../../assets/salonica.png";

const linkClass = ({ isActive }) =>
  `px-4 py-2.5 rounded-md font-semibold transition-colors duration-150 ${
    isActive ? "bg-indigo-100 text-indigo-700" : "text-gray-700 hover:bg-gray-100"
  }`;

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [ownerHasVerifiedSalon, setOwnerHasVerifiedSalon] = useState(null);
  const [ownerSetupComplete, setOwnerSetupComplete] = useState(null);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/auth/sign-in");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const displayName = (() => {
    if (!user) return "";
    const first = user.first_name || user.firstName || "";
    const last = user.last_name || user.lastName || "";
    const name = `${first} ${last}`.trim();
    return name || user.name || user.email || "User";
  })();

  useEffect(() => {
    let cancelled = false;
    async function fetchOwnerSalon() {
      if (!user || (user.role !== "owner" && user.role !== "salon_owner")) {
        setOwnerHasVerifiedSalon(null);
        setOwnerSetupComplete(null);
        return;
      }
      try {
        const res = await api("/salons/mine");
        if (cancelled) return;
        const salon = res.salon || null;
        const isVerified = salon?.status === "verified";
        setOwnerHasVerifiedSalon(isVerified);
        
        // If verified, check setup completion
        if (isVerified && salon?.id) {
          try {
            const setupStatus = await checkSetupStatus(salon.id);
            if (!cancelled) {
              setOwnerSetupComplete(setupStatus.isComplete);
            }
          } catch (err) {
            if (!cancelled) setOwnerSetupComplete(false);
          }
        } else {
          setOwnerSetupComplete(null);
        }
      } catch (err) {
        if (!cancelled) {
          setOwnerHasVerifiedSalon(false);
          setOwnerSetupComplete(false);
        }
      }
    }
    fetchOwnerSalon();
    
    // Listen for setup completion events
    const handleSetupComplete = () => {
      if (!cancelled) {
        fetchOwnerSalon();
      }
    };
    window.addEventListener('setupStatusChanged', handleSetupComplete);
    
    return () => {
      cancelled = true;
      window.removeEventListener('setupStatusChanged', handleSetupComplete);
    };
  }, [user?.role]);

  // Role-based navigation links
  const getNavLinks = () => {
    if (!user) return null;

    switch (user.role) {
      case "customer":
        return (
          <>
            <NavLink to="/browse" className={linkClass}>Browse Salons</NavLink>
            <NavLink to="/appointments" className={linkClass}>My Appointments</NavLink>
            <NavLink to="/rewards" className={linkClass}>Loyalty</NavLink>
            <NavLink to="/profile" className={linkClass}>Profile</NavLink>
          </>
        );
      case "owner":
      case "salon_owner":
        // If verified and setup complete, show full navigation
        if (ownerHasVerifiedSalon === true && ownerSetupComplete === true) {
          return (
            <>
              <NavLink to="/salon-dashboard" className={linkClass}>Dashboard</NavLink>
              <NavLink to="/salon-settings" className={linkClass}>Settings</NavLink>
              <NavLink to="/employees" className={linkClass}>Employees</NavLink>
              <NavLink to="/clients" className={linkClass}>Customers</NavLink>
              <NavLink to="/loyalty-program" className={linkClass}>Loyalty Program</NavLink>
              <NavLink to="/retail" className={linkClass}>My Shop</NavLink>
              <NavLink to="/payments" className={linkClass}>Payments</NavLink>
              <NavLink to="/profile" className={linkClass}>Profile</NavLink>
            </>
          );
        }
        // If verified but setup not complete, only show Setup link
        if (ownerHasVerifiedSalon === true && ownerSetupComplete === false) {
          return (
            <>
              <NavLink to="/salon-setup" className={linkClass}>Complete Setup</NavLink>
              <NavLink to="/profile" className={linkClass}>Profile</NavLink>
            </>
          );
        }
        // If not verified or loading, show registration link
        return (
          <>
            <NavLink to="/salon-registration" className={linkClass}>Registration</NavLink>
            <NavLink to="/profile" className={linkClass}>Profile</NavLink>
          </>
        );
      case "barber":
        return (
          <>
            <NavLink to="/schedule" className={linkClass}>My Schedule</NavLink>
            <NavLink to="/profile" className={linkClass}>Profile</NavLink>
          </>
        );
      case "admin":
        return (
          <>
            <NavLink to="/admin/dashboard" className={linkClass}>Dashboard</NavLink>
            <NavLink to="/admin/verify" className={linkClass}>Salon Verification</NavLink>
            <NavLink to="/admin/analytics" className={linkClass}>Analytics</NavLink>
            <NavLink to="/admin/health" className={linkClass}>Platform Health</NavLink>
            <NavLink to="/profile" className={linkClass}>Profile</NavLink>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-4 flex-shrink-0">
          <NavLink to="/" className="flex items-center text-lg font-extrabold text-indigo-600 hover:text-indigo-700 flex-shrink-0">
            <img src={salonicaLogo} alt="Salonica" className="h-10 w-auto object-contain max-w-[120px]" />
          </NavLink>
          <nav className="flex gap-3">
            {getNavLinks()}
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <NotificationDrawer />
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Welcome, {displayName}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  {user.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded-md font-semibold text-gray-700 hover:bg-gray-100 transition-colors duration-150"
              >
                Logout
              </button>
            </>
          ) : (
            <nav className="flex gap-2">
              <NavLink to="/auth/sign-in" className={linkClass}>Sign In</NavLink>
              <NavLink to="/auth/sign-up" className={linkClass}>Sign Up</NavLink>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
