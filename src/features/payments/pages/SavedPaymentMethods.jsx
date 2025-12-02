import { useState, useEffect } from "react";
import { Button } from "../../../shared/ui/button.jsx";
import { Card } from "../../../shared/ui/card.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../../shared/ui/dialog.jsx";
import { Input } from "../../../shared/ui/input.jsx";
import { Label } from "../../../shared/ui/label.jsx";
import {
  getSavedPaymentMethods,
  createSavedPaymentMethod,
  setDefaultPaymentMethod,
  deletePaymentMethod
} from "../api.js";
import {
  luhnValidate,
  detectCardBrand,
  validateExpiryDate,
  validateCVV,
  formatCardBrand,
  validateBillingAddress
} from "../../../shared/utils/cardValidation.js";

export default function SavedPaymentMethods() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form validation errors
  const [formErrors, setFormErrors] = useState({});

  // Form state
  const [cardNumber, setCardNumber] = useState("");
  const [detectedCardBrand, setDetectedCardBrand] = useState("unknown");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [billingAddress, setBillingAddress] = useState({
    line1: "",
    line2: "",
    city: "",
    state: "",
    zip: "",
    country: "US"
  });
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    loadMethods();
  }, []);

  const loadMethods = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getSavedPaymentMethods();
      setMethods(data);
    } catch (err) {
      setError(err.message || "Failed to load payment methods");
    } finally {
      setLoading(false);
    }
  };

  // Reset form errors when dialog closes
  useEffect(() => {
    if (!showAddDialog) {
      setFormErrors({});
      setError("");
    }
  }, [showAddDialog]);

  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\s/g, "");
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(" ") : cleaned;
  };

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value);
    if (formatted.replace(/\s/g, "").length <= 19) {
      setCardNumber(formatted);
      // Detect card brand as user types
      const brand = detectCardBrand(formatted);
      setDetectedCardBrand(brand);
      // Clear card number error when user types
      if (formErrors.cardNumber) {
        setFormErrors(prev => ({ ...prev, cardNumber: null }));
      }
    }
  };

  const validateForm = () => {
    const errors = {};

    // Card number validation
    const cardNumberClean = cardNumber.replace(/\s/g, "");
    if (!cardNumberClean) {
      errors.cardNumber = "Card number is required";
    } else if (cardNumberClean.length < 13 || cardNumberClean.length > 19) {
      errors.cardNumber = "Card number must be between 13 and 19 digits";
    } else if (!luhnValidate(cardNumberClean)) {
      errors.cardNumber = "Invalid card number (Luhn check failed)";
    }

    // Expiry validation
    if (!expMonth || !expYear) {
      errors.expiry = "Expiration date is required";
    } else {
      const month = parseInt(expMonth);
      const year = parseInt(expYear);
      if (!validateExpiryDate(month, year)) {
        errors.expiry = "Invalid or expired card";
      }
    }

    // CVV validation
    if (!cvv) {
      errors.cvv = "CVV is required";
    } else if (!validateCVV(cvv, detectedCardBrand)) {
      errors.cvv = detectedCardBrand === "amex" 
        ? "CVV must be 4 digits for American Express"
        : "CVV must be 3 digits";
    }

    // Cardholder name validation
    if (!cardholderName || !cardholderName.trim()) {
      errors.cardholderName = "Cardholder name is required";
    } else if (cardholderName.trim().length < 2) {
      errors.cardholderName = "Cardholder name must be at least 2 characters";
    }

    // Billing address validation
    const addressErrors = validateBillingAddress(billingAddress);
    Object.assign(errors, addressErrors);

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddMethod = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setFormErrors({});

    // Frontend validation
    if (!validateForm()) {
      setSaving(false);
      return;
    }

    try {
      await createSavedPaymentMethod({
        card_number: cardNumber.replace(/\s/g, ""),
        exp_month: parseInt(expMonth),
        exp_year: parseInt(expYear),
        cvv: cvv,
        cardholder_name: cardholderName.trim(),
        billing_address: {
          ...billingAddress,
          state: billingAddress.state.toUpperCase().trim()
        },
        is_default: isDefault
      });

      setSuccessMessage("Payment method added successfully");
      setShowAddDialog(false);
      resetForm();
      loadMethods();
      
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      // Parse backend error
      const errorMsg = err.message || "Failed to add payment method";
      setError(errorMsg);
      // If it's a validation error, try to map it to form fields
      if (errorMsg.includes("card number") || errorMsg.includes("Card number")) {
        setFormErrors(prev => ({ ...prev, cardNumber: errorMsg }));
      } else if (errorMsg.includes("expiry") || errorMsg.includes("expiration")) {
        setFormErrors(prev => ({ ...prev, expiry: errorMsg }));
      } else if (errorMsg.includes("CVV") || errorMsg.includes("cvv")) {
        setFormErrors(prev => ({ ...prev, cvv: errorMsg }));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (methodId) => {
    try {
      await setDefaultPaymentMethod(methodId);
      setSuccessMessage("Default payment method updated");
      loadMethods();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to set default payment method");
    }
  };

  const handleDelete = async (methodId) => {
    if (!confirm("Are you sure you want to delete this payment method?")) {
      return;
    }

    try {
      await deletePaymentMethod(methodId);
      setSuccessMessage("Payment method deleted");
      loadMethods();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to delete payment method");
    }
  };

  const resetForm = () => {
    setCardNumber("");
    setDetectedCardBrand("unknown");
    setExpMonth("");
    setExpYear("");
    setCvv("");
    setCardholderName("");
    setBillingAddress({
      line1: "",
      line2: "",
      city: "",
      state: "",
      zip: "",
      country: "US"
    });
    setIsDefault(false);
    setFormErrors({});
  };

  const getCardBrandIcon = (brand) => {
    const brandLower = brand?.toLowerCase() || "";
    if (brandLower.includes("visa")) return "💳";
    if (brandLower.includes("mastercard")) return "💳";
    if (brandLower.includes("amex")) return "💳";
    return "💳";
  };

  if (loading && methods.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white border rounded-2xl p-8 text-center">
          <div className="text-gray-600">Loading payment methods...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Saved Payment Methods</h1>
          <p className="text-gray-600">Manage your saved payment methods for faster checkout</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          Add Payment Method
        </Button>
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 text-sm">
          {successMessage}
        </div>
      )}

      {methods.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-gray-500 mb-4">No saved payment methods</div>
          <Button onClick={() => setShowAddDialog(true)}>
            Add Your First Payment Method
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {methods.map((method) => (
            <Card key={method.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-3xl">{getCardBrandIcon(method.card_brand)}</div>
                  <div>
                    <div className="font-semibold text-lg">
                      {method.card_brand?.toUpperCase() || "Card"} •••• {method.card_last4}
                    </div>
                    <div className="text-sm text-gray-600">
                      Expires {String(method.card_exp_month).padStart(2, "0")}/{method.card_exp_year}
                      {method.billing_name && ` • ${method.billing_name}`}
                    </div>
                    {method.is_default && (
                      <div className="text-sm text-blue-600 font-medium mt-1">Default Payment Method</div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!method.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(method.id)}
                    >
                      Set as Default
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(method.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Payment Method Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
            <DialogDescription>
              Add a new payment method to your account for faster checkout.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMethod} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
                {error}
              </div>
            )}
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="newCardNumber">Card Number</Label>
                {detectedCardBrand !== "unknown" && cardNumber.length > 0 && (
                  <span className="text-sm text-gray-600 font-medium">
                    {formatCardBrand(detectedCardBrand)}
                  </span>
                )}
              </div>
              <Input
                id="newCardNumber"
                type="text"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={handleCardNumberChange}
                maxLength={19}
                className={formErrors.cardNumber ? "border-red-500" : ""}
                required
              />
              {formErrors.cardNumber && (
                <p className="text-sm text-red-600 mt-1">{formErrors.cardNumber}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="newExpMonth">Month</Label>
                <Input
                  id="newExpMonth"
                  type="number"
                  placeholder="MM"
                  min="1"
                  max="12"
                  value={expMonth}
                  onChange={(e) => {
                    setExpMonth(e.target.value);
                    if (formErrors.expiry) {
                      setFormErrors(prev => ({ ...prev, expiry: null }));
                    }
                  }}
                  className={formErrors.expiry ? "border-red-500" : ""}
                  required
                />
              </div>
              <div>
                <Label htmlFor="newExpYear">Year</Label>
                <Input
                  id="newExpYear"
                  type="number"
                  placeholder="YYYY"
                  min={new Date().getFullYear()}
                  value={expYear}
                  onChange={(e) => {
                    setExpYear(e.target.value);
                    if (formErrors.expiry) {
                      setFormErrors(prev => ({ ...prev, expiry: null }));
                    }
                  }}
                  className={formErrors.expiry ? "border-red-500" : ""}
                  required
                />
              </div>
              <div>
                <Label htmlFor="newCvv">CVV</Label>
                <Input
                  id="newCvv"
                  type="text"
                  placeholder={detectedCardBrand === "amex" ? "1234" : "123"}
                  maxLength="4"
                  value={cvv}
                  onChange={(e) => {
                    setCvv(e.target.value.replace(/\D/g, ""));
                    if (formErrors.cvv) {
                      setFormErrors(prev => ({ ...prev, cvv: null }));
                    }
                  }}
                  className={formErrors.cvv ? "border-red-500" : ""}
                  required
                />
                {formErrors.cvv && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.cvv}</p>
                )}
              </div>
            </div>
            {formErrors.expiry && (
              <p className="text-sm text-red-600 -mt-3">{formErrors.expiry}</p>
            )}

            <div>
              <Label htmlFor="newCardholderName">Cardholder Name</Label>
              <Input
                id="newCardholderName"
                type="text"
                placeholder="John Doe"
                value={cardholderName}
                onChange={(e) => {
                  setCardholderName(e.target.value);
                  if (formErrors.cardholderName) {
                    setFormErrors(prev => ({ ...prev, cardholderName: null }));
                  }
                }}
                className={formErrors.cardholderName ? "border-red-500" : ""}
                required
              />
              {formErrors.cardholderName && (
                <p className="text-sm text-red-600 mt-1">{formErrors.cardholderName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="newBillingLine1">Billing Address</Label>
              <Input
                id="newBillingLine1"
                type="text"
                placeholder="Street Address"
                value={billingAddress.line1}
                onChange={(e) => {
                  setBillingAddress({ ...billingAddress, line1: e.target.value });
                  if (formErrors.line1) {
                    setFormErrors(prev => ({ ...prev, line1: null }));
                  }
                }}
                className={`mb-2 ${formErrors.line1 ? "border-red-500" : ""}`}
                required
              />
              {formErrors.line1 && (
                <p className="text-sm text-red-600 mt-1 mb-2">{formErrors.line1}</p>
              )}
              <Input
                type="text"
                placeholder="Apt, Suite, etc. (optional)"
                value={billingAddress.line2}
                onChange={(e) => setBillingAddress({ ...billingAddress, line2: e.target.value })}
                className="mb-2"
              />
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <Input
                    type="text"
                    placeholder="City"
                    value={billingAddress.city}
                    onChange={(e) => {
                      setBillingAddress({ ...billingAddress, city: e.target.value });
                      if (formErrors.city) {
                        setFormErrors(prev => ({ ...prev, city: null }));
                      }
                    }}
                    className={formErrors.city ? "border-red-500" : ""}
                    required
                  />
                  {formErrors.city && (
                    <p className="text-sm text-red-600 mt-1">{formErrors.city}</p>
                  )}
                </div>
                <div>
                  <Input
                    type="text"
                    placeholder="State (2 letters)"
                    maxLength="2"
                    value={billingAddress.state}
                    onChange={(e) => {
                      setBillingAddress({ ...billingAddress, state: e.target.value.toUpperCase() });
                      if (formErrors.state) {
                        setFormErrors(prev => ({ ...prev, state: null }));
                      }
                    }}
                    className={formErrors.state ? "border-red-500" : ""}
                    required
                  />
                  {formErrors.state && (
                    <p className="text-sm text-red-600 mt-1">{formErrors.state}</p>
                  )}
                </div>
              </div>
              <Input
                type="text"
                placeholder="ZIP Code"
                value={billingAddress.zip}
                onChange={(e) => {
                  setBillingAddress({ ...billingAddress, zip: e.target.value });
                  if (formErrors.zip) {
                    setFormErrors(prev => ({ ...prev, zip: null }));
                  }
                }}
                className={formErrors.zip ? "border-red-500" : ""}
                required
              />
              {formErrors.zip && (
                <p className="text-sm text-red-600 mt-1">{formErrors.zip}</p>
              )}
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">Set as default payment method</span>
            </label>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false);
                  resetForm();
                }}
                className="flex-1"
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? "Adding..." : "Add Payment Method"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

