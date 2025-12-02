/**
 * Card validation utilities using Luhn's algorithm and card type detection
 */

/**
 * Validates a card number using Luhn's algorithm
 * @param {string} cardNumber - Card number (spaces will be removed)
 * @returns {boolean} - True if valid
 */
export function luhnValidate(cardNumber) {
  const digits = cardNumber.replace(/\D/g, "");
  if (!digits || digits.length < 13 || digits.length > 19) {
    return false;
  }

  let sum = 0;
  const numDigits = digits.length;
  const parity = numDigits % 2;

  for (let i = 0; i < numDigits; i++) {
    let digit = parseInt(digits[i], 10);
    if (i % 2 === parity) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
  }

  return sum % 10 === 0;
}

/**
 * Detects the card brand based on card number
 * @param {string} cardNumber - Card number (spaces will be removed)
 * @returns {string} - Card brand: 'visa', 'mastercard', 'amex', 'discover', 'diners', 'jcb', 'unionpay', 'unknown'
 */
export function detectCardBrand(cardNumber) {
  const cleaned = cardNumber.replace(/\D/g, "");

  if (!cleaned) return "unknown";

  // Visa: starts with 4
  if (/^4/.test(cleaned)) {
    return "visa";
  }

  // Mastercard: starts with 5[1-5] or 2221-2720
  if (/^5[1-5]/.test(cleaned) || /^222[1-9]/.test(cleaned) || /^22[3-9]/.test(cleaned) || /^2[3-6]/.test(cleaned) || /^27[01]/.test(cleaned) || /^2720/.test(cleaned)) {
    return "mastercard";
  }

  // Amex: starts with 34 or 37
  if (/^3[47]/.test(cleaned)) {
    return "amex";
  }

  // Discover: starts with 6011, 65, or 64[4-9]
  if (/^6011/.test(cleaned) || /^65/.test(cleaned) || /^64[4-9]/.test(cleaned)) {
    return "discover";
  }

  // Diners Club: starts with 30[0-5], 36, 38, or 39
  if (/^30[0-5]/.test(cleaned) || /^36/.test(cleaned) || /^38/.test(cleaned) || /^39/.test(cleaned)) {
    return "diners";
  }

  // JCB: starts with 2131, 1800, or 35
  if (/^2131/.test(cleaned) || /^1800/.test(cleaned) || /^35/.test(cleaned)) {
    return "jcb";
  }

  // UnionPay: starts with 62
  if (/^62/.test(cleaned)) {
    return "unionpay";
  }

  return "unknown";
}

/**
 * Validates expiry date
 * @param {number} month - Expiration month (1-12)
 * @param {number} year - Expiration year (4 digits)
 * @returns {boolean} - True if valid and not expired
 */
export function validateExpiryDate(month, year) {
  if (!month || !year) return false;
  if (month < 1 || month > 12) return false;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;

  return true;
}

/**
 * Validates CVV based on card brand
 * @param {string} cvv - CVV code
 * @param {string} cardBrand - Card brand
 * @returns {boolean} - True if valid
 */
export function validateCVV(cvv, cardBrand) {
  if (!cvv || !cvv.match(/^\d+$/)) return false;

  if (cardBrand === "amex") {
    return cvv.length === 4;
  } else {
    return cvv.length === 3;
  }
}

/**
 * Formats card brand name for display
 * @param {string} brand - Card brand code
 * @returns {string} - Formatted brand name
 */
export function formatCardBrand(brand) {
  const brands = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    discover: "Discover",
    diners: "Diners Club",
    jcb: "JCB",
    unionpay: "UnionPay",
    unknown: "Card"
  };
  return brands[brand] || "Card";
}

/**
 * Validates billing address fields
 * @param {object} address - Billing address object
 * @returns {object} - Object with field errors
 */
export function validateBillingAddress(address) {
  const errors = {};

  if (!address.line1 || !address.line1.trim()) {
    errors.line1 = "Street address is required";
  }

  if (!address.city || !address.city.trim()) {
    errors.city = "City is required";
  } else if (address.city.length > 100) {
    errors.city = "City must be 100 characters or less";
  }

  if (!address.state || !address.state.trim()) {
    errors.state = "State is required";
  } else {
    const stateUpper = address.state.toUpperCase().trim();
    if (stateUpper.length !== 2) {
      errors.state = "State must be a 2-letter abbreviation";
    } else if (!/^[A-Z]{2}$/.test(stateUpper)) {
      errors.state = "State must be 2 uppercase letters";
    } else {
      // Validate against US state codes
      const validStates = [
        "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
        "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
        "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
        "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
        "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
      ];
      if (!validStates.includes(stateUpper)) {
        errors.state = "Please enter a valid US state abbreviation";
      }
    }
  }

  if (!address.zip || !address.zip.trim()) {
    errors.zip = "ZIP code is required";
  } else if (!/^\d{5}(-\d{4})?$/.test(address.zip.trim())) {
    errors.zip = "ZIP code must be 5 digits or 5+4 format (e.g., 12345 or 12345-6789)";
  }

  return errors;
}

