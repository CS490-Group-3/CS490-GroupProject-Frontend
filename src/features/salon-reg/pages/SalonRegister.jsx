import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../shared/ui/card";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Textarea } from "../../../shared/ui/textarea";
import { Alert, AlertDescription } from "../../../shared/ui/alert";
import { Badge } from "../../../shared/ui/badge";
import { CheckCircle2, Clock, Upload, AlertCircle, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { submitSalonRegistration, getOwnedSalon, getSalonDetail, updatePendingApplication, checkSetupStatus, submitSalonAppeal, getSalonStatusHistory } from "../api.js";

export default function SalonRegister() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [statusMessage, setStatusMessage] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [ownedSalon, setOwnedSalon] = useState(null);
  const [currentSalonId, setCurrentSalonId] = useState(null);
  const [showForm, setShowForm] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [existingLogoUrl, setExistingLogoUrl] = useState("");
  const [existingLicenseUrl, setExistingLicenseUrl] = useState("");
  const [originalValues, setOriginalValues] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    email: "",
    description: "",
    timezone: "America/New_York",
  });

  const cacheBust = (url) => {
    if (!url) return "";
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}v=${Date.now()}`;
  };

  const refreshSalonData = async () => {
    try {
      const res = await getOwnedSalon();
      const salon = res.salon || null;
      setOwnedSalon(salon);
      setCurrentSalonId(salon?.id || null);

      if (!salon) {
        setStatus("not_submitted");
        setShowForm(true);
        setIsEditing(true);
        return;
      }

      if (salon.status === "verified") {
        // Check if setup is complete
        const setupStatus = await checkSetupStatus(salon.id);
        if (!setupStatus.isComplete) {
          // Redirect to setup page if not complete
          navigate("/salon-setup");
          return;
        }
        setStatus("approved");
        setShowForm(false);
        setIsEditing(false);
      } else if (salon.status === "pending") {
        setStatus("pending");
        setShowForm(false);
        setIsEditing(false);
      } else if (salon.status === "rejected") {
        setStatus("rejected");
        setShowForm(true);
        setIsEditing(true);
        // Reset form fields for fresh appeal (don't preload old data)
        setName("");
        setAddress("");
        setCity("");
        setState("");
        setZip("");
        setPhone("");
        setEmail("");
        setDescription("");
        setTimezone("America/New_York");
        setLogoFile(null);
        setLicenseFile(null);
        // Fetch rejection reason from status history
        try {
          const history = await getSalonStatusHistory(salon.id);
          const rejectionNotif = history.timeline?.find(n => 
            n.title === "Salon Denied" || n.message?.includes("Denied")
          );
          if (rejectionNotif?.message) {
            // Extract reason from message (format: "Your Salon has been Denied. Reason(s): {reason}")
            const reasonMatch = rejectionNotif.message.match(/Reason\(s\):\s*(.+)/i);
            if (reasonMatch) {
              setRejectionReason(reasonMatch[1].trim());
            } else {
              setRejectionReason(rejectionNotif.message);
            }
          }
        } catch (err) {
          console.error("Failed to fetch rejection reason:", err);
        }
      } else {
        setStatus("not_submitted");
        setShowForm(true);
        setIsEditing(true);
      }

      // Only load detail data if not rejected (rejected salons get fresh form)
      if (salon.status !== "rejected") {
        try {
          const detail = await getSalonDetail(salon.id);
          setName(detail.name || salon.name || "");
          setAddress(detail.address || salon.address || "");
          setCity(detail.city || "");
          setState(detail.state || "");
          setZip(detail.zip_code || "");
          setPhone(detail.phone || "");
          setEmail(detail.email || "");
          setDescription(detail.description || "");
          setTimezone(detail.timezone || "America/New_York");
          setExistingLogoUrl(cacheBust(detail.logo_url || salon.logo_url || ""));
          setExistingLicenseUrl(cacheBust(detail.license_url || salon.license_url || ""));
          setOriginalValues({
            name: detail.name || salon.name || "",
            address: detail.address || salon.address || "",
            city: detail.city || "",
            state: detail.state || "",
            zip: detail.zip_code || "",
            phone: detail.phone || "",
            email: detail.email || "",
            description: detail.description || "",
            timezone: detail.timezone || "America/New_York",
          });
        } catch (err) {
          setName(salon?.name || "");
          setAddress(salon?.address || "");
          setCity(salon?.city || "");
          setState(salon?.state || "");
          setZip(salon?.zip_code || "");
          setPhone(salon?.phone || "");
          setEmail(salon?.email || "");
          setDescription(salon?.description || "");
          setExistingLogoUrl(cacheBust(salon?.logo_url || ""));
          setExistingLicenseUrl(cacheBust(salon?.license_url || ""));
          setOriginalValues({
            name: salon?.name || "",
            address: salon?.address || "",
            city: salon?.city || "",
            state: salon?.state || "",
            zip: salon?.zip_code || "",
            phone: salon?.phone || "",
            email: salon?.email || "",
            description: salon?.description || "",
            timezone: salon?.timezone || "America/New_York",
          });
        }
      }
    } catch (error) {
      console.error("Failed to load owned salons:", error);
      setOwnedSalon(null);
      setStatus("not_submitted");
      setShowForm(true);
      setIsEditing(true);
    }
  };

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [logoFile, setLogoFile] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);
  const [formError, setFormError] = useState("");
  
  const DESCRIPTION_MAX_LENGTH = 255;

  const parseError = (err) => {
    const fallback = "Application failed. Try again later.";
    if (!err) return fallback;
    const raw = err.message || err.toString();
    const lowerRaw = raw.toLowerCase();
    if (lowerRaw.includes("row-level security") || lowerRaw.includes("rls")) {
      return "Try a different file.";
    }
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "string") return parsed;
      if (parsed.error) return parsed.error;
      if (Array.isArray(parsed.details) && parsed.details.length) {
        const first = parsed.details[0];
        if (first.msg) return first.msg;
        if (first.message) return first.message;
      }
    } catch (_) {
      // not JSON
    }
    if (raw && raw.includes("Validation failed")) return "Validation failed. Please check your entries.";
    return raw || fallback;
  };

  const validateForm = () => {
    const phoneDigits = phone ? phone.replace(/\D/g, "") : "";
    const emailValid = email ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) : false;
    if (!phone && !email) {
      setFormError("Please provide at least one contact method (phone or email).");
      return false;
    }
    if (phoneDigits && phoneDigits.length !== 10) {
      setFormError("Phone must be exactly 10 digits.");
      return false;
    }
    if (email && !emailValid) {
      setFormError("Please enter a valid email address.");
      return false;
    }
    if (!state || state.length !== 2) {
      setFormError("State must be a 2-letter code.");
      return false;
    }
    if (!zip || !/^\d{5}$/.test(zip)) {
      setFormError("ZIP Code must be 5 digits.");
      return false;
    }
    if (status === "not_submitted" && !licenseFile) {
      setFormError("Business license is required.");
      return false;
    }
    if (description && description.length > DESCRIPTION_MAX_LENGTH) {
      setFormError(`Description must be ${DESCRIPTION_MAX_LENGTH} characters or less.`);
      return false;
    }
    setFormError("");
    return true;
  };

  const resetToOriginal = () => {
    setName(originalValues.name || "");
    setAddress(originalValues.address || "");
    setCity(originalValues.city || "");
    setState(originalValues.state || "");
    setZip(originalValues.zip || "");
    setPhone(originalValues.phone || "");
    setEmail(originalValues.email || "");
    setDescription(originalValues.description || "");
    setTimezone(originalValues.timezone || "America/New_York");
    setLogoFile(null);
    setLicenseFile(null);
    setFormError("");
    setIsEditing(false);
  };

  useEffect(() => {
    async function loadOwned() {
      try {
        const res = await getOwnedSalon();
        const salon = res.salon || null;
        setOwnedSalon(salon);
        setCurrentSalonId(salon?.id || null);
        if (!salon) {
          setStatus("not_submitted");
          setShowForm(true);
          setIsEditing(true);
        } else if (salon.status === "verified") {
          // Check if setup is complete
          const setupStatus = await checkSetupStatus(salon.id);
          if (!setupStatus.isComplete) {
            // Redirect to setup page if not complete
            navigate("/salon-setup");
            return;
          }
          setStatus("approved");
          setShowForm(false);
          setIsEditing(false);
        } else if (salon.status === "pending") {
          setStatus("pending");
          setShowForm(false);
          setIsEditing(false);
        } else if (salon.status === "rejected") {
          setStatus("rejected");
          setShowForm(true);
          setIsEditing(true);
          // Reset form fields for fresh appeal (don't preload old data)
          setName("");
          setAddress("");
          setCity("");
          setState("");
          setZip("");
          setPhone("");
          setEmail("");
          setDescription("");
          setTimezone("America/New_York");
          setLogoFile(null);
          setLicenseFile(null);
          // Fetch rejection reason from status history
          try {
            const history = await getSalonStatusHistory(salon.id);
            const rejectionNotif = history.timeline?.find(n => 
              n.title === "Salon Denied" || n.message?.includes("Denied")
            );
            if (rejectionNotif?.message) {
              const reasonMatch = rejectionNotif.message.match(/Reason\(s\):\s*(.+)/i);
              if (reasonMatch) {
                setRejectionReason(reasonMatch[1].trim());
              } else {
                setRejectionReason(rejectionNotif.message);
              }
            }
          } catch (err) {
            console.error("Failed to fetch rejection reason:", err);
          }
        } else {
          setStatus("not_submitted");
          setShowForm(true);
          setIsEditing(true);
        }
        // Only load detail data if not rejected (rejected salons get fresh form)
        if (salon?.id && salon.status !== "rejected") {
          try {
            const detail = await getSalonDetail(salon.id);
            setName(detail.name || salon.name || "");
            setAddress(detail.address || salon.address || "");
            setCity(detail.city || "");
            setState(detail.state || "");
            setZip(detail.zip_code || "");
            setPhone(detail.phone || "");
            setEmail(detail.email || "");
            setDescription(detail.description || "");
            setTimezone(detail.timezone || "America/New_York");
            setExistingLogoUrl(detail.logo_url || salon.logo_url || "");
            setExistingLicenseUrl(detail.license_url || salon.license_url || "");
            setOriginalValues({
              name: detail.name || salon.name || "",
              address: detail.address || salon.address || "",
              city: detail.city || "",
              state: detail.state || "",
              zip: detail.zip_code || "",
              phone: detail.phone || "",
              email: detail.email || "",
              description: detail.description || "",
              timezone: detail.timezone || "America/New_York",
            });
          } catch (err) {
            // ignore detail load failures
            setName(salon?.name || "");
            setAddress(salon?.address || "");
            setCity(salon?.city || "");
            setState(salon?.state || "");
            setZip(salon?.zip_code || "");
            setPhone(salon?.phone || "");
            setEmail(salon?.email || "");
            setDescription(salon?.description || "");
            setExistingLogoUrl(salon?.logo_url || "");
            setExistingLicenseUrl(salon?.license_url || "");
            setOriginalValues({
              name: salon?.name || "",
              address: salon?.address || "",
              city: salon?.city || "",
              state: salon?.state || "",
              zip: salon?.zip_code || "",
              phone: salon?.phone || "",
              email: salon?.email || "",
              description: salon?.description || "",
              timezone: salon?.timezone || "America/New_York",
            });
          }
        }
      } catch (error) {
        console.error("Failed to load owned salons:", error);
        setOwnedSalon(null);
        setStatus("not_submitted");
      }
    }
    loadOwned();
  }, []);

  const updateDay = (dayIndex, updates) => {
    setHours((prev) =>
      prev.map((h) => (h.day_of_week === dayIndex ? { ...h, ...updates } : h))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const cleanPhone = phone ? phone.replace(/\D/g, "") : "";

      const result = await submitSalonRegistration({
        name,
        address,
        city,
        state,
        zip_code: zip,
        phone: cleanPhone || undefined,
        email: email || undefined,
        description,
        timezone,
        logoFile,
        licenseFile,
      });

      setStatus("pending");
      setStatusMessage(result.message || "Application submitted. Awaiting admin review.");
      const refreshed = await getOwnedSalon();
      setOwnedSalon(refreshed.salon || null);
      setCurrentSalonId(refreshed.salon?.id || null);
      if (refreshed.salon) {
        setOriginalValues({
          name: refreshed.salon.name || "",
          address: refreshed.salon.address || "",
          city: refreshed.salon.city || "",
          state: refreshed.salon.state || "",
          zip: refreshed.salon.zip_code || "",
          phone: refreshed.salon.phone || "",
          email: refreshed.salon.email || "",
          description: refreshed.salon.description || "",
          timezone: refreshed.salon.timezone || "America/New_York",
        });
      }
      setShowForm(false);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to submit registration:", error);
      setFormError(parseError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePending = async (e) => {
    e.preventDefault();
    if (!currentSalonId) return;
    if (!validateForm()) return;
    setLoading(true);
    try {
      const cleanPhone = phone ? phone.replace(/\D/g, "") : "";

      const result = await updatePendingApplication(currentSalonId, {
        name,
        address,
        city,
        state,
        zip_code: zip,
        phone: cleanPhone || undefined,
        email: email || undefined,
        description,
        timezone,
        logoFile,
        licenseFile,
      });

      setStatus("pending");
      setStatusMessage(result.message || "Application updated. Awaiting admin review.");
      setShowForm(false);
      setIsEditing(false);
      await refreshSalonData();
    } catch (error) {
      setFormError(parseError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleAppeal = async (e) => {
    e.preventDefault();
    if (!currentSalonId) return;
    if (!validateForm()) return;
    setLoading(true);
    try {
      const cleanPhone = phone ? phone.replace(/\D/g, "") : "";

      const result = await submitSalonAppeal(currentSalonId, {
        name,
        address,
        city,
        state,
        zip_code: zip,
        phone: cleanPhone || undefined,
        email: email || undefined,
        description,
        timezone,
        logoFile,
        licenseFile,
      });

      setStatus("pending");
      setStatusMessage(result.message || "Appeal submitted. Awaiting admin review.");
      setShowForm(false);
      setIsEditing(false);
      setRejectionReason("");
      await refreshSalonData();
    } catch (error) {
      setFormError(parseError(error));
    } finally {
      setLoading(false);
    }
  };

  const primarySalon = ownedSalon;
  const isApproved = status === "approved";
  const isPending = status === "pending";
  const isRejected = status === "rejected";
  const canSubmitNew = status === "not_submitted";
  const canUpdatePending = isPending && !!currentSalonId;
  const canAppeal = isRejected && !!currentSalonId;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Salon Registration</h2>
            <p className="text-sm text-indigo-100 mt-1">
              Submit your application. An admin must approve before your owner portal unlocks.
            </p>
          </div>
          {["approved", "pending", "rejected"].includes(status) && (
            <div className="flex items-center gap-2">
              {status === "approved" && (
                <Badge className="bg-white text-green-700 border border-green-200">Approved</Badge>
              )}
              {status === "pending" && (
                <Badge className="bg-white text-yellow-700 border border-yellow-200">Pending Review</Badge>
              )}
              {status === "rejected" && (
                <Badge className="bg-white text-red-700 border border-red-200">Rejected</Badge>
              )}
            </div>
          )}
        </div>
        {status === "approved" && (
          <div className="mt-4 flex items-center gap-2 text-sm text-indigo-50">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              {primarySalon?.name || "Your salon"} is verified. You now have access to the full owner experience.
            </span>
          </div>
        )}
        {status === "pending" && (
          <div className="mt-4 flex items-center gap-2 text-sm text-indigo-50">
            <Clock className="h-4 w-4" />
            <span>{statusMessage || "Your application is in the admin queue. Typical review is 1-3 business days."}</span>
          </div>
        )}
        {status === "rejected" && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-indigo-50">
              <AlertCircle className="h-4 w-4" />
              <span>Your application was rejected. You can submit an appeal with updated information.</span>
            </div>
            {rejectionReason && (
              <div className="ml-6 p-3 bg-white/10 rounded-lg border border-white/20">
                <p className="text-xs font-semibold text-indigo-50 mb-1">Rejection Reason:</p>
                <p className="text-sm text-indigo-100">{rejectionReason}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {ownedSalon && (
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <h3 className="text-lg font-semibold">{ownedSalon.name || "Your salon"}</h3>
              <p className="text-sm text-gray-600">Status: {ownedSalon.status}</p>
            </div>
            <Button
              onClick={() => {
                const next = !showForm;
                setShowForm(next);
                if (!next) {
                  setIsEditing(false);
                }
              }}
            >
              {showForm ? "Stop Viewing Application" : "View / Edit Application"}
            </Button>
          </CardContent>
        </Card>
      )}

      {!isApproved && showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Business Details</CardTitle>
            <CardDescription>
              All fields are required unless marked optional.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={canAppeal ? handleAppeal : canUpdatePending ? handleUpdatePending : handleSubmit} className="space-y-8">
              {!canSubmitNew && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (isEditing) {
                        resetToOriginal();
                      } else {
                        setIsEditing(true);
                      }
                    }}
                  >
                    {isEditing ? "Cancel Edit" : "Edit"}
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="name">Salon Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Elite Hair Studio"
                    required
                    disabled={!isEditing}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="address">Street Address *</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main St"
                    required
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Newark"
                    required
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="state">State (2 letters) *</Label>
                  <Input
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    maxLength={2}
                    placeholder="NJ"
                    required
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="zip">ZIP Code *</Label>
                  <Input
                    id="zip"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="07102"
                    required
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone *</Label>
                <select
                  id="timezone"
                  className={`w-full rounded-md border px-3 py-2 ${!isEditing ? "bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200" : "border-gray-300"}`}
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  disabled={!isEditing}
                >
                  <option value="America/New_York">America/New_York (ET)</option>
                  <option value="America/Chicago">America/Chicago (CT)</option>
                  <option value="America/Denver">America/Denver (MT)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PT)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone (10 digits, digits only) *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9735551234"
                  required={!email}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@salon.com"
                  required={!phone}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="description">Description *</Label>
                <span className={`text-sm ${description.length > DESCRIPTION_MAX_LENGTH ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                  {description.length} / {DESCRIPTION_MAX_LENGTH}
                </span>
              </div>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell customers about your services, vibe, and specialties."
                rows={4}
                required
                disabled={!isEditing}
                className={description.length > DESCRIPTION_MAX_LENGTH ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
              />
              {description.length > DESCRIPTION_MAX_LENGTH && (
                <p className="text-sm text-red-600 mt-1 font-medium">
                  Description exceeds the {DESCRIPTION_MAX_LENGTH} character limit by {description.length - DESCRIPTION_MAX_LENGTH} characters. Please shorten it to submit.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="logo">Logo (optional)</Label>
                  <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600 mb-2">Upload a square image.</p>
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                    disabled={!isEditing}
                  />
                  {!isEditing && existingLogoUrl && (
                    <p className="text-xs text-gray-500 mt-2 break-all">
                      Current: <a className="text-indigo-600" href={existingLogoUrl} target="_blank" rel="noreferrer">Logo</a>
                    </p>
                  )}
                  {logoFile && (
                    <div className="mt-2 text-sm text-gray-700">{logoFile.name}</div>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="license">Business License *</Label>
                <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-2">PDF or image up to 10MB.</p>
                  <Input
                    id="license"
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                    required={canSubmitNew}
                    disabled={!isEditing}
                  />
                  {!isEditing && existingLicenseUrl && (
                    <p className="text-xs text-gray-500 mt-2 break-all">
                      Current: <a className="text-indigo-600" href={existingLicenseUrl} target="_blank" rel="noreferrer">License</a>
                    </p>
                  )}
                  {licenseFile && (
                    <div className="mt-2 text-sm text-gray-700">{licenseFile.name}</div>
                  )}
                </div>
              </div>
            </div>

            {formError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || (!isEditing && !canSubmitNew && !canAppeal) || (isPending && !canUpdatePending)}
            >
              {loading
                ? "Saving..."
                : canAppeal
                  ? "Submit Appeal"
                  : canUpdatePending
                    ? "Update Application"
                    : "Submit Application"}
            </Button>
          </form>
        </CardContent>
        </Card>
      )}

      {isApproved && (
        <Card>
          <CardHeader>
            <CardTitle>What happens next?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Your salon is approved. Use the dashboard to manage services, employees, and customers.
            </p>
          </CardContent>
        </Card>
      )}


      <Card>
        <CardHeader>
          <CardTitle>What happens after submission?</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            <li className="flex gap-3">
              <Badge className="h-6 w-6 rounded-full p-0 flex items-center justify-center">1</Badge>
              <div>
                <p>Submit your application</p>
                <p className="text-xs text-gray-500">Provide accurate business info.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <Badge className="h-6 w-6 rounded-full p-0 flex items-center justify-center">2</Badge>
              <div>
                <p>Admin review (1-3 business days)</p>
                <p className="text-xs text-gray-500">Admins verify your license.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <Badge className="h-6 w-6 rounded-full p-0 flex items-center justify-center">3</Badge>
              <div>
                <p>Approval notification</p>
                <p className="text-xs text-gray-500">We’ll email you once approved or if updates are needed.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <Badge className="h-6 w-6 rounded-full p-0 flex items-center justify-center">4</Badge>
              <div>
                <p>Go live</p>
                <p className="text-xs text-gray-500">Owner dashboard unlocks; start taking bookings.</p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
