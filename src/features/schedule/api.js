import { api } from "../../shared/api/client.js";

const AVAILABILITY_BASE = "/schedule/availability";
const APPOINTMENTS_BASE = "/appointments";
const UNAVAILABILITY_BASE = "/schedule/unavailability";

export async function fetchAvailability() {
  return api(AVAILABILITY_BASE);
}

export async function createAvailability(availability) {
  if (!Array.isArray(availability)) {
    throw new Error("Availability payload must be an array.");
  }

  return api(AVAILABILITY_BASE, {
    method: "POST",
    body: JSON.stringify({ availability }),
  });
}

export async function updateAvailability(updates) {
  if (!Array.isArray(updates) || updates.length === 0) {
    throw new Error("No availability updates provided.");
  }

  return api(AVAILABILITY_BASE, {
    method: "PATCH",
    body: JSON.stringify({ availability: updates }),
  });
}

// Generic appointments fetcher with filters + paging support
export async function fetchAppointments(params = {}) {
  const search = new URLSearchParams();
  const { when, status, limit, page } = params;
  if (when) search.set("when", when);
  if (status) search.set("status", Array.isArray(status) ? status.join(",") : status);
  if (limit) search.set("limit", String(limit));
  if (page) search.set("page", String(page));
  const qs = search.toString();
  return api(`${APPOINTMENTS_BASE}${qs ? `?${qs}` : ""}`);
}

export async function patchAppointment(payload) {
  if (!payload?.id) {
    throw new Error("Appointment update payload must include an id.");
  }

  return api(APPOINTMENTS_BASE, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// ---- Unavailability / blocking ----
export async function fetchUnavailability(params = {}) {
  const query = new URLSearchParams();
  if (params.start_from) query.append("start_from", params.start_from);
  if (params.end_before) query.append("end_before", params.end_before);
  const qs = query.toString();
  return api(`${UNAVAILABILITY_BASE}${qs ? `?${qs}` : ""}`);
}

export async function createUnavailability(payload) {
  if (!payload?.start_datetime || !payload?.end_datetime) {
    throw new Error("start_datetime and end_datetime are required.");
  }

  return api(UNAVAILABILITY_BASE, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateUnavailability(blockId, updates) {
  if (!blockId) {
    throw new Error("blockId is required to update unavailability.");
  }
  if (!updates || Object.keys(updates).length === 0) {
    throw new Error("No updates provided for unavailability.");
  }

  return api(`${UNAVAILABILITY_BASE}/${blockId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deleteUnavailability(blockId, params = {}) {
  if (!blockId) {
    throw new Error("blockId is required to delete unavailability.");
  }
  const query = new URLSearchParams();
  if (params.barber_id) query.append("barber_id", params.barber_id);
  const qs = query.toString();
  return api(`${UNAVAILABILITY_BASE}/${blockId}${qs ? `?${qs}` : ""}`, {
    method: "DELETE",
  });
}

// Notify customer that barber is running late
export async function notifyRunningLate(appointmentId) {
  if (!appointmentId) {
    throw new Error("Appointment ID is required to notify customer.");
  }
  return api(`${APPOINTMENTS_BASE}/${appointmentId}/running-late`, {
    method: "POST",
  });
}
