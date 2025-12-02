import { useState, useEffect } from "react";
import { Button } from "../../../shared/ui/button.jsx";
import { Input } from "../../../shared/ui/input.jsx";
import { Label } from "../../../shared/ui/label.jsx";
import { Card } from "../../../shared/ui/card.jsx";
import { getSavedPaymentMethods } from "../api.js";
import { getLoyaltyRewards, getCustomerPoints } from "../../loyalty/api.js";
import {
  luhnValidate,
  detectCardBrand,
  validateExpiryDate,
  validateCVV,
  formatCardBrand,
  validateBillingAddress
} from "../../../shared/utils/cardValidation.js";

export default function PaymentForm({ 
  appointmentId,  // For existing appointments
  appointmentData, // For new appointments (will be created with payment)
  amount, 
  salonId, 
  onSuccess, 
  onCancel,
  showLoyaltyRedemption = true 
}) {
  const [savedMethods, setSavedMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [useNewCard, setUseNewCard] = useState(false);
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);
  const [redeemLoyaltyPoints, setRedeemLoyaltyPoints] = useState(false);
  
  // New card form fields
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
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);
  const [loyaltyRewards, setLoyaltyRewards] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(amount);

  // Load saved payment methods and loyalty info
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [methods, points] = await Promise.all([
          getSavedPaymentMethods(),
          showLoyaltyRedemption && salonId ? getCustomerPoints() : Promise.resolve([])
        ]);
        
        if (!alive) return;
        
        setSavedMethods(methods);
        if (methods.length > 0 && !useNewCard) {
          setSelectedMethod(methods.find(m => m.is_default) || methods[0]);
        }
        
        if (showLoyaltyRedemption && salonId && points.length > 0) {
          const salonPoints = points.find(p => p.salon_id === salonId);
          if (salonPoints) {
            setLoyaltyBalance(salonPoints.balance || 0);
          }
          
          // Get loyalty rewards config
          try {
            const rewards = await getLoyaltyRewards(salonId);
            setLoyaltyRewards(rewards);
          } catch (err) {
            console.error("Failed to load loyalty rewards:", err);
          }
        }
      } catch (err) {
        console.error("Failed to load payment data:", err);
      }
    })();
    
    return () => { alive = false; };
  }, [salonId, showLoyaltyRedemption, useNewCard]);

  // Calculate discount when loyalty redemption is toggled
  useEffect(() => {
    if (redeemLoyaltyPoints && loyaltyRewards && loyaltyBalance >= loyaltyRewards.pointThreshold) {
      const discount = (amount * loyaltyRewards.rewardDiscount) / 100;
      setDiscountAmount(discount);
      setFinalAmount(Math.max(0, amount - discount));
    } else {
      setDiscountAmount(0);
      setFinalAmount(amount);
    }
  }, [redeemLoyaltyPoints, loyaltyRewards, loyaltyBalance, amount]);

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
    
    if (!useNewCard && !selectedMethod) {
      setError("Please select a payment method");
      return false;
    }
    
    if (useNewCard) {
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
    }
    
    if (redeemLoyaltyPoints && loyaltyBalance < (loyaltyRewards?.pointThreshold || 100)) {
      setError(`Insufficient points. Need ${loyaltyRewards?.pointThreshold || 100}, have ${loyaltyBalance}`);
      return false;
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFormErrors({});
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // If we have appointmentData, create appointment with payment atomically
      // Otherwise, use existing appointmentId
      if (appointmentData) {
        const paymentData = {
          redeem_loyalty_points: redeemLoyaltyPoints
        };
        
        if (useNewCard) {
          paymentData.card_number = cardNumber.replace(/\s/g, "");
          paymentData.exp_month = parseInt(expMonth);
          paymentData.exp_year = parseInt(expYear);
          paymentData.cvv = cvv;
          paymentData.cardholder_name = cardholderName;
          paymentData.billing_address = billingAddress;
          paymentData.save_payment_method = savePaymentMethod;
        } else {
          paymentData.payment_method_id = selectedMethod.id;
        }
        
        const { createAppointmentWithPayment } = await import("../api.js");
        const result = await createAppointmentWithPayment(appointmentData, paymentData);
        
        onSuccess(result);
      } else if (appointmentId) {
        // Existing appointment - just process payment
        const paymentData = {
          appointment_id: appointmentId,
          redeem_loyalty_points: redeemLoyaltyPoints
        };
        
        if (useNewCard) {
          paymentData.card_number = cardNumber.replace(/\s/g, "");
          paymentData.exp_month = parseInt(expMonth);
          paymentData.exp_year = parseInt(expYear);
          paymentData.cvv = cvv;
          paymentData.cardholder_name = cardholderName;
          paymentData.billing_address = billingAddress;
          paymentData.save_payment_method = savePaymentMethod;
        } else {
          paymentData.payment_method_id = selectedMethod.id;
        }
        
        const { createPayment } = await import("../api.js");
        const result = await createPayment(paymentData);
        
        onSuccess(result);
      } else {
        throw new Error("Either appointmentId or appointmentData must be provided");
      }
    } catch (err) {
      setError(err.message || "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const canRedeemLoyalty = loyaltyRewards && loyaltyBalance >= (loyaltyRewards.pointThreshold || 100);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Loyalty Points Redemption */}
      {showLoyaltyRedemption && salonId && loyaltyRewards && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <Label className="text-base font-semibold">Loyalty Points</Label>
              <p className="text-sm text-gray-600">
                You have {loyaltyBalance} points
              </p>
            </div>
            {canRedeemLoyalty && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={redeemLoyaltyPoints}
                  onChange={(e) => setRedeemLoyaltyPoints(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">
                  Redeem {loyaltyRewards.pointThreshold} points for {loyaltyRewards.rewardDiscount}% off
                </span>
              </label>
            )}
          </div>
          {!canRedeemLoyalty && (
            <p className="text-sm text-gray-500">
              Need {loyaltyRewards.pointThreshold} points to redeem. You have {loyaltyBalance}.
            </p>
          )}
        </Card>
      )}

      {/* Payment Amount Summary */}
      <Card className="p-4 bg-gray-50">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">${amount.toFixed(2)}</span>
          </div>
          {redeemLoyaltyPoints && discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Loyalty Discount ({loyaltyRewards?.rewardDiscount}%)</span>
              <span className="font-medium">-${discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-semibold pt-2 border-t">
            <span>Total</span>
            <span>${finalAmount.toFixed(2)}</span>
          </div>
        </div>
      </Card>

      {/* Payment Method Selection */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Payment Method</Label>
        
        {savedMethods.length > 0 && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="paymentMethod"
                checked={!useNewCard}
                onChange={() => {
                  setUseNewCard(false);
                  setSelectedMethod(savedMethods.find(m => m.is_default) || savedMethods[0]);
                }}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Use saved payment method</span>
            </label>
            
            {!useNewCard && (
              <div className="ml-6 space-y-2">
                {savedMethods.map((method) => (
                  <label
                    key={method.id}
                    className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name="savedMethod"
                      checked={selectedMethod?.id === method.id}
                      onChange={() => setSelectedMethod(method)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="font-medium">
                        {method.card_brand?.toUpperCase() || "Card"} •••• {method.card_last4}
                      </div>
                      <div className="text-sm text-gray-600">
                        Expires {String(method.card_exp_month).padStart(2, "0")}/{method.card_exp_year}
                        {method.is_default && (
                          <span className="ml-2 text-blue-600">(Default)</span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
        
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="paymentMethod"
            checked={useNewCard || savedMethods.length === 0}
            onChange={() => setUseNewCard(true)}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium">
            {savedMethods.length > 0 ? "Enter new card" : "Enter card details"}
          </span>
        </label>
      </div>

      {/* New Card Form */}
      {(useNewCard || savedMethods.length === 0) && (
        <div className="space-y-4 border rounded-lg p-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              {detectedCardBrand !== "unknown" && cardNumber.length > 0 && (
                <span className="text-sm text-gray-600 font-medium">
                  {formatCardBrand(detectedCardBrand)}
                </span>
              )}
            </div>
            <Input
              id="cardNumber"
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
              <Label htmlFor="expMonth">Month</Label>
              <Input
                id="expMonth"
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
              <Label htmlFor="expYear">Year</Label>
              <Input
                id="expYear"
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
              <Label htmlFor="cvv">CVV</Label>
              <Input
                id="cvv"
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
            <Label htmlFor="cardholderName">Cardholder Name</Label>
            <Input
              id="cardholderName"
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
            <Label htmlFor="billingLine1">Billing Address</Label>
            <Input
              id="billingLine1"
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
                />
                {formErrors.city && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.city}</p>
                )}
              </div>
              <div>
                <Input
                  type="text"
                  placeholder="State"
                  maxLength="2"
                  value={billingAddress.state}
                  onChange={(e) => {
                    setBillingAddress({ ...billingAddress, state: e.target.value.toUpperCase() });
                    if (formErrors.state) {
                      setFormErrors(prev => ({ ...prev, state: null }));
                    }
                  }}
                  className={formErrors.state ? "border-red-500" : ""}
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
            />
            {formErrors.zip && (
              <p className="text-sm text-red-600 mt-1">{formErrors.zip}</p>
            )}
          </div>
          
          {/* Save Payment Method Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={savePaymentMethod}
              onChange={(e) => setSavePaymentMethod(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">
              Save this payment method for future use
            </span>
          </label>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex-1"
        >
          {loading ? "Processing..." : `Pay $${finalAmount.toFixed(2)}`}
        </Button>
      </div>
    </form>
  );
}

