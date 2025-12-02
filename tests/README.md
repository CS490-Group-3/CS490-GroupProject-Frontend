# Frontend Test Suite

## Overview
Comprehensive test suite for the React frontend with 70% code coverage target.

## Test Structure
- `unit/` - Unit tests for components and utilities (Vitest + React Testing Library)
- `e2e/` - End-to-end tests (Playwright)

## Running Tests

### Install Dependencies
```bash
npm install
```

### Unit Tests
```bash
# Run once
npm test

# Watch mode
npm test -- --watch

# With coverage
npm run test:coverage

# UI mode
npm run test:ui
```

### E2E Tests
```bash
# Run all E2E tests
npm run test:e2e

# UI mode (interactive)
npm run test:e2e:ui

# Run specific test
npx playwright test tests/e2e/auth.spec.js
```

## Coverage Reports
Coverage reports are generated in `coverage/` directory:
- HTML: `coverage/index.html`
- LCOV: `coverage/lcov.info` (for CI/CD)

## CI/CD
Tests run automatically on push/PR via GitHub Actions (`.github/workflows/tests.yml`)

## Writing Tests

### Component Tests
```javascript
import { render, screen } from '@testing-library/react'
import { Button } from '@/shared/ui/button'

test('renders button', () => {
  render(<Button>Click me</Button>)
  expect(screen.getByRole('button')).toBeInTheDocument()
})
```

### E2E Tests
```javascript
import { test, expect } from '@playwright/test'

test('user can login', async ({ page }) => {
  await page.goto('/auth/sign-in')
  await page.fill('input[type="email"]', 'test@example.com')
  await page.fill('input[type="password"]', 'password')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/.*dashboard/)
})
```

