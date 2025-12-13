import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../shared/api/client.js";
import { 
  getSalonEmployees, 
  searchBarbers, 
  addBarberToSalon, 
  removeEmployee, 
  updateEmployee,
  getBarberServices,
  addServiceToBarber,
  getSalonServices,
  getSalonHours,
  getEmployeeAvailability,
  setEmployeeAvailability
} from "../../salon-reg/api.js";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Textarea } from "../../../shared/ui/textarea";
import { ArrowLeft, Plus, Trash2, Edit2, Save, X, Search, Clock, Calendar, Loader2 } from "lucide-react";

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default function Employees() {
  const navigate = useNavigate();
  const [salon, setSalon] = useState(null);
  const [salonId, setSalonId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [services, setServices] = useState([]);
  const [salonHours, setSalonHours] = useState([]);
  
  // Employee search
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    user_id: "",
    bio: "",
    years_experience: "",
  });
  const [addingEmployee, setAddingEmployee] = useState(false);
  
  // Editing employee
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editingEmployeeData, setEditingEmployeeData] = useState({});
  
  // Services assignment
  const [selectedBarberForService, setSelectedBarberForService] = useState(null);
  const [barberServices, setBarberServices] = useState({});
  const [pendingServiceSelections, setPendingServiceSelections] = useState({});
  const [savingServices, setSavingServices] = useState(false);
  
  // Availability
  const [selectedBarberForAvailability, setSelectedBarberForAvailability] = useState(null);
  const [barberAvailability, setBarberAvailability] = useState({});
  const [editingAvailability, setEditingAvailability] = useState({});
  const [savingAvailability, setSavingAvailability] = useState(false);

  useEffect(() => {
    loadSalonData();
  }, []);

  useEffect(() => {
    if (!searchEmail || searchEmail.length < 2) {
      setSearchResults([]);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      handleSearchBarbers(searchEmail);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchEmail]);

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
      
      await loadEmployees(salonData.id);
      await loadServices(salonData.id);
      await loadSalonHours(salonData.id);
    } catch (err) {
      console.error("Error loading salon:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async (id) => {
    try {
      const employeesRes = await getSalonEmployees(id);
      setEmployees(employeesRes.employees || []);
    } catch (err) {
      console.error("Error loading employees:", err);
    }
  };

  const loadServices = async (id) => {
    try {
      const servicesRes = await getSalonServices(id);
      const servicesList = servicesRes.services || [];
      setServices(servicesList.filter(s => s && s.id));
    } catch (err) {
      console.error("Error loading services:", err);
    }
  };

  const loadSalonHours = async (id) => {
    try {
      const hoursRes = await getSalonHours(id);
      if (hoursRes.hours && hoursRes.hours.length > 0) {
        setSalonHours(hoursRes.hours);
      }
    } catch (err) {
      console.error("Error loading salon hours:", err);
    }
  };

  const handleSearchBarbers = async (email) => {
    if (!email || email.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    try {
      const results = await searchBarbers(email);
      setSearchResults(results.barbers || []);
    } catch (err) {
      console.error("Error searching barbers:", err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

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
      setShowAddEmployee(false);
      setSearchEmail("");
      setSearchResults([]);
      await loadEmployees(salonId);
      alert("Employee added successfully!");
    } catch (error) {
      alert("Failed to add employee: " + (error.message || "Unknown error"));
    } finally {
      setAddingEmployee(false);
    }
  };

  const handleRemoveEmployee = async (barberId) => {
    if (!salonId) return;
    if (!confirm("Are you sure you want to remove this employee?")) return;
    
    try {
      await removeEmployee(salonId, barberId);
      await loadEmployees(salonId);
      alert("Employee removed successfully!");
    } catch (error) {
      alert("Failed to remove employee: " + (error.message || "Unknown error"));
    }
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee.id);
    setEditingEmployeeData({
      bio: employee.bio || "",
      years_experience: employee.years_experience || "",
      is_active: employee.is_active !== false,
    });
  };

  const handleSaveEmployee = async (barberId) => {
    if (!salonId) return;
    try {
      await updateEmployee(salonId, barberId, editingEmployeeData);
      setEditingEmployee(null);
      setEditingEmployeeData({});
      await loadEmployees(salonId);
      alert("Employee updated successfully!");
    } catch (error) {
      alert("Failed to update employee: " + (error.message || "Unknown error"));
    }
  };

  const handleLoadBarberServices = async (barberId) => {
    if (!salonId) return;
    try {
      const servicesRes = await getBarberServices(salonId, barberId);
      const currentServices = servicesRes.services || [];
      setBarberServices(prev => ({
        ...prev,
        [barberId]: currentServices
      }));
      setPendingServiceSelections(prev => ({
        ...prev,
        [barberId]: currentServices.map(s => s.id)
      }));
    } catch (err) {
      console.error("Error loading barber services:", err);
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
    setSavingServices(true);
    try {
      const currentServiceIds = (barberServices[barberId] || []).map(s => s.id);
      let selectedServiceIds = pendingServiceSelections[barberId] || [];
      
      // Deduplicate selectedServiceIds - remove any duplicate service IDs
      selectedServiceIds = [...new Set(selectedServiceIds)];
      
      // Add new services sequentially
      const toAdd = selectedServiceIds.filter(id => !currentServiceIds.includes(id));
      for (let i = 0; i < toAdd.length; i++) {
        const serviceId = toAdd[i];
        await addServiceToBarber(salonId, barberId, serviceId);
      }
      
      // Remove services sequentially
      const toRemove = currentServiceIds.filter(id => !selectedServiceIds.includes(id));
      for (let i = 0; i < toRemove.length; i++) {
        const serviceId = toRemove[i];
        await api(`/salons/${salonId}/barbers/${barberId}/services/${serviceId}`, {
          method: "DELETE"
        });
      }
      
      // Reload barber services to verify assignments (regardless of response codes)
      await handleLoadBarberServices(barberId);
      setSelectedBarberForService(null);
      alert("Services updated successfully!");
    } catch (error) {
      alert("Failed to update services: " + (error.message || "Unknown error"));
    } finally {
      setSavingServices(false);
    }
  };

  const handleLoadBarberAvailability = async (barberId) => {
    if (!salonId) return;
    try {
      const availabilityRes = await getEmployeeAvailability(salonId, barberId);
      const availability = availabilityRes.availability || [];
      
      // Convert to map by day_of_week
      const availabilityMap = {};
      availability.forEach(av => {
        availabilityMap[av.day_of_week] = av;
      });
      
      setBarberAvailability(prev => ({
        ...prev,
        [barberId]: availabilityMap
      }));
      
      // Initialize editing state with salon hours as defaults
      // CRITICAL: Always use current salon hours as the source of truth
      // If barber availability times don't match salon hours, reset to salon hours
      const editingMap = {};
      DAYS.forEach(day => {
        const existing = availabilityMap[day.value];
        const salonHour = salonHours.find(h => h.day_of_week === day.value);
        
        // Determine if salon is closed for this day
        const salonIsClosed = salonHour?.is_closed || false;
        
        if (existing) {
          // Convert is_active from database to is_closed for frontend
          const barberIsAvailable = existing.is_active === true;
          
          // If barber is unavailable (is_active: false), keep them unavailable
          // If barber is available but salon is closed, mark barber as unavailable
          // If barber is available and salon is open, use salon hours (not old DB times)
          if (!barberIsAvailable || salonIsClosed) {
            // Barber is unavailable or salon is closed
            editingMap[day.value] = {
              ...existing,
              is_closed: true, // Barber unavailable
              start_time: salonHour?.open_time?.substring(0, 5) || "09:00", // Show salon hours for reference
              end_time: salonHour?.close_time?.substring(0, 5) || "17:00",
            };
          } else {
            // Barber is available and salon is open
            // ALWAYS use current salon hours, not old database times
            // This ensures barber availability matches current salon hours
            editingMap[day.value] = {
              ...existing,
              is_closed: false, // Barber available
              start_time: salonHour?.open_time?.substring(0, 5) || "09:00", // Use salon hours
              end_time: salonHour?.close_time?.substring(0, 5) || "17:00", // Use salon hours
            };
          }
        } else {
          // No existing entry - use salon hours as default
          editingMap[day.value] = {
            day_of_week: day.value,
            is_closed: salonIsClosed || (day.value < 1 || day.value > 5),
            start_time: salonHour?.open_time?.substring(0, 5) || "09:00",
            end_time: salonHour?.close_time?.substring(0, 5) || "17:00",
          };
        }
      });
      setEditingAvailability(prev => ({
        ...prev,
        [barberId]: editingMap
      }));
    } catch (err) {
      console.error("Error loading barber availability:", err);
    }
  };

  const handleSaveBarberAvailability = async (barberId) => {
    if (!salonId) return;
    setSavingAvailability(true);
    try {
      const availabilityData = editingAvailability[barberId];
      if (!availabilityData) return;
      
      // Helper to normalize time format (HH:MM -> HH:MM:SS)
      const normalizeTime = (timeStr) => {
        if (!timeStr) return "00:00:00";
        if (timeStr.length === 5 && timeStr.includes(":")) {
          // HH:MM format - add :00
          return `${timeStr}:00`;
        }
        return timeStr; // Already HH:MM:SS or invalid
      };
      
      // Convert to array format - only include open days
      const availabilityArray = Object.values(availabilityData)
        .filter(av => !av.is_closed)
        .map(av => ({
          day_of_week: av.day_of_week,
          start_time: normalizeTime(av.start_time),
          end_time: normalizeTime(av.end_time),
          is_active: true,
        }));
      
      const existing = barberAvailability[barberId] || {};
      const hasExisting = Object.keys(existing).length > 0;
      
      if (hasExisting) {
        // Update existing - handle updates, new entries, and deletions
        const updateArray = [];
        const newDays = [];
        
        // Process each day
        Object.values(availabilityData).forEach(av => {
          const existingAv = existing[av.day_of_week];
          if (existingAv) {
            // Update existing entry
            // For closed days, use 00:00:00 times and is_active=false
            updateArray.push({
              id: existingAv.id,
              day_of_week: av.day_of_week,
              start_time: av.is_closed ? "00:00:00" : normalizeTime(av.start_time),
              end_time: av.is_closed ? "00:00:00" : normalizeTime(av.end_time),
              is_active: !av.is_closed,
            });
          } else if (!av.is_closed) {
            // New entry to create
            newDays.push({
              day_of_week: av.day_of_week,
              start_time: normalizeTime(av.start_time),
              end_time: normalizeTime(av.end_time),
              is_active: true,
            });
          }
        });
        
        // Update existing entries
        if (updateArray.length > 0) {
          await setEmployeeAvailability(salonId, barberId, updateArray, "PATCH");
        }
        
        // Create new entries
        if (newDays.length > 0) {
          await setEmployeeAvailability(salonId, barberId, newDays, "POST");
        }
      } else {
        // Create new
        await setEmployeeAvailability(salonId, barberId, availabilityArray, "POST");
      }
      
      await handleLoadBarberAvailability(barberId);
      setSelectedBarberForAvailability(null);
      alert("Availability updated successfully!");
    } catch (error) {
      // Extract user-friendly error message from response
      let errorMessage = "Failed to update availability";
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      // Remove any technical database error details
      if (errorMessage.includes("violates check constraint") || errorMessage.includes("23514")) {
        errorMessage = "Invalid availability hours. Please ensure barber hours are within salon hours.";
      }
      alert(errorMessage);
    } finally {
      setSavingAvailability(false);
    }
  };

  const getSalonHoursForDay = (dayOfWeek) => {
    const salonHour = salonHours.find(h => h.day_of_week === dayOfWeek);
    if (!salonHour || salonHour.is_closed) {
      return { open: null, close: null, isClosed: true };
    }
    return {
      open: salonHour.open_time?.substring(0, 5) || "09:00",
      close: salonHour.close_time?.substring(0, 5) || "17:00",
      isClosed: false,
    };
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600 mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate("/salon-dashboard")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Employees</h1>
        </div>
        <Button onClick={() => setShowAddEmployee(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Add Employee Modal */}
      {showAddEmployee && (
        <div className="bg-white border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Add New Employee</h2>
            <Button variant="ghost" size="sm" onClick={() => {
              setShowAddEmployee(false);
              setSearchEmail("");
              setSearchResults([]);
              setNewEmployee({ user_id: "", bio: "", years_experience: "" });
            }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div>
            <Label>Search by Email</Label>
            <div className="flex gap-2">
              <Input
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="Enter barber email..."
                className="flex-1"
              />
              <Button onClick={() => handleSearchBarbers(searchEmail)} disabled={searching}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {searching && <p className="text-sm text-gray-500 mt-1">Searching...</p>}
            
            {searchResults.length > 0 && (
              <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                {searchResults.map((barber) => (
                  <div
                    key={barber.id}
                    onClick={() => {
                      setNewEmployee({ ...newEmployee, user_id: barber.id });
                      setSearchEmail(`${barber.first_name} ${barber.last_name} (${barber.email})`);
                      setSearchResults([]);
                    }}
                    className="p-3 border-b cursor-pointer hover:bg-gray-50"
                  >
                    <div className="font-medium">{barber.first_name} {barber.last_name}</div>
                    <div className="text-sm text-gray-500">{barber.email}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {newEmployee.user_id && (
            <>
              <div>
                <Label>Bio</Label>
                <Textarea
                  value={newEmployee.bio}
                  onChange={(e) => setNewEmployee({ ...newEmployee, bio: e.target.value })}
                  placeholder="Enter employee bio..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label>Years of Experience</Label>
                <Input
                  type="number"
                  value={newEmployee.years_experience}
                  onChange={(e) => setNewEmployee({ ...newEmployee, years_experience: e.target.value })}
                  placeholder="0"
                  min="0"
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={() => handleAddEmployee(newEmployee.user_id)} disabled={addingEmployee}>
                  {addingEmployee ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add Employee
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowAddEmployee(false);
                  setSearchEmail("");
                  setSearchResults([]);
                  setNewEmployee({ user_id: "", bio: "", years_experience: "" });
                }}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Employees List */}
      <div className="bg-white border rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">All Employees</h2>
        {employees.length === 0 ? (
          <p className="text-gray-600">No employees yet. Add your first employee above.</p>
        ) : (
          <div className="space-y-6">
            {/* Active Employees */}
            {employees.filter(emp => emp.is_active !== false).length > 0 && (
              <div>
                <h3 className="text-md font-semibold mb-3 text-gray-800">Active Employees</h3>
                <div className="space-y-4">
                  {employees.filter(emp => emp.is_active !== false).map((emp) => (
              <div key={emp.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{emp.name}</h3>
                      {!emp.is_active && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Inactive</span>
                      )}
                    </div>
                    
                    {editingEmployee === emp.id ? (
                      <div className="space-y-3 mt-3">
                        <div>
                          <Label>Bio</Label>
                          <Textarea
                            value={editingEmployeeData.bio || ""}
                            onChange={(e) => setEditingEmployeeData({ ...editingEmployeeData, bio: e.target.value })}
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label>Years of Experience</Label>
                          <Input
                            type="number"
                            value={editingEmployeeData.years_experience || ""}
                            onChange={(e) => setEditingEmployeeData({ ...editingEmployeeData, years_experience: e.target.value })}
                            min="0"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editingEmployeeData.is_active !== false}
                            onChange={(e) => setEditingEmployeeData({ ...editingEmployeeData, is_active: e.target.checked })}
                            id={`active-${emp.id}`}
                          />
                          <Label htmlFor={`active-${emp.id}`}>Active</Label>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => handleSaveEmployee(emp.id)} size="sm">
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </Button>
                          <Button variant="outline" onClick={() => {
                            setEditingEmployee(null);
                            setEditingEmployeeData({});
                          }} size="sm">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {emp.bio && <p className="text-gray-600 text-sm mb-1">{emp.bio}</p>}
                        {emp.years_experience !== null && emp.years_experience !== undefined && (
                          <p className="text-sm text-gray-500">Years of Experience: {emp.years_experience}</p>
                        )}
                        <div className="mt-2 flex gap-2">
                          <Button
                            onClick={() => handleEditEmployee(emp)}
                            variant="outline"
                            size="sm"
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit Info
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedBarberForService(emp.id);
                              handleLoadBarberServices(emp.id);
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Manage Services
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedBarberForAvailability(emp.id);
                              handleLoadBarberAvailability(emp.id);
                            }}
                            variant="outline"
                            size="sm"
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            Set Hours
                          </Button>
                          <Button
                            onClick={() => handleRemoveEmployee(emp.id)}
                            variant="outline"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Services Assignment */}
                {selectedBarberForService === emp.id && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">Assign Services</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedBarberForService(null);
                          setPendingServiceSelections(prev => {
                            const updated = { ...prev };
                            delete updated[emp.id];
                            return updated;
                          });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {services.length === 0 ? (
                      <p className="text-sm text-gray-600">No services available. Add services first.</p>
                    ) : (
                      <>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {services.map((service) => {
                            const currentServiceIds = barberServices[emp.id]?.map(s => s.id) || [];
                            const pendingIds = pendingServiceSelections[emp.id];
                            // If pendingIds exists (even if empty array), use it. Otherwise fall back to current services.
                            const isChecked = pendingIds !== undefined
                              ? pendingIds.includes(service.id)
                              : currentServiceIds.includes(service.id);
                            
                            return (
                              <label key={service.id} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleServiceSelection(emp.id, service.id)}
                                />
                                <span className="text-sm">
                                  {service.name} - ${Number(service.price).toFixed(2)} ({service.duration_minutes} min)
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button onClick={() => handleSaveBarberServices(emp.id)} disabled={savingServices} size="sm">
                            {savingServices ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Save Services
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedBarberForService(null);
                              setPendingServiceSelections(prev => {
                                const updated = { ...prev };
                                delete updated[emp.id];
                                return updated;
                              });
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Availability Editor */}
                {selectedBarberForAvailability === emp.id && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">Set Working Hours</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedBarberForAvailability(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-600 mb-3">
                      Hours must be within salon hours for each day.
                    </p>
                    <div className="space-y-3">
                      {DAYS.map((day) => {
                        const salonHour = getSalonHoursForDay(day.value);
                        const editingData = editingAvailability[emp.id]?.[day.value] || {
                          day_of_week: day.value,
                          is_closed: salonHour.isClosed,
                          start_time: salonHour.open || "09:00",
                          end_time: salonHour.close || "17:00",
                        };
                        
                        return (
                          <div key={day.value} className="flex items-center gap-4 p-3 border rounded-lg bg-white">
                            <div className="w-24 font-medium">{day.label}</div>
                            {salonHour.isClosed ? (
                              <span className="text-sm text-gray-500">Salon Closed</span>
                            ) : (
                              <>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={!editingData.is_closed}
                                    onChange={(e) => {
                                      setEditingAvailability(prev => ({
                                        ...prev,
                                        [emp.id]: {
                                          ...prev[emp.id],
                                          [day.value]: {
                                            ...editingData,
                                            is_closed: !e.target.checked,
                                          }
                                        }
                                      }));
                                    }}
                                  />
                                  <Label className="text-sm">Available</Label>
                                </div>
                                {!editingData.is_closed && (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="time"
                                      value={editingData.start_time || "09:00"}
                                      onChange={(e) => {
                                        setEditingAvailability(prev => ({
                                          ...prev,
                                          [emp.id]: {
                                            ...prev[emp.id],
                                            [day.value]: {
                                              ...editingData,
                                              start_time: e.target.value,
                                            }
                                          }
                                        }));
                                      }}
                                      className="w-32"
                                      min={salonHour.open}
                                      max={salonHour.close}
                                    />
                                    <span>to</span>
                                    <Input
                                      type="time"
                                      value={editingData.end_time || "17:00"}
                                      onChange={(e) => {
                                        setEditingAvailability(prev => ({
                                          ...prev,
                                          [emp.id]: {
                                            ...prev[emp.id],
                                            [day.value]: {
                                              ...editingData,
                                              end_time: e.target.value,
                                            }
                                          }
                                        }));
                                      }}
                                      className="w-32"
                                      min={salonHour.open}
                                      max={salonHour.close}
                                    />
                                    <span className="text-xs text-gray-500">
                                      (Salon: {salonHour.open} - {salonHour.close})
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button onClick={() => handleSaveBarberAvailability(emp.id)} disabled={savingAvailability} size="sm">
                        {savingAvailability ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Hours
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedBarberForAvailability(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inactive Employees (Past Employees) */}
            {employees.filter(emp => emp.is_active === false).length > 0 && (
              <div>
                <h3 className="text-md font-semibold mb-3 text-gray-600">Past Employees</h3>
                <div className="space-y-4">
                  {employees.filter(emp => emp.is_active === false).map((emp) => (
                    <div key={emp.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-700">{emp.name}</h3>
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Inactive</span>
                          </div>
                          
                          <>
                            {emp.bio && <p className="text-gray-600 text-sm mb-1">{emp.bio}</p>}
                            {emp.years_experience !== null && emp.years_experience !== undefined && (
                              <p className="text-sm text-gray-500">Years of Experience: {emp.years_experience}</p>
                            )}
                          </>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

