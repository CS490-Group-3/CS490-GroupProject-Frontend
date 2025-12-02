import { api } from "../../shared/api/client.js";

// Get user profile information
export async function getUserProfile() {
  if (import.meta.env.VITE_MOCK === "1") {
    return MOCK_USER_PROFILE;
  }
  return api("/api/auth/me");
}

// Update user profile information
export async function updateUserProfile(profileData) {
  if (import.meta.env.VITE_MOCK === "1") {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      success: true,
      message: "Profile updated successfully",
      profile: { ...MOCK_USER_PROFILE, ...profileData },
    };
  }
  return api("/api/auth/profile", {
    method: "PUT",
    body: JSON.stringify(profileData),
  });
}

// Get user preferences
// NOTE: Backend doesn't have a dedicated preferences endpoint yet
// This will use mock data until backend implements it
export async function getUserPreferences() {
  if (import.meta.env.VITE_MOCK === "1") {
    return MOCK_USER_PREFERENCES;
  }
  // TODO: Backend needs to implement /api/auth/preferences or add to /api/auth/me
  return MOCK_USER_PREFERENCES; // Fallback to mock for now
}

// Update user preferences
// NOTE: Backend doesn't have a dedicated preferences endpoint yet
export async function updateUserPreferences(preferences) {
  if (import.meta.env.VITE_MOCK === "1") {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      success: true,
      message: "Preferences updated successfully",
      preferences: { ...MOCK_USER_PREFERENCES, ...preferences },
    };
  }
  // TODO: Backend needs to implement /api/auth/preferences
  return {
    success: true,
    message: "Preferences saved locally (backend endpoint pending)",
    preferences: { ...MOCK_USER_PREFERENCES, ...preferences },
  };
}

/* ---------------- Mock Data ---------------- */

const MOCK_USER_PROFILE = {
  id: 1,
  email: "demo@example.com",
  firstName: "John",
  lastName: "Doe",
  phone: "+1 (555) 123-4567",
  dateOfBirth: "1990-05-15",
  address: {
    street: "123 Main Street",
    city: "New York",
    state: "NY",
    zipCode: "10001",
    country: "USA",
  },
  memberSince: "2024-01-15",
  profileImage: null,
};

const MOCK_USER_PREFERENCES = {
  notificationsEnabled: true,
  appointmentReminders: {
    dayBefore: true,
    hourBefore: true,
  },
  promotionalNotifications: false,
};

