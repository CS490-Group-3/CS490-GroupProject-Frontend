import { api } from "../../shared/api/client.js";

function buildSearch(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value) && value.length === 0) return;
    search.set(key, Array.isArray(value) ? value.join(",") : value);
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

async function fetchAppointments(params = {}) {
  const res = await api(`/appointments${buildSearch(params)}`);
  // Return the full response object for pagination info
  return res;
}

export async function listServices() {
  const res = await api("/services?unique=name");
  return res.services ?? [];
}

export async function listSalons({ q = "", location = "", services = [], sort = "top" } = {}) {
  const search = buildSearch({
    q,
    location,
    services,
    sort,
  });
  const res = await api(`/salons${search}`);
  return res.salons ?? [];
}

export async function getSalon(id) {
  return api(`/salons/${id}`);
}

export async function getSalonReviews(id) {
  const res = await api(`/salons/${id}/reviews?limit=1000`);
  return res.reviews ?? [];
}

export async function listEmployees(salonId) {
  const res = await api(`/salons/${salonId}/employees`);
  return res.employees ?? [];
}

export async function listAvailability({ salonId, employeeId, serviceId, dateISO }) {
  const params = buildSearch({
    salon_id: salonId,
    barber_id: employeeId,
    service_id: serviceId,
    date: dateISO,
  });
  const res = await api(`/appointments/availability${params}`);
  return res.slots ?? [];
}

export async function listUserAppointments(params = {}) {
  const { 
    when, 
    page = 1, 
    limit = 100, 
    sort = "asc",
    status
  } = params;
  
  const searchParams = {
    page,
    limit,
    sort
  };
  
  if (when) {
    searchParams.when = when;
  }
  
  if (status) {
    searchParams.status = status;
  }
  
  const res = await fetchAppointments(searchParams);
  return res;
}

export async function createAppointment(payload) {
  return api("/appointments/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAppointment(payload) {
  if (!payload?.id) throw new Error("Appointment update requires an id.");
  return api("/appointments", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function rescheduleAppointment(id, update) {
  return api(`/appointments/${id}/reschedule`, {
    method: "PATCH",
    body: JSON.stringify(update),
  });
}

export async function cancelAppointment(id, reason) {
  return api(`/appointments/${id}/cancel`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });
}

export async function submitReview(appointmentId, { stars, comment }) {
  return api(`/reviews/`, {
    method: "POST",
    body: JSON.stringify({ 
      appointment_id: appointmentId,
      rating: stars,
      comment: comment || "",
    }),
  });
}

export async function updateReview(reviewId, { stars, comment }) {
  return api(`/reviews/${reviewId}`, {
    method: "PATCH",
    body: JSON.stringify({ 
      rating: stars,
      comment: comment || "",
    }),
  });
}

export async function uploadReviewImages(reviewId, files, labels) {
  const formData = new FormData();
  
  // Validate files
  if (!files || files.length === 0) {
    throw new Error("No files provided");
  }
  
  console.log("Preparing FormData with files:", files.length, "files");
  console.log("Files array:", files);
  
  // Add all files - Flask's getlist() will collect them into an array
  files.forEach((file, index) => {
    // Validate that it's a File object
    if (!(file instanceof File)) {
      console.error(`File ${index + 1} is not a File object:`, file, typeof file);
      throw new Error(`File ${index + 1} is not a valid File object`);
    }
    console.log(`Adding file ${index + 1}:`, {
      name: file.name,
      type: file.type,
      size: file.size,
      isFile: file instanceof File,
      isBlob: file instanceof Blob
    });
    formData.append("files", file, file.name);
  });
  
  // Add corresponding labels
  if (labels && labels.length > 0) {
    labels.forEach((label, index) => {
      console.log(`Adding label ${index + 1}:`, label);
      formData.append("labels", label);
    });
  }
  
  // Log FormData contents (for debugging)
  console.log("FormData entries:");
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
    } else {
      console.log(`  ${key}: ${value}`);
    }
  }
  
  return api(`/reviews/${reviewId}/images`, {
    method: "POST",
    body: formData,
  });
}

export async function getReviewImages(reviewId) {
  const res = await api(`/reviews/${reviewId}/images`);
  return Array.isArray(res) ? res : res.images || [];
}

export async function getFullReview(reviewId) {
  return api(`/reviews/${reviewId}`);
}

export async function refreshSignedUrl(filepath, fileType = "review-images") {
  return api("/uploads/refresh", {
    method: "POST",
    body: JSON.stringify({
      filepath,
      file_type: fileType
    }),
  });
}

export async function listVendorRequests() {
  const pending = await fetchAppointments({ when: "upcoming", status: "pending" });
  const upcoming = await fetchAppointments({ when: "upcoming", status: "scheduled" });
  const denied = await fetchAppointments({ when: "past", status: "denied" });
  return { pending, upcoming, denied };
}

export async function vendorConfirm(id, message) {
  return api(`/appointments/${id}/action`, {
    method: "PATCH",
    body: JSON.stringify({ action: "confirm", message }),
  });
}

export async function vendorDeny(id, reason) {
  return api(`/appointments/${id}/action`, {
    method: "PATCH",
    body: JSON.stringify({ action: "deny", reason }),
  });
}
