import { useState, useEffect } from "react";
import { Button } from "../../../shared/ui/button";
import { getCustomerPoints, getLoyaltyRewards, redeemPoints } from "../api.js";

export default function Loyalty() {
  const [salonBalances, setSalonBalances] = useState([]); // Array of { salon_id, salon_name, balance, activity }
  const [selectedSalonId, setSelectedSalonId] = useState(null);
  const [rewards, setRewards] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
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
        if (balances.length > 0 && balances[0].salon_id) {
          setSelectedSalonId(balances[0].salon_id);
        }
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

  // Load rewards when salon is selected
  useEffect(() => {
    if (!selectedSalonId) return;
    
    let alive = true;
    (async () => {
      try {
        const rewardsData = await getLoyaltyRewards(selectedSalonId);
        if (!alive) return;
        setRewards(rewardsData);
      } catch (err) {
        if (!alive) return;
        console.error("Failed to load rewards:", err);
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
          <div className="text-gray-600">Loading loyalty data...</div>
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

      {/* Salon Selection */}
      {salonBalances.length > 1 && (
        <div className="bg-white border rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Salon</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {salonBalances.map((salon) => (
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
              </button>
            ))}
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
              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t">
                <div>
                  <div className="text-sm text-gray-500">Lifetime Earned</div>
                  <div className="text-lg font-semibold text-gray-900">{selectedSalon.lifetime_points_earned || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Lifetime Redeemed</div>
                  <div className="text-lg font-semibold text-gray-900">{selectedSalon.lifetime_points_redeemed || 0}</div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">Points are salon-specific and cannot be transferred</p>
            </div>
          </div>

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
                  
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border px-4 py-3 bg-white"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{item.description}</div>
                        <div className="text-sm text-gray-500">{formattedDate}</div>
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

