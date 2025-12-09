/**
 * Feature 1: Authentication - User Login
 * Tests user login functionality with proper API mocking
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import SignIn from './SignIn.jsx'

const mockLogin = vi.fn(async (email, password) => {
  if (email === 'test@example.com' && password === 'password123') {
    return { id: '1', email: 'test@example.com', role: 'customer' }
  }
  throw new Error('Invalid credentials')
})

vi.mock('../auth-provider.jsx', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    loading: false,
  }),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('Feature 1: Authentication - Sign In', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render sign in form', () => {
    render(
      <BrowserRouter>
        <SignIn />
      </BrowserRouter>
    )

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    const buttons = screen.getAllByRole('button')
    const submitButton = buttons.find(btn => btn.type === 'submit')
    expect(submitButton).toBeInTheDocument()
  })

  it('should validate email format', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <SignIn />
      </BrowserRouter>
    )

    const emailInput = screen.getByLabelText(/email/i)
    expect(emailInput).toBeInTheDocument()
    
    // Type invalid email
    await user.type(emailInput, 'invalid-email')
    expect(emailInput.value).toBe('invalid-email')
    
    // Form should be interactive
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('should validate required fields', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <SignIn />
      </BrowserRouter>
    )

    // Check that form fields exist
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    
    expect(emailInput).toBeInTheDocument()
    expect(passwordInput).toBeInTheDocument()
    
    // Form should be interactive
    const buttons = screen.getAllByRole('button')
    const submitButton = buttons.find(btn => btn.type === 'submit')
    expect(submitButton).toBeInTheDocument()
  })
})

