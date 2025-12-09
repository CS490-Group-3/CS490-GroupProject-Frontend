import { useEffect, useState } from "react";
import { getMyBarberSalon } from "../api.js";
import { getSalon } from "../../booking/api.js";
import { Building2, MapPin, Phone, Mail, Clock, Users, Scissors, AlertCircle } from "lucide-react";
import { Card } from "../../../shared/ui/card.jsx";

export default function BarberSalon() {
  const [salon, setSalon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const result = await getMyBarberSalon();
        if (!alive) return;
        
        if (result.salon) {
          // Fetch full salon details including services and employees
          const fullSalon = await getSalon(result.salon.id);
          if (!alive) return;
          setSalon(fullSalon);
        } else {
          setSalon(null);
        }
      } catch (err) {
        if (!alive) return;
        console.error("Error loading salon:", err);
        // If 404 or "not associated" error, barber hasn't been added to a salon yet
        if (err.message?.includes("not associated") || err.response?.status === 404 || err.message?.includes("404")) {
          setSalon(null);
          setError(null);
        } else {
          setError(err.message || "Failed to load salon information");
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading salon information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex items-center gap-3 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <div>
              <h2 className="font-semibold">Error</h2>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card className="p-8 border-2 border-dashed border-gray-300">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Not Yet Added to a Salon
              </h2>
              <p className="text-gray-600 max-w-md mx-auto">
                You haven't been added to a salon yet. Please contact the salon owner to add you to their salon.
                Once you're added, you'll be able to view all salon details, manage your schedule, and see your appointments here.
              </p>
            </div>
            <div className="pt-4">
              <p className="text-sm text-gray-500">
                If you believe this is an error, please reach out to your salon owner or administrator.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const services = salon.services || [];
  const employees = salon.employees || [];
  const hours = salon.hours || [];

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">My Salon</h1>
      </div>

      {/* Salon Overview */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {salon.logo_url && (
            <div className="md:col-span-1">
              <img
                src={salon.logo_url}
                alt={salon.name}
                className="w-full h-48 object-cover rounded-lg border"
              />
            </div>
          )}
          <div className={salon.logo_url ? "md:col-span-2" : "md:col-span-3"}>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">{salon.name}</h2>
            {salon.description && (
              <p className="text-gray-700 mb-4">{salon.description}</p>
            )}
            <div className="space-y-2">
              {salon.address && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {salon.address}
                    {salon.city && `, ${salon.city}`}
                    {salon.state && `, ${salon.state}`}
                    {salon.zip_code && ` ${salon.zip_code}`}
                  </span>
                </div>
              )}
              {salon.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{salon.phone}</span>
                </div>
              )}
              {salon.email && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>{salon.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Operating Hours */}
      {hours.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900">Operating Hours</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {hours.map((hour) => (
              <div
                key={hour.day_of_week}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <span className="font-medium text-gray-900">
                  {dayNames[hour.day_of_week] || `Day ${hour.day_of_week}`}
                </span>
                <span className="text-gray-600">
                  {hour.is_closed
                    ? "Closed"
                    : `${formatTime(hour.open_time)} - ${formatTime(hour.close_time)}`}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Services */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Scissors className="h-5 w-5 text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-900">Services</h2>
        </div>
        {services.length === 0 ? (
          <p className="text-gray-600 text-sm">No services available yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((service) => (
              <div
                key={service.id}
                className="p-4 border rounded-lg bg-white hover:bg-gray-50 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{service.name}</h3>
                    {service.description && (
                      <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      {service.duration_minutes && (
                        <span>{service.duration_minutes} min</span>
                      )}
                      {service.price != null && (
                        <span className="font-semibold text-gray-900">
                          ${Number(service.price).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Team Members */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-900">Team Members</h2>
        </div>
        {employees.length === 0 ? (
          <p className="text-gray-600 text-sm">No team members listed yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className="p-4 border rounded-lg bg-white"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={employee.avatar || "https://placehold.co/64x64?text=Staff"}
                    alt={employee.name || "Team Member"}
                    className="h-12 w-12 rounded-full object-cover border"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {employee.name || "Team Member"}
                    </h3>
                    {employee.years_experience != null && (
                      <p className="text-sm text-gray-600">
                        {employee.years_experience} years experience
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {employee.is_active ? "Active" : "Inactive"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

