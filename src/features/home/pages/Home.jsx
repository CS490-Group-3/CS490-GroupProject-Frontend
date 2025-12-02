import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/auth-provider.jsx";
import salonicaLogo from "../../../assets/salonica.png";

export default function Home() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (user) {
      const roleRedirects = {
        customer: "/browse",
        owner: "/salon-dashboard",
        salon_owner: "/salon-dashboard",
        barber: "/schedule",
        admin: "/admin/dashboard",
      };
      const destination = roleRedirects[user.role] || "/browse";
      navigate(destination, { replace: true });
    }
  }, [user, navigate]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!user) {
      navigate("/auth/sign-in");
    } else {
      navigate(`/browse?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleBrowseClick = () => {
    if (!user) {
      navigate("/auth/sign-in");
    } else {
      navigate("/browse");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-pink-100">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-purple-600 via-pink-500 to-purple-700 overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        
        {/* Navigation Bar */}
        <nav className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/")}
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <img
                src={salonicaLogo}
                alt="Salonica"
                className="h-12 w-auto object-contain max-w-[140px] cursor-pointer"
              />
            </button>
            <div className="flex gap-4">
              <button
                onClick={() => navigate("/auth/sign-in")}
                className="px-4 py-2 text-white font-bold hover:text-purple-100 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate("/auth/sign-up")}
                className="px-6 py-2 bg-white text-purple-600 font-bold rounded-lg hover:bg-gray-50 transition-all shadow-lg"
              >
                Get Started
              </button>
            </div>
          </div>
        </nav>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Your Perfect Salon,
              <br />
              <span className="text-purple-100">
                Just a Click Away
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-purple-50 mb-10 max-w-3xl mx-auto font-medium">
              Book appointments at top-rated salons, manage your schedule, and earn rewards—all in one place.
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8 relative z-10">
              <div className="flex gap-3 shadow-2xl">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for salons, services, or locations..."
                  className="flex-1 px-6 py-4 rounded-l-xl border-0 focus:outline-none focus:ring-2 focus:ring-white text-lg"
                />
                <button
                  type="submit"
                  className="px-8 py-4 bg-white text-purple-600 font-bold rounded-r-xl hover:bg-gray-50 transition-all relative z-10"
                >
                  Search
                </button>
              </div>
            </form>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate("/auth/sign-up")}
                className="px-8 py-4 bg-white text-purple-600 font-bold rounded-xl hover:bg-gray-50 transition-all shadow-2xl hover:shadow-3xl text-lg"
              >
                Get Started Free
              </button>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-gray-900 mb-2">10,000+</div>
              <div className="text-gray-600 font-medium">Appointments Booked</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-gray-900 mb-2">500+</div>
              <div className="text-gray-600 font-medium">Verified Salons</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-gray-900 mb-2">4.9★</div>
              <div className="text-gray-600 font-medium">Average Rating</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-gray-900 mb-2">50,000+</div>
              <div className="text-gray-600 font-medium">Happy Customers</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 font-medium">
              Book your perfect salon appointment in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg">
                1
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Find Your Salon</h3>
              <p className="text-gray-600 text-lg font-medium">
                Browse hundreds of verified salons, read reviews, and compare services in your area.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg">
                2
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Book Instantly</h3>
              <p className="text-gray-600 text-lg font-medium">
                Choose your preferred time, select your stylist, and book your appointment in seconds.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg">
                3
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Enjoy & Earn</h3>
              <p className="text-gray-600 text-lg font-medium">
                Show up, enjoy your service, and earn loyalty rewards for every visit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Choose Salonica?
            </h2>
            <p className="text-xl text-gray-600 font-medium">
              The easiest way to book and manage your salon appointments
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4 shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Instant Booking</h3>
              <p className="text-gray-600 font-medium">
                Book appointments 24/7 with real-time availability. No phone calls needed.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4 shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Verified Reviews</h3>
              <p className="text-gray-600 font-medium">
                Read authentic reviews from real customers to find the perfect salon.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4 shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Loyalty Rewards</h3>
              <p className="text-gray-600 font-medium">
                Earn points with every booking and redeem for discounts and perks.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4 shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Reminders</h3>
              <p className="text-gray-600 font-medium">
                Never miss an appointment with automatic reminders.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4 shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Secure Payments</h3>
              <p className="text-gray-600 font-medium">
                Safe and secure payment processing with multiple payment options.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4 shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Mobile Friendly</h3>
              <p className="text-gray-600 font-medium">
                Book and manage appointments on the go from any device, anywhere.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dual CTA Section */}
      <section className="py-20 bg-gradient-to-br from-purple-100 via-pink-50 to-pink-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* For Customers */}
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl hover:shadow-2xl transition-shadow">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4 shadow-lg">
                <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">For Customers</h3>
              <p className="text-gray-600 text-lg mb-6 font-medium">
                Discover and book the best salons in your area. Earn rewards with every visit.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-700 font-medium">
                  <span className="text-green-500 mr-3 font-bold">✓</span>
                  Browse verified salons
                </li>
                <li className="flex items-center text-gray-700 font-medium">
                  <span className="text-green-500 mr-3 font-bold">✓</span>
                  Book instantly online
                </li>
                <li className="flex items-center text-gray-700 font-medium">
                  <span className="text-green-500 mr-3 font-bold">✓</span>
                  Earn loyalty points
                </li>
                <li className="flex items-center text-gray-700 font-medium">
                  <span className="text-green-500 mr-3 font-bold">✓</span>
                  Free to use
                </li>
              </ul>
              <button
                onClick={() => navigate("/auth/sign-up?type=customer")}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
              >
                Sign Up as Customer
              </button>
            </div>

            {/* For Salon Owners */}
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl hover:shadow-2xl transition-shadow">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center mb-4 shadow-lg">
                <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">For Salon Owners</h3>
              <p className="text-gray-600 text-lg mb-6 font-medium">
                Grow your business with our powerful booking platform and management tools.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-700 font-medium">
                  <span className="text-green-500 mr-3 font-bold">✓</span>
                  Online booking system
                </li>
                <li className="flex items-center text-gray-700 font-medium">
                  <span className="text-green-500 mr-3 font-bold">✓</span>
                  Customer management
                </li>
                <li className="flex items-center text-gray-700 font-medium">
                  <span className="text-green-500 mr-3 font-bold">✓</span>
                  Analytics dashboard
                </li>
                <li className="flex items-center text-gray-700 font-medium">
                  <span className="text-green-500 mr-3 font-bold">✓</span>
                  No setup fees
                </li>
              </ul>
              <button
                onClick={() => navigate("/auth/sign-up?type=owner")}
                className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl"
              >
                Register Your Salon
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 opacity-90 font-medium">
            Join Salonica today and experience the future of salon booking
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate("/auth/sign-up")}
              className="px-8 py-4 bg-white text-purple-600 font-bold rounded-xl hover:bg-gray-100 transition-all shadow-lg text-lg"
            >
              Get Started Free
            </button>
            <button
              onClick={handleBrowseClick}
              className="px-8 py-4 bg-white/20 backdrop-blur-sm text-white font-bold rounded-xl hover:bg-white/30 transition-all text-lg"
            >
              {user ? "Explore Salons" : "Browse Salons"}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div>
              <img
                src={salonicaLogo}
                alt="Salonica"
                className="h-10 w-auto mb-4"
              />
              <p className="text-gray-400 font-medium">
                Your perfect salon appointment, just a click away.
              </p>
            </div>

            {/* For Customers */}
            <div>
              <h4 className="font-bold text-white mb-4">For Customers</h4>
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={handleBrowseClick}
                    className="hover:text-white transition-colors text-left font-medium"
                  >
                    Browse Salons
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate("/auth/sign-in")}
                    className="hover:text-white transition-colors text-left font-medium"
                  >
                    Sign In
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate("/auth/sign-up?type=customer")}
                    className="hover:text-white transition-colors text-left font-medium"
                  >
                    Sign Up
                  </button>
                </li>
              </ul>
            </div>

            {/* For Business */}
            <div>
              <h4 className="font-bold text-white mb-4">For Business</h4>
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={() => navigate("/auth/sign-up?type=owner")}
                    className="hover:text-white transition-colors text-left font-medium"
                  >
                    Register Your Salon
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate("/auth/sign-in")}
                    className="hover:text-white transition-colors text-left font-medium"
                  >
                    Owner Login
                  </button>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-bold text-white mb-4">Company</h4>
              <ul className="space-y-2">
                <li>
                  <span className="text-gray-400 font-medium">About Us</span>
                </li>
                <li>
                  <span className="text-gray-400 font-medium">Contact</span>
                </li>
                <li>
                  <span className="text-gray-400 font-medium">Privacy Policy</span>
                </li>
                <li>
                  <span className="text-gray-400 font-medium">Terms of Service</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p className="font-medium">&copy; 2025 Salonica. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
