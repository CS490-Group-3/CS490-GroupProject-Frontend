import { useState, useEffect } from "react";
import { Button } from "../../../shared/ui/button.jsx";
import { Input } from "../../../shared/ui/input.jsx";
import { Label } from "../../../shared/ui/label.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../../shared/ui/dialog.jsx";
import { Textarea } from "../../../shared/ui/textarea.jsx";
import { getSavedPaymentMethods } from "../../payments/api.js";
import { getCustomerPoints, getLoyaltyRewards, getPotentialPoints } from "../../loyalty/api.js";
import { getActivePromotions } from "../api.js";
import { api } from "../../../shared/api/client.js";
import {
  luhnValidate,
  detectCardBrand,
  validateExpiryDate,
  validateCVV,
  formatCardBrand,
  validateBillingAddress,
  validateShippingAddress
} from "../../../shared/utils/cardValidation.js";

export default function CheckoutModal({ cart, cartItems, onClose, onSuccess }) {
  const [savedMethods, setSavedMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [useNewCard, setUseNewCard] = useState(false);
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);
  const [redeemLoyaltyPoints, setRedeemLoyaltyPoints] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState("delivery"); // "pickup" or "delivery"
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(false);
  
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
  
  const [shippingAddress, setShippingAddress] = useState({
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
  const [loyaltyProgram, setLoyaltyProgram] = useState(null);
  const [potentialPoints, setPotentialPoints] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(cart?.total_amount || 0);
  const [promotions, setPromotions] = useState([]);
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [promotionDiscount, setPromotionDiscount] = useState(0);

  // Load saved payment methods and loyalty info (critical - load first)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Load critical data first (payment methods, loyalty balance, rewards, promotions)
        const [methodsRes, loyaltyRes, rewardsRes, promotionsRes] = await Promise.all([
          getSavedPaymentMethods().catch((err) => {
            console.error("Error fetching saved payment methods:", err);
            return [];
          }),
          getCustomerPoints().catch(() => []),
          cart?.salon_id ? getLoyaltyRewards(cart.salon_id).catch(() => null) : Promise.resolve(null),
          cart?.salon_id && cart?.total_amount ? getActivePromotions(cart.salon_id, cart.total_amount, "products").catch(() => ({ promotions: [] })) : Promise.resolve({ promotions: [] })
        ]);
        
        if (!alive) return;
        
        console.log("Loaded payment methods:", methodsRes);
        setSavedMethods(methodsRes || []);
        
        // Find balance for this salon
        if (cart?.salon_id && Array.isArray(loyaltyRes)) {
          const salonBalance = loyaltyRes.find(s => s.salon_id === cart.salon_id);
          setLoyaltyBalance(salonBalance?.balance || 0);
        } else {
          setLoyaltyBalance(0);
        }
        
        if (rewardsRes) {
          setLoyaltyProgram({
            minPoints: rewardsRes.pointThreshold || 100,
            discountPercent: rewardsRes.rewardDiscount || 10
          });
        }
        
        if (promotionsRes?.promotions) {
          setPromotions(promotionsRes.promotions);
        }
        
        // Set default payment method
        if (methodsRes && methodsRes.length > 0) {
          const defaultMethod = methodsRes.find(m => m.is_default) || methodsRes[0];
          setSelectedMethod(defaultMethod);
        }
        
        // Calculate potential points asynchronously (non-critical - load last)
        if (cart?.salon_id && cart?.total_amount) {
          (async () => {
            try {
              const points = await getPotentialPoints(cart.salon_id, cart.total_amount);
              if (!alive) return;
              setPotentialPoints(points);
            } catch (err) {
              console.error("Error calculating potential points:", err);
            }
          })();
        }
      } catch (err) {
        console.error("Error loading payment methods:", err);
      }
    })();
    
    return () => { alive = false; };
  }, [cart?.salon_id]);

  // Calculate promotion discount
  useEffect(() => {
    if (selectedPromotion && cart?.total_amount) {
      const promotion = promotions.find(p => p.id === selectedPromotion);
      if (promotion) {
        let discount = 0;
        if (promotion.discount_type === "percentage") {
          discount = cart.total_amount * (promotion.discount_value / 100);
        } else if (promotion.discount_type === "fixed_amount") {
          discount = Math.min(promotion.discount_value, cart.total_amount);
        }
        setPromotionDiscount(discount);
      } else {
        setPromotionDiscount(0);
      }
    } else {
      setPromotionDiscount(0);
    }
  }, [selectedPromotion, promotions, cart?.total_amount]);

  // Update final amount when loyalty redemption or promotion changes
  useEffect(() => {
    const baseAmount = (cart?.total_amount || 0) - promotionDiscount;
    const minPoints = loyaltyProgram?.minPoints || 100;
    const discountPercent = loyaltyProgram?.discountPercent || 10;
    
    if (redeemLoyaltyPoints && loyaltyBalance >= minPoints && loyaltyProgram) {
      // Use the loyalty program's discount percentage on amount after promotion
      const discount = baseAmount * (discountPercent / 100);
      setDiscountAmount(discount);
      setFinalAmount(baseAmount - discount);
    } else {
      setDiscountAmount(0);
      setFinalAmount(baseAmount);
    }
  }, [redeemLoyaltyPoints, loyaltyBalance, cart?.total_amount, loyaltyProgram, promotionDiscount]);

  // Copy shipping to billing when toggle is enabled
  useEffect(() => {
    if (billingSameAsShipping) {
      setBillingAddress({ ...shippingAddress });
    }
  }, [billingSameAsShipping, shippingAddress]);

  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\s/g, "");
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(" ") : cleaned;
  };

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value);
    if (formatted.replace(/\s/g, "").length <= 19) {
      setCardNumber(formatted);
      const brand = detectCardBrand(formatted);
      setDetectedCardBrand(brand);
      if (formErrors.cardNumber) {
        setFormErrors(prev => ({ ...prev, cardNumber: null }));
      }
    }
  };

  const validateForm = () => {
    const errors = {};

    // Validate shipping address only if delivery method is "delivery"
    if (deliveryMethod === "delivery") {
      const shippingErrors = validateShippingAddress(shippingAddress);
      if (Object.keys(shippingErrors).length > 0) {
        errors.shipping = shippingErrors;
      }
    }

    if (useNewCard || savedMethods.length === 0) {
      const cardNumberClean = cardNumber.replace(/\s/g, "");
      if (!cardNumberClean) {
        errors.cardNumber = "Card number is required";
      } else if (!luhnValidate(cardNumberClean)) {
        errors.cardNumber = "Invalid card number";
      }

      if (!expMonth || !expYear) {
        errors.expiry = "Expiration date is required";
      } else if (!validateExpiryDate(parseInt(expMonth), parseInt(expYear))) {
        errors.expiry = "Invalid or expired date";
      }

      if (!cvv) {
        errors.cvv = "CVV is required";
      } else if (!validateCVV(cvv, detectedCardBrand)) {
        errors.cvv = "Invalid CVV";
      }

      if (!cardholderName.trim()) {
        errors.cardholderName = "Cardholder name is required";
      }

      // Only validate billing address if not same as shipping
      if (!billingSameAsShipping) {
        const billingErrors = validateBillingAddress(billingAddress);
        if (Object.keys(billingErrors).length > 0) {
          errors.billing = billingErrors;
        }
      }
    } else if (!selectedMethod) {
      errors.paymentMethod = "Please select a payment method";
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
      // Format shipping address - if pickup, send null; if delivery, format as string or structured
      let shippingAddressData = null;
      if (deliveryMethod === "delivery") {
        // Format as structured object for backend
        shippingAddressData = {
          line1: shippingAddress.line1,
          line2: shippingAddress.line2 || "",
          city: shippingAddress.city,
          state: shippingAddress.state,
          zip: shippingAddress.zip,
          country: shippingAddress.country || "US"
        };
      }

      const checkoutData = {
        order_id: cart.id,
        delivery_method: deliveryMethod,
        shipping_address: shippingAddressData,
        redeem_loyalty_points: redeemLoyaltyPoints,
        promotion_id: selectedPromotion || null
      };
      
      const shouldUseNewCard = useNewCard || savedMethods.length === 0;
      if (shouldUseNewCard) {
        checkoutData.card_number = cardNumber.replace(/\s/g, "");
        checkoutData.exp_month = parseInt(expMonth);
        checkoutData.exp_year = parseInt(expYear);
        checkoutData.cvv = cvv;
        checkoutData.cardholder_name = cardholderName;
        checkoutData.billing_address = billingAddress;
        checkoutData.save_payment_method = savePaymentMethod;
      } else {
        checkoutData.payment_method_id = selectedMethod.id;
      }
      
      const result = await api("/orders/checkout", {
        method: "POST",
        body: checkoutData
      });
      
      onSuccess(result);
    } catch (err) {
      setError(err.error || err.message || "Failed to process checkout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
          <DialogDescription>Complete your order by providing payment and shipping information</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Summary */}
          <div className="border rounded-lg p-4 space-y-2">
            <h3 className="font-semibold">Order Summary</h3>
            {cartItems.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  {item.products?.name || "Product"} × {item.quantity}
                </span>
                <span>${(item.subtotal || 0).toFixed(2)}</span>
              </div>
            ))}
            <div className="pt-2 border-t flex justify-between">
              <span>Subtotal:</span>
              <span>${(cart?.subtotal || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tax:</span>
              <span>${(cart?.tax || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Shipping:</span>
              <span>${(cart?.shipping_cost || 0).toFixed(2)}</span>
            </div>
            {promotionDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Promotion Discount:</span>
                <span>-${promotionDiscount.toFixed(2)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Loyalty Discount:</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="pt-2 border-t flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>${finalAmount.toFixed(2)}</span>
            </div>
            {potentialPoints > 0 && (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 text-sm text-indigo-600 font-medium">
                  <span>🎁</span>
                  <span>You'll earn {potentialPoints} loyalty points after successful delivery of this order!</span>
                </div>
              </div>
            )}
          </div>

          {/* Delivery Method Selection */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Delivery Method *</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="delivery"
                  checked={deliveryMethod === "delivery"}
                  onChange={(e) => setDeliveryMethod(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Delivery</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="pickup"
                  checked={deliveryMethod === "pickup"}
                  onChange={(e) => setDeliveryMethod(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Pickup</span>
              </label>
            </div>
          </div>

          {/* Shipping Address - Only show if delivery */}
          {deliveryMethod === "delivery" && (
            <div className="space-y-2">
              <Label>Shipping Address *</Label>
              <Input
                placeholder="Street Address"
                value={shippingAddress.line1}
                onChange={(e) => {
                  const newShipping = { ...shippingAddress, line1: e.target.value };
                  setShippingAddress(newShipping);
                  if (billingSameAsShipping) {
                    setBillingAddress(newShipping);
                  }
                  if (formErrors.shipping?.line1) {
                    setFormErrors(prev => ({
                      ...prev,
                      shipping: { ...prev.shipping, line1: null }
                    }));
                  }
                }}
                className={formErrors.shipping?.line1 ? "border-red-500" : ""}
              />
              <Input
                placeholder="Apt, Suite, etc. (optional)"
                value={shippingAddress.line2}
                onChange={(e) => {
                  const newShipping = { ...shippingAddress, line2: e.target.value };
                  setShippingAddress(newShipping);
                  if (billingSameAsShipping) {
                    setBillingAddress(newShipping);
                  }
                }}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="City"
                  value={shippingAddress.city}
                  onChange={(e) => {
                    const newShipping = { ...shippingAddress, city: e.target.value };
                    setShippingAddress(newShipping);
                    if (billingSameAsShipping) {
                      setBillingAddress(newShipping);
                    }
                    if (formErrors.shipping?.city) {
                      setFormErrors(prev => ({
                        ...prev,
                        shipping: { ...prev.shipping, city: null }
                      }));
                    }
                  }}
                  className={formErrors.shipping?.city ? "border-red-500" : ""}
                />
                <Input
                  placeholder="State"
                  maxLength="2"
                  value={shippingAddress.state}
                  onChange={(e) => {
                    const newShipping = { ...shippingAddress, state: e.target.value.toUpperCase() };
                    setShippingAddress(newShipping);
                    if (billingSameAsShipping) {
                      setBillingAddress(newShipping);
                    }
                    if (formErrors.shipping?.state) {
                      setFormErrors(prev => ({
                        ...prev,
                        shipping: { ...prev.shipping, state: null }
                      }));
                    }
                  }}
                  className={formErrors.shipping?.state ? "border-red-500" : ""}
                />
              </div>
              <Input
                placeholder="ZIP Code"
                value={shippingAddress.zip}
                onChange={(e) => {
                  const newShipping = { ...shippingAddress, zip: e.target.value };
                  setShippingAddress(newShipping);
                  if (billingSameAsShipping) {
                    setBillingAddress(newShipping);
                  }
                  if (formErrors.shipping?.zip) {
                    setFormErrors(prev => ({
                      ...prev,
                      shipping: { ...prev.shipping, zip: null }
                    }));
                  }
                }}
                className={formErrors.shipping?.zip ? "border-red-500" : ""}
              />
              {formErrors.shipping && (
                <p className="text-sm text-red-500">
                  {Object.values(formErrors.shipping).join(", ")}
                </p>
              )}
            </div>
          )}

          {/* Promotional Offers */}
          {promotions.length > 0 && (
            <div className="border rounded-lg p-4 space-y-2">
              <Label className="text-base font-semibold mb-3 block">Available Promotions</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="promotion"
                    checked={!selectedPromotion}
                    onChange={() => setSelectedPromotion(null)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">No promotion</span>
                </label>
                {promotions.map((promotion) => {
                  const discountText = promotion.discount_type === "percentage" 
                    ? `${promotion.discount_value}% off`
                    : `$${promotion.discount_value} off`;
                  
                  return (
                    <label key={promotion.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="promotion"
                        checked={selectedPromotion === promotion.id}
                        onChange={() => setSelectedPromotion(promotion.id)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium">{promotion.title}</span>
                        <p className="text-xs text-gray-500">{promotion.description}</p>
                        {promotionDiscount > 0 && selectedPromotion === promotion.id && (
                          <p className="text-xs text-green-600">
                            You'll save ${promotionDiscount.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-medium text-indigo-600">{discountText}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Loyalty Points Redemption */}
          {loyaltyProgram && loyaltyBalance >= loyaltyProgram.minPoints && (
            <div className="border rounded-lg p-4 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={redeemLoyaltyPoints}
                  onChange={(e) => setRedeemLoyaltyPoints(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="font-medium">
                  Redeem {loyaltyProgram.minPoints} loyalty points for {loyaltyProgram.discountPercent}% discount
                </span>
              </label>
              {redeemLoyaltyPoints && discountAmount > 0 && (
                <p className="text-sm text-green-600 ml-6">
                  You'll save ${discountAmount.toFixed(2)}
                </p>
              )}
            </div>
          )}

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
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number *</Label>
                <Input
                  id="cardNumber"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  placeholder="1234 5678 9012 3456"
                  className={formErrors.cardNumber ? "border-red-500" : ""}
                />
                {formErrors.cardNumber && (
                  <p className="text-sm text-red-500">{formErrors.cardNumber}</p>
                )}
                {detectedCardBrand !== "unknown" && (
                  <p className="text-xs text-gray-500">
                    {formatCardBrand(detectedCardBrand)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expMonth">Expiration Month *</Label>
                  <Input
                    id="expMonth"
                    type="number"
                    min="1"
                    max="12"
                    value={expMonth}
                    onChange={(e) => {
                      setExpMonth(e.target.value);
                      if (formErrors.expiry) {
                        setFormErrors(prev => ({ ...prev, expiry: null }));
                      }
                    }}
                    placeholder="MM"
                    className={formErrors.expiry ? "border-red-500" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expYear">Expiration Year *</Label>
                  <Input
                    id="expYear"
                    type="number"
                    min={new Date().getFullYear()}
                    value={expYear}
                    onChange={(e) => {
                      setExpYear(e.target.value);
                      if (formErrors.expiry) {
                        setFormErrors(prev => ({ ...prev, expiry: null }));
                      }
                    }}
                    placeholder="YYYY"
                    className={formErrors.expiry ? "border-red-500" : ""}
                  />
                </div>
              </div>
              {formErrors.expiry && (
                <p className="text-sm text-red-500">{formErrors.expiry}</p>
              )}

              <div className="space-y-2">
                <Label htmlFor="cvv">CVV *</Label>
                <Input
                  id="cvv"
                  type="password"
                  value={cvv}
                  onChange={(e) => {
                    setCvv(e.target.value);
                    if (formErrors.cvv) {
                      setFormErrors(prev => ({ ...prev, cvv: null }));
                    }
                  }}
                  placeholder="123"
                  className={formErrors.cvv ? "border-red-500" : ""}
                />
                {formErrors.cvv && (
                  <p className="text-sm text-red-500">{formErrors.cvv}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardholderName">Cardholder Name *</Label>
                <Input
                  id="cardholderName"
                  value={cardholderName}
                  onChange={(e) => {
                    setCardholderName(e.target.value);
                    if (formErrors.cardholderName) {
                      setFormErrors(prev => ({ ...prev, cardholderName: null }));
                    }
                  }}
                  placeholder="John Doe"
                  className={formErrors.cardholderName ? "border-red-500" : ""}
                />
                {formErrors.cardholderName && (
                  <p className="text-sm text-red-500">{formErrors.cardholderName}</p>
                )}
              </div>

              {/* Billing Address */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Billing Address *</Label>
                  {deliveryMethod === "delivery" && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={billingSameAsShipping}
                        onChange={(e) => {
                          setBillingSameAsShipping(e.target.checked);
                          if (e.target.checked) {
                            setBillingAddress({ ...shippingAddress });
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Same as shipping address</span>
                    </label>
                  )}
                </div>
                <Input
                  placeholder="Street Address"
                  value={billingAddress.line1}
                  onChange={(e) => {
                    setBillingAddress({ ...billingAddress, line1: e.target.value });
                    setBillingSameAsShipping(false);
                    if (formErrors.billing?.line1) {
                      setFormErrors(prev => ({
                        ...prev,
                        billing: { ...prev.billing, line1: null }
                      }));
                    }
                  }}
                  disabled={billingSameAsShipping}
                  className={formErrors.billing?.line1 ? "border-red-500" : ""}
                />
                <Input
                  placeholder="Apt, Suite, etc. (optional)"
                  value={billingAddress.line2}
                  onChange={(e) => {
                    setBillingAddress({ ...billingAddress, line2: e.target.value });
                    setBillingSameAsShipping(false);
                  }}
                  disabled={billingSameAsShipping}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="City"
                    value={billingAddress.city}
                    onChange={(e) => {
                      setBillingAddress({ ...billingAddress, city: e.target.value });
                      setBillingSameAsShipping(false);
                      if (formErrors.billing?.city) {
                        setFormErrors(prev => ({
                          ...prev,
                          billing: { ...prev.billing, city: null }
                        }));
                      }
                    }}
                    disabled={billingSameAsShipping}
                    className={formErrors.billing?.city ? "border-red-500" : ""}
                  />
                  <Input
                    placeholder="State"
                    maxLength="2"
                    value={billingAddress.state}
                    onChange={(e) => {
                      setBillingAddress({ ...billingAddress, state: e.target.value.toUpperCase() });
                      setBillingSameAsShipping(false);
                      if (formErrors.billing?.state) {
                        setFormErrors(prev => ({
                          ...prev,
                          billing: { ...prev.billing, state: null }
                        }));
                      }
                    }}
                    disabled={billingSameAsShipping}
                    className={formErrors.billing?.state ? "border-red-500" : ""}
                  />
                </div>
                <Input
                  placeholder="ZIP Code"
                  value={billingAddress.zip}
                  onChange={(e) => {
                    setBillingAddress({ ...billingAddress, zip: e.target.value });
                    setBillingSameAsShipping(false);
                    if (formErrors.billing?.zip) {
                      setFormErrors(prev => ({
                        ...prev,
                        billing: { ...prev.billing, zip: null }
                      }));
                    }
                  }}
                  disabled={billingSameAsShipping}
                  className={formErrors.billing?.zip ? "border-red-500" : ""}
                />
                {formErrors.billing && (
                  <p className="text-sm text-red-500">
                    {Object.values(formErrors.billing).join(", ")}
                  </p>
                )}
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={savePaymentMethod}
                  onChange={(e) => setSavePaymentMethod(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Save this payment method for future use</span>
              </label>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-black text-white hover:opacity-90"
            >
              {loading ? "Processing..." : `Pay $${finalAmount.toFixed(2)}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

