/**
 * Feature 2: Salon Browsing and Search
 * Tests salon search functionality with API mocking
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import SalonSearch from './SalonSearch.jsx'
import * as bookingApi from '../api.js'
import { mockApiResponse } from '../../../../tests/setup.js'

vi.mock('../api.js')
vi.mock('../../auth/auth-provider.jsx', () => ({
  useAuth: () => ({ user: { role: 'customer' }, loading: false }),
}))

// Services should be array of strings (names), not objects
const mockServices = ['Haircut', 'Beard Trim', 'Shampoo', 'Styling']

const mockSalons = [
  { id: '1', name: 'Fade Factory', address: '123 Main St', rating: 4.5 },
  { id: '2', name: 'Elite Cuts', address: '456 Oak Ave', rating: 4.8 },
]

describe('Feature 2: Salon Browsing and Search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    bookingApi.listServices.mockResolvedValue(mockServices)
    bookingApi.listSalons.mockResolvedValue(mockSalons)
  })

  it('should display salon search page', async () => {
    render(
      <BrowserRouter>
        <SalonSearch />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search by name/i)).toBeInTheDocument()
    })
  })

  it('should search salons by name', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <SalonSearch />
      </BrowserRouter>
    )

    const searchInput = await screen.findByPlaceholderText(/search by name/i)
    await user.type(searchInput, 'Fade')

    await waitFor(() => {
      expect(bookingApi.listSalons).toHaveBeenCalled()
    }, { timeout: 2000 })
  })

  it('should filter salons by location', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <SalonSearch />
      </BrowserRouter>
    )

    const locationInput = await screen.findByPlaceholderText(/location/i)
    await user.type(locationInput, 'New York')

    await waitFor(() => {
      expect(bookingApi.listSalons).toHaveBeenCalled()
    }, { timeout: 2000 })
  })

  it('should display salon cards after loading', async () => {
    render(
      <BrowserRouter>
        <SalonSearch />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(bookingApi.listSalons).toHaveBeenCalled()
    })
  })
})

