# Tests

This directory contains the test suite for the Natural Highs application.

## Directory Structure

```text
tests/
├── e2e/                    # Playwright E2E tests
│   ├── admin-events.spec.ts      # Admin event management tests (AC3, AC6)
│   ├── admin-export.spec.ts      # Admin export functionality tests (AC4, AC8)
│   ├── check-in.spec.ts          # User check-in flow tests (AC1, AC8)
│   ├── consent-form.spec.ts      # Consent form tests
│   ├── guest-check-in.spec.ts    # Guest check-in flow tests (AC2, AC6)
│   ├── magic-link.spec.ts        # Magic link authentication tests
│   ├── mobile-viewport.spec.ts   # Mobile viewport coverage tests (AC7)
│   └── profile-creation.spec.ts  # Profile creation flow tests (AC5, AC6)
├── factories/              # Test data factories
│   ├── events.factory.ts         # Event data factory functions
│   └── surveys.factory.ts        # Survey response factory functions
├── fixtures/               # Playwright fixtures
│   ├── admin.fixture.ts          # Admin authentication fixture
│   ├── auth.fixture.ts           # Base authentication fixture
│   ├── events.fixture.ts         # Event-related fixtures
│   └── session.fixture.ts        # Session cookie injection helpers
└── README.md               # This file
```

## Running Tests

### E2E Tests

```bash
# Run all E2E tests
bun run test:e2e

# Run tests in headed mode (see browser)
bun run test:e2e:headed

# Run a specific test file
bunx playwright test tests/e2e/check-in.spec.ts

# Run tests matching a pattern
bunx playwright test --grep "check-in"

# Run in debug mode
bunx playwright test --debug
```

### Unit Tests

```bash
# Run unit tests
bun run test

# Run in watch mode
bun run test:watch

# Run with coverage
bun run test:coverage
```

## Test Strategy

### E2E Test Patterns

E2E tests use Playwright and follow these patterns:

1. **API Mocking**: Tests mock API endpoints to isolate frontend behavior
2. **Data-testid Selectors**: All interactive elements use `data-testid` attributes for stability
3. **GIVEN-WHEN-THEN**: Tests follow the behavior-driven development format
4. **Fixtures**: Reusable test setup is extracted into fixtures

### Test Categories

| Category | Files | Description |
|----------|-------|-------------|
| Authentication | auth.fixture.ts, admin.fixture.ts | User and admin auth setup |
| Check-in Flows | check-in.spec.ts, guest-check-in.spec.ts | Event check-in journeys |
| Admin Features | admin-events.spec.ts, admin-export.spec.ts | Admin panel functionality |
| Profile | profile-creation.spec.ts | User profile creation |
| Mobile | mobile-viewport.spec.ts | Mobile device compatibility |

## Writing New Tests

### E2E Test Template

```typescript
import {expect, test} from '@playwright/test'

test.describe('Feature Name', () => {
  test('should do something', async ({page}) => {
    // GIVEN: Initial state
    await page.goto('/page')

    // WHEN: User action
    await page.getByTestId('button').click()

    // THEN: Expected outcome
    await expect(page.getByTestId('result')).toBeVisible()
  })
})
```

### Using Fixtures

```typescript
import {expect, test} from '../fixtures/auth.fixture'

test('authenticated user can access page', async ({authenticatedPage}) => {
  await authenticatedPage.goto('/dashboard')
  await expect(authenticatedPage.getByTestId('dashboard')).toBeVisible()
})
```

### Session Cookie Injection

For admin authentication tests, use the session fixture to inject encrypted session cookies:

```typescript
import {injectSessionCookie, injectAdminSessionCookie} from '../fixtures/session.fixture'

// Inject regular user session
await injectSessionCookie(context, {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User'
}, {signedConsentForm: true})

// Inject admin session (convenience wrapper)
await injectAdminSessionCookie(context, {
  uid: 'admin-user-123',
  email: 'admin@naturalhighs.org',
  displayName: 'Admin User'
})

// Then navigate
await page.goto('/events')
```

The session fixture uses iron-webcrypto to encrypt session data matching the production useAppSession() format. Key features:

- **Cookie name**: `nh-session` (matches production)
- **Encryption**: iron-webcrypto seal/unseal with same options as h3/TanStack Start
- **Session data**: `{userId, email, displayName, claims, env}`
- **Claims**: `{admin?: boolean, signedConsentForm?: boolean}`

The admin.fixture.ts combines session injection with a test user factory for convenience:

```typescript
import {expect, test} from '../fixtures/admin.fixture'

test('admin can access events page', async ({page, adminUser}) => {
  // adminUser fixture automatically injects admin session cookie
  await page.goto('/events')
  await expect(page.getByTestId('admin-events-page')).toBeVisible()
  
  // Access injected user data
  expect(adminUser.email).toBe('admin@naturalhighs.org')
})
```

### Creating Factories

```typescript
// factories/example.factory.ts
export function createExample(overrides = {}) {
  return {
    id: `example-${Date.now()}`,
    name: 'Default Name',
    ...overrides
  }
}
```

## Acceptance Criteria Coverage

| AC | Description | Test File |
|----|-------------|-----------|
| AC1 | Check-in Happy Path | check-in.spec.ts |
| AC2 | Guest Check-in Flow | guest-check-in.spec.ts |
| AC3 | Admin Event Creation | admin-events.spec.ts |
| AC4 | Admin Export Flow | admin-export.spec.ts |
| AC5 | Profile Creation Flow | profile-creation.spec.ts |
| AC6 | Error Handling Paths | Multiple files |
| AC7 | Mobile Viewport Coverage | mobile-viewport.spec.ts |
| AC8 | Performance Assertions | check-in.spec.ts, admin-export.spec.ts |

## Principles

1. **Avoid flaky tests**: Use explicit waits and assertions
2. **Keep tests independent**: Each test should run in isolation
3. **Use descriptive names**: Test names should explain what is being tested
4. **Mock external dependencies**: API calls should be mocked
5. **Test error cases**: Include negative path tests
6. **Mobile first**: Consider mobile viewport in all tests
