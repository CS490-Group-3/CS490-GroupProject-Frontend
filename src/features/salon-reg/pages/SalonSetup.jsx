import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../shared/ui/card";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Textarea } from "../../../shared/ui/textarea";
import { Alert, AlertDescription } from "../../../shared/ui/alert";
import { Badge } from "../../../shared/ui/badge";
import { CheckCircle2, Clock, X, Plus, Search, Loader2 } from "lucide-react";
import {
  getOwnedSalon,
  checkSetupStatus,
  updateSalonHours,
  getSalonHours,
  createService,
  getSalonServices,
  searchBarbers,
  addBarberToSalon,
  getSalonEmployees,
  addServiceToBarber,
  getBarberServices,
} from "../api.js";
import { api } from "../../../shared/api/client.js";

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default function SalonSetup() {
  const navigate = useNavigate();
  const [salon, setSalon] = useState(null);
  const [salonId, setSalonId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [setupStatus, setSetupStatus] = useState({
    hasHours: false,
    hasServices: false,
    hasEmployees: false,
    hasEmployeeWithServices: false,
    isComplete: false,
  });

  // Hours state - Monday to Friday open by default (1-5)
  const [hours, setHours] = useState(
    DAYS.map((day) => ({
      day_of_week: day.value,
      is_closed: day.value < 1 || day.value > 5, // Closed on Sunday (0) and Saturday (6)
      open_time: "09:00",
      close_time: "17:00",
    }))
  );
  const [savingHours, setSavingHours] = useState(false);

  // Services state
  const [services, setServices] = useState([]);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [newService, setNewService] = useState({
    name: "",
    description: "",
    duration_minutes: "",
    price: "",
    is_active: true,
  });
  const durationInputRef = useRef(null);
  const [savingService, setSavingService] = useState(false);

  // Employees state
  const [employees, setEmployees] = useState([]);
  const [showEmployeeSearch, setShowEmployeeSearch] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    user_id: "",
    bio: "",
    years_experience: "",
  });
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [selectedBarberForService, setSelectedBarberForService] = useState(null);
  const [barberServices, setBarberServices] = useState({});
  const [pendingServiceSelections, setPendingServiceSelections] = useState({}); // {barberId: [serviceId1, serviceId2, ...]}
  const [savingServices, setSavingServices] = useState(false);

  useEffect(() => {
    loadSalonData();
  }, []);

  const loadSalonData = async () => {
    try {
      setLoading(true);
      const res = await getOwnedSalon();
      const salonData = res.salon;
      
      if (!salonData || salonData.status !== "verified") {
        navigate("/salon-registration");
        return;
      }

      setSalon(salonData);
      setSalonId(salonData.id);
      
      // Load existing hours
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
                is_closed: day.value < 1 || day.value > 5, // Closed on Sunday (0) and Saturday (6)
                open_time: "09:00",
                close_time: "17:00",
              };
            })
          );
        }
      } catch (err) {
        console.error("Error loading hours:", err);
      }

      // Load services
      try {
        const servicesRes = await getSalonServices(salonData.id);
        console.log("Services response:", servicesRes);
        // Handle response - should be {services: [...]}
        let servicesList = [];
        if (servicesRes && Array.isArray(servicesRes.services)) {
          servicesList = servicesRes.services;
        } else if (Array.isArray(servicesRes)) {
          // Fallback if response is directly an array
          servicesList = servicesRes;
        }
        console.log("Parsed services list:", servicesList);
        // Filter out any null/undefined services
        const validServices = servicesList.filter(s => s && s.id);
        console.log("Valid services:", validServices);
        setServices(validServices);
      } catch (err) {
        console.error("Error loading services:", err);
        setServices([]);
      }

      // Load employees
      try {
        const employeesRes = await getSalonEmployees(salonData.id);
        const employeesList = employeesRes.employees || [];
        console.log("Loaded employees:", employeesList);
        setEmployees(employeesList);
        
        // Load services for each employee
        if (employeesRes.employees && employeesRes.employees.length > 0) {
          const barberServicesMap = {};
          await Promise.all(
            employeesRes.employees.map(async (emp) => {
              try {
                const services = await getBarberServices(salonData.id, emp.id);
                barberServicesMap[emp.id] = services.services || [];
              } catch {
                barberServicesMap[emp.id] = [];
              }
            })
          );
          setBarberServices(barberServicesMap);
        }
      } catch (err) {
        console.error("Error loading employees:", err);
      }

      // Check setup status
      const status = await checkSetupStatus(salonData.id);
      setSetupStatus(status);
    } catch (error) {
      console.error("Error loading salon data:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshSetupStatus = async () => {
    if (!salonId) return;
    const status = await checkSetupStatus(salonId);
    setSetupStatus(status);
    // Notify header to refresh navigation
    if (status.isComplete) {
      window.dispatchEvent(new Event('setupStatusChanged'));
    }
  };

  const handleSaveHours = async () => {
    if (!salonId) return;
    setSavingHours(true);
    try {
      await updateSalonHours(salonId, hours);
      await refreshSetupStatus();
      alert("Hours saved successfully!");
    } catch (error) {
      alert("Failed to save hours: " + (error.message || "Unknown error"));
    } finally {
      setSavingHours(false);
    }
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    if (!salonId) return;
    
    // Validate duration is in 15-minute increments
    const duration = parseInt(newService.duration_minutes);
    if (isNaN(duration) || duration < 15) {
      alert("Duration must be at least 15 minutes");
      return;
    }
    if (duration % 15 !== 0) {
      alert("Duration must be in 15-minute increments (15, 30, 45, 60, etc.)");
      return;
    }
    
    setSavingService(true);
    try {
      await createService({
        salon_id: salonId,
        name: newService.name,
        description: newService.description || "",
        duration_minutes: duration,
        price: String(newService.price), // Backend expects price as string
        is_active: newService.is_active,
      });
      setNewService({
        name: "",
        description: "",
        duration_minutes: "",
        price: "",
        is_active: true,
      });
      setShowServiceForm(false);
      await loadSalonData();
      await refreshSetupStatus();
    } catch (error) {
      alert("Failed to create service: " + (error.message || "Unknown error"));
    } finally {
      setSavingService(false);
    }
  };

  const handleSearchBarbers = async (email = null) => {
    const searchTerm = email || searchEmail;
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await searchBarbers(searchTerm);
      setSearchResults(res.barbers || []);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Debounced search for live updates
  useEffect(() => {
    if (!showEmployeeSearch) {
      setSearchResults([]);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      if (searchEmail.trim().length >= 2) {
        handleSearchBarbers(searchEmail);
      } else {
        setSearchResults([]);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchEmail, showEmployeeSearch]);

  const handleAddEmployee = async (user_id) => {
    if (!salonId) return;
    setAddingEmployee(true);
    try {
      await addBarberToSalon(salonId, {
        user_id,
        bio: newEmployee.bio,
        years_experience: parseInt(newEmployee.years_experience) || 0,
        is_active: true,
      });
      setNewEmployee({ user_id: "", bio: "", years_experience: "" });
      setShowEmployeeSearch(false);
      setSearchEmail("");
      setSearchResults([]);
      // Reload employees immediately so they show up
      await loadSalonData();
      await refreshSetupStatus();
    } catch (error) {
      alert("Failed to add employee: " + (error.message || "Unknown error"));
    } finally {
      setAddingEmployee(false);
    }
  };

  const handleToggleServiceSelection = (barberId, serviceId) => {
    setPendingServiceSelections(prev => {
      const current = prev[barberId] || [];
      const isSelected = current.includes(serviceId);
      return {
        ...prev,
        [barberId]: isSelected
          ? current.filter(id => id !== serviceId)
          : [...current, serviceId]
      };
    });
  };

  const handleSaveBarberServices = async (barberId) => {
    if (!salonId) return;
    let selectedServices = pendingServiceSelections[barberId] || [];
    const currentServices = barberServices[barberId] || [];
    const currentServiceIds = currentServices.map(s => s.id);
    
    // Deduplicate selectedServices - remove any duplicate service IDs
    selectedServices = [...new Set(selectedServices)];
    
    // Find services to add (in selection but not in current)
    const toAdd = selectedServices.filter(id => !currentServiceIds.includes(id));
    // Find services to remove (in current but not in selection)
    const toRemove = currentServiceIds.filter(id => !selectedServices.includes(id));
    
    setSavingServices(true);
    try {
      // Add new services sequentially
      if (toAdd.length > 0) {
        for (let i = 0; i < toAdd.length; i++) {
          const serviceId = toAdd[i];
          await addServiceToBarber(salonId, barberId, serviceId);
        }
      }
      
      // Remove unselected services sequentially
      if (toRemove.length > 0) {
        for (let i = 0; i < toRemove.length; i++) {
          const serviceId = toRemove[i];
          await api(`/salons/${salonId}/barbers/${barberId}/services/${serviceId}`, {
            method: "DELETE"
          });
        }
      }
      
      // Reload barber services to ensure state is up-to-date
      const updatedServices = await getBarberServices(salonId, barberId);
      const servicesList = updatedServices.services || [];
      setBarberServices(prev => ({
        ...prev,
        [barberId]: servicesList
      }));
      
      // Clear pending selections for this barber
      setPendingServiceSelections(prev => {
        const updated = { ...prev };
        delete updated[barberId];
        return updated;
      });
      
      setSelectedBarberForService(null);
      await refreshSetupStatus();
    } catch (error) {
      alert("Failed to save service assignments: " + (error.message || "Unknown error"));
    } finally {
      setSavingServices(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!salon || salon.status !== "verified") {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-2xl font-semibold mb-2">Complete Your Salon Setup</h2>
        <p className="text-sm text-indigo-100">
          Finish these steps to unlock your full owner portal and start taking bookings.
        </p>
      </div>

      {/* Setup Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Checklist</CardTitle>
          <CardDescription>Complete all steps to unlock your owner portal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            {setupStatus.hasHours ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Clock className="h-5 w-5 text-gray-400" />
            )}
            <span className={setupStatus.hasHours ? "text-green-700" : ""}>
              Set salon hours
            </span>
          </div>
          <div className="flex items-center gap-3">
            {setupStatus.hasServices ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Clock className="h-5 w-5 text-gray-400" />
            )}
            <span className={setupStatus.hasServices ? "text-green-700" : ""}>
              Add at least one service
            </span>
          </div>
          <div className="flex items-center gap-3">
            {setupStatus.hasEmployees ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Clock className="h-5 w-5 text-gray-400" />
            )}
            <span className={setupStatus.hasEmployees ? "text-green-700" : ""}>
              Add at least one employee
            </span>
          </div>
          <div className="flex items-center gap-3">
            {setupStatus.hasEmployeeWithServices ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Clock className="h-5 w-5 text-gray-400" />
            )}
            <span className={setupStatus.hasEmployeeWithServices ? "text-green-700" : ""}>
              Assign at least one service to an employee
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Salon Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {setupStatus.hasHours && <CheckCircle2 className="h-5 w-5 text-green-600" />}
            Step 1: Set Salon Hours
          </CardTitle>
          <CardDescription>Configure your weekly business hours</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hours.map((dayHour, idx) => (
            <div key={dayHour.day_of_week} className="flex items-center gap-4">
              <div className="w-24">
                <Label>{DAYS.find((d) => d.value === dayHour.day_of_week)?.label}</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!dayHour.is_closed}
                  onChange={(e) => {
                    const newHours = [...hours];
                    newHours[idx].is_closed = !e.target.checked;
                    setHours(newHours);
                  }}
                  className="w-4 h-4"
                />
                <Label>{!dayHour.is_closed ? "Open" : "Closed"}</Label>
              </div>
              {!dayHour.is_closed && (
                <>
                  <Input
                    type="time"
                    value={dayHour.open_time}
                    onChange={(e) => {
                      const newHours = [...hours];
                      newHours[idx].open_time = e.target.value;
                      setHours(newHours);
                    }}
                    className="w-32"
                  />
                  <span>to</span>
                  <Input
                    type="time"
                    value={dayHour.close_time}
                    onChange={(e) => {
                      const newHours = [...hours];
                      newHours[idx].close_time = e.target.value;
                      setHours(newHours);
                    }}
                    className="w-32"
                  />
                </>
              )}
            </div>
          ))}
          <Button onClick={handleSaveHours} disabled={savingHours}>
            {savingHours ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Hours
          </Button>
        </CardContent>
      </Card>

      {/* Step 2: Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {setupStatus.hasServices && <CheckCircle2 className="h-5 w-5 text-green-600" />}
            Step 2: Add Services
          </CardTitle>
          <CardDescription>Create services that customers can book</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {services.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-lg">Your Services:</h4>
              <div className="grid gap-3">
                {services.filter(service => service && service.id).map((service) => (
                  <div key={service.id} className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-lg text-gray-900 mb-1">
                          {service.name || "Unnamed Service"}
                        </div>
                        {service.description && (
                          <div className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {service.description}
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-indigo-600">${parseFloat(service.price || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-600">
                            <Clock className="h-4 w-4" />
                            <span>{service.duration_minutes || 0} minutes</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!showServiceForm ? (
            <Button onClick={() => setShowServiceForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          ) : (
            <form onSubmit={handleAddService} className="space-y-4 border p-4 rounded-lg">
              <div>
                <Label>Service Name *</Label>
                <Input
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Duration (minutes) *</Label>
                  <Input
                    ref={durationInputRef}
                    type="number"
                    min="15"
                    step="15"
                    value={newService.duration_minutes === "" ? "" : newService.duration_minutes}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Allow typing any number, don't round while typing
                      if (val === "") {
                        setNewService({ ...newService, duration_minutes: "" });
                      } else {
                        const num = parseInt(val);
                        if (!isNaN(num) && num >= 0) {
                          setNewService({ ...newService, duration_minutes: num });
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      // Handle arrow keys to round to nearest 15 first, then step by 15
                      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                        e.preventDefault();
                        const current = parseInt(newService.duration_minutes) || 0;
                        let newValue;
                        if (current === 0) {
                          newValue = 15;
                        } else if (current % 15 !== 0) {
                          if (e.key === "ArrowUp") {
                            newValue = Math.ceil(current / 15) * 15;
                          } else {
                            newValue = Math.floor(current / 15) * 15;
                            newValue = newValue < 15 ? 15 : newValue;
                          }
                        } else {
                          if (e.key === "ArrowUp") {
                            newValue = current + 15;
                          } else {
                            newValue = Math.max(15, current - 15);
                          }
                        }
                        setNewService({ ...newService, duration_minutes: newValue });
                      }
                    }}
                    onMouseDown={(e) => {
                      // Detect clicks on the spinner arrows
                      const rect = e.target.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const clickY = e.clientY - rect.top;
                      const width = rect.width;
                      const height = rect.height;
                      
                      // Check if click is on the right side where spinner is (last 30px)
                      if (clickX > width - 30) {
                        e.preventDefault();
                        const current = parseInt(newService.duration_minutes) || 0;
                        let newValue;
                        
                        // Determine if up or down arrow based on Y position
                        const isUpArrow = clickY < height / 2;
                        
                        if (current === 0) {
                          newValue = 15;
                        } else if (current % 15 !== 0) {
                          // Round to nearest 15 first
                          if (isUpArrow) {
                            newValue = Math.ceil(current / 15) * 15;
                          } else {
                            newValue = Math.floor(current / 15) * 15;
                            newValue = newValue < 15 ? 15 : newValue;
                          }
                        } else {
                          // Already on 15-min boundary, step by 15
                          if (isUpArrow) {
                            newValue = current + 15;
                          } else {
                            newValue = Math.max(15, current - 15);
                          }
                        }
                        
                        setNewService({ ...newService, duration_minutes: newValue });
                      }
                    }}
                    onWheel={(e) => e.target.blur()} // Prevent scroll from changing value
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Must be in 15-minute increments (15, 30, 45, 60, etc.)</p>
                </div>
                <div>
                  <Label>Price ($) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newService.price}
                    onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={savingService}>
                  {savingService ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Service
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowServiceForm(false);
                    setNewService({
                      name: "",
                      description: "",
                      duration_minutes: "",
                      price: "",
                      is_active: true,
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Employees */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {setupStatus.hasEmployees && <CheckCircle2 className="h-5 w-5 text-green-600" />}
            Step 3: Add Employees
          </CardTitle>
          <CardDescription>Add barbers to your salon</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {employees.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Current Employees:</h4>
              {employees.map((emp) => (
                <div key={emp.id} className="p-3 border rounded-lg">
                  <div className="font-semibold">
                    {emp.name || "Employee"}
                  </div>
                  {emp.bio && (
                    <div className="text-sm text-gray-500 mt-1">{emp.bio}</div>
                  )}
                  <div className="text-sm text-gray-600 mt-1">
                    Services: {barberServices[emp.id]?.length || 0} assigned
                  </div>
                  {selectedBarberForService === emp.id ? (
                    <div className="mt-2 space-y-2">
                      <Label>Assign Services:</Label>
                      {services.filter(service => service && service.id).map((service) => {
                        const currentServices = barberServices[emp.id] || [];
                        const currentServiceIds = currentServices.map(s => s.id);
                        const pendingSelections = pendingServiceSelections[emp.id];
                        // If pendingSelections exists (even if empty array), use it. Otherwise fall back to current services.
                        const isChecked = pendingSelections !== undefined
                          ? pendingSelections.includes(service.id)
                          : currentServiceIds.includes(service.id);
                        return (
                          <div key={service.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleServiceSelection(emp.id, service.id)}
                              disabled={savingServices}
                            />
                            <Label>{service.name || "Unnamed Service"}</Label>
                          </div>
                        );
                      })}
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() => handleSaveBarberServices(emp.id)}
                          disabled={savingServices}
                        >
                          {savingServices ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Save Services
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedBarberForService(null);
                            // Clear pending selections for this barber
                            setPendingServiceSelections(prev => {
                              const updated = { ...prev };
                              delete updated[emp.id];
                              return updated;
                            });
                          }}
                          disabled={savingServices}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        setSelectedBarberForService(emp.id);
                        // Reload current services for this barber to ensure we have the latest data
                        try {
                          const currentServicesRes = await getBarberServices(salonId, emp.id);
                          const currentServices = currentServicesRes.services || [];
                          const currentServiceIds = currentServices.map(s => s.id);
                          // Update barberServices state with latest data
                          setBarberServices(prev => ({
                            ...prev,
                            [emp.id]: currentServices
                          }));
                          // Initialize pending selections with current services
                          setPendingServiceSelections(prev => ({
                            ...prev,
                            [emp.id]: [...currentServiceIds]
                          }));
                        } catch (err) {
                          console.error("Error loading barber services:", err);
                          // Fallback to existing state
                          const currentServices = barberServices[emp.id] || [];
                          const currentServiceIds = currentServices.map(s => s.id);
                          setPendingServiceSelections(prev => ({
                            ...prev,
                            [emp.id]: [...currentServiceIds]
                          }));
                        }
                      }}
                    >
                      Assign Services
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          {!showEmployeeSearch ? (
            <Button onClick={() => setShowEmployeeSearch(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          ) : (
            <div className="border p-4 rounded-lg space-y-4">
              <div>
                <Label>Search by Email</Label>
                <p className="text-xs text-gray-500 mb-2">Start typing to search for barbers (minimum 2 characters)</p>
                <div className="relative">
                  <Input
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    placeholder="barber@example.com or name@..."
                    className="pr-10"
                  />
                  {searching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
              </div>
              {searchEmail.trim().length > 0 && searchEmail.trim().length < 2 && (
                <p className="text-xs text-gray-500">Type at least 2 characters to search</p>
              )}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Available Barbers:</Label>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {searchResults.map((user) => {
                      const userId = typeof user === "string" ? user : user.id;
                      const email = typeof user === "object" ? user.email : "";
                      const firstName = typeof user === "object" ? user.first_name || "" : "";
                      const lastName = typeof user === "object" ? user.last_name || "" : "";
                      const fullName = `${firstName} ${lastName}`.trim() || "No name provided";
                      return (
                        <div
                          key={userId}
                          className="p-3 border rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors cursor-pointer"
                          onClick={() => {
                            setNewEmployee({ ...newEmployee, user_id: userId });
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">{fullName}</div>
                              <div className="text-sm text-gray-600">{email || `User ID: ${userId}`}</div>
                            </div>
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNewEmployee({ ...newEmployee, user_id: userId });
                              }}
                            >
                              Select
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {searchEmail.trim().length >= 2 && !searching && searchResults.length === 0 && (
                <div className="p-3 border rounded-lg bg-gray-50 text-center text-sm text-gray-600">
                  No barbers found matching "{searchEmail}". Make sure they have the "barber" role and aren't already in a salon.
                </div>
              )}
              {newEmployee.user_id && (
                <div className="space-y-4 border-t pt-4">
                  <div>
                    <Label>Bio (optional)</Label>
                    <Textarea
                      value={newEmployee.bio}
                      onChange={(e) => setNewEmployee({ ...newEmployee, bio: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Years of Experience</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newEmployee.years_experience}
                      onChange={(e) => {
                        const val = e.target.value;
                        // Allow empty string or valid numbers
                        if (val === "" || (!isNaN(val) && parseInt(val) >= 0)) {
                          setNewEmployee({
                            ...newEmployee,
                            years_experience: val,
                          });
                        }
                      }}
                      placeholder="0"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleAddEmployee(newEmployee.user_id)}
                      disabled={addingEmployee}
                    >
                      {addingEmployee ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Add Employee
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowEmployeeSearch(false);
                        setSearchEmail("");
                        setSearchResults([]);
                        setNewEmployee({ user_id: "", bio: "", years_experience: "" });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completion Message */}
      {setupStatus.isComplete && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Setup Complete!</strong> Your owner portal is now unlocked. You can access all features from the navigation menu.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

