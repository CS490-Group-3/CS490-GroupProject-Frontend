import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import { useAuth } from "../../features/auth/auth-provider.jsx";

export default function RootLayout() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const onAuth = pathname.startsWith("/auth/");
  
  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      {!onAuth && user ? <Header /> : null}
      <main className="flex-1 p-6">
        <Suspense fallback={<div className="text-gray-500">Loading…</div>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
