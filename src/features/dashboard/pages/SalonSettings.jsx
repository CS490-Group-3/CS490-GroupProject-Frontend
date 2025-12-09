import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../shared/api/client.js";
import { updateSalon, updateSalonHours, getSalonHours } from "../../salon-reg/api.js";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Textarea } from "../../../shared/ui/textarea";
import { Save, Loader2, ArrowLeft } from "lucide-react";

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default function SalonSettings() {
  const navigate = useNavigate();
  const [salon, setSalon] = useState(null);
  const [salonId, setSalonId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const DESCRIPTION_MAX_LENGTH = 255;
  
  const [salonData, setSalonData] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    phone: "",
    email: "",
  });
  const [logoFile, setLogoFile] = useState(null);
  
  const [hours, setHours] = useState(
    DAYS.map((day) => ({
      day_of_week: day.value,
      is_closed: day.value < 1 || day.value > 5,
      open_time: "09:00",
      close_time: "17:00",
    }))
  );

  useEffect(() => {
    loadSalonData();
  }, []);

  const loadSalonData = async () => {
    try {
      setLoading(true);
      const res = await api("/salons/mine");
      const salonData = res.salon || null;
      
      if (!salonData || salonData.status !== "verified") {
        navigate("/salon-dashboard");
        return;
      }
      
      setSalon(salonData);
      setSalonId(salonData.id);
      setSalonData({
        name: salonData.name || "",
        description: salonData.description || "",
        address: salonData.address || "",
        city: salonData.city || "",
        state: salonData.state || "",
        zip_code: salonData.zip_code || "",
        phone: salonData.phone || "",
        email: salonData.email || "",
      });
      
      // Load hours
      try {
        const hoursRes = await getSalonHours(salonData.id);
        if (hoursRes.hours && hoursRes.hours.length > 0) {
          const hoursMap = {};
          hoursRes.hours.forEach((h) => {
            hoursMap[h.day_of_week] = h;
          });
          setHours(
            DAYS.map((day) => {
              const existing = hoursMap[day.value];
              return existing || {
                day_of_week: day.value,
                is_closed: day.value < 1 || day.value > 5,
                open_time: "09:00",
                close_time: "17:00",
              };
            })
          );
        }
      } catch (err) {
        console.error("Error loading hours:", err);
      }
    } catch (err) {
      console.error("Error loading salon:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSalon = async () => {
    if (!salonId) return;
    
    // Validate description length
    if (salonData.description && salonData.description.length > DESCRIPTION_MAX_LENGTH) {
      alert(`Description must be ${DESCRIPTION_MAX_LENGTH} characters or less. Currently ${salonData.description.length} characters.`);
      return;
    }
    
    setSaving(true);
    try {
      await updateSalon(salonId, salonData, logoFile);
      await loadSalonData();
      setLogoFile(null);
      alert("Salon information updated successfully!");
    } catch (error) {
      alert("Failed to update salon: " + (error.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHours = async () => {
    if (!salonId) return;
    setSaving(true);
    try {
      await updateSalonHours(salonId, hours);
      alert("Hours updated successfully!");
    } catch (error) {
      alert("Failed to update hours: " + (error.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button onClick={() => navigate("/salon-dashboard")} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold">Salon Settings</h1>
      </div>

      {/* Salon Information */}
      <div className="bg-white border rounded-2xl p-6 space-y-6">
        <h2 className="text-xl font-semibold">Business Information</h2>
        
        <div className="space-y-4">
          <div>
            <Label>Salon Name *</Label>
            <Input
              value={salonData.name}
              onChange={(e) => setSalonData({ ...salonData, name: e.target.value })}
              required
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Description</Label>
              <span className={`text-sm ${salonData.description.length > DESCRIPTION_MAX_LENGTH ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                {salonData.description.length} / {DESCRIPTION_MAX_LENGTH}
              </span>
            </div>
            <Textarea
              value={salonData.description}
              onChange={(e) => setSalonData({ ...salonData, description: e.target.value })}
              rows={4}
              className={salonData.description.length > DESCRIPTION_MAX_LENGTH ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
            />
            {salonData.description.length > DESCRIPTION_MAX_LENGTH && (
              <p className="text-sm text-red-600 mt-1 font-medium">
                Description exceeds the {DESCRIPTION_MAX_LENGTH} character limit by {salonData.description.length - DESCRIPTION_MAX_LENGTH} characters. Please shorten it to submit.
              </p>
            )}
          </div>
          
          <div>
            <Label>Address *</Label>
            <Input
              value={salonData.address}
              onChange={(e) => setSalonData({ ...salonData, address: e.target.value })}
              required
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>City *</Label>
              <Input
                value={salonData.city}
                onChange={(e) => setSalonData({ ...salonData, city: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>State *</Label>
              <Input
                value={salonData.state}
                onChange={(e) => setSalonData({ ...salonData, state: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Zip Code *</Label>
              <Input
                value={salonData.zip_code}
                onChange={(e) => setSalonData({ ...salonData, zip_code: e.target.value })}
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Phone *</Label>
              <Input
                value={salonData.phone}
                onChange={(e) => setSalonData({ ...salonData, phone: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={salonData.email}
                onChange={(e) => setSalonData({ ...salonData, email: e.target.value })}
                required
              />
            </div>
          </div>
          
          <div>
            <Label>Logo</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files[0])}
            />
            {salon?.logo_url && !logoFile && (
              <img src={salon.logo_url} alt="Current logo" className="mt-2 h-32 w-32 object-cover rounded" />
            )}
          </div>
        </div>
        
        <Button onClick={handleSaveSalon} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      {/* Business Hours */}
      <div className="bg-white border rounded-2xl p-6 space-y-6">
        <h2 className="text-xl font-semibold">Business Hours</h2>
        
        <div className="space-y-4">
          {DAYS.map((day) => {
            const dayHours = hours.find(h => h.day_of_week === day.value);
            return (
              <div key={day.value} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="w-24 font-medium">{day.label}</div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!dayHours?.is_closed}
                    onChange={(e) => {
                      setHours(prev =>
                        prev.map(h =>
                          h.day_of_week === day.value
                            ? { ...h, is_closed: !e.target.checked }
                            : h
                        )
                      );
                    }}
                  />
                  {!dayHours?.is_closed ? (
                    <Label>Open</Label>
                  ) : (
                    <span className="text-gray-500">Closed</span>
                  )}
                </div>
                {!dayHours?.is_closed && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={dayHours?.open_time || "09:00"}
                      onChange={(e) => {
                        setHours(prev =>
                          prev.map(h =>
                            h.day_of_week === day.value
                              ? { ...h, open_time: e.target.value }
                              : h
                          )
                        );
                      }}
                      className="w-32"
                    />
                    <span>to</span>
                    <Input
                      type="time"
                      value={dayHours?.close_time || "17:00"}
                      onChange={(e) => {
                        setHours(prev =>
                          prev.map(h =>
                            h.day_of_week === day.value
                              ? { ...h, close_time: e.target.value }
                              : h
                          )
                        );
                      }}
                      className="w-32"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <Button onClick={handleSaveHours} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Hours
        </Button>
      </div>
    </div>
  );
}

