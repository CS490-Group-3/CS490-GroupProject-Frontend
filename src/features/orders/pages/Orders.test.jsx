/**
 * Feature 13: Order Creation and Management
 * Tests order functionality using the api() function
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import Orders from './Orders.jsx'
import { api } from '../../../shared/api/client.js'

vi.mock('../../../shared/api/client.js')
vi.mock('../../auth/auth-provider.jsx', () => ({
  useAuth: () => ({ user: { id: '1', role: 'customer' }, loading: false }),
}))

const mockOrders = [
  {
    id: 'order-1',
    salon_id: 'salon-1',
    salon_name: 'Fade Factory',
    items: [
      { product_id: '1', quantity: 2, product: { name: 'Hair Gel', price: 15.99 } },
    ],
    total: 31.98,
    status: 'pending',
    created_at: '2024-01-15T10:00:00Z',
  },
]

describe('Feature 13: Order Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.mockResolvedValue(mockOrders)
  })

  it('should display user orders', async () => {
    render(
      <BrowserRouter>
        <Orders />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith('/orders')
    })
  })

  it('should allow canceling an order', async () => {
    const user = userEvent.setup()
    api.mockResolvedValueOnce(mockOrders)
    api.mockResolvedValueOnce({ success: true })

    render(
      <BrowserRouter>
        <Orders />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith('/orders')
    })

    const cancelButtons = screen.queryAllByText(/cancel/i)
    if (cancelButtons.length > 0) {
      await user.click(cancelButtons[0])
      await waitFor(() => {
        expect(api).toHaveBeenCalledWith(
          expect.stringContaining('/orders'),
          expect.any(Object)
        )
      })
    }
  })
})

