import { api } from "../../shared/api/client.js";

export async function submitSalonRegistration({
  name,
  address,
  city,
  state,
  zip_code,
  phone,
  email,
  description,
  timezone,
  logoFile,
  licenseFile,
}) {
  const formData = new FormData();
  formData.append("name", name);
  formData.append("address", address);
  if (city) formData.append("city", city);
  if (state) formData.append("state", state);
  if (zip_code) formData.append("zip_code", zip_code);
  if (phone) formData.append("phone", phone);
  if (email) formData.append("email", email);
  if (description) formData.append("description", description);
  if (timezone) formData.append("timezone", timezone);
  if (logoFile) formData.append("logo", logoFile);
  if (licenseFile) formData.append("license", licenseFile);

  return api("/salons/apply", {
    method: "POST",
    body: formData,
  });
}

export async function getOwnedSalon() {
  return api("/salons/mine");
}

export async function getSalonDetail(salonId) {
  return api(`/salons/${salonId}`);
}

export async function updatePendingApplication(salonId, {
  name,
  address,
  city,
  state,
  zip_code,
  phone,
  email,
  description,
  timezone,
  logoFile,
  licenseFile,
}) {
  const formData = new FormData();
  if (name) formData.append("name", name);
  if (address) formData.append("address", address);
  if (city) formData.append("city", city);
  if (state) formData.append("state", state);
  if (zip_code) formData.append("zip_code", zip_code);
  if (phone) formData.append("phone", phone);
  if (email) formData.append("email", email);
  if (description) formData.append("description", description);
  if (timezone) formData.append("timezone", timezone);
  if (logoFile) formData.append("logo", logoFile);
  if (licenseFile) formData.append("license", licenseFile);

  return api(`/salons/${salonId}/application`, {
    method: "PATCH",
    body: formData,
  });
}

// Setup checklist API functions
export async function checkSetupStatus(salonId) {
  try {
    // Get salon detail which includes hours, services, employees
    const detail = await getSalonDetail(salonId);
    
    // Check hours
    const hasHours = detail.hours && detail.hours.length > 0 && 
                     detail.hours.some(h => !h.is_closed);
    
    // Check services
    const hasServices = detail.services && detail.services.length > 0;
    
    // Check employees
    const hasEmployees = detail.employees && detail.employees.length > 0;
    
    // Check if at least one employee has services assigned
    let hasEmployeeWithServices = false;
    if (hasEmployees) {
      // Fetch services for each employee
      const employeeChecks = await Promise.all(
        detail.employees.map(async (employee) => {
          try {
            const services = await api(`/salons/${salonId}/barbers/${employee.id}/services`);
            return services.services && services.services.length > 0;
          } catch {
            return false;
          }
        })
      );
      hasEmployeeWithServices = employeeChecks.some(has => has);
    }
    
    return {
      hasHours,
      hasServices,
      hasEmployees,
      hasEmployeeWithServices,
      isComplete: hasHours && hasServices && hasEmployees && hasEmployeeWithServices,
    };
  } catch (error) {
    console.error("Error checking setup status:", error);
    return {
      hasHours: false,
      hasServices: false,
      hasEmployees: false,
      hasEmployeeWithServices: false,
      isComplete: false,
    };
  }
}

// Search for barbers not in a salon
export async function searchBarbers(email) {
  return api(`/salons/provider/search?email=${encodeURIComponent(email)}`);
}

// Add barber to salon
export async function addBarberToSalon(salonId, { user_id, bio, years_experience, is_active }) {
  return api("/salons/provider", {
    method: "POST",
    body: JSON.stringify({
      salon_id: salonId,
      user_id,
      bio,
      years_experience,
      is_active: is_active !== undefined ? is_active : true,
    }),
  });
}

// Get salon employees
export async function getSalonEmployees(salonId) {
  return api(`/salons/${salonId}/employees`);
}

// Get salon services
export async function getSalonServices(salonId) {
  return api(`/salons/${salonId}/services`);
}

// Create service
export async function createService({ salon_id, name, description, duration_minutes, price, is_active }) {
  return api("/services", {
    method: "POST",
    body: JSON.stringify({
      salon_id,
      name,
      description,
      duration_minutes,
      price,
      is_active: is_active !== undefined ? is_active : true,
    }),
  });
}

// Update salon hours
export async function updateSalonHours(salonId, hours) {
  return api(`/salons/${salonId}/hours`, {
    method: "PUT",
    body: JSON.stringify({ hours }),
  });
}

// Get salon hours
export async function getSalonHours(salonId) {
  return api(`/salons/${salonId}/hours`);
}

// Add service to barber
export async function addServiceToBarber(salonId, barberId, serviceId) {
  return api(`/salons/${salonId}/barbers/${barberId}/services`, {
    method: "POST",
    body: JSON.stringify({ service_id: serviceId }),
  });
}

// Get barber services
export async function getBarberServices(salonId, barberId) {
  return api(`/salons/${salonId}/barbers/${barberId}/services`);
}

// Update verified salon
export async function updateSalon(salonId, updates, logoFile = null) {
  if (logoFile) {
    const formData = new FormData();
    Object.keys(updates).forEach(key => {
      formData.append(key, updates[key]);
    });
    formData.append('logo', logoFile);
    return api(`/salons/${salonId}`, {
      method: "PATCH",
      body: formData,
    });
  } else {
    return api(`/salons/${salonId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }
}

// Update service
export async function updateService(serviceId, salonId, updates) {
  return api(`/services/${serviceId}`, {
    method: "PATCH",
    body: JSON.stringify({ ...updates, salon_id: salonId }),
  });
}

// Delete service
export async function deleteService(serviceId, salonId) {
  return api(`/services/${serviceId}?salon_id=${salonId}`, {
    method: "DELETE",
  });
}

// Remove employee
export async function removeEmployee(salonId, barberId) {
  return api(`/salons/${salonId}/employees/${barberId}`, {
    method: "DELETE",
  });
}

// Get salon customers
export async function getSalonCustomers(salonId) {
  return api(`/salons/${salonId}/customers`);
}

// Respond to review
export async function respondToReview(reviewId, message) {
  return api(`/reviews/${reviewId}/response`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

// Get customer appointments (for salon owner)
export async function getCustomerAppointments(salonId, customerId, page = 1, limit = 100, when = "all", status = null, sort = "asc") {
  // Salon owners can filter by customer_id, the endpoint will return all salon appointments filtered by customer
  let url = `/appointments?customer_id=${customerId}&salon_id=${salonId}&when=${when}&page=${page}&limit=${limit}&sort=${sort}`;
  if (status) {
    url += `&status=${status}`;
  }
  const res = await api(url);
  // Handle both array and object response formats
  if (Array.isArray(res)) {
    return { appointments: res, total_count: res.length, count: res.length, page: 1, limit: res.length };
  }
  return res;
}

// Update appointment status
export async function updateAppointmentStatus(appointmentId, status, cancellationReason = null) {
  const payload = { id: appointmentId, status };
  if (cancellationReason) {
    payload.cancellation_reason = cancellationReason;
  }
  return await api(`/appointments`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// Mark appointment as completed or no-show
export async function markAppointmentComplete(appointmentId, status) {
  return await api(`/appointments/${appointmentId}/complete`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// Update employee (barber) information
export async function updateEmployee(salonId, barberId, updates) {
  return await api(`/salons/${salonId}/employees/${barberId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

// Get employee availability
export async function getEmployeeAvailability(salonId, barberId) {
  return await api(`/salons/${salonId}/employees/${barberId}/availability`);
}

// Set employee availability (POST for create, PATCH for update)
export async function setEmployeeAvailability(salonId, barberId, availability, method = "POST") {
  return await api(`/salons/${salonId}/employees/${barberId}/availability`, {
    method: method,
    body: JSON.stringify({ availability }),
  });
}

// Submit appeal for rejected salon
export async function submitSalonAppeal(salonId, {
  name,
  address,
  city,
  state,
  zip_code,
  phone,
  email,
  description,
  timezone,
  logoFile,
  licenseFile,
}) {
  const formData = new FormData();
  if (name) formData.append("name", name);
  if (address) formData.append("address", address);
  if (city) formData.append("city", city);
  if (state) formData.append("state", state);
  if (zip_code) formData.append("zip_code", zip_code);
  if (phone) formData.append("phone", phone);
  if (email) formData.append("email", email);
  if (description) formData.append("description", description);
  if (timezone) formData.append("timezone", timezone);
  if (logoFile) formData.append("logo", logoFile);
  if (licenseFile) formData.append("license", licenseFile);

  return api(`/salons/${salonId}/appeal`, {
    method: "PUT",
    body: formData,
  });
}

// Get salon status history (to get rejection reason from notifications)
export async function getSalonStatusHistory(salonId) {
  return api(`/salons/${salonId}/status-history`);
}
