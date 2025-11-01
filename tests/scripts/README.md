# Test Scripts - Natural Highs API

This directory contains automated test scripts for the Natural Highs API backend.

## Script Overview

### Public Endpoint Tests

**`test-public-endpoints.sh`**
- Tests all publicly accessible endpoints
- Verifies server health
- Checks authentication endpoint validation
- Ensures protected endpoints return 401 when unauthenticated

**Usage:**
```bash
bun tests/scripts/test-public-endpoints.sh
```

### Comprehensive Unauthenticated Tests

**`test-all-unauthenticated-endpoints.sh`**
- Comprehensive testing of all endpoints without authentication
- Tests all endpoint categories (users, events, surveys, admin, guests)
- Verifies proper error responses (401, 400, 404)
- Includes test summary with pass/fail counts

**Usage:**
```bash
bun tests/scripts/test-all-unauthenticated-endpoints.sh
```

### Authenticated API Tests

**`test-authenticated-api.ts`**
- Automated testing of authenticated endpoints
- Creates test users automatically
- Obtains session cookies
- Tests user, admin, form, event, and survey endpoints

**Prerequisites:**
- Server running on port 3000
- Firebase emulators running (Auth: 9099, Firestore: 8080)

**Usage:**
```bash
bun tests/scripts/test-authenticated-api.ts
```

### Test User Setup

**`setup-test-users.ts`**
- Prepares test environment
- Cleans up existing test users
- Creates fresh test users via registration API
- Obtains authentication tokens for manual testing

**Usage:**
```bash
bun tests/scripts/setup-test-users.ts
```

## Naming Conventions

All scripts follow clear, descriptive naming:

- **Purpose-based**: Script names describe what they do
- **No abbreviations**: Full words used for clarity
- **Consistent format**: `test-{category}-{scope}.{ext}` or `setup-{purpose}.ts`

### Examples:
- `test-public-endpoints.sh` - Tests public endpoints
- `test-all-unauthenticated-endpoints.sh` - Tests all endpoints without auth
- `test-authenticated-api.ts` - Tests authenticated API endpoints
- `setup-test-users.ts` - Sets up test users

## Function Naming

All functions use descriptive, action-oriented names:

- `executeApiRequest()` - Makes HTTP requests
- `printTestResult()` - Displays test outcomes
- `createSessionFromIdToken()` - Creates session cookies
- `registerUserAndObtainToken()` - Registers and authenticates users
- `verifyEmulatorsAreRunning()` - Checks emulator connectivity

## Variable Naming

Variables use clear, self-documenting names:

- `tests_passed` / `testsPassed` - Counter for passed tests
- `sessionCookie` - Authentication cookie string
- `expectedStatusCode` - Expected HTTP status code
- `requestBody` - HTTP request payload
- `firebaseUserId` - Firebase user identifier

## Best Practices

1. **Clear intent**: Every function name describes its purpose
2. **No magic numbers**: All constants are named
3. **Type safety**: TypeScript scripts use interfaces for data structures
4. **Error handling**: All scripts handle errors gracefully
5. **Helpful output**: Clear success/failure messages with context
6. **Exit codes**: Proper exit codes for CI/CD integration

## Running All Tests

To run the full test suite:

```bash
# 1. Start emulators
bun run emulators &

# 2. Start server
bun run server &

# 3. Run public endpoint tests
bun tests/scripts/test-public-endpoints.sh

# 4. Run comprehensive unauthenticated tests
bun tests/scripts/test-all-unauthenticated-endpoints.sh

# 5. Setup test users
bun tests/scripts/setup-test-users.ts

# 6. Run authenticated tests
bun tests/scripts/test-authenticated-api.ts
```

## Output Format

All scripts provide:
- ✅ Clear pass/fail indicators
- Color-coded output (green for pass, red for fail)
- Detailed error messages when tests fail
- Summary statistics at the end
- Proper exit codes (0 for success, 1 for failure)

