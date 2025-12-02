import { api } from "../../shared/api/client.js";

// Get customer's current points balance and activity
// NOTE: Loyalty points endpoint not visible in current API docs
// Using mock data until backend implements it
export async function getCustomerPoints() {
  if (import.meta.env.VITE_MOCK === "1") {
    return MOCK_CUSTOMER_POINTS;
  }
  // TODO: Backend needs to implement loyalty points API
  // Falling back to mock data for now
  return MOCK_CUSTOMER_POINTS;
}

// Get available loyalty rewards for a specific salon
export async function getLoyaltyRewards(salonId = null) {
  if (import.meta.env.VITE_MOCK === "1") {
    return MOCK_REWARDS;
  }
  if (salonId) {
    return api(`/loyalty/rewards?salon_id=${salonId}`);
  }
  return api("/loyalty/rewards");
}

// Redeem points for a reward at a specific salon
export async function redeemPoints(salonId) {
  if (import.meta.env.VITE_MOCK === "1") {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const threshold = MOCK_REWARDS.pointThreshold || 100;
    const salon = MOCK_CUSTOMER_POINTS.find((s) => s.salon_id === salonId) || MOCK_CUSTOMER_POINTS[0];
    return {
      success: true,
      message: "Reward redeemed successfully",
      newBalance: (salon?.balance || 150) - threshold,
    };
  }
  return api("/loyalty/redeem", {
    method: "POST",
    body: JSON.stringify({ salon_id: salonId }),
  });
}

// Get owner's loyalty program configuration
export async function getLoyaltyConfig() {
  if (import.meta.env.VITE_MOCK === "1") {
    return MOCK_LOYALTY_CONFIG;
  }
  return api("/owner/loyalty/config");
}

// Update owner's loyalty program configuration
export async function updateLoyaltyConfig(config) {
  if (import.meta.env.VITE_MOCK === "1") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return {
      success: true,
      message: "Loyalty program settings updated successfully",
      config: { ...MOCK_LOYALTY_CONFIG, ...config },
    };
  }
  return api("/owner/loyalty/config", {
    method: "POST",
    body: JSON.stringify(config),
  });
}

// Get owner's payment history
export async function getPaymentHistory(startDate = null, endDate = null) {
  if (import.meta.env.VITE_MOCK === "1") {
    await new Promise((resolve) => setTimeout(resolve, 500));
    let payments = [...MOCK_PAYMENTS];
    
    // Filter by date if provided
    if (startDate) {
      payments = payments.filter((p) => p.date >= startDate);
    }
    if (endDate) {
      payments = payments.filter((p) => p.date <= endDate);
    }
    
    return payments;
  }
  
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  
  const queryString = params.toString();
  return api(`/owner/payments${queryString ? `?${queryString}` : ""}`);
}

// Mock data - salon-specific balances
const MOCK_CUSTOMER_POINTS = [
  {
    salon_id: "salon-1",
    salon_name: "Elite Hair Studio",
    balance: 150,
    activity: [
      {
        id: 1,
        type: "earned",
        points: 50,
        description: "Appointment completed at Elite Hair Studio",
        date: "2025-01-15",
        appointmentId: "A-2001",
      },
      {
        id: 2,
        type: "earned",
        points: 75,
        description: "Appointment completed at Elite Hair Studio",
        date: "2025-01-05",
        appointmentId: "A-1999",
      },
      {
        id: 3,
        type: "earned",
        points: 45,
        description: "Appointment completed at Elite Hair Studio",
        date: "2024-12-28",
        appointmentId: "A-1998",
      },
    ],
  },
  {
    salon_id: "salon-2",
    salon_name: "Glamour Salon",
    balance: 100,
    activity: [
      {
        id: 4,
        type: "earned",
        points: 100,
        description: "Appointment completed at Glamour Salon",
        date: "2025-01-10",
        appointmentId: "A-2000",
      },
    ],
  },
];

const MOCK_REWARDS = {
  pointThreshold: 100,
  rewardDiscount: 10, // percentage (0-100)
};

const MOCK_LOYALTY_CONFIG = {
  pointsPerDollar: 1,
  pointThreshold: 100,
  rewardDiscount: 10, // percentage (0-100)
};

const MOCK_PAYMENTS = [
  {
    id: 1,
    date: "2025-01-15",
    customer: "John Smith",
    service: "Haircut",
    amount: 45,
    status: "paid",
    paymentMethod: "card",
  },
  {
    id: 2,
    date: "2025-01-14",
    customer: "Sarah Johnson",
    service: "Hair Coloring",
    amount: 120,
    status: "paid",
    paymentMethod: "card",
  },
  {
    id: 3,
    date: "2025-01-13",
    customer: "Mike Chen",
    service: "Haircut",
    amount: 50,
    status: "paid",
    paymentMethod: "card",
  },
  {
    id: 4,
    date: "2025-01-12",
    customer: "Emma Davis",
    service: "Beard Trim",
    amount: 25,
    status: "paid",
    paymentMethod: "cash",
  },
  {
    id: 5,
    date: "2025-01-11",
    customer: "Alex Rivera",
    service: "Haircut",
    amount: 45,
    status: "unpaid",
    paymentMethod: null,
  },
];

