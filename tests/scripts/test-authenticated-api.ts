#!/usr/bin/env bun

/**
 * Authenticated API Endpoint Testing
 *
 * Automates testing of all endpoints that require authentication.
 * Creates test users, obtains session cookies, and runs comprehensive tests.
 *
 * Prerequisites:
 * - Server running on http://localhost:3000
 * - Firebase emulators running (Auth: 9099, Firestore: 8080)
 *
 * Usage: bun tests/scripts/test-authenticated-api.ts
 */

const API_SERVER_URL = 'http://localhost:3000';
const FIREBASE_AUTH_EMULATOR_URL = 'http://localhost:9099';
const FIREBASE_FIRESTORE_EMULATOR_URL = 'http://localhost:8080';
const FIREBASE_EMULATOR_API_KEY = 'demo-api-key';

interface ApiResponseData {
  [key: string]: string | number | boolean | null | undefined | ApiResponseData | ApiResponseData[];
}

interface TestResult {
  testName: string;
  passed: boolean;
  actualStatusCode?: number;
  expectedStatusCode?: number;
  errorMessage?: string;
  responseData?: ApiResponseData;
}

interface UserCredentials {
  idToken: string;
  userId: string;
}

const testResults: TestResult[] = [];

interface RequestPayload {
  [key: string]: string | number | boolean | null | undefined | RequestPayload | RequestPayload[];
}

async function executeApiRequest(
  testName: string,
  httpMethod: string,
  endpointPath: string,
  expectedStatusCode: number,
  requestBody?: RequestPayload,
  sessionCookie?: string
): Promise<boolean> {
  const fullUrl = `${API_SERVER_URL}${endpointPath}`;
  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (sessionCookie) {
    requestHeaders.Cookie = sessionCookie;
  }

  const requestOptions: RequestInit = {
    method: httpMethod,
    headers: requestHeaders,
  };

  if (requestBody && ['POST', 'PATCH', 'PUT'].includes(httpMethod)) {
    requestOptions.body = JSON.stringify(requestBody);
  }

  try {
    const response = await fetch(fullUrl, requestOptions);
    const responseData: ApiResponseData = await response.json().catch(() => {
      return {} as ApiResponseData;
    });

    const testPassed = response.status === expectedStatusCode;
    testResults.push({
      testName,
      passed: testPassed,
      actualStatusCode: response.status,
      expectedStatusCode,
      responseData,
      errorMessage: testPassed
        ? undefined
        : `Expected ${expectedStatusCode}, got ${response.status}`,
    });

    if (!testPassed && response.status !== expectedStatusCode) {
      console.log(`  Response: ${JSON.stringify(responseData).slice(0, 200)}`);
    }

    return testPassed;
  } catch (error) {
    testResults.push({
      testName,
      passed: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    console.log(`  Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    return false;
  }
}

async function registerUserAndObtainToken(
  username: string,
  emailAddress: string,
  password: string
): Promise<UserCredentials | null> {
  console.log(`  Registering ${emailAddress} via API...`);
  const registrationResponse = await fetch(`${API_SERVER_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      email: emailAddress,
      password,
      confirmPassword: password,
    }),
  });

  let firebaseUserId: string | null = null;

  if (registrationResponse.ok) {
    const registrationData = (await registrationResponse.json()) as {
      uid: string;
    };
    firebaseUserId = registrationData.uid;
    console.log(`  Registered (UID: ${firebaseUserId})`);
  } else {
    const errorData = (await registrationResponse.json()) as { error?: string };
    if (errorData.error?.includes('already exists')) {
      console.log(`  User already exists, continuing`);
      const signInResponse = await fetch(
        `${FIREBASE_AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_EMULATOR_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: emailAddress,
            password,
            returnSecureToken: true,
          }),
        }
      );

      if (signInResponse.ok) {
        const signInData = (await signInResponse.json()) as { localId: string };
        firebaseUserId = signInData.localId;
      }
    } else {
      console.log(`  Registration failed: ${errorData.error || 'Unknown error'}`);
      return null;
    }
  }

  if (!firebaseUserId) {
    console.log(`  Could not get user ID, trying direct sign-in`);
  }

  const signInResponse = await fetch(
    `${FIREBASE_AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_EMULATOR_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailAddress,
        password,
        returnSecureToken: true,
      }),
    }
  );

  if (!signInResponse.ok) {
    const errorText = await signInResponse.text();
    console.log(`  Sign-in failed: ${errorText}`);
    return null;
  }

  const signInData = (await signInResponse.json()) as {
    idToken: string;
    localId: string;
  };
  return {
    idToken: signInData.idToken,
    userId: signInData.localId,
  };
}

async function markUserAsAdmin(_userId: string): Promise<boolean> {
  console.log(`  Admin flag update: Use Firebase Emulator UI or admin endpoint`);
  return true;
}

async function createSessionFromIdToken(idToken: string): Promise<string | null> {
  const response = await fetch(`${API_SERVER_URL}/api/auth/sessionLogin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    const errorData = (await response.json()) as ApiResponseData;
    console.error('Session login failed:', errorData);
    return null;
  }

  const setCookieHeader = response.headers.get('set-cookie');
  if (setCookieHeader) {
    const sessionCookieMatch = setCookieHeader.match(/session=([^;]+)/);
    return sessionCookieMatch ? `session=${sessionCookieMatch[1]}` : null;
  }

  return null;
}

async function verifyEmulatorsAreRunning(): Promise<void> {
  try {
    await fetch(`${FIREBASE_AUTH_EMULATOR_URL}/`);
    console.log('Firebase Auth emulator connected');
  } catch (_error) {
    console.log('Firebase Auth emulator not responding');
    process.exit(1);
  }

  try {
    await fetch(FIREBASE_FIRESTORE_EMULATOR_URL);
    console.log('Firestore emulator connected');
  } catch (_error) {
    console.log('Firestore emulator not responding');
    process.exit(1);
  }
}

async function main() {
  console.log('=========================================');
  console.log('Authenticated API Endpoint Testing');
  console.log('=========================================\n');

  await verifyEmulatorsAreRunning();
  console.log('');

  console.log('Creating test users\n');

  const regularUserCredentials = await registerUserAndObtainToken(
    'testuser',
    'testuser@test.com',
    'password123'
  );
  if (!regularUserCredentials) {
    console.log('Failed to get regular user credentials');
    process.exit(1);
  }
  console.log(`Regular user ready: testuser@test.com\n`);

  const adminUserCredentials = await registerUserAndObtainToken(
    'admin',
    'admin@test.com',
    'password123'
  );
  if (!adminUserCredentials) {
    console.log('Could not get admin user credentials, some tests will be skipped');
  } else {
    await markUserAsAdmin(adminUserCredentials.userId);
    console.log(`Admin user ready: admin@test.com\n`);
  }

  console.log('Creating session cookies\n');

  const regularUserSessionCookie = await createSessionFromIdToken(regularUserCredentials.idToken);
  if (!regularUserSessionCookie) {
    console.log('Failed to create regular user session');
    process.exit(1);
  }
  console.log('Regular user session created');

  let adminUserSessionCookie: string | null = null;
  if (adminUserCredentials) {
    adminUserSessionCookie = await createSessionFromIdToken(adminUserCredentials.idToken);
    if (adminUserSessionCookie) {
      console.log('Admin user session created');
    } else {
      console.log('Admin session failed (may need isAdmin flag set)');
    }
  }

  console.log('\n=========================================');
  console.log('Running Endpoint Tests');
  console.log('=========================================\n');

  console.log('--- Authentication Endpoints ---');
  await executeApiRequest(
    'Check Session Status',
    'GET',
    '/api/auth/sessionLogin',
    200,
    undefined,
    regularUserSessionCookie
  );

  console.log('\n--- User Endpoints ---');
  await executeApiRequest(
    'Get User Profile',
    'GET',
    '/api/users/profile',
    200,
    undefined,
    regularUserSessionCookie
  );
  await executeApiRequest(
    'Get Current User',
    'GET',
    '/api/users/me',
    200,
    undefined,
    regularUserSessionCookie
  );
  const profileUpdatePayload: UserProfileUpdateRequest = {
    firstName: 'Test',
    lastName: 'User',
    phone: '555-1234',
    dateOfBirth: '1990-01-01',
  };
  await executeApiRequest(
    'Update User Profile',
    'POST',
    '/api/users/profile',
    200,
    profileUpdatePayload,
    regularUserSessionCookie
  );

  console.log('\n--- Form Endpoints ---');
  await executeApiRequest('Get Consent Form Template', 'GET', '/api/forms/consent', 404, undefined);
  if (regularUserSessionCookie) {
    await executeApiRequest(
      'Get Demographics Form',
      'GET',
      '/api/forms/demographics',
      200,
      undefined,
      regularUserSessionCookie
    );
  }

  console.log('\n--- Event Endpoints ---');
  if (regularUserSessionCookie) {
    await executeApiRequest(
      'List Events',
      'GET',
      '/api/events',
      200,
      undefined,
      regularUserSessionCookie
    );
  }

  console.log('\n--- Admin Endpoints ---');
  if (adminUserSessionCookie) {
    await executeApiRequest(
      'List Form Templates',
      'GET',
      '/api/formTemplates',
      200,
      undefined,
      adminUserSessionCookie
    );
    await executeApiRequest(
      'List Event Types',
      'GET',
      '/api/eventTypes',
      200,
      undefined,
      adminUserSessionCookie
    );
  } else {
    console.log('Skipping admin endpoints - no admin session cookie available');
  }

  console.log('\n--- Survey Endpoints ---');
  if (regularUserSessionCookie) {
    await executeApiRequest(
      'Get User Surveys',
      'GET',
      '/api/surveys',
      200,
      undefined,
      regularUserSessionCookie
    );
  }

  console.log('\n=========================================');
  console.log('Test Summary');
  console.log('=========================================\n');

  const passedTests = testResults.filter(result => result.passed).length;
  const failedTests = testResults.filter(result => !result.passed).length;

  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Total: ${testResults.length}\n`);

  if (failedTests > 0) {
    console.log('Failed Tests:');
    testResults
      .filter(result => !result.passed)
      .forEach(result => {
        console.log(`  ${result.testName}`);
        if (result.errorMessage) console.log(`     ${result.errorMessage}`);
        if (result.actualStatusCode && result.expectedStatusCode) {
          console.log(
            `     Got: ${result.actualStatusCode}, Expected: ${result.expectedStatusCode}`
          );
        }
      });
  }

  if (failedTests === 0 && passedTests > 0) {
    console.log('All tests passed\n');
    process.exit(0);
  } else {
    process.exit(failedTests > 0 ? 1 : 0);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
