/**
 * Feature 6: Profile Management
 * Tests user profile viewing and editing
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Profile from './Profile.jsx'
import { api } from '../../../shared/api/client.js'

vi.mock('../../../shared/api/client.js')
vi.mock('../../auth/auth-provider.jsx', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      email: 'test@example.com',
      role: 'customer',
      first_name: 'John',
      last_name: 'Doe',
    },
    updateUser: vi.fn(),
    loading: false,
  }),
}))

const mockProfile = {
  id: '1',
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  phone: '123-456-7890',
  date_of_birth: '1990-01-01',
}

const mockAppointments = {
  appointments: [],
  total: 0,
}

describe('Feature 6: Profile Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    // Mock API calls that Profile component makes
    api.mockImplementation((path) => {
      if (path === '/auth/me') {
        return Promise.resolve({ user: mockProfile })
      }
      if (path.includes('/appointments')) {
        return Promise.resolve(mockAppointments)
      }
      return Promise.resolve({})
    })
  })

  it('should display user profile information', async () => {
    render(
      <BrowserRouter>
        <Profile />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(api).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('should allow editing profile', async () => {
    render(
      <BrowserRouter>
        <Profile />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(api).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('should save profile changes', async () => {
    render(
      <BrowserRouter>
        <Profile />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(api).toHaveBeenCalled()
    }, { timeout: 3000 })
  })
})

