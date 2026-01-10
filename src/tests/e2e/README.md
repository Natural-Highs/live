# E2E Testing Strategy

## Overview

This project uses a **two-tier testing strategy** to ensure comprehensive coverage while maintaining test reliability and performance.

| Layer | Purpose | Auth Approach | Mock Policy |
|-------|---------|---------------|-------------|
| **Integration** | Real infrastructure behavior | OOB API, WebAuthn CDP | Zero mocks |
| **E2E** | User journey verification | Session state reuse | Error simulation only |

## Mock Policy

### Acceptable Mocks (Error Simulation Only)

E2E tests may use `page.route()` mocks **only** for error simulation scenarios:

```typescript
// Network failure - ACCEPTABLE
await page.route('**/_serverFn/*', route => route.abort('failed'))

// Server error - ACCEPTABLE
await page.route('**/_serverFn/*', route =>
  route.fulfill({status: 500, body: 'Internal error'}))

// Timeout simulation - ACCEPTABLE
await page.route('**/_serverFn/*', async route => {
  await new Promise(r => setTimeout(r, 30000))
  route.abort('timedout')
})

// Firebase Auth errors (EXPIRED_OOB_CODE, etc.) - ACCEPTABLE
await page.route('**/identitytoolkit.googleapis.com/**', route =>
  route.fulfill({status: 400, body: JSON.stringify({error: {message: 'EXPIRED_OOB_CODE'}})}))
```

### Prohibited Patterns (Do NOT Use)

```typescript
// SUCCESS PATH MOCKS - NOT ALLOWED
// Server functions hit Firestore emulator directly
await page.route('**/api/events', route =>
  route.fulfill({status: 200, body: JSON.stringify([...])}))  // DON'T DO THIS

await page.route('**/_serverFn/*', route =>
  route.fulfill({status: 200, body: JSON.stringify({success: true})}))  // DON'T DO THIS
```

### Why This Policy

The application follows TanStack Start patterns:
- **Routes call server functions directly** (not REST APIs)
- **Server functions hit Firebase emulators** during tests
- **No `/api/*` endpoints exist** - they were an antipattern

This means `page.route()` mocks for success paths are **dead code** - they intercept routes that are never called.

## Session State Reuse

Per Playwright best practices, E2E tests use **session cookie injection** for authenticated scenarios:

```typescript
import {injectSessionCookie} from '../fixtures/session.fixture'

test('authenticated user flow', async ({page, context}) => {
  // Session injection is acceptable per AC2
  await injectSessionCookie(context, testUser, {signedConsentForm: true})

  await page.goto('/dashboard')
  // Server functions hit Firestore emulator directly
})
```

This is acceptable because:
- Real authentication is tested in the integration layer
- E2E tests focus on user journey verification, not auth correctness
- Playwright docs recommend this pattern for test efficiency

## Firestore Seeding

For data scenarios, seed test data directly in the Firestore emulator:

```typescript
import {createTestEvent, clearFirestoreEmulator} from '../fixtures/firestore.fixture'
import {TEST_CODES} from '../factories'

test.beforeEach(async () => {
  await clearFirestoreEmulator()
  await createTestEvent({
    id: 'event-1',
    eventCode: TEST_CODES.VALID,
    name: 'Test Event',
    isActive: true
  })
})
```

## Available Fixtures

| Fixture | Location | Purpose |
|---------|----------|---------|
| `session.fixture` | `src/tests/fixtures/` | Session cookie injection |
| `admin.fixture` | `src/tests/fixtures/` | Admin user authentication |
| `firestore.fixture` | `src/tests/fixtures/` | Firestore data seeding |
| `firestore-seed.fixture` | `src/tests/integration/fixtures/` | Playwright-wrapped seeding |
| `webauthn.fixture` | `src/tests/integration/fixtures/` | Virtual authenticator via CDP |
| `oob-codes.fixture` | `src/tests/integration/fixtures/` | Magic link code retrieval |

## Running Tests

```bash
# Start Firebase emulators (required)
bun run emulators:start

# Run E2E tests
bun run test:e2e

# Run specific file
bunx playwright test src/tests/e2e/check-in.spec.ts

# Run with UI mode
bunx playwright test --ui
```

## Data Isolation for Parallel Workers

E2E tests support parallel workers via **worker-scoped** `workerPrefix` fixture:

```typescript
import {test, expect} from '../fixtures'

test('creates user document', async ({page, workerPrefix}) => {
  // Generate isolated ID: "w0__user-1" or "w1__user-1"
  const userId = `${workerPrefix}__user-1`

  // Seed data with isolated ID
  await createTestUser(userId, {displayName: 'Test User'})

  // Test runs without interfering with parallel workers
})
```

### Why Worker-Scoped Instead of Per-Test

The previous per-test isolation pattern (`testInfo.testId` prefix) caused problems:
- Per-test cleanup performed dozens of REST calls per test
- With 50 tests and 2 workers, this resulted in 50 cleanup cycles
- Excessive REST calls caused ECONNRESET errors

The worker-scoped pattern follows [Playwright's recommended approach](https://playwright.dev/docs/test-parallel#isolate-test-data-between-parallel-workers):
- Cleanup runs once per worker (~2 cycles), not per test (~50 cycles)
- Reduces REST calls by 25x
- Tests within a worker run sequentially (Playwright guarantee)

### Available Isolation Helpers

| Helper | Purpose | Example Output |
|--------|---------|----------------|
| `workerPrefix` | Worker-scoped prefix fixture | `w0`, `w1` |
| `isolatedDocId(baseId)` | Prefixed document ID | `w0__user-1` |
| `isolatedPath(basePath)` | Prefixed collection path | `w0__users` |
| `getWorkerPrefix(workerInfo)` | Direct function call | `w0` |

### Cleanup Behavior

The `workerCleanup` fixture automatically cleans data prefixed with the current worker's `workerInfo.workerIndex` at worker start. This ensures:
- No cross-worker data collisions
- Clean state for each worker
- Parallel execution with `--workers=2`
- Minimal emulator load (cleanup once per worker, not per test)

## CI Integration

E2E tests run in CI with Firebase emulators:
- Emulators start automatically in the `test-e2e` job
- Tests are sharded across 4 workers for parallelism
- Data isolation via `workerPrefix` enables `--workers=2` per shard
- Global setup health check ensures emulators are ready before tests
- Execution time target: <4 minutes per shard with 2 workers
- Flakiness threshold: <2%

## Mock Migration Summary

| Before | After |
|--------|-------|
| 82 `page.route()` mocks | 15 mocks |
| Success path + error mocks | Error simulation only |
| `/api/*` patterns | `/_serverFn/*` patterns |
| REST API assumptions | Server function reality |

**Note:** 2 success path mocks remain in `passkey.spec.ts` (see blockers in story file).

## Troubleshooting

### ECONNRESET / Connection Reset Errors

If tests fail intermittently with ECONNRESET or similar connection errors, the issue is typically a transient emulator instability:

**Symptoms:**
```
Error: ECONNRESET
Error: socket hang up
Error: fetch failed
```

**Root Cause:**
Firebase emulators occasionally drop connections under load, especially during parallel test execution or CI cold starts.

**Solutions:**

1. **Use retryable seed functions:**
   ```typescript
   import {createTestUserWithRetry, createTestEventWithRetry} from '../fixtures'

   test.beforeEach(async () => {
     // These automatically retry on ECONNRESET (3 attempts, exponential backoff)
     await createTestEventWithRetry({id: 'event-1', ...})
     await createTestUserWithRetry('user-1', {...})
   })
   ```

2. **Wrap custom operations with `withRetry`:**
   ```typescript
   import {withRetry} from '../fixtures'

   await withRetry(async () => {
     await customFirestoreOperation()
   })
   ```

3. **Health check in global setup:**
   The `playwright.global-setup.ts` waits for emulators with exponential backoff. If tests still fail:
   - Increase `CI_EMULATOR_TIMEOUT` (default: 60000ms)
   - Check emulator startup logs for errors

4. **CI-specific considerations:**
   - Emulator startup timeout is 90s in CI
   - 2 workers per shard balance parallelism vs emulator load
   - Sharding (4 shards) provides isolation at the runner level

### Health Check Failures

If tests fail with "Emulators not ready" error:

```
Error: Firebase emulators not ready after 60000ms
```

**Solutions:**
1. Verify emulators are running: `curl http://127.0.0.1:8180 && curl http://127.0.0.1:9099`
2. Check for port conflicts: `netstat -tulpn | grep -E '8180|9099'`
3. Restart emulators: `bun run emulators:stop && bun run emulators:start`
4. Increase timeout: `CI_EMULATOR_TIMEOUT=90000 bunx playwright test`

### Parallel Worker Data Collisions

If tests pass with `--workers=1` but fail with `--workers=2`:

**Symptoms:**
- Tests read stale or wrong data
- Random failures in data assertions
- "User not found" for seeded data

**Solutions:**
1. Use isolation helpers (`isolatedDocId`, `isolatedPath`) for all test data
2. Ensure all seed functions use prefixed IDs
3. Avoid global state in test setup
4. Check that cleanup only removes prefixed data
