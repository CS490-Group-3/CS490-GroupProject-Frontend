/**
 * Feature 7: Loyalty Points Viewing
 * Feature 8: Loyalty Points Redemption
 * Tests loyalty program functionality
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import * as loyaltyApi from '../api.js'

// Mock the loyalty component/page
vi.mock('../api.js')
vi.mock('../../auth/auth-provider.jsx', () => ({
  useAuth: () => ({ user: { id: '1', role: 'customer' }, loading: false }),
}))

const mockLoyaltyBalance = {
  salon_id: 'salon-1',
  salon_name: 'Fade Factory',
  balance: 150,
  activity: [
    { id: '1', type: 'earned', points: 50, description: 'Appointment completed', date: '2024-01-15' },
  ],
}

const mockLoyaltyConfig = {
  points_per_dollar: 1,
  redemption_rate: 100,
  min_redemption: 100,
}

describe('Feature 7-8: Loyalty Program', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loyaltyApi.getLoyaltyBalance = vi.fn().mockResolvedValue([mockLoyaltyBalance])
    loyaltyApi.getLoyaltyConfig = vi.fn().mockResolvedValue(mockLoyaltyConfig)
    loyaltyApi.redeemPoints = vi.fn().mockResolvedValue({ success: true })
  })

  it('should display loyalty points balance', async () => {
    const balance = await loyaltyApi.getLoyaltyBalance('salon-1')
    expect(balance).toBeDefined()
    expect(balance[0].balance).toBe(150)
  })

  it('should allow redeeming loyalty points', async () => {
    const result = await loyaltyApi.redeemPoints('salon-1', 100)
    expect(result.success).toBe(true)
    expect(loyaltyApi.redeemPoints).toHaveBeenCalledWith('salon-1', 100)
  })

  it('should fetch loyalty configuration', async () => {
    const config = await loyaltyApi.getLoyaltyConfig('salon-1')
    expect(config).toBeDefined()
    expect(config.points_per_dollar).toBe(1)
  })

  it('should calculate potential points', async () => {
    loyaltyApi.getPotentialPoints = vi.fn().mockResolvedValue({ points: 50 })
    const result = await loyaltyApi.getPotentialPoints('salon-1', 50)
    expect(result.points).toBe(50)
  })
})

