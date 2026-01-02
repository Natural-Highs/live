# Integration Tests

Integration tests verify real infrastructure behavior without mocking.

## Key Differences from E2E Tests

| Aspect | Integration Tests | E2E Tests |
|--------|------------------|-----------|
| Firebase | Real emulators | Often mocked |
| WebAuthn | Virtual authenticator via CDP | Mocked responses |
| Session | Real cookie handling | Session injection |
| Purpose | Infrastructure correctness | User flow verification |

## Running Integration Tests

```bash
# Local (emulators must be running)
bun run emulators  # In separate terminal
bun run test:integration

# CI (emulators auto-started)
bun run test:integration:ci
```

## Fixtures

- `firebase.fixture.ts` - Emulator connection and health check
- `oob-codes.fixture.ts` - Magic link OOB Code API
- `webauthn.fixture.ts` - Virtual authenticator via CDP

## Architecture

Integration tests sit between unit tests and E2E tests in the test pyramid:

```text
          E2E (10%)
      Integration (25%)
        Unit (60%)
```
