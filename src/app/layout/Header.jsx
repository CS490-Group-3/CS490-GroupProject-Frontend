import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "../../features/auth/auth-provider.jsx";
import { api } from "../../shared/api/client.js";
import { checkSetupStatus } from "../../features/salon-reg/api.js";
import NotificationDrawer from "../../features/notifications/components/NotificationDrawer.jsx";
import salonicaLogo from "../../assets/salonica.png";
import { ChevronDown } from "lucide-react";

const linkClass = ({ isActive }) =>
  `px-3 py-2 rounded-md text-base font-semibold transition-colors duration-150 whitespace-nowrap ${
    isActive ? "bg-indigo-100 text-indigo-700" : "text-gray-700 hover:bg-gray-100"
  }`;

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [ownerHasVerifiedSalon, setOwnerHasVerifiedSalon] = useState(null);
  const [ownerSetupComplete, setOwnerSetupComplete] = useState(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Role-based navigation links
  const getNavLinks = () => {
    if (!user) return null;

    switch (user.role) {
      case "customer":
        return (
          <>
            <NavLink to="/browse" className={linkClass}>Browse Salons</NavLink>
            <NavLink to="/appointments" className={linkClass}>My Appointments</NavLink>
            <NavLink to="/orders" className={linkClass}>Orders</NavLink>
            <NavLink to="/rewards" className={linkClass}>Loyalty</NavLink>
            <NavLink to="/profile" className={linkClass}>Profile</NavLink>
          </>
        );
      case "owner":
      case "salon_owner":
        // If verified and setup complete, show full navigation
        if (ownerHasVerifiedSalon === true && ownerSetupComplete === true) {
          const moreMenuItems = [
            { to: "/revenue", label: "Revenue" },
            { to: "/promotions", label: "Promotions" },
            { to: "/loyalty-program", label: "Loyalty Program" },
            { to: "/retail", label: "My Shop" },
          ];
          const isMoreActive = moreMenuItems.some(item => location.pathname === item.to);
          
          return (
            <>
              <NavLink to="/salon-dashboard" className={linkClass}>Dashboard</NavLink>
              <NavLink to="/salon-settings" className={linkClass}>Settings</NavLink>
              <NavLink to="/employees" className={linkClass}>Employees</NavLink>
              <NavLink to="/clients" className={linkClass}>Customers</NavLink>
              <NavLink to="/salon-orders" className={linkClass}>Orders</NavLink>
              <div className="relative" ref={moreMenuRef}>
                <button
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  className={`px-3 py-2 rounded-md text-base font-semibold transition-colors duration-150 whitespace-nowrap flex items-center gap-1 ${
                    isMoreActive ? "bg-indigo-100 text-indigo-700" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  More
                  <ChevronDown className={`h-4 w-4 transition-transform ${moreMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {moreMenuOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1">
                    {moreMenuItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMoreMenuOpen(false)}
                        className={({ isActive }) =>
                          `block px-4 py-2 text-sm transition-colors ${
                            isActive ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700 hover:bg-gray-50"
                          }`
                        }
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
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
            <NavLink to="/my-salon" className={linkClass}>My Salon</NavLink>
            <NavLink to="/profile" className={linkClass}>Profile</NavLink>
          </>
        );
      case "admin":
        return (
          <>
            <NavLink to="/admin/dashboard" className={linkClass}>Dashboard</NavLink>
            <NavLink to="/admin/verify" className={linkClass}>Salon Verification</NavLink>
            <NavLink to="/admin/analytics" className={linkClass}>Analytics</NavLink>
            <NavLink to="/admin/revenue" className={linkClass}>Revenue</NavLink>
            <NavLink to="/admin/audit-logs" className={linkClass}>Audit</NavLink>
            <NavLink to="/admin/health" className={linkClass}>Monitor</NavLink>
            <NavLink to="/profile" className={linkClass}>Profile</NavLink>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
      <div className="w-full px-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 py-2.5">
          <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto justify-center md:justify-start">
            <NavLink to="/" className="flex items-center text-lg font-extrabold text-indigo-600 hover:text-indigo-700 flex-shrink-0">
              <img src={salonicaLogo} alt="Salonica" className="h-7 md:h-8 w-auto object-contain max-w-[90px] md:max-w-[100px]" />
            </NavLink>
            <nav className="flex flex-wrap gap-1.5 justify-center md:justify-start">
              {getNavLinks()}
            </nav>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {user ? (
              <>
                <NotificationDrawer />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-600 whitespace-nowrap hidden sm:inline">
                    Welcome, {displayName}
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 whitespace-nowrap">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-2 py-1 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors duration-150 whitespace-nowrap"
                >
                  Logout
                </button>
              </>
            ) : (
              <nav className="flex gap-1">
                <NavLink to="/auth/sign-in" className={linkClass}>Sign In</NavLink>
                <NavLink to="/auth/sign-up" className={linkClass}>Sign Up</NavLink>
              </nav>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
