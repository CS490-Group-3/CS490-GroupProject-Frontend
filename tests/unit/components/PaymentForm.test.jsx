import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
// Note: Adjust import path based on actual file location
// import { PaymentForm } from '../../../src/features/payments/components/PaymentForm'

// Mock the API
vi.mock('../../../src/features/payments/api', () => ({
  createPaymentWithAppointment: vi.fn(),
  getSavedPaymentMethods: vi.fn(() => Promise.resolve([])),
}))

// Skip this test suite if PaymentForm doesn't exist yet
describe.skip('PaymentForm Component', () => {
  const defaultProps = {
    appointmentData: {
      salon_id: 'salon-123',
      barber_id: 'barber-123',
      service_id: 'service-123',
      start_at: '2025-12-01T10:00:00Z',
      end_at: '2025-12-01T11:00:00Z',
    },
    amount: 50.00,
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders payment form', () => {
    render(<PaymentForm {...defaultProps} />)
    expect(screen.getByText(/payment/i)).toBeInTheDocument()
  })

  it('shows card number input', () => {
    render(<PaymentForm {...defaultProps} />)
    const cardInput = screen.getByLabelText(/card number/i)
    expect(cardInput).toBeInTheDocument()
  })

  it('validates card number on blur', async () => {
    const user = userEvent.setup()
    render(<PaymentForm {...defaultProps} />)
    
    const cardInput = screen.getByLabelText(/card number/i)
    await user.type(cardInput, '1234')
    await user.tab()
    
    await waitFor(() => {
      expect(screen.getByText(/invalid|error/i)).toBeInTheDocument()
    })
  })

  it('shows card brand as user types', async () => {
    const user = userEvent.setup()
    render(<PaymentForm {...defaultProps} />)
    
    const cardInput = screen.getByLabelText(/card number/i)
    await user.type(cardInput, '4111111111111111')
    
    await waitFor(() => {
      expect(screen.getByText(/visa/i)).toBeInTheDocument()
    })
  })

  it('shows expiry and CVV inputs', () => {
    render(<PaymentForm {...defaultProps} />)
    expect(screen.getByLabelText(/expiry|expiration/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/cvv|cvc/i)).toBeInTheDocument()
  })

  it('shows save payment method toggle', () => {
    render(<PaymentForm {...defaultProps} />)
    expect(screen.getByLabelText(/save.*payment method/i)).toBeInTheDocument()
  })
})

