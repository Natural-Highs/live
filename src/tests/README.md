# Test Architecture

This directory contains the test suite for the Natural Highs application.

## Directory Structure

```text
src/tests/
├── e2e/                    # Playwright E2E tests
│   ├── *.spec.ts           # Test specifications
├── factories/              # Test data factories
│   ├── index.ts            # Barrel export for all factories
│   ├── events.factory.ts   # Event data factories
│   ├── surveys.factory.ts  # Survey data factories
│   └── user.factory.ts     # User data factories
├── fixtures/               # Playwright fixtures
│   ├── index.ts            # Merged fixture with all capabilities
│   ├── auth.fixture.ts     # Authentication fixtures
│   ├── admin.fixture.ts    # Admin authentication fixtures
│   ├── events.fixture.ts   # Event-related fixtures
│   ├── network.fixture.ts  # Network mocking (MockApiHelper)
│   ├── session.fixture.ts  # Session cookie injection
│   ├── firestore.fixture.ts       # Firestore data seeding
│   └── firebase-reset.fixture.ts  # Auto-cleanup fixture
├── firestore/              # Firestore security rules tests
├── performance/            # Performance tests
└── README.md               # This file
```

## Quick Start

```bash
# Run all E2E tests
bun run test:e2e

# Run tests in headed mode
bun run test:e2e:headed

# Run specific test file
bunx playwright test src/tests/e2e/check-in.spec.ts

# Run unit tests
bun run test

# Run with coverage
bun run test:coverage
```

---

## Fixture Composition Pattern

Use `mergeTests()` to compose fixtures. Import from `src/tests/fixtures` for full access:

```typescript
import {test, expect} from '../fixtures'

test('user can check in', async ({
  page,
  authenticatedUser,      // From auth.fixture
  mockActiveEvent,        // From events.fixture
  mockEventCodeValidation,// From events.fixture
  mockApi,                // From network.fixture (MockApiHelper)
  autoCleanFirestore      // From firebase-reset.fixture (auto)
}) => {
  await mockEventCodeValidation(mockActiveEvent)
  await page.goto('/check-in')
  // ... assertions
})
```

### Available Fixtures

| Fixture | Source | Description |
|---------|--------|-------------|
| `authenticatedUser` | auth.fixture | Pre-authenticated user with session cookie |
| `setMagicLinkEmail` | auth.fixture | Set email in localStorage for magic link |
| `mockSuccessfulMagicLinkSignIn` | auth.fixture | Mock Firebase auth success |
| `mockFailedMagicLinkSignIn` | auth.fixture | Mock Firebase auth failure |
| `adminUser` | admin.fixture | Pre-authenticated admin user |
| `mockActiveEvent` | events.fixture | Mock event with valid code |
| `mockEventCodeValidation` | events.fixture | Mock event code API |
| `mockEventCheckIn` | events.fixture | Mock check-in API |
| `mockApi` | network.fixture | MockApiHelper for typed mocking |
| `autoCleanFirestore` | firebase-reset.fixture | Auto-clears Firestore (runs automatically) |

### Selective Composition

For specific needs, import individual fixtures:

```typescript
import {test as adminTest} from '../fixtures/admin.fixture'
import {mergeTests} from '@playwright/test'

// Combine specific fixtures
const test = mergeTests(adminTest, customFixture)
```

---

## Factory Pattern

All factories follow: `create{Entity}(overrides?: Partial<T>): T`

```typescript
import {createUser, createEvent, createActiveEvent} from '../factories'

// Default values
const user = createUser()

// With overrides
const specificUser = createUser({
  email: 'maya@example.com',
  displayName: 'Maya'
})

// Specialized factories
const activeEvent = createActiveEvent({code: '1234'})
const adminUser = createAdminUser()
```

### Factory Properties

- **Pure functions**: No side effects, can be used in unit tests
- **Partial overrides**: Override any field while keeping defaults
- **Faker integration**: Realistic random data
- **Deterministic**: Seed faker for reproducible tests

---

## Network Mocking Pattern

### MockApiHelper (Recommended)

Typed, chainable API for network mocking:

```typescript
test('mocks API response', async ({page, mockApi}) => {
  // FIRST: Set up mocks BEFORE navigation
  await mockApi
    .onGet('/api/events')
    .respondWith([{id: 1, name: 'Event'}])

  await mockApi
    .onPost('/api/check-in')
    .respondWith({success: true})

  // THEN: Navigate
  await page.goto('/events')
})
```

### MockApiHelper Methods

```typescript
// HTTP methods
mockApi.onGet(pattern)    // GET requests
mockApi.onPost(pattern)   // POST requests
mockApi.onPut(pattern)    // PUT requests
mockApi.onPatch(pattern)  // PATCH requests
mockApi.onDelete(pattern) // DELETE requests

// Response types
.respondWith(body)                    // 200 OK
.respondWith(body, {status: 201})     // Custom status
.respondWith(body, {delay: 500})      // Delayed response
.respondWithError(404, {error: 'x'})  // Error response
.abort('timedout')                    // Network failure

// Utilities
mockApi.waitForRequest('/api/events')   // Wait for request
mockApi.waitForResponse('/api/events')  // Wait for response
```

### Intercept-Before-Navigate Pattern

**CRITICAL**: Always set up route handlers BEFORE navigation to avoid race conditions:

```typescript
// CORRECT
await mockApi.onGet('/api/data').respondWith({items: []})
await page.goto('/dashboard')

// WRONG - Race condition!
await page.goto('/dashboard')
await mockApi.onGet('/api/data').respondWith({items: []})
```

---

## Session Cookie Injection

For authenticated tests, inject session cookies before navigation:

```typescript
import {injectSessionCookie, injectAdminSessionCookie} from '../fixtures'

test('authenticated user flow', async ({page, context}) => {
  // Inject user session
  await injectSessionCookie(context, {
    uid: 'test-user-123',
    email: 'user@example.com',
    displayName: 'Test User'
  }, {
    signedConsentForm: true,
    profileComplete: true
  })

  await page.goto('/dashboard')
})

test('admin flow', async ({page, context}) => {
  // Inject admin session (convenience wrapper)
  await injectAdminSessionCookie(context, {
    uid: 'admin-123',
    email: 'admin@naturalhighs.org',
    displayName: 'Admin'
  })

  await page.goto('/admin')
})
```

---

## Firebase Emulator Testing

### Auto-Cleanup Fixture

The `autoCleanFirestore` fixture runs automatically, clearing Firestore before each test:

```typescript
import {test} from '../fixtures'

// autoCleanFirestore runs automatically - no explicit call needed
test('creates fresh data', async ({page}) => {
  // Firestore is already empty
})
```

### Manual Data Seeding

For tests requiring specific Firestore data:

```typescript
import {
  createTestUserDocument,
  deleteTestUserDocument,
  injectAuthenticatedUser,
  clearAuthenticatedUser
} from '../fixtures'

test('user with profile', async ({page, context}) => {
  const uid = 'test-user-123'

  // Create session + user document together
  await injectAuthenticatedUser(context, {
    uid,
    email: 'test@example.com',
    displayName: 'Test User'
  }, {
    signedConsentForm: true,
    profileComplete: true
  }, {
    dateOfBirth: '1995-06-15',
    pronouns: 'they/them'
  })

  await page.goto('/settings/profile')

  // Cleanup
  await clearAuthenticatedUser(context, uid)
})
```

---

## Anti-Patterns to Avoid

### DO NOT use waitForTimeout

```typescript
// WRONG - Arbitrary delays cause flaky tests
await page.waitForTimeout(500)

// CORRECT - Wait for specific conditions
await expect(page.getByTestId('modal')).toBeVisible()
await page.waitForLoadState('networkidle')
await expect(page.getByTestId('button')).toBeEnabled()
```

### DO NOT use CSS/ID selectors for interactions

```typescript
// WRONG - Fragile selectors
await page.locator('.btn-primary').click()
await page.locator('#submit-btn').click()

// CORRECT - Semantic selectors
await page.getByTestId('submit-button').click()
await page.getByRole('button', {name: /submit/i}).click()
```

### DO NOT share mutable state between tests

```typescript
// WRONG - Tests affect each other
let sharedUser: User
beforeAll(() => { sharedUser = createUser() })

// CORRECT - Fresh state per test
test('test 1', async ({authenticatedUser}) => {
  // authenticatedUser is fresh
})
```

### DO NOT skip cleanup

```typescript
// WRONG - Leaks state to other tests
await createTestUserDocument(user)
// ... test without cleanup

// CORRECT - Always clean up
await createTestUserDocument(user)
try {
  // ... test
} finally {
  await deleteTestUserDocument(user.uid)
}

// OR use fixtures that auto-cleanup
test('auto-cleaned', async ({authenticatedUser}) => {
  // authenticatedUser fixture handles cleanup
})
```

---

## Selector Priority

Use selectors in this priority order:

1. **`getByTestId`** - For custom test hooks (`data-testid` attributes)
2. **`getByRole`** - For semantic elements (buttons, headings, links)
3. **`getByPlaceholder`** - For form inputs
4. **`getByLabel`** - For labeled form elements
5. **`getByText`** - For content verification (not interactions)

```typescript
// Preferred: Test ID for custom elements
await page.getByTestId('event-code-input').fill('1234')

// Good: Role for semantic elements
await page.getByRole('button', {name: /submit/i}).click()

// Good: Placeholder for inputs
await page.getByPlaceholder(/email/i).fill('test@example.com')

// OK: Text for verification (not clicks)
await expect(page.getByText('Welcome back')).toBeVisible()
```

---

## Test Structure Template

```typescript
import {test, expect} from '../fixtures'

test.describe('Feature Name', () => {
  test.describe('AC1: Acceptance Criteria Description', () => {
    test('should do expected behavior', async ({
      page,
      authenticatedUser,
      mockApi
    }) => {
      // GIVEN: Initial state
      await mockApi.onGet('/api/data').respondWith({items: []})

      // WHEN: User action
      await page.goto('/feature')
      await page.getByTestId('action-button').click()

      // THEN: Expected outcome
      await expect(page.getByTestId('result')).toBeVisible()
      await expect(page.getByTestId('result')).toHaveText('Success')
    })

    test('should handle error case', async ({page, mockApi}) => {
      // GIVEN: Error condition
      await mockApi.onGet('/api/data').respondWithError(500, {error: 'Server error'})

      // WHEN: User navigates
      await page.goto('/feature')

      // THEN: Error is shown
      await expect(page.getByTestId('error-message')).toBeVisible()
    })
  })
})
```

---

## Running Specific Tests

```bash
# By file
bunx playwright test src/tests/e2e/check-in.spec.ts

# By test name pattern
bunx playwright test --grep "check-in"

# In debug mode
bunx playwright test --debug

# With specific browser
bunx playwright test --project=chromium

# With UI mode
bunx playwright test --ui
```

---

## Coverage

For unit tests (Vitest):

```bash
bun run test:coverage
```

Coverage reports are generated in `.build/coverage/`.

---

## Troubleshooting

### Tests are flaky

1. Replace `waitForTimeout` with explicit waits
2. Check for race conditions in API mocking (use intercept-before-navigate)
3. Ensure tests don't share mutable state

### Firestore tests fail

1. Ensure Firebase emulator is running: `bun run emulators`
2. Check `FIRESTORE_EMULATOR_HOST` environment variable

### Session injection doesn't work

1. Ensure `SESSION_SECRET_TEST` is set in playwright.config.ts
2. Inject cookies BEFORE navigation
3. Check cookie domain matches test URL

### Mock API not intercepting

1. Set up route handlers BEFORE `page.goto()`
2. Check URL pattern matches actual request URL
3. Use `mockApi.waitForRequest()` to debug

---

<<<<<<< HEAD
Last Updated: 2025-12-26
=======
_Last Updated: 2025-12-26_
>>>>>>> e4ef5165 (feat(tests): standardize test architecture with fixture composition)
