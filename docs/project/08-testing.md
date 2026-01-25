# Testing

> **TL;DR**: `bun run test` for unit tests (Vitest), `bun run test:e2e` for E2E (Playwright), `bun run test:integration` for integration tests (real emulators). Tests co-locate with source in `src/`, fixtures in `src/tests/`.

## Quick Reference

| Command | Purpose |
|---------|---------|
| `bun run dev` | Start emulators + dev server |
| `bun run dev:cloud` | Dev with real Firebase (Doppler) |
| `bun run emulators` | Start Firebase emulators only |
| `bun run seed:test-data` | Seed test scenarios |
| `bun run test` | Unit tests (watch mode) |
| `bun run test:ci` | Unit tests (single run) |
| `bun run test:e2e` | E2E tests (UI mode) |
| `bun run test:e2e:ci` | E2E tests (headless) |
| `bun run test:integration` | Integration tests (requires emulators) |
| `bun run test:integration:ci` | Integration tests (CI mode) |
| `bun run validate` | lint + test:ci + test:e2e:ci |

## Best Practices

- **Naming**: Describe behavior (`returns true for valid email`) not implementation
- **AAA Pattern**: Arrange → Act → Assert
- **Isolation**: `beforeEach` clears mocks, `afterEach` cleans test data
- **Co-location**: Unit tests next to source (`Button.test.tsx` beside `button.tsx`)

## Test Organization

```text
src/
├── tests/
│   ├── e2e/              # Playwright E2E tests (may use mocks)
│   ├── integration/      # Integration tests (real emulators, no mocks)
│   │   ├── fixtures/     # Firebase, OOB Code, WebAuthn fixtures
│   │   ├── magic-link.integration.ts
│   │   ├── passkey.integration.ts
│   │   └── session.integration.ts
│   ├── fixtures/         # Session, auth, Firestore helpers
│   └── factories/        # Test data builders
└── components/
    └── Button.test.tsx   # Co-located unit tests
```

## Vitest (Unit Tests)

Config: See [`vite.config.ts`](../../vite.config.ts) `test` section. Key settings: `environment: 'happy-dom'`, coverage threshold 70%.

```typescript
// Basic test
import {formatDate} from './utils'

describe('formatDate', () => {
  it('formats ISO date to readable string', () => {
    expect(formatDate('2024-01-15')).toBe('January 15, 2024')
  })
})
```

<details>
<summary>Component testing example</summary>

```typescript
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {Button} from './button'

describe('Button', () => {
  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalled()
  })
})
```

</details>

<details>
<summary>Mocking patterns</summary>

```typescript
// Mock module
vi.mock('@/lib/firebase/firebase', () => ({
  auth: {currentUser: {uid: 'test-uid'}}
}))

// Mock function
const mockFetch = vi.fn().mockResolvedValue({data: []})

// Spy
const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
```

</details>

**Globals available** (no imports): `describe`, `it`, `expect`, `vi`, `beforeEach`, `afterEach`

## Playwright (E2E Tests)

Config: See [`playwright.config.ts`](../playwright.config.ts). Runs against `localhost:3000` with Firebase emulators.

```typescript
import {test, expect} from '@playwright/test'

test('shows login page for unauthenticated users', async ({page}) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL('/authentication')
})
```

<details>
<summary>Authenticated test with fixtures</summary>

```typescript
import {test, expect} from '@playwright/test'
import {createAuthenticatedSession} from '../fixtures/session.fixture'

test.beforeEach(async ({page}) => {
  await createAuthenticatedSession(page, {userId: 'test-user'})
})

test('displays user profile', async ({page}) => {
  await page.goto('/profile')
  await expect(page.locator('h1')).toContainText('Profile')
})
```

</details>

<details>
<summary>Page Object pattern</summary>

```typescript
export class LoginPage {
  constructor(private page: Page) {}
  async goto() { await this.page.goto('/authentication') }
  async login(email: string, password: string) {
    await this.page.fill('[name="email"]', email)
    await this.page.fill('[name="password"]', password)
    await this.page.click('button[type="submit"]')
  }
}
```

</details>

## Fixtures and Factories

| File | Purpose |
|------|---------|
| `src/tests/fixtures/session.fixture.ts` | Create authenticated sessions |
| `src/tests/fixtures/firestore.fixture.ts` | Seed/cleanup Firestore data |
| `src/tests/factories/user.factory.ts` | Generate test user data |
| `src/tests/integration/fixtures/firebase.fixture.ts` | Firebase emulator health check and cleanup |
| `src/tests/integration/fixtures/oob-codes.fixture.ts` | OOB Code API for magic link testing |
| `src/tests/integration/fixtures/webauthn.fixture.ts` | CDP virtual authenticator for passkeys |

Use `mergeTests()` from `@playwright/test` to compose fixtures.

## Integration Tests

Integration tests verify real infrastructure behavior without mocking. Located in `src/tests/integration/`.

### Key Differences from E2E Tests

| Aspect | Integration Tests | E2E Tests |
|--------|------------------|-----------|
| Firebase | Real emulators | May use mocks |
| WebAuthn | Virtual authenticator via CDP | Mocked responses |
| Session | Real cookie handling | Session injection |
| Purpose | Infrastructure correctness | User flow verification |

### Running Integration Tests

```bash
# Start emulators first (required)
bun run emulators

# Run integration tests (in another terminal)
bun run test:integration
```

### Integration Test Fixtures

1. **Firebase Fixture** (`firebase.fixture.ts`):
   - Health checks Auth (9099) and Firestore (8180) emulators
   - Auto-cleans data before/after each test
   - Verifies SESSION_SECRET is set

2. **OOB Code Fixture** (`oob-codes.fixture.ts`):
   - Fetches magic link codes via emulator REST API
   - Polling with exponential backoff for async code generation
   - No real emails sent

3. **WebAuthn Fixture** (`webauthn.fixture.ts`):
   - Creates virtual authenticator via Chrome CDP
   - CTAP2 protocol with resident key support
   - Requires Chromium browser

### Example Integration Test

```typescript
import {mergeTests} from '@playwright/test'
import {test as firebaseTest} from './fixtures/firebase.fixture'
import {test as oobTest, expect} from './fixtures/oob-codes.fixture'

const test = mergeTests(firebaseTest, oobTest)

test('complete magic link flow with real emulator', async ({
  page,
  getMagicLinkCode,
  clearAllTestData
}) => {
  // Tests run against real Firebase Auth emulator
  await page.goto('/authentication')
  await page.fill('[name="email"]', 'test@example.com')
  await page.click('button[type="submit"]')

  // Fetch OOB code via emulator API (no email sent)
  const magicLink = await getMagicLinkCode('test@example.com')

  // Complete sign-in with real WebAuthn verification
  await page.goto(magicLink)
  await expect(page).toHaveURL('/dashboard')
})
```

## Emulator-First Testing

All local development and testing uses Firebase emulators by default. This ensures tests run against real Firebase behavior without mocking.

### Starting Development

```bash
# Single command starts emulators + dev server
bun run dev

# Or manually in separate terminals:
bun run emulators        # Terminal 1: Start emulators
bun run dev:cloud        # Terminal 2: Dev with real Firebase (when needed)
```

### Emulator Ports

- Auth: `localhost:9099`
- Firestore: `localhost:8180`
- UI: `localhost:4000`

### Seeding Test Data

```bash
# Seed all scenarios
bun run seed:test-data

# Seed specific scenario
bun run seed:test-data admin-with-guests
```

Available scenarios:
- `admin-with-guests` - Active event with 3 guest check-ins
- `user-with-history` - Registered user with past event attendance
- `empty-event` - Active event with no check-ins

### Dev Auth Bypass

Navigate to `/dev/auth` during local development for quick role-based login:
- **Admin** - Full admin access
- **User** - Standard user dashboard
- **Guest** - Guest check-in flow

Note: This route returns 404 in production.

## Anti-Patterns

### DO NOT create REST wrappers for mocking

```typescript
// BAD: REST wrapper for mocking
// src/routes/api/guests.ts
export const handler = async (req) => {
  const result = await listGuestsForEvent({data: {eventId: req.query.eventId}})
  return new Response(JSON.stringify(result))
}

// Then in tests:
await page.route('/api/guests*', async route => {
  await route.fulfill({json: mockData})
})
```

This pattern:
- Breaks type-safety by adding an unnecessary HTTP layer
- Creates maintenance burden (two code paths)
- Diverges from real production behavior

### DO use emulator fixtures

```typescript
// GOOD: Direct server function with emulator fixtures
import {createTestEvent, createTestGuest} from '../fixtures/firestore.fixture'

test.beforeEach(async () => {
  await createTestEvent({
    id: 'test-event',
    name: 'Test Event',
    eventCode: '1234',
    isActive: true
  })
  await createTestGuest({
    firstName: 'Derek',
    lastName: 'Jeter',
    eventId: 'test-event'
  })
})

test('displays guest list', async ({page}) => {
  await page.goto('/admin/guests')
  await expect(page.getByText('Derek Jeter')).toBeVisible()
})
```

## Infrastructure Stability

### Parallel Worker Data Isolation

E2E tests use `workerInfo.workerIndex` with worker-scoped fixtures for data isolation:

```typescript
import {test, expect} from '../fixtures'

test('creates isolated data', async ({page, workerPrefix}) => {
  const userId = `${workerPrefix}__user-1`     // "w0__user-1" or "w1__user-1"
  const eventId = `${workerPrefix}__event-1`   // "w0__event-1"
})
```

Worker-scoped fixtures run cleanup once per worker (not per test), following Playwright's recommended pattern. Tests within a worker run sequentially, so no intra-worker collision is possible.

**Why not per-test isolation?** Per-test cleanup causes excessive REST calls to the emulator (~25x more than worker-scoped), leading to ECONNRESET errors under load.

### Emulator Health Check

Global setup in `playwright.global-setup.ts` verifies emulators before tests:
- Auth emulator: `127.0.0.1:9099`
- Firestore emulator: `127.0.0.1:8180`
- Timeout: 60s (configurable via `CI_EMULATOR_TIMEOUT`)
- Exponential backoff: 100ms → 5s cap

### Retry Logic for Transient Failures

Retryable seed functions handle ECONNRESET errors:

```typescript
import {createTestUserWithRetry, createTestEventWithRetry} from '../fixtures'

// 3 retries with 100ms/200ms/400ms exponential backoff
await createTestEventWithRetry({id: 'event-1', ...})
await createTestUserWithRetry('user-1', {...})
```

Retryable errors: `ECONNRESET`, `ETIMEDOUT`, `ECONNREFUSED`, `socket hang up`, `fetch failed`

### CI Configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| Workers per shard | 2 | Balanced parallelism vs emulator load |
| Shards | 4 | Separate emulator instances per runner |
| Emulator timeout | 90s | Cold start allowance in CI |
| Flakiness threshold | <2% | Validated via burn-in testing |
| Target time | <4 min/shard | With 2 workers enabled |

### Burn-In Testing

```bash
# Run 10 iterations to validate stability
./scripts/burn-in.sh 10

# Results in .build/burn-in-results.json
# Must pass with <2% flakiness before merge
```

## Coverage

| Scope | Threshold |
|-------|-----------|
| Global | 70% |
| `lib/queries/` | 100% |
| `server/functions/utils/` | 100% |

Run `bun run test:ci --coverage` to view HTML report.

---

_Previous: [Components](07-components) | Next: [Deployment](09-deployment)_
