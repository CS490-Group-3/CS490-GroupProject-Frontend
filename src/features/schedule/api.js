import { api } from "../../shared/api/client.js";

export async function fetchAppointments(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  });
  const qs = search.toString();
  return api(`/appointments${qs ? `?${qs}` : ""}`);
}

export async function patchAppointment(appointmentId, updates) {
  return api(`/appointments/${appointmentId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function fetchUnavailability(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  });
  const qs = search.toString();
  return api(`/schedule/unavailability${qs ? `?${qs}` : ""}`);
}

export async function createUnavailability(data) {
  return api("/schedule/unavailability", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteUnavailability(blockId) {
  return api(`/schedule/unavailability/${blockId}`, {
    method: "DELETE",
  });
}

export async function fetchAvailability() {
  return api("/schedule/availability");
}

export async function createAvailability(data) {
  return api("/schedule/availability", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateAvailability(data) {
  return api("/schedule/availability", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function notifyRunningLate(appointmentId) {
  return api(`/appointments/${appointmentId}/notify-late`, {
    method: "POST",
  });
}

export async function getMyBarberSalon() {
  return api("/salons/mine");
}
