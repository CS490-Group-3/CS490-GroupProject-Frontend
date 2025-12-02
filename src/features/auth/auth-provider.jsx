import { createContext, useContext, useState, useEffect } from "react";
import { setAccessToken, setRefreshToken, clearTokens, getAccessToken } from "../../shared/api/client.js";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Add loading state

  // Update user data (e.g., after profile update)
  const updateUser = (updatedUserData) => {
    setUser((prevUser) => {
      if (!prevUser) return updatedUserData;
      return { ...prevUser, ...updatedUserData };
    });
  };

  const login = async (email, password) => {
    const res = await fetch(`${import.meta.env.VITE_API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Login failed" }));
      throw new Error(errorData.error || "Login failed");
    }
    
    const data = await res.json(); // expect { access_token, refresh_token, user, ... }
    
    // Store tokens
    if (data.access_token) {
      setAccessToken(data.access_token);
    }
    if (data.refresh_token) {
      setRefreshToken(data.refresh_token);
    }
    
    // Set user from response
    const userData = data.user || { id: data.id, role: data.role, email: data.email };
    setUser(userData);
    return userData; // Return user data for role-based redirects
  };

  const logout = async () => {
    const token = getAccessToken();
    if (token) {
      try {
        await fetch(`${import.meta.env.VITE_API}/auth/logout`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
        });
      } catch (error) {
        // Continue with logout even if API call fails
        console.error("Logout API call failed:", error);
      }
    }
    clearTokens();
    setUser(null);
  };

  // Check authentication on mount and when token changes
  useEffect(() => {
    let cancelled = false;
    
    (async () => {
      const token = getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        const r = await fetch(`${import.meta.env.VITE_API}/auth/me`, {
          headers: {
            "Authorization": `Bearer ${token}`
          },
        });
        
        if (cancelled) return;
        
        if (r.ok) {
          const userData = await r.json();
          setUser(userData.user || userData);
        } else {
          // Token invalid, clear it
          clearTokens();
          setUser(null);
        }
      } catch (error) {
        // Network error or invalid token
        if (!cancelled) {
          clearTokens();
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthCtx.Provider value={{ user, login, logout, loading, updateUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
