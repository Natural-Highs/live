# Testing

> **TL;DR**: `bun run test` for unit tests (Vitest), `bun run test:e2e` for E2E (Playwright). Tests co-locate with source in `src/`, fixtures in `tests/`.

## Quick Reference

| Command | Purpose |
|---------|---------|
| `bun run test` | Unit tests (watch mode) |
| `bun run test:ci` | Unit tests (single run) |
| `bun run test:e2e` | E2E tests (UI mode) |
| `bun run test:e2e:ci` | E2E tests (headless) |
| `bun run validate` | lint + test:ci + test:e2e:ci |

## Best Practices

- **Naming**: Describe behavior (`returns true for valid email`) not implementation
- **AAA Pattern**: Arrange → Act → Assert
- **Isolation**: `beforeEach` clears mocks, `afterEach` cleans test data
- **Co-location**: Unit tests next to source (`Button.test.tsx` beside `button.tsx`)

## Test Organization

```text
tests/
├── e2e/              # Playwright E2E tests
├── fixtures/         # Session, auth, Firestore helpers
└── factories/        # Test data builders

src/
└── components/
    └── Button.test.tsx   # Co-located unit tests
```

## Vitest (Unit Tests)

Config: See [`vitest.config.ts`](../vitest.config.ts). Key settings: `environment: 'happy-dom'`, coverage threshold 70%.

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
| `tests/fixtures/session.fixture.ts` | Create authenticated sessions |
| `tests/fixtures/firestore.fixture.ts` | Seed/cleanup Firestore data |
| `tests/factories/user.factory.ts` | Generate test user data |

Use `mergeTests()` from `@playwright/test` to compose fixtures.

## Firebase Emulators

E2E tests run against local emulators. Start with `bun run emulators`:
- Auth: `localhost:9099`
- Firestore: `localhost:8080`
- UI: `localhost:4000`

## Coverage

| Scope | Threshold |
|-------|-----------|
| Global | 70% |
| `lib/queries/` | 100% |
| `server/functions/utils/` | 100% |

Run `bun run test:ci --coverage` to view HTML report.

---

_Previous: [Components](07-components) | Next: [Deployment](09-deployment)_
