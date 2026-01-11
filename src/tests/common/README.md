# Shared Test SDK

Common utilities for E2E and integration tests. Single source of truth for emulator configuration, seed functions, and type definitions.

## Architecture

```text
src/tests/common/
├── emulator-config.ts   # Centralized emulator configuration
├── index.ts             # Barrel exports
├── seed-functions.ts    # Firestore seed/cleanup functions
├── types.ts             # Shared type definitions
└── README.md            # This file
```

## Emulator Configuration

All emulator settings are defined in `emulator-config.ts`:

```typescript
import {EMULATOR_CONFIG, getEmulatorEnvironment} from '@/tests/common'

// Access config constants
EMULATOR_CONFIG.projectId     // 'naturalhighs'
EMULATOR_CONFIG.auth.host     // '127.0.0.1:9099'
EMULATOR_CONFIG.firestore.host // '127.0.0.1:8180'

// Apply to process.env before SDK init
applyEmulatorEnvironment()
```

The `demo-` prefix on project ID is required by Firebase emulators to distinguish from production.

## Seed Functions

### User Documents

```typescript
import {
  createTestUserDocument,
  createTestUser,
  deleteTestUserDocument,
  deleteTestUser
} from '@/tests/common'

// Create user with profile data
await createTestUserDocument({
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  dateOfBirth: '1995-06-15',
  profileComplete: true,
  signedConsentForm: true
})

// Create with minor demographics (subcollection)
await createTestUserDocument(userDoc, {
  pronouns: 'they/them',
  gender: 'non-binary'
})

// Cleanup
await deleteTestUserDocument('test-user-123')
```

### Events and Guests

```typescript
import {
  createTestEvent,
  createTestGuest,
  deleteTestEvent,
  deleteTestGuest,
  deleteAllTestEvents,
  deleteAllTestGuests
} from '@/tests/common'

// Create event
await createTestEvent({
  id: 'event-123',
  name: 'Community Session',
  eventCode: '1234',
  isActive: true
})

// Create guest linked to event
const guestId = await createTestGuest({
  firstName: 'Jane',
  lastName: 'Doe',
  eventId: 'event-123',
  consentSignature: 'Jane Doe'
})

// Cleanup
await deleteAllTestEvents()
await deleteAllTestGuests()
```

### Survey Responses

```typescript
import {
  createTestResponse,
  deleteTestResponse,
  deleteAllTestResponses
} from '@/tests/common'

await createTestResponse({
  userId: 'user-123',
  eventId: 'event-456',
  surveyType: 'pre',
  responses: {
    'question-1': 5,
    'question-2': 'Very satisfied'
  }
})
```

## Emulator Health Checks

```typescript
import {
  isFirestoreEmulatorAvailable,
  waitForFirestoreEmulator,
  ensureEmulatorConnected
} from '@/tests/common'

// Check if available (non-blocking)
const available = await isFirestoreEmulatorAvailable()

// Wait with retries (for test setup)
await waitForFirestoreEmulator({
  maxAttempts: 30,
  retryDelayMs: 2000,
  timeoutMs: 60000
})

// Throw if not connected (fail-fast)
await ensureEmulatorConnected()
```

## Parallel Test Isolation

E2E tests run with `fullyParallel: true`. Use worker prefixes to prevent data collisions:

```typescript
test('my test', async ({workerPrefix}) => {
  // GOOD - Worker-isolated document IDs
  await createTestUser(`${workerPrefix}__user-1`, {...})
  await createTestEvent({
    id: `${workerPrefix}__event-1`,
    ...
  })

  // BAD - Will collide with other workers
  await createTestUser('user-1', {...})
})
```

Integration tests run sequentially (`fullyParallel: false`) so prefixes are optional but recommended.

## Cleanup

```typescript
import {
  clearFirestoreEmulator,
  cleanupTestApp
} from '@/tests/common'

// Clear all data (use in afterAll)
await clearFirestoreEmulator()

// Cleanup Firebase app instance
await cleanupTestApp()
```

## Types

```typescript
import type {
  TestUserDocument,
  MinorDemographicsData,
  TestEventDocument,
  TestGuestDocument,
  TestGuestEventDocument,
  TestResponseDocument
} from '@/tests/common'
```

## Integration with Fixtures

E2E fixtures (`src/tests/fixtures/`) re-export from common:

```typescript
// firestore.fixture.ts re-exports everything
import {createTestUserDocument} from '../fixtures/firestore.fixture'

// Or import directly from common
import {createTestUserDocument} from '../common'
```

Integration fixtures (`src/tests/integration/fixtures/`) use common directly:

```typescript
import {EMULATOR_CONFIG, getTestDb} from '../../common'
```
