import { describe, it, expect } from 'vitest'
import { 
  luhnValidate, 
  detectCardBrand, 
  validateExpiryDate, 
  validateCVV 
} from '../../../src/shared/utils/cardValidation'

describe('Card Validation Utilities', () => {
  describe('luhnValidate', () => {
    it('validates valid Visa card', () => {
      expect(luhnValidate('4111111111111111')).toBe(true)
    })

    it('validates valid Mastercard', () => {
      expect(luhnValidate('5555555555554444')).toBe(true)
    })

    it('rejects invalid card number (fails Luhn)', () => {
      expect(luhnValidate('4111111111111112')).toBe(false)
    })

    it('rejects card number that is too short', () => {
      expect(luhnValidate('1234')).toBe(false)
    })

    it('rejects card number that is too long', () => {
      expect(luhnValidate('41111111111111111111')).toBe(false)
    })
  })

  describe('detectCardBrand', () => {
    it('detects Visa', () => {
      expect(detectCardBrand('4111111111111111')).toBe('visa')
    })

    it('detects Mastercard', () => {
      expect(detectCardBrand('5555555555554444')).toBe('mastercard')
    })

    it('detects American Express', () => {
      expect(detectCardBrand('378282246310005')).toBe('amex')
    })

    it('returns unknown for unrecognized card', () => {
      expect(detectCardBrand('1234567890123456')).toBe('unknown')
    })
  })

  describe('validateExpiryDate', () => {
    it('validates future expiry date', () => {
      const futureYear = new Date().getFullYear() + 1
      expect(validateExpiryDate(12, futureYear)).toBe(true)
    })

    it('rejects expired card', () => {
      const pastYear = new Date().getFullYear() - 1
      expect(validateExpiryDate(12, pastYear)).toBe(false)
    })

    it('rejects invalid month', () => {
      expect(validateExpiryDate(13, 2025)).toBe(false)
    })
  })

  describe('validateCVV', () => {
    it('validates 3-digit CVV for Visa', () => {
      expect(validateCVV('123', 'visa')).toBe(true)
    })

    it('validates 4-digit CVV for Amex', () => {
      expect(validateCVV('1234', 'amex')).toBe(true)
    })

    it('rejects CVV that is too short', () => {
      expect(validateCVV('12', 'visa')).toBe(false)
    })

    it('rejects non-numeric CVV', () => {
      expect(validateCVV('abc', 'visa')).toBe(false)
    })
  })
})

