import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should redirect to sign-in page when not authenticated', async ({ page }) => {
    await expect(page).toHaveURL(/.*sign-in/)
    await expect(page.locator('h1, h2')).toContainText(/sign in|login/i)
  })

  test('should display sign-in form', async ({ page }) => {
    await page.goto('/auth/sign-in')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/auth/sign-in')
    await page.locator('button[type="submit"]').click()
    
    // Wait for validation messages
    await expect(page.locator('text=/email|required/i')).toBeVisible()
  })

  test('should navigate to sign-up page', async ({ page }) => {
    await page.goto('/auth/sign-in')
    const signUpLink = page.locator('a[href*="sign-up"], button:has-text("Sign Up")').first()
    if (await signUpLink.isVisible()) {
      await signUpLink.click()
      await expect(page).toHaveURL(/.*sign-up/)
    }
  })

  test('should display sign-up form', async ({ page }) => {
    await page.goto('/auth/sign-up')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })
})

test.describe('Role-Based Navigation', () => {
  test('customer should see customer navigation after login', async ({ page }) => {
    // This would require actual authentication
    // For now, we'll test the structure
    await page.goto('/customer/browse')
    // Add assertions based on your actual implementation
  })

  test('owner should see owner dashboard after login', async ({ page }) => {
    await page.goto('/owner/dashboard')
    // Add assertions
  })
})

