import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/auth-provider.jsx";
import { getCurrentUserProfile, updateUserProfile } from "../api.js";
import { listUserAppointments } from "../../booking/api.js";
import { Card } from "../../../shared/ui/card.jsx";
import { Button } from "../../../shared/ui/button.jsx";
import { Input } from "../../../shared/ui/input.jsx";
import { Label } from "../../../shared/ui/label.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../../shared/ui/tabs.jsx";
import { Badge } from "../../../shared/ui/badge.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/ui/select.jsx";
import { ImageWithFallback } from "../../../shared/ui/ImageWithFallback.jsx";

const AGE_BRACKETS = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
const GENDERS = ["male", "female", "non-binary", "prefer-not-to-say", "other"];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Data states
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState({ upcoming: [], past: [] });

  // Form states
  const [profileForm, setProfileForm] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});

  const userRole = user?.role;
  const isCustomer = userRole === "customer";
  const isOwner = userRole === "salon_owner" || userRole === "owner";
  const isBarber = userRole === "barber";
  const isAdmin = userRole === "admin";

  // Validation functions
  const validateEmail = (email) => {
    if (!email) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? null : "Please enter a valid email address";
  };

  const validatePhone = (phone) => {
    if (!phone) return null;
    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length !== 10) {
      return "Phone number must be exactly 10 digits";
    }
    return null;
  };

  const validateCity = (city) => {
    if (!city) return null;
    if (city.trim().length === 0) {
      return "City cannot be empty";
    }
    const cityRegex = /^[a-zA-Z\s\-'\.]+$/;
    if (!cityRegex.test(city)) {
      return "City can only contain letters, spaces, hyphens, apostrophes, and periods";
    }
    return null;
  };

  const validateState = (state) => {
    if (!state) return null;
    if (state.trim().length === 0) {
      return "State cannot be empty";
    }
    const stateRegex = /^[a-zA-Z\s\-'\.]+$/;
    if (!stateRegex.test(state)) {
      return "State can only contain letters, spaces, hyphens, apostrophes, and periods";
    }
    return null;
  };

  const updateFieldError = (field, value) => {
    let error = null;
    switch (field) {
      case "email":
        error = validateEmail(value);
        break;
      case "phone":
        error = validatePhone(value);
        break;
      case "city":
        error = validateCity(value);
        break;
      case "state":
        error = validateState(value);
        break;
      default:
        break;
    }
    setFieldErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  };

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    setError(null);
    try {
      const profileData = await getCurrentUserProfile();
      setProfile(profileData);
      
      // Initialize form with profile data (snake_case from backend)
      // Strip non-digits from phone number if it exists
      const phoneValue = profileData?.phone ? profileData.phone.replace(/\D/g, "").slice(0, 10) : "";
      setProfileForm({
        first_name: profileData?.first_name || "",
        last_name: profileData?.last_name || "",
        email: profileData?.email || "",
        phone: phoneValue,
        profile_image_url: profileData?.profile_image_url || "",
        date_of_birth: profileData?.date_of_birth || "",
        city: profileData?.city || "",
        state: profileData?.state || "",
        age_bracket: profileData?.age_bracket || null,
        gender: profileData?.gender || null,
      });

      // Load customer-specific data only for customers
      if (isCustomer) {
        try {
          const appointmentsData = await listUserAppointments();
          setAppointments(appointmentsData || { upcoming: [], past: [] });
        } catch (err) {
          console.error("Failed to load customer data:", err);
        }
      }
    } catch (err) {
      setError("Failed to load profile data: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile() {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    // Validate all fields
    const errors = {};
    if (profileForm.email) {
      const emailError = validateEmail(profileForm.email);
      if (emailError) errors.email = emailError;
    }
    if (profileForm.phone) {
      const phoneError = validatePhone(profileForm.phone);
      if (phoneError) errors.phone = phoneError;
    }
    if (profileForm.city) {
      const cityError = validateCity(profileForm.city);
      if (cityError) errors.city = cityError;
    }
    if (profileForm.state) {
      const stateError = validateState(profileForm.state);
      if (stateError) errors.state = stateError;
    }

    // Frontend validation
    if (profileForm.first_name && profileForm.first_name.length > 100) {
      errors.first_name = "First name must be 100 characters or less";
    }
    if (profileForm.last_name && profileForm.last_name.length > 100) {
      errors.last_name = "Last name must be 100 characters or less";
    }
    if (profileForm.city && profileForm.city.length > 100) {
      errors.city = "City must be 100 characters or less";
    }
    if (profileForm.state && profileForm.state.length > 50) {
      errors.state = "State must be 50 characters or less";
    }

    // If there are validation errors, show them and stop
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("Please fix the validation errors below");
      setSaving(false);
      return;
    }

    try {
      // Only send fields that have values (partial update)
      const updateData = {};
      if (profileForm.first_name !== undefined) updateData.first_name = profileForm.first_name || null;
      if (profileForm.last_name !== undefined) updateData.last_name = profileForm.last_name || null;
      if (profileForm.phone !== undefined) updateData.phone = profileForm.phone || null;
      if (profileForm.profile_image_url !== undefined) updateData.profile_image_url = profileForm.profile_image_url || null;
      if (profileForm.date_of_birth !== undefined) updateData.date_of_birth = profileForm.date_of_birth || null;
      if (profileForm.city !== undefined) updateData.city = profileForm.city || null;
      if (profileForm.state !== undefined) updateData.state = profileForm.state || null;
      if (profileForm.age_bracket !== undefined) updateData.age_bracket = profileForm.age_bracket || null;
      if (profileForm.gender !== undefined) updateData.gender = profileForm.gender || null;

      const result = await updateUserProfile(updateData);
      setProfile({ ...profile, ...result });
      
      // Update user in auth context so header reflects changes immediately
      if (updateUser && result) {
        // Merge updated fields with existing user data
        updateUser({
          first_name: result.first_name !== undefined ? result.first_name : profile?.first_name,
          last_name: result.last_name !== undefined ? result.last_name : profile?.last_name,
          phone: result.phone !== undefined ? result.phone : profile?.phone,
          profile_image_url: result.profile_image_url !== undefined ? result.profile_image_url : profile?.profile_image_url,
          date_of_birth: result.date_of_birth !== undefined ? result.date_of_birth : profile?.date_of_birth,
          city: result.city !== undefined ? result.city : profile?.city,
          state: result.state !== undefined ? result.state : profile?.state,
          age_bracket: result.age_bracket !== undefined ? result.age_bracket : profile?.age_bracket,
          gender: result.gender !== undefined ? result.gender : profile?.gender,
        });
      }
      
      setIsEditingProfile(false);
      setFieldErrors({});
      setSuccessMessage("Profile updated successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const errorMessage = err.message || "Unknown error";
      
      // Try to parse error details if available
      let parsedError = null;
      try {
        parsedError = JSON.parse(errorMessage);
      } catch {
        // Not JSON, use as-is
      }

      if (parsedError) {
        if (parsedError.details && Array.isArray(parsedError.details)) {
          const detailMessages = parsedError.details.map(d => d.msg || d.message || JSON.stringify(d)).join(", ");
          setError(`Validation failed: ${detailMessages}`);
        } else if (parsedError.error) {
          setError(parsedError.error);
        } else {
          setError(errorMessage);
        }
      } else {
        setError("Failed to update profile: " + errorMessage);
      }
    } finally {
      setSaving(false);
    }
  }

  function handleCancelProfile() {
    // Reset form to original profile data
    // Strip non-digits from phone number if it exists
    const phoneValue = profile?.phone ? profile.phone.replace(/\D/g, "").slice(0, 10) : "";
    setProfileForm({
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      email: profile?.email || "",
      phone: phoneValue,
      profile_image_url: profile?.profile_image_url || "",
      date_of_birth: profile?.date_of_birth || "",
      city: profile?.city || "",
      state: profile?.state || "",
      age_bracket: profile?.age_bracket || null,
      gender: profile?.gender || null,
    });
    setIsEditingProfile(false);
    setError(null);
    setFieldErrors({});
  }


  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  // Determine tabs based on role
  const tabs = ["profile"];
  if (isCustomer) {
    tabs.push("history");
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Profile</h1>
        <p className="text-gray-600">Manage your profile information and preferences.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {successMessage}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full mb-8 ${tabs.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          <TabsTrigger value="profile">Profile Info</TabsTrigger>
          {isCustomer && (
            <TabsTrigger value="history">Visit History</TabsTrigger>
          )}
        </TabsList>

        {/* Profile Info Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Personal Information</h2>
              {!isEditingProfile ? (
                <Button onClick={() => {
                  setIsEditingProfile(true);
                  setFieldErrors({});
                  setError(null);
                }}>Edit Profile</Button>
              ) : (
                <div className="space-x-2">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="outline" onClick={handleCancelProfile}>Cancel</Button>
                </div>
              )}
            </div>

            {/* Profile Image */}
            <div className="mb-6">
              <Label>Profile Image URL</Label>
              <div className="flex items-center gap-4 mt-2">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                  {profileForm.profile_image_url ? (
                    <ImageWithFallback
                      src={profileForm.profile_image_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400 text-2xl">?</span>
                  )}
                </div>
                {isEditingProfile && (
                  <div className="flex-1">
                    <Input
                      id="profile_image_url"
                      type="url"
                      value={profileForm.profile_image_url || ""}
                      onChange={(e) => setProfileForm({ ...profileForm, profile_image_url: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      className="max-w-md"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter a URL to your profile image</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={profileForm.first_name || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                  disabled={!isEditingProfile}
                  maxLength={100}
                  placeholder="Enter first name"
                />
              </div>

              <div>
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={profileForm.last_name || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                  disabled={!isEditingProfile}
                  maxLength={100}
                  placeholder="Enter last name"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileForm.email || ""}
                  disabled
                  className={`bg-gray-50 ${fieldErrors.email ? "border-red-500" : ""}`}
                />
                {fieldErrors.email && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>
                )}
                {!fieldErrors.email && (
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profileForm.phone || ""}
                  onChange={(e) => {
                    // Strip all non-digits
                    const digitsOnly = e.target.value.replace(/\D/g, "");
                    // Limit to 10 digits
                    const phoneValue = digitsOnly.slice(0, 10);
                    setProfileForm({ ...profileForm, phone: phoneValue });
                    updateFieldError("phone", phoneValue);
                  }}
                  disabled={!isEditingProfile}
                  maxLength={10}
                  placeholder="1234567890"
                  className={fieldErrors.phone ? "border-red-500" : ""}
                />
                {fieldErrors.phone && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.phone}</p>
                )}
                {!fieldErrors.phone && (
                  <p className="text-xs text-gray-500 mt-1">Enter 10 digits (no dashes or spaces)</p>
                )}
              </div>

              <div>
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={profileForm.date_of_birth || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, date_of_birth: e.target.value })}
                  disabled={!isEditingProfile}
                />
              </div>

              <div>
                <Label htmlFor="age_bracket">Age Bracket</Label>
                <Select
                  value={profileForm.age_bracket || undefined}
                  onValueChange={(value) => setProfileForm({ ...profileForm, age_bracket: value === "__none__" ? null : value })}
                  disabled={!isEditingProfile}
                >
                  <SelectTrigger id="age_bracket">
                    <SelectValue placeholder="Select age bracket" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {AGE_BRACKETS.map(bracket => (
                      <SelectItem key={bracket} value={bracket}>{bracket}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={profileForm.gender || undefined}
                  onValueChange={(value) => setProfileForm({ ...profileForm, gender: value === "__none__" ? null : value })}
                  disabled={!isEditingProfile}
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {GENDERS.map(gender => (
                      <SelectItem key={gender} value={gender}>
                        {gender.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={profileForm.city || ""}
                  onChange={(e) => {
                    const cityValue = e.target.value;
                    setProfileForm({ ...profileForm, city: cityValue });
                    updateFieldError("city", cityValue);
                  }}
                  disabled={!isEditingProfile}
                  maxLength={100}
                  placeholder="Enter city"
                  className={fieldErrors.city ? "border-red-500" : ""}
                />
                {fieldErrors.city && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.city}</p>
                )}
              </div>

              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={profileForm.state || ""}
                  onChange={(e) => {
                    const stateValue = e.target.value;
                    setProfileForm({ ...profileForm, state: stateValue });
                    updateFieldError("state", stateValue);
                  }}
                  disabled={!isEditingProfile}
                  maxLength={50}
                  placeholder="Enter state"
                  className={fieldErrors.state ? "border-red-500" : ""}
                />
                {fieldErrors.state && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.state}</p>
                )}
              </div>
            </div>

            {/* Role-specific quick links */}
            {(isOwner || isBarber || isAdmin) && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-semibold mb-3">Quick Links</h3>
                <div className="flex flex-wrap gap-2">
                  {isOwner && (
                    <Button variant="outline" onClick={() => navigate("/salon-dashboard")}>
                      Salon Dashboard
                    </Button>
                  )}
                  {isBarber && (
                    <Button variant="outline" onClick={() => navigate("/schedule")}>
                      My Schedule
                    </Button>
                  )}
                  {isAdmin && (
                    <Button variant="outline" onClick={() => navigate("/admin/dashboard")}>
                      Admin Dashboard
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Visit History Tab - Customer Only */}
        {isCustomer && (
          <TabsContent value="history" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-6">Appointment History</h2>

              {appointments.past && appointments.past.length > 0 ? (
                <div className="space-y-4">
                  {appointments.past.map((appt) => (
                    <div
                      key={appt.id}
                      className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{appt.salon?.name}</h3>
                            <Badge variant={appt.status === "completed" ? "default" : "outline"}>
                              {appt.status}
                            </Badge>
                          </div>
                          <p className="text-gray-600 text-sm mb-1">{appt.salon?.address}</p>
                          <p className="text-gray-700 mb-1">
                            <span className="font-medium">Service:</span> {appt.service?.name}
                          </p>
                          <p className="text-gray-700 mb-1">
                            <span className="font-medium">Provider:</span> {appt.employee?.name}
                          </p>
                          <p className="text-gray-700">
                            <span className="font-medium">Date:</span>{" "}
                            {appt.whenISO ? new Date(appt.whenISO).toLocaleDateString() : "N/A"} at{" "}
                            {appt.whenISO ? new Date(appt.whenISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A"}
                          </p>
                          {appt.cancellation_reason && (
                            <p className="text-red-600 text-sm mt-2">
                              <span className="font-medium">Cancellation reason:</span> {appt.cancellation_reason}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">${appt.service?.price || "N/A"}</p>
                          <p className="text-sm text-gray-500">{appt.payment_status || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>No appointment history yet.</p>
                  <p className="text-sm mt-2">Book your first appointment to see it here!</p>
                </div>
              )}
            </Card>

            {appointments.upcoming && appointments.upcoming.length > 0 && (
              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-6">Upcoming Appointments</h2>
                <div className="space-y-4">
                  {appointments.upcoming.map((appt) => (
                    <div
                      key={appt.id}
                      className="p-4 border border-blue-200 bg-blue-50 rounded-lg"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{appt.salon?.name}</h3>
                            <Badge variant="default">{appt.status}</Badge>
                          </div>
                          <p className="text-gray-600 text-sm mb-1">{appt.salon?.address}</p>
                          <p className="text-gray-700 mb-1">
                            <span className="font-medium">Service:</span> {appt.service?.name}
                          </p>
                          <p className="text-gray-700 mb-1">
                            <span className="font-medium">Provider:</span> {appt.employee?.name}
                          </p>
                          <p className="text-gray-700">
                            <span className="font-medium">Date:</span>{" "}
                            {appt.whenISO ? new Date(appt.whenISO).toLocaleDateString() : "N/A"} at{" "}
                            {appt.whenISO ? new Date(appt.whenISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">${appt.service?.price || "N/A"}</p>
                          <p className="text-sm text-gray-500">{appt.payment_status || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>
        )}

      </Tabs>
    </div>
  );
}
