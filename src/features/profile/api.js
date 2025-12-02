import { api } from "../../shared/api/client.js";

/**
 * Get the current authenticated user's profile
 * @returns {Promise<Object>} User profile object
 */
export async function getCurrentUserProfile() {
  const res = await api("/auth/me");
  return res.user ?? null;
}

/**
 * Update the current user's profile
 * @param {Object} profileData - Profile data to update (all fields optional, snake_case)
 * @returns {Promise<Object>} Updated profile object
 */
export async function updateUserProfile(profileData) {
  const res = await api("/auth/profile", {
    method: "PUT",
    body: JSON.stringify(profileData),
  });
  return res.profile ?? profileData;
}

/**
 * Get available services for preferred_services selection
 * @returns {Promise<Array<string>>} Array of service names
 */
export async function getAvailableServices() {
  const res = await api("/services?unique=name");
  return res.services ?? [];
}
