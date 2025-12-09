/**
 * Feature 14: Payment Processing
 * Tests payment functionality
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as paymentsApi from './api.js'
import { api } from '../../shared/api/client.js'

vi.mock('../../shared/api/client.js')

const mockPayment = {
  id: 'payment-1',
  amount: 50.00,
  status: 'completed',
  payment_method_id: 'pm-1',
}

const mockPaymentMethod = {
  id: 'pm-1',
  type: 'card',
  last4: '4242',
  brand: 'visa',
}

describe('Feature 14: Payment Processing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should get saved payment methods', async () => {
    const mockMethods = [mockPaymentMethod]
    api.mockResolvedValueOnce({ payment_methods: mockMethods })

    const result = await paymentsApi.getSavedPaymentMethods()

    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
    expect(api).toHaveBeenCalledWith('/payment-methods')
  })

  it('should create a saved payment method', async () => {
    api.mockResolvedValueOnce(mockPaymentMethod)

    const result = await paymentsApi.createSavedPaymentMethod({
      type: 'card',
      token: 'tok_123',
    })

    expect(result).toEqual(mockPaymentMethod)
    expect(api).toHaveBeenCalledWith(
      '/payment-methods',
      expect.objectContaining({
        method: 'POST',
      })
    )
  })

  it('should set default payment method', async () => {
    api.mockResolvedValueOnce({ success: true })

    const result = await paymentsApi.setDefaultPaymentMethod('pm-1')

    expect(result).toBeDefined()
    expect(api).toHaveBeenCalledWith(
      '/payment-methods/pm-1/set-default',
      expect.objectContaining({
        method: 'PUT',
      })
    )
  })

  it('should delete a payment method', async () => {
    api.mockResolvedValueOnce({ success: true })

    const result = await paymentsApi.deletePaymentMethod('pm-1')

    expect(result).toBeDefined()
    expect(api).toHaveBeenCalledWith(
      '/payment-methods/pm-1',
      expect.objectContaining({
        method: 'DELETE',
      })
    )
  })
})

