import { useState, useEffect } from "react";
import { Button } from "../../../shared/ui/button";
import { getCustomerPoints, getLoyaltyRewards, redeemPoints, getActivePromotions } from "../api.js";
import { Tag, Calendar } from "lucide-react";

export default function Loyalty() {
  const [salonBalances, setSalonBalances] = useState([]); // Array of { salon_id, salon_name, balance, activity }
  const [selectedSalonId, setSelectedSalonId] = useState(null);
  const [rewards, setRewards] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [calculatingPending, setCalculatingPending] = useState(true);
  const [promotionsBySalon, setPromotionsBySalon] = useState({}); // { salon_id: [promotions] }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        // Load main loyalty data first (critical)
        const pointsData = await getCustomerPoints();
        if (!alive) return;
        
        // Points data should be array of salon balances: [{ salon_id, salon_name, balance, activity }, ...]
        // Or object with salon_balances array
        let balances = [];
        if (Array.isArray(pointsData)) {
          balances = pointsData;
        } else if (pointsData.salon_balances && Array.isArray(pointsData.salon_balances)) {
          balances = pointsData.salon_balances;
        } else if (pointsData.balance !== undefined) {
          // Fallback: single balance object (old format)
          balances = [{
            salon_id: pointsData.salon_id || "default",
            salon_name: pointsData.salon_name || "Salon",
            balance: pointsData.balance || 0,
            activity: pointsData.activity || []
          }];
        }
        
        setSalonBalances(balances);
        
        // Auto-select first salon if available and not already selected
        const firstSalonId = balances.length > 0 && balances[0].salon_id ? balances[0].salon_id : null;
        if (firstSalonId) {
          setSelectedSalonId(firstSalonId);
          // Immediately load rewards for first salon (high priority - load early)
          getLoyaltyRewards(firstSalonId)
            .then((rewardsData) => {
              if (!alive) return;
              setRewards(rewardsData);
            })
            .catch((err) => {
              console.error("Failed to load rewards:", err);
            });
        }
        
        // Load promotions for all salons asynchronously
        (async () => {
          try {
            const { getActivePromotions } = await import("../api.js");
            const promotionsMap = {};
            await Promise.all(
              balances.map(async (salon) => {
                try {
                  const promotions = await getActivePromotions(salon.salon_id, 0);
                  promotionsMap[salon.salon_id] = promotions || [];
                } catch (err) {
                  console.error(`Failed to load promotions for salon ${salon.salon_id}:`, err);
                  promotionsMap[salon.salon_id] = [];
                }
              })
            );
            if (!alive) return;
            setPromotionsBySalon(promotionsMap);
          } catch (err) {
            console.error("Error loading promotions:", err);
          }
        })();
        
        // Calculate pending points asynchronously (non-critical - load last)
        setCalculatingPending(true);
        (async () => {
          try {
            const { listUserAppointments } = await import("../../booking/api.js");
            const { api } = await import("../../../shared/api/client.js");
            const { getPotentialPoints } = await import("../api.js");
            
            const [appointmentsRes, ordersRes] = await Promise.all([
              listUserAppointments().catch(() => ({ upcoming: [], past: [] })),
              api("/orders").then(res => res.orders || []).catch(() => [])
            ]);
            
            if (!alive) return;
            
            const appointments = [...(appointmentsRes.upcoming || []), ...(appointmentsRes.past || [])];
            const orders = ordersRes || [];
            
            // Calculate pending points per salon
            const pendingPointsBySalon = {};
            
            // Calculate from scheduled appointments
            for (const apt of appointments) {
              if ((apt.status === "scheduled" || apt.status === "confirmed") && 
                  apt.payment_status === "completed" && 
                  apt.salon_id && 
                  apt.payment?.amount) {
                const salonId = apt.salon_id;
                const amount = parseFloat(apt.payment.amount) || 0;
                if (amount > 0) {
                  const points = await getPotentialPoints(salonId, amount);
                  pendingPointsBySalon[salonId] = (pendingPointsBySalon[salonId] || 0) + points;
                }
              }
            }
            
            // Calculate from pending orders
            for (const order of orders) {
              if (order.order_status && 
                  !["delivered", "cancelled"].includes(order.order_status) &&
                  order.salon_id && 
                  order.total_amount) {
                const salonId = order.salon_id;
                const amount = parseFloat(order.total_amount) || 0;
                if (amount > 0) {
                  const points = await getPotentialPoints(salonId, amount);
                  pendingPointsBySalon[salonId] = (pendingPointsBySalon[salonId] || 0) + points;
                }
              }
            }
            
            if (!alive) return;
            
            // Update balances with pending points
            setSalonBalances(prev => prev.map(salon => ({
              ...salon,
              pending_points: pendingPointsBySalon[salon.salon_id] || 0
            })));
          } catch (err) {
            console.error("Error calculating pending points:", err);
          } finally {
            if (alive) setCalculatingPending(false);
          }
        })();
      } catch (err) {
        if (!alive) return;
        setError(err.message || "Failed to load loyalty data");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Load rewards when salon is selected (if not already loaded)
  useEffect(() => {
    if (!selectedSalonId) return;
    
    let alive = true;
    (async () => {
      try {
        setRewards(null); // Reset to show loading
        const rewardsData = await getLoyaltyRewards(selectedSalonId);
        if (!alive) return;
        setRewards(rewardsData);
      } catch (err) {
        if (!alive) return;
        console.error("Failed to load rewards:", err);
        setRewards(null); // Keep as null on error
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedSalonId]);

  const handleRedeem = async () => {
    if (redeeming || !rewards || !rewards.pointThreshold || !selectedSalonId) return;

    const selectedSalon = salonBalances.find((s) => s.salon_id === selectedSalonId);
    if (!selectedSalon) return;

    if (selectedSalon.balance < rewards.pointThreshold) {
      alert(`Not enough points. You need ${rewards.pointThreshold} points to redeem.`);
      return;
    }

    if (!confirm(`Redeem ${rewards.pointThreshold} points for a ${rewards.rewardDiscount}% discount at ${selectedSalon.salon_name || "this salon"}?`)) {
      return;
    }

    setRedeeming(true);
    try {
      const result = await redeemPoints(selectedSalonId);
      if (result.success) {
        // Update points balance for selected salon
        setSalonBalances((prev) =>
          prev.map((salon) =>
            salon.salon_id === selectedSalonId
              ? {
                  ...salon,
                  balance: result.newBalance || salon.balance - rewards.pointThreshold,
                  activity: [
                    {
                      id: Date.now(),
                      type: "redeemed",
                      points: -rewards.pointThreshold,
                      description: `Redeemed ${rewards.rewardDiscount}% discount`,
                      date: new Date().toISOString().split("T")[0],
                    },
                    ...salon.activity,
                  ],
                }
              : salon
          )
        );
        alert(`Success! You've redeemed ${rewards.pointThreshold} points for a ${rewards.rewardDiscount}% discount.`);
      }
    } catch (err) {
      alert(err.message || "Failed to redeem reward");
    } finally {
      setRedeeming(false);
    }
  };

  const selectedSalon = selectedSalonId ? salonBalances.find((s) => s.salon_id === selectedSalonId) : null;
  const currentBalance = selectedSalon?.balance || 0;
  const currentActivity = selectedSalon?.activity || [];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white border rounded-2xl p-8 text-center">
          <div className="text-gray-600">Loading loyalty data... (may take a while...)</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white border rounded-2xl p-8 text-center">
          <div className="text-red-600 mb-2">Error loading loyalty data</div>
          <div className="text-sm text-gray-600">{error}</div>
        </div>
      </div>
    );
  }

  if (salonBalances.length === 0 && !loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Loyalty Rewards</h1>
          <p className="text-gray-600">Track your loyalty points and redeem rewards at each salon</p>
        </div>
        <div className="bg-white border rounded-2xl p-8 text-center mt-6">
          <div className="text-gray-600 mb-2">No loyalty points yet</div>
          <div className="text-sm text-gray-500">Visit a salon and complete an appointment to start earning points!</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Loyalty Rewards</h1>
        <p className="text-gray-600">Track your loyalty points and redeem rewards at each salon</p>
      </div>

      {/* Promotional Offers - All Salons Overview */}
      {Object.keys(promotionsBySalon).length > 0 && Object.values(promotionsBySalon).some(promos => promos.length > 0) && (
        <div className="bg-white border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Promotions</h2>
          <div className="space-y-4">
            {salonBalances.map((salon) => {
              const salonPromotions = promotionsBySalon[salon.salon_id] || [];
              if (salonPromotions.length === 0) return null;
              
              return (
                <div key={salon.salon_id} className="border rounded-xl p-4 bg-gray-50">
                  <h3 className="font-semibold text-gray-900 mb-3">{salon.salon_name || "Salon"}</h3>
                  <div className="space-y-2">
                    {salonPromotions.map((promotion) => {
                      const discountText = promotion.discount_type === "percentage" 
                        ? `${promotion.discount_value}% off`
                        : `$${promotion.discount_value} off`;
                      
                      const validFrom = new Date(promotion.valid_from);
                      const validUntil = new Date(promotion.valid_until);
                      const now = new Date();
                      const isActive = now >= validFrom && now <= validUntil;
                      
                      return (
                        <div
                          key={promotion.id}
                          className={`border rounded-lg p-3 ${
                            isActive ? "bg-green-50 border-green-200" : "bg-white border-gray-200"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Tag className="h-3 w-3 text-indigo-600" />
                                <h4 className="font-medium text-gray-900 text-sm">{promotion.title}</h4>
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                                  {discountText}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 mb-2">{promotion.description}</p>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>
                                    {validFrom.toLocaleDateString()} - {validUntil.toLocaleDateString()}
                                  </span>
                                </div>
                                {promotion.min_purchase_amount > 0 && (
                                  <span>Min: ${promotion.min_purchase_amount}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Salon Selection */}
      {salonBalances.length > 1 && (
        <div className="bg-white border rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Salon</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {salonBalances.map((salon) => {
              const promotionCount = (promotionsBySalon[salon.salon_id] || []).length;
              return (
                <button
                  key={salon.salon_id}
                  onClick={() => setSelectedSalonId(salon.salon_id)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    selectedSalonId === salon.salon_id
                      ? "ring-2 ring-indigo-600 border-indigo-600 bg-indigo-50"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="font-medium text-gray-900">{salon.salon_name || "Salon"}</div>
                  <div className="text-sm text-gray-600 mt-1">{salon.balance} points</div>
                  {promotionCount > 0 && (
                    <div className="text-xs text-indigo-600 mt-1 font-medium">
                      {promotionCount} active promotion{promotionCount !== 1 ? 's' : ''}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!selectedSalon && salonBalances.length > 0 && (
        <div className="bg-white border rounded-2xl p-8 text-center">
          <div className="text-gray-600">Select a salon to view your loyalty points</div>
          <Button
            onClick={() => setSelectedSalonId(salonBalances[0].salon_id)}
            className="mt-4"
          >
            View {salonBalances[0].salon_name || "First Salon"}
          </Button>
        </div>
      )}

      {selectedSalon ? (
        <>
          {/* Points Balance Card */}
          <div className="bg-white border rounded-2xl p-6">
            <div className="text-center py-6">
              <div className="text-sm text-gray-600 mb-2">{selectedSalon.salon_name || "Salon"}</div>
              <div className="text-5xl font-bold text-gray-900 mb-2">{currentBalance}</div>
              <div className="text-lg text-gray-600 mb-4">Loyalty Points</div>
              <div className="mb-4">
                <div className="text-sm text-gray-500">Earning Rate</div>
                {rewards && rewards.pointsPerDollar ? (
                  <div className="text-base font-semibold text-indigo-600">
                    {rewards.pointsPerDollar} point{rewards.pointsPerDollar !== 1 ? 's' : ''} per dollar
                  </div>
                ) : (
                  <div className="text-base font-semibold text-gray-400">
                    Loading...
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
                <div>
                  <div className="text-sm text-gray-500">Lifetime Earned</div>
                  <div className="text-lg font-semibold text-gray-900">{selectedSalon.lifetime_points_earned || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Lifetime Redeemed</div>
                  <div className="text-lg font-semibold text-gray-900">{selectedSalon.lifetime_points_redeemed || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Pending</div>
                  <div className="text-lg font-semibold text-amber-600">
                    {calculatingPending ? "Calculating..." : (selectedSalon.pending_points || 0)}
                  </div>
                </div>
              </div>
              {!calculatingPending && selectedSalon.pending_points > 0 && (
                <p className="text-xs text-amber-600 mt-2">
                  {selectedSalon.pending_points} points will be added when your appointments/orders are completed
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">Points are salon-specific and cannot be transferred</p>
            </div>
          </div>

      {/* Promotional Offers - Show for selected salon */}
      {selectedSalonId && promotionsBySalon[selectedSalonId] && promotionsBySalon[selectedSalonId].length > 0 && (
        <div className="bg-white border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Promotions</h2>
          <div className="space-y-3">
            {promotionsBySalon[selectedSalonId].map((promotion) => {
              const discountText = promotion.discount_type === "percentage" 
                ? `${promotion.discount_value}% off`
                : `$${promotion.discount_value} off`;
              
              const validFrom = new Date(promotion.valid_from);
              const validUntil = new Date(promotion.valid_until);
              const now = new Date();
              const isActive = now >= validFrom && now <= validUntil;
              
              return (
                <div
                  key={promotion.id}
                  className={`border rounded-xl p-4 ${
                    isActive ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Tag className="h-4 w-4 text-indigo-600" />
                        <h3 className="font-semibold text-gray-900">{promotion.title}</h3>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                          {discountText}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{promotion.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {validFrom.toLocaleDateString()} - {validUntil.toLocaleDateString()}
                          </span>
                        </div>
                        {promotion.min_purchase_amount > 0 && (
                          <span>Min purchase: ${promotion.min_purchase_amount}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Reward */}
      <div className="bg-white border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Reward</h2>
        {rewards && rewards.pointThreshold && rewards.rewardDiscount ? (
          <div
            className={`rounded-xl border p-6 ${
              currentBalance >= rewards.pointThreshold
                ? "bg-green-50 border-green-300"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <div className="text-center mb-4">
              <div className={`text-3xl font-bold mb-2 ${
                currentBalance >= rewards.pointThreshold ? "text-green-700" : "text-gray-900"
              }`}>
                {rewards.rewardDiscount}% Off
              </div>
              <div className="text-sm text-gray-600">
                Requires {rewards.pointThreshold} points
              </div>
            </div>
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Your points at {selectedSalon.salon_name || "this salon"}</span>
                <span className="font-semibold">{currentBalance} / {rewards.pointThreshold}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div
                  className={`h-3 rounded-full transition-all ${
                    currentBalance >= rewards.pointThreshold ? "bg-green-600" : "bg-indigo-600"
                  }`}
                  style={{
                    width: `${Math.min((currentBalance / rewards.pointThreshold) * 100, 100)}%`,
                  }}
                />
              </div>
              {currentBalance < rewards.pointThreshold && (
                <div className="text-xs text-gray-500 text-center">
                  {rewards.pointThreshold - currentBalance} more points needed to redeem
                </div>
              )}
              {currentBalance >= rewards.pointThreshold && (
                <div className="text-xs text-green-600 text-center font-medium">
                  ✓ You're eligible to redeem!
                </div>
              )}
            </div>
            <Button
              onClick={handleRedeem}
              disabled={currentBalance < rewards.pointThreshold || redeeming}
              className="w-full rounded-xl"
              variant={currentBalance >= rewards.pointThreshold ? "default" : "secondary"}
            >
              {redeeming
                ? "Redeeming..."
                : currentBalance >= rewards.pointThreshold
                ? `Redeem ${rewards.pointThreshold} Points for ${rewards.rewardDiscount}% Off`
                : `Need ${rewards.pointThreshold - currentBalance} More Points`}
            </Button>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No reward configured yet</p>
            <p className="text-sm mt-1">This salon hasn't set up a loyalty program yet</p>
          </div>
        )}
      </div>

          {/* Recent Activity */}
          <div className="bg-white border rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {currentActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No activity yet</p>
                  <p className="text-sm mt-1">Your points history for {selectedSalon.salon_name || "this salon"} will appear here</p>
                </div>
              ) : (
                currentActivity.map((item) => {
                  // Format date nicely
                  let formattedDate = item.date;
                  if (item.date) {
                    try {
                      const date = new Date(item.date);
                      if (!isNaN(date.getTime())) {
                        formattedDate = date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        });
                      }
                    } catch (e) {
                      // Keep original if parsing fails
                    }
                  }
                  
                  // Show appointment date if available and description contains no-show
                  const showAppointmentDate = item.appointmentDate && 
                    (item.description?.toLowerCase().includes("no-show") || 
                     item.description?.toLowerCase().includes("appointment"));
                  
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border px-4 py-3 bg-white"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{item.description}</div>
                        <div className="text-sm text-gray-500">
                          {showAppointmentDate && item.appointmentDate ? (
                            <span>Appointment: {item.appointmentDate} • {formattedDate}</span>
                          ) : (
                            formattedDate
                          )}
                        </div>
                      </div>
                      <div
                        className={`text-lg font-semibold ${
                          item.type === "earned" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {item.type === "earned" ? "+" : ""}
                        {item.points} pts
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      ) : salonBalances.length > 0 ? (
        <div className="bg-white border rounded-2xl p-8 text-center">
          <div className="text-gray-600">Loading salon details...</div>
        </div>
      ) : null}
    </div>
  );
}

