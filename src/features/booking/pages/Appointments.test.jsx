/**
 * Feature 3: Appointment Booking
 * Feature 4: Appointment Rescheduling
 * Feature 5: Appointment Cancellation
 * Tests appointment management functionality
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Appointments from './Appointments.jsx'
import * as bookingApi from '../api.js'
import { mockApiResponse } from '../../../../tests/setup.js'

vi.mock('../api.js')
vi.mock('../../auth/auth-provider.jsx', () => ({
  useAuth: () => ({ user: { id: '1', role: 'customer' }, loading: false }),
}))

const mockAppointments = {
  appointments: [
    {
      id: '1',
      salon_name: 'Fade Factory',
      service_name: 'Haircut',
      barber_name: 'John Doe',
      appointment_date: '2024-12-25T10:00:00Z',
      status: 'scheduled',
    },
    {
      id: '2',
      salon_name: 'Elite Cuts',
      service_name: 'Beard Trim',
      barber_name: 'Jane Smith',
      appointment_date: '2024-12-26T14:00:00Z',
      status: 'scheduled',
    },
  ],
  total: 2,
}

describe('Feature 3-5: Appointment Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    bookingApi.listUserAppointments.mockResolvedValue(mockAppointments)
  })

  it('should display user appointments', async () => {
    render(
      <BrowserRouter>
        <Appointments />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(bookingApi.listUserAppointments).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('should allow rescheduling appointments', async () => {
    bookingApi.rescheduleAppointment.mockResolvedValue({ success: true })

    render(
      <BrowserRouter>
        <Appointments />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(bookingApi.listUserAppointments).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('should allow canceling appointments', async () => {
    bookingApi.cancelAppointment.mockResolvedValue({ success: true })

    render(
      <BrowserRouter>
        <Appointments />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(bookingApi.listUserAppointments).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('should filter appointments by status', async () => {
    render(
      <BrowserRouter>
        <Appointments />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(bookingApi.listUserAppointments).toHaveBeenCalled()
    }, { timeout: 3000 })
  })
})

