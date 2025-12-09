import { api } from "../../shared/api/client.js";

/**
 * Payment API functions
 */

// Get user's saved payment methods
export async function getSavedPaymentMethods() {
  try {
    const response = await api("/payment-methods");
    console.log("Payment methods API response:", response);
    const methods = response.payment_methods || response || [];
    console.log("Returning payment methods:", methods);
    return methods;
  } catch (error) {
    console.error("Failed to fetch saved payment methods:", error);
    return [];
  }
}

// Create a saved payment method
export async function createSavedPaymentMethod(paymentMethodData) {
  try {
    const response = await api("/payment-methods", {
      method: "POST",
      body: JSON.stringify(paymentMethodData),
    });
    return response;
  } catch (error) {
    console.error("Failed to create saved payment method:", error);
    throw error;
  }
}

// Set a payment method as default
export async function setDefaultPaymentMethod(paymentMethodId) {
  try {
    const response = await api(`/payment-methods/${paymentMethodId}/set-default`, {
      method: "PUT",
    });
    return response;
  } catch (error) {
    console.error("Failed to set default payment method:", error);
    throw error;
  }
}

// Delete a saved payment method
export async function deletePaymentMethod(paymentMethodId) {
  try {
    const response = await api(`/payment-methods/${paymentMethodId}`, {
      method: "DELETE",
    });
    return response;
  } catch (error) {
    console.error("Failed to delete payment method:", error);
    throw error;
  }
}

// Create a payment for an appointment (existing appointment)
export async function createPayment(paymentData) {
  try {
    const response = await api("/payments", {
      method: "POST",
      body: JSON.stringify(paymentData),
    });
    return response;
  } catch (error) {
    console.error("Failed to create payment:", error);
    throw error;
  }
}

// Create appointment and payment atomically (appointment only created if payment succeeds)
export async function createAppointmentWithPayment(appointmentData, paymentData) {
  try {
    const payload = {
      appointment: appointmentData,
      ...paymentData
    };
    const response = await api("/payments/create-with-appointment", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response;
  } catch (error) {
    console.error("Failed to create appointment with payment:", error);
    throw error;
  }
}

// Get user's payment history
export async function getPaymentHistory(startDate = null, endDate = null) {
  try {
    const params = new URLSearchParams();
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    
    const queryString = params.toString();
    const response = await api(`/payments${queryString ? `?${queryString}` : ""}`);
    return response.payments || [];
  } catch (error) {
    console.error("Failed to fetch payment history:", error);
    return [];
  }
}

// Get a single payment by ID
export async function getPayment(paymentId) {
  try {
    const response = await api(`/payments/${paymentId}`);
    return response.payment;
  } catch (error) {
    console.error("Failed to fetch payment:", error);
    throw error;
  }
}
