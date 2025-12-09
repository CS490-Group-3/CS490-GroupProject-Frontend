import { useEffect, useState } from "react";
import { api } from "../../../shared/api/client.js";
import { Plus, Edit2, Trash2, Calendar, Tag, Users, Loader2, X, Save, AlertCircle } from "lucide-react";
import { Button } from "../../../shared/ui/button.jsx";
import { Input } from "../../../shared/ui/input.jsx";
import { Label } from "../../../shared/ui/label.jsx";
import { Textarea } from "../../../shared/ui/textarea.jsx";

export default function Promotions() {
  const [salonId, setSalonId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    discount_type: "percentage",
    discount_value: "",
    valid_from: "",
    valid_until: "",
    min_purchase_amount: "",
    target_audience: "existing_customers",
    min_visits: "",
    min_loyalty_points: "",
    targeting_logic: "and",
  });

  useEffect(() => {
    loadSalonAndPromotions();
  }, []);

  const loadSalonAndPromotions = async () => {
    try {
      setLoading(true);
      const salonRes = await api("/salons/mine");
      const salon = salonRes.salon;
      
      if (!salon || !salon.id) {
        setError("Salon not found");
        return;
      }
      
      setSalonId(salon.id);
      await loadPromotions(salon.id);
    } catch (err) {
      setError(err.message || "Failed to load salon data");
      console.error("Error loading salon:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadPromotions = async (salonId) => {
    try {
      const data = await api(`/salons/${salonId}/promotions`);
      setPromotions(Array.isArray(data.promotions) ? data.promotions : []);
    } catch (err) {
      console.error("Error loading promotions:", err);
      setPromotions([]);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      discount_type: "percentage",
      discount_value: "",
      valid_from: "",
      valid_until: "",
      min_purchase_amount: "",
      target_audience: "existing_customers",
      min_visits: "",
      min_loyalty_points: "",
      targeting_logic: "and",
    });
    setEditingPromotion(null);
    setShowForm(false);
    setError("");
  };

  const handleEdit = (promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      title: promotion.title || "",
      description: promotion.description || "",
      discount_type: promotion.discount_type || "percentage",
      discount_value: promotion.discount_value?.toString() || "",
      valid_from: promotion.valid_from ? new Date(promotion.valid_from).toISOString().slice(0, 16) : "",
      valid_until: promotion.valid_until ? new Date(promotion.valid_until).toISOString().slice(0, 16) : "",
      min_purchase_amount: promotion.min_purchase_amount?.toString() || "",
      target_audience: promotion.target_audience || "existing_customers",
      min_visits: promotion.min_visits ? promotion.min_visits.toString() : "",
      min_loyalty_points: promotion.min_loyalty_points ? promotion.min_loyalty_points.toString() : "",
      targeting_logic: promotion.targeting_logic || "and",
    });
    setShowForm(true);
  };

  const handleDelete = async (promotionId) => {
    if (!window.confirm("Are you sure you want to delete this promotion? This action cannot be undone.")) {
      return;
    }

    try {
      await api(`/salons/${salonId}/promotions/${promotionId}`, {
        method: "DELETE",
      });
      await loadPromotions(salonId);
    } catch (err) {
      alert(err.message || "Failed to delete promotion");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    // Validation
    const discount = parseFloat(formData.discount_value);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      setError("Please enter a valid discount percentage (0-100)");
      return;
    }
    
    if (!formData.valid_from || !formData.valid_until) {
      setError("Please select start and end dates");
      return;
    }
    
    if (new Date(formData.valid_from) >= new Date(formData.valid_until)) {
      setError("End date must be after start date");
      return;
    }
    
    if (!formData.title || !formData.description) {
      setError("Please provide a title and description");
      return;
    }

    setSaving(true);
    try {
      const promotionData = {
        title: formData.title,
        description: formData.description,
        discount_type: formData.discount_type,
        discount_value: discount,
        valid_from: new Date(formData.valid_from).toISOString(),
        valid_until: new Date(formData.valid_until).toISOString(),
        target_audience: formData.target_audience,
      };
      
      if (formData.min_purchase_amount) {
        promotionData.min_purchase_amount = parseFloat(formData.min_purchase_amount);
      }
      
      // Add custom targeting fields if target_audience is "custom"
      if (formData.target_audience === "custom") {
        if (formData.min_visits) {
          promotionData.min_visits = parseInt(formData.min_visits);
        }
        if (formData.min_loyalty_points) {
          promotionData.min_loyalty_points = parseFloat(formData.min_loyalty_points);
        }
        // At least one custom criterion must be specified
        if (!formData.min_visits && !formData.min_loyalty_points) {
          setError("Please specify at least one custom targeting criterion (min visits or min loyalty points)");
          setSaving(false);
          return;
        }
        // Add targeting logic if both criteria are specified
        if (formData.min_visits && formData.min_loyalty_points) {
          promotionData.targeting_logic = formData.targeting_logic;
        }
      }

      if (editingPromotion) {
        // Update existing
        await api(`/salons/${salonId}/promotions/${editingPromotion.id}`, {
          method: "PATCH",
          body: promotionData,
        });
      } else {
        // Create new
        await api(`/salons/${salonId}/promotions`, {
          method: "POST",
          body: promotionData,
        });
      }

      await loadPromotions(salonId);
      resetForm();
    } catch (err) {
      setError(err.message || "Failed to save promotion");
      console.error("Error saving promotion:", err);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPromotionStatus = (promotion) => {
    const now = new Date();
    const start = new Date(promotion.valid_from);
    const end = new Date(promotion.valid_until);
    
    if (!promotion.is_active) {
      return { label: "Inactive", color: "bg-gray-100 text-gray-800" };
    }
    if (now < start) {
      return { label: "Upcoming", color: "bg-blue-100 text-blue-800" };
    }
    if (now >= start && now <= end) {
      return { label: "Active", color: "bg-green-100 text-green-800" };
    }
    return { label: "Expired", color: "bg-red-100 text-red-800" };
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white border rounded-2xl p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <div className="text-gray-600 mt-4">Loading promotions...</div>
        </div>
      </div>
    );
  }

  if (error && !salonId) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white border rounded-2xl p-8 text-center">
          <div className="text-red-600">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Promotional Offers</h1>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Promotion
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white border rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingPromotion ? "Edit Promotion" : "Create New Promotion"}
            </h2>
            <Button variant="ghost" size="icon" onClick={resetForm}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Promotion Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Holiday Blowout Sale"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="e.g., 20% off all services this weekend!"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discount_value">Discount (%) *</Label>
                <Input
                  id="discount_value"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  placeholder="20"
                  required
                />
              </div>
              <div>
                <Label htmlFor="min_purchase_amount">Min Purchase Amount ($)</Label>
                <Input
                  id="min_purchase_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.min_purchase_amount}
                  onChange={(e) => setFormData({ ...formData, min_purchase_amount: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="valid_from">Start Date & Time *</Label>
                <Input
                  id="valid_from"
                  type="datetime-local"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="valid_until">End Date & Time *</Label>
                <Input
                  id="valid_until"
                  type="datetime-local"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="target_audience">Target Audience *</Label>
              <select
                id="target_audience"
                value={formData.target_audience}
                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value, min_visits: "", min_loyalty_points: "" })}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="existing_customers">Existing Customers Only</option>
                <option value="all_users">All Users</option>
                <option value="custom">Custom</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.target_audience === "existing_customers"
                  ? "Only customers who have booked appointments or have loyalty points"
                  : formData.target_audience === "all_users"
                  ? "All users on the platform (excluding admins and salon owners)"
                  : "Customize targeting based on visit count and/or loyalty points"}
              </p>
            </div>

            {formData.target_audience === "custom" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="min_visits">Min Confirmed Visits</Label>
                    <Input
                      id="min_visits"
                      type="number"
                      min="0"
                      value={formData.min_visits}
                      onChange={(e) => setFormData({ ...formData, min_visits: e.target.value })}
                      placeholder="e.g., 3"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Customers with this many or more scheduled/completed appointments
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="min_loyalty_points">Min Lifetime Loyalty Points</Label>
                    <Input
                      id="min_loyalty_points"
                      type="number"
                      min="0"
                      step="1"
                      value={formData.min_loyalty_points}
                      onChange={(e) => setFormData({ ...formData, min_loyalty_points: e.target.value })}
                      placeholder="e.g., 500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Customers with this many or more lifetime points earned
                    </p>
                  </div>
                </div>
                
                {/* Hint when only one field is filled */}
                {(formData.min_visits && formData.min_visits.trim() !== "" && (!formData.min_loyalty_points || formData.min_loyalty_points.trim() === "")) || 
                 (formData.min_loyalty_points && formData.min_loyalty_points.trim() !== "" && (!formData.min_visits || formData.min_visits.trim() === "")) ? (
                  <div className="text-xs text-gray-500 mt-2 p-2 bg-blue-50 rounded">
                    💡 Fill in both fields to choose AND/OR logic for combining criteria
                  </div>
                ) : null}
                
                {/* Show AND/OR selector when both fields have values */}
                {formData.min_visits && formData.min_visits.trim() !== "" && formData.min_loyalty_points && formData.min_loyalty_points.trim() !== "" && (
                  <div className="border rounded-lg p-4 bg-gray-50 mt-4">
                    <Label className="text-base font-semibold mb-3 block">
                      Targeting Logic (Both criteria specified)
                    </Label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="targeting_logic"
                          value="and"
                          checked={formData.targeting_logic === "and"}
                          onChange={(e) => setFormData({ ...formData, targeting_logic: e.target.value })}
                          className="w-4 h-4"
                        />
                        <div>
                          <span className="font-medium">AND</span>
                          <p className="text-xs text-gray-600">
                            Customer must meet BOTH criteria (has {formData.min_visits}+ visits AND {formData.min_loyalty_points}+ points)
                          </p>
                        </div>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="targeting_logic"
                          value="or"
                          checked={formData.targeting_logic === "or"}
                          onChange={(e) => setFormData({ ...formData, targeting_logic: e.target.value })}
                          className="w-4 h-4"
                        />
                        <div>
                          <span className="font-medium">OR</span>
                          <p className="text-xs text-gray-600">
                            Customer must meet EITHER criterion (has {formData.min_visits}+ visits OR {formData.min_loyalty_points}+ points)
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {editingPromotion ? "Update Promotion" : "Create Promotion"}
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Promotions List */}
      {promotions.length === 0 && !showForm ? (
        <div className="bg-white border rounded-2xl p-12 text-center">
          <Tag className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Promotions Yet</h3>
          <p className="text-gray-600 mb-4">
            Create your first promotional offer to attract and retain customers.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Promotion
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {promotions.map((promotion) => {
            const status = getPromotionStatus(promotion);
            return (
              <div
                key={promotion.id}
                className="bg-white border rounded-2xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {promotion.title}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-4">{promotion.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Discount:</span>
                        <div className="font-semibold text-gray-900">
                          {promotion.discount_value}% off
                        </div>
                      </div>
                      {promotion.min_purchase_amount > 0 && (
                        <div>
                          <span className="text-gray-500">Min Purchase:</span>
                          <div className="font-semibold text-gray-900">
                            ${promotion.min_purchase_amount}
                          </div>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Valid From:</span>
                        <div className="font-semibold text-gray-900">
                          {formatDate(promotion.valid_from)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Valid Until:</span>
                        <div className="font-semibold text-gray-900">
                          {formatDate(promotion.valid_until)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>
                          {promotion.recipient_count || 0} recipients
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant={promotion.is_active ? "default" : "outline"}
                      size="sm"
                      onClick={async () => {
                        try {
                          await api(`/salons/${salonId}/promotions/${promotion.id}`, {
                            method: "PATCH",
                            body: { is_active: !promotion.is_active },
                          });
                          await loadPromotions(salonId);
                        } catch (err) {
                          alert(err.message || "Failed to update promotion");
                        }
                      }}
                    >
                      {promotion.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(promotion)}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(promotion.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

