# Testing

Vitest for unit/integration tests, Playwright for E2E tests.

## Test Organization

```text
tests/
├── e2e/                    # Playwright E2E
│   ├── auth.spec.ts
│   ├── profile.spec.ts
│   └── check-in.spec.ts
├── fixtures/               # Test helpers
│   ├── session.fixture.ts
│   ├── auth.fixture.ts
│   └── firestore.fixture.ts
└── factories/              # Test data
    ├── user.factory.ts
    └── events.factory.ts

src/
├── components/
│   └── Button.test.tsx     # Co-located unit tests
└── lib/
    └── utils.test.ts
```

## Commands

| Command | Purpose |
|---------|---------|
| `bun run test` | Unit tests (watch mode) |
| `bun run test:ci` | Unit tests (single run) |
| `bun run test:e2e` | E2E tests (UI mode) |
| `bun run test:e2e:ci` | E2E tests (headless) |
| `bun run validate` | lint + test:ci + test:e2e:ci |

## Vitest (Unit Tests)

### Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      thresholds: {
        global: {lines: 70, branches: 70}
      }
    }
  }
})
```

### Basic Test

```typescript
// src/lib/utils.test.ts
import {formatDate} from './utils'

describe('formatDate', () => {
  it('formats ISO date to readable string', () => {
    expect(formatDate('2024-01-15')).toBe('January 15, 2024')
  })

  it('handles invalid input', () => {
    expect(() => formatDate('invalid')).toThrow()
  })
})
```

### Component Test

```typescript
// src/components/ui/Button.test.tsx
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {Button} from './button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)

    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalled()
  })

  it('disables when loading', () => {
    render(<Button disabled>Submit</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

### Mocking

```typescript
// Mock module
vi.mock('@/lib/firebase/firebase', () => ({
  auth: {currentUser: {uid: 'test-uid'}}
}))

// Mock function
const mockFetch = vi.fn().mockResolvedValue({data: []})
vi.mock('@/server/functions/users', () => ({
  getUsers: mockFetch
}))

// Spy on function
const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
expect(spy).toHaveBeenCalled()
spy.mockRestore()
```

### Available Globals

No imports needed:
- `describe`, `it`, `test`
- `expect`
- `vi` (mock utilities)
- `beforeEach`, `afterEach`
- `beforeAll`, `afterAll`

## Playwright (E2E Tests)

### Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'bun run dev:bare',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  }
})
```

### Basic E2E Test

```typescript
// tests/e2e/auth.spec.ts
import {test, expect} from '@playwright/test'

test.describe('Authentication', () => {
  test('shows login page for unauthenticated users', async ({page}) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/authentication')
  })

  test('redirects to dashboard after login', async ({page}) => {
    await page.goto('/authentication')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/dashboard')
  })
})
```

### Using Fixtures

```typescript
// tests/e2e/profile.spec.ts
import {test, expect} from '@playwright/test'
import {createAuthenticatedSession} from '../fixtures/session.fixture'

test.describe('Profile', () => {
  test.beforeEach(async ({page}) => {
    await createAuthenticatedSession(page, {
      userId: 'test-user',
      claims: {profileComplete: true}
    })
  })

  test('displays user profile', async ({page}) => {
    await page.goto('/profile')
    await expect(page.locator('h1')).toContainText('Profile')
  })
})
```

### Page Object Pattern

```typescript
// tests/e2e/pages/login.page.ts
import {Page} from '@playwright/test'

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/authentication')
  }

  async login(email: string, password: string) {
    await this.page.fill('[name="email"]', email)
    await this.page.fill('[name="password"]', password)
    await this.page.click('button[type="submit"]')
  }
}

// Usage
test('login flow', async ({page}) => {
  const loginPage = new LoginPage(page)
  await loginPage.goto()
  await loginPage.login('test@example.com', 'password')
})
```

## Test Fixtures

### Fixture Composition with mergeTests

Use `mergeTests()` from `@playwright/test` to compose fixtures:

```typescript
// tests/fixtures/index.ts
import {mergeTests} from '@playwright/test'
import {test as sessionTest} from './session.fixture'
import {test as firestoreTest} from './firestore.fixture'

// Compose fixtures for full integration testing
export const test = mergeTests(sessionTest, firestoreTest)
export {expect} from '@playwright/test'
```

### Session Fixture

```typescript
// tests/fixtures/session.fixture.ts
import {Page} from '@playwright/test'

interface SessionData {
  userId: string
  email?: string
  claims?: Record<string, boolean>
}

export async function createAuthenticatedSession(
  page: Page,
  data: SessionData
) {
  // Set session cookie directly
  await page.context().addCookies([{
    name: 'nh-session',
    value: encodeSession(data),
    domain: 'localhost',
    path: '/'
  }])
}
```

### Firestore Fixture

```typescript
// tests/fixtures/firestore.fixture.ts
import {adminDb} from '@/lib/firebase/firebase.admin'

export async function seedUser(uid: string, data: Partial<User>) {
  await adminDb().collection('users').doc(uid).set({
    email: 'test@example.com',
    displayName: 'Test User',
    createdAt: new Date(),
    ...data
  })
}

export async function cleanupTestData() {
  const batch = adminDb().batch()
  const users = await adminDb()
    .collection('users')
    .where('email', '>=', 'test-')
    .get()

  users.docs.forEach(doc => batch.delete(doc.ref))
  await batch.commit()
}
```

## Test Factories

```typescript
// tests/factories/user.factory.ts
let counter = 0

export function createUser(overrides: Partial<User> = {}): User {
  counter++
  return {
    uid: `test-user-${counter}`,
    email: `test-${counter}@example.com`,
    displayName: `Test User ${counter}`,
    createdAt: new Date().toISOString(),
    claims: {},
    ...overrides
  }
}
```

## Firebase Emulators

E2E tests run against Firebase emulators.

### Start Emulators

```bash
bun run emulators
```

Runs:
- Auth: `localhost:9099`
- Firestore: `localhost:8080`
- UI: `localhost:4000`

### Environment Setup

```typescript
// playwright.config.ts
const emulatorEnv = {
  VITE_USE_EMULATORS: 'true',
  USE_EMULATORS: 'true',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080'
}

export default defineConfig({
  use: {
    ...emulatorEnv
  }
})
```

## Coverage

### Thresholds

| Scope | Minimum |
|-------|---------|
| Global | 70% |
| `lib/queries/` | 100% |
| `server/functions/utils/` | 100% |

### View Coverage

```bash
bun run test:ci --coverage
```

Opens HTML report in browser.

## Best Practices

### Test Naming

```typescript
// Describe what, not how
describe('validateEmail', () => {
  it('returns true for valid email format')
  it('returns false for missing @ symbol')
  it('throws for empty string')
})
```

### Arrange-Act-Assert

```typescript
it('increments counter on click', async () => {
  // Arrange
  render(<Counter initial={0} />)

  // Act
  await userEvent.click(screen.getByRole('button'))

  // Assert
  expect(screen.getByText('1')).toBeInTheDocument()
})
```

### Isolation

```typescript
describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await cleanupTestData()
  })
})
```

---

_Previous: [Components](07-components) | Next: [Deployment](09-deployment)_
