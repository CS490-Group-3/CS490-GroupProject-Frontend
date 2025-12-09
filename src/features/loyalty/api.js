import { api } from "../../shared/api/client.js";

// Get customer's current points balance and activity
export async function getCustomerPoints() {
  try {
    const response = await api("/loyalty/balance");
    // Transform backend response to match frontend structure
    const salonBalances = response.salon_balances || [];
    return salonBalances.map(salon => ({
      salon_id: salon.salon_id,
      salon_name: salon.salon_name,
      balance: salon.balance || 0,
      lifetime_points_earned: salon.lifetime_points_earned || 0,
      lifetime_points_redeemed: salon.lifetime_points_redeemed || 0,
      pending_points: salon.pending_points || 0,
      activity: salon.activity || []
    }));
  } catch (error) {
    console.error("Failed to fetch loyalty points:", error);
    return [];
  }
}

// Get available loyalty rewards for a specific salon
export async function getLoyaltyRewards(salonId = null) {
  if (!salonId) {
    throw new Error("salonId is required");
  }
  try {
    const response = await api(`/loyalty/rewards?salon_id=${salonId}`);
    return {
      pointThreshold: response.pointThreshold || 100,
      rewardDiscount: response.rewardDiscount || 10
    };
  } catch (error) {
    console.error("Failed to fetch loyalty rewards:", error);
    throw error;
  }
}

// Get active promotional offers for a salon (customer-facing, only shows eligible promotions)
export async function getActivePromotions(salonId, purchaseAmount = 0) {
  if (!salonId) {
    return [];
  }
  try {
    const response = await api(`/salons/${salonId}/promotions/active?purchase_amount=${purchaseAmount}`);
    return response.promotions || [];
  } catch (error) {
    console.error("Failed to fetch active promotions:", error);
    return [];
  }
}

// Calculate potential loyalty points for an amount
export async function getPotentialPoints(salonId, amount) {
  if (!salonId || amount == null) {
    return 0;
  }
  try {
    const response = await api(`/loyalty/potential-points?salon_id=${salonId}&amount=${amount}`);
    return response.points || 0;
  } catch (error) {
    console.error("Failed to calculate potential points:", error);
    return 0;
  }
}

// Redeem points for a reward at a specific salon
// Note: Actual redemption happens during payment creation
// This endpoint just checks eligibility
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
  try {
    const response = await api("/loyalty/redeem", {
      method: "POST",
      body: JSON.stringify({ salon_id: salonId }),
    });
    return response;
  } catch (error) {
    console.error("Failed to check redemption eligibility:", error);
    throw error;
  }
}

// Get owner's loyalty program configuration
export async function getLoyaltyConfig() {
  if (import.meta.env.VITE_MOCK === "1") {
    return MOCK_LOYALTY_CONFIG;
  }
  try {
    const response = await api("/owner/loyalty/config");
    return {
      pointsPerDollar: response.pointsPerDollar || 1.0,
      pointThreshold: response.pointThreshold || 100,
      rewardDiscount: response.rewardDiscount || 10,
      is_active: response.is_active !== false
    };
  } catch (error) {
    console.error("Failed to fetch loyalty config:", error);
    return MOCK_LOYALTY_CONFIG;
  }
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
  try {
    const response = await api("/owner/loyalty/config", {
      method: "POST",
      body: JSON.stringify({
        pointsPerDollar: config.pointsPerDollar,
        pointThreshold: config.pointThreshold,
        rewardDiscount: config.rewardDiscount
      }),
    });
    return response;
  } catch (error) {
    console.error("Failed to update loyalty config:", error);
    throw error;
  }
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
  
  try {
    const params = new URLSearchParams();
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    
    const queryString = params.toString();
    const response = await api(`/owner/payments${queryString ? `?${queryString}` : ""}`);
    return Array.isArray(response) ? response : [];
  } catch (error) {
    console.error("Failed to fetch payment history:", error);
    return [];
  }
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

