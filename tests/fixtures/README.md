# Test Fixtures Architecture

This directory contains Playwright test fixtures for E2E testing with session-based authentication.

## Overview

The fixture architecture follows a layered pattern:

```text
session.fixture.ts   <- Foundation: Cookie encryption/injection
       ↑
firestore.fixture.ts <- Firestore document seeding
       ↑
auth.fixture.ts      <- Regular user authentication
       ↑
admin.fixture.ts     <- Admin user authentication (extends auth)
```

## Session-Based Authentication

All authenticated tests use server-side session cookies, matching the production authentication flow via `useAppSession()`.

### Key Components

| File | Purpose |
|------|---------|
| `session.fixture.ts` | Core session cookie utilities + Firestore integration |
| `firestore.fixture.ts` | Firestore document seeding for routes with loaders |
| `auth.fixture.ts` | Regular user fixtures + magic link helpers |
| `admin.fixture.ts` | Admin user fixtures with admin claims |

## Usage

### Basic Authenticated Test

```typescript
import {test, expect} from '../fixtures/auth.fixture'

test('authenticated user can access dashboard', async ({authenticatedUser, page}) => {
  // authenticatedUser fixture automatically injects session cookie
  await page.goto('/dashboard')
  expect(page.url()).not.toContain('/authentication')
})
```

### Admin Test

```typescript
import {test, expect} from '../fixtures/admin.fixture'

test('admin can access admin routes', async ({adminUser, page}) => {
  // adminUser fixture injects session with {admin: true, signedConsentForm: true}
  await page.goto('/admin-dashboard')
  expect(page.url()).toContain('/admin-dashboard')
})
```

### Manual Session Injection

For tests requiring custom session data:

```typescript
import {test} from '@playwright/test'
import {injectSessionCookie, clearSessionCookie, type TestUser} from '../fixtures/session.fixture'

test('custom session claims', async ({context, page}) => {
  const user: TestUser = {
    uid: 'custom-user-id',
    email: 'custom@example.com',
    displayName: 'Custom User'
  }

  await injectSessionCookie(context, user, {
    signedConsentForm: false,  // Test incomplete consent flow
    admin: false
  })

  await page.goto('/consent')
  // User should be on consent page since signedConsentForm is false

  // Cleanup
  await clearSessionCookie(context)
})
```

## Session Fixture API

### Types

```typescript
interface TestUser {
  uid: string
  email: string
  displayName: string
}

interface TestClaims {
  admin?: boolean
  signedConsentForm?: boolean
}

interface SessionData {
  userId: string
  email: string
  displayName: string
  claims: {admin?: boolean; signedConsentForm?: boolean}
  env: 'development' | 'staging' | 'production'
  sessionCreatedAt?: string
}
```

### Functions

| Function | Description |
|----------|-------------|
| `buildTestSessionCookie(user, claims)` | Creates encrypted session cookie value |
| `injectSessionCookie(context, user, claims)` | Injects session cookie into browser context |
| `injectAdminSessionCookie(context, user)` | Injects admin session (admin: true) |
| `clearSessionCookie(context)` | Removes session cookie from context |

## Magic Link Testing

For testing the Firebase magic link authentication flow (not session cookies):

```typescript
import {test} from '../fixtures/auth.fixture'

test('magic link sign-in', async ({
  page,
  setMagicLinkEmail,
  mockSuccessfulMagicLinkSignIn
}) => {
  const mockUser = {
    email: 'test@example.com',
    uid: 'test-uid',
    displayName: 'Test User',
    idToken: 'mock-token'
  }

  // Set email in localStorage (same-device flow)
  await setMagicLinkEmail(mockUser.email)

  // Mock Firebase auth to succeed
  await mockSuccessfulMagicLinkSignIn(mockUser)

  // Navigate to magic link URL
  await page.goto('/magic-link?oobCode=test-code&mode=signIn')

  // Verify successful sign-in...
})
```

## Environment Configuration

### Required Environment Variables

```bash
SESSION_SECRET=<32+ character secret>
```

### Playwright Configuration

The test environment uses a hardcoded test secret for consistency:

```typescript
// playwright.config.ts
export const SESSION_SECRET_TEST =
  'test-session-secret-32-characters-minimum-length-for-iron-webcrypto'

// Automatically injected into emulator environment
```

**Why Hardcoded?**

The test secret is intentionally hardcoded (not from Doppler or .env) for these reasons:

1. **No CI Dependencies**: Tests run in GitHub Actions without requiring Doppler access
2. **Consistency**: Same secret across all test runs (local and CI)
3. **Security Isolation**: Different from production SECRET (prevents accidental cross-environment session replay)
4. **Simplicity**: No environment variable management needed for E2E tests
5. **Iron-webcrypto Requirement**: Must be 32+ characters for encryption to work

**Production vs Test Secrets:**

| Environment | Secret Source | Purpose |
|-------------|--------------|---------|
| Production/Staging | Doppler `SESSION_SECRET` | Real user sessions (90-day expiry) |
| E2E Tests | Hardcoded `SESSION_SECRET_TEST` | Test session cookies (isolated) |

The hardcoded test secret is exported from `playwright.config.ts` and reused in `session.fixture.ts` to ensure cookie encryption matches server-side session validation during tests.

## Concurrent Session Testing

For testing multi-device scenarios:

```typescript
import {test} from '@playwright/test'
import {injectSessionCookie, clearSessionCookie} from '../fixtures/session.fixture'

test('two users can access simultaneously', async ({browser}) => {
  const contextA = await browser.newContext()
  const contextB = await browser.newContext()

  try {
    await injectSessionCookie(contextA, userA, claims)
    await injectSessionCookie(contextB, userB, claims)

    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    // Both can access protected routes
    await Promise.all([
      pageA.goto('/dashboard'),
      pageB.goto('/dashboard')
    ])

    // Sessions are isolated
  } finally {
    await clearSessionCookie(contextA)
    await clearSessionCookie(contextB)
    await contextA.close()
    await contextB.close()
  }
})
```

## Session Cookie Details

| Property | Value |
|----------|-------|
| Cookie Name | `nh-session` |
| Domain | `localhost` |
| Path | `/` |
| HttpOnly | `false` (in tests) |
| Secure | `false` (in tests) |
| SameSite | `Lax` |
| Encryption | iron-webcrypto (AES-256-CBC + HMAC-SHA-256) |

## Common Patterns

### Testing Access Control

```typescript
test('non-admin cannot access admin routes', async ({context, page}) => {
  await injectSessionCookie(context, user, {
    admin: false,
    signedConsentForm: true
  })

  await page.goto('/admin-dashboard')
  await page.waitForLoadState('networkidle')

  // Should be redirected away
  expect(page.url()).not.toContain('/admin-dashboard')
})
```

### Testing Unauthenticated Access

```typescript
test('unauthenticated user redirected to login', async ({page}) => {
  // No session injection

  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')

  expect(page.url()).toContain('/authentication')
})
```

### Testing Session Expiration

```typescript
test('clearing session logs user out', async ({context, page}) => {
  await injectSessionCookie(context, user, claims)
  await page.goto('/dashboard')

  // Clear session mid-test
  await clearSessionCookie(context)

  // Navigate to another protected route
  await page.goto('/profile')
  await page.waitForLoadState('networkidle')

  // Should be redirected to auth
  expect(page.url()).toContain('/authentication')
})
```

## Migration from localStorage

Previously, tests used `testAuthState` in localStorage. This pattern has been removed:

```typescript
// OLD (deprecated) - DO NOT USE
localStorage.setItem('testAuthState', JSON.stringify({
  isAuthenticated: true,
  user: {...}
}))

// NEW - Use session cookie injection
await injectSessionCookie(context, user, claims)
```

## Troubleshooting

### Session Not Recognized

1. Verify `SESSION_SECRET` matches between test and server
2. Check cookie domain matches app domain (`localhost`)
3. Ensure cookie is injected before navigation

### TypeScript Errors

Import types explicitly:

```typescript
import type {TestUser, TestClaims} from '../fixtures/session.fixture'
```

### Session Data Mismatch

The session data structure must match `SessionData` in `src/lib/session.ts`:

```typescript
{
  userId: string
  email: string
  displayName: string
  claims: {admin?: boolean; signedConsentForm?: boolean}
  env: 'development' | 'staging' | 'production'
}
```
