#!/usr/bin/env bun

/**
 * Setup Test Users for API Testing
 *
 * Prepares test environment by:
 * 1. Cleaning up existing test users from Firebase Auth emulator
 * 2. Creating fresh test users via the registration API
 * 3. Obtaining authentication tokens for testing
 *
 * Usage: bun tests/scripts/setup-test-users.ts
 */

import type { FirebaseAuthSignInResponse, RegistrationResponse, UserCredentials } from './types';

const API_SERVER_URL = 'http://localhost:3000';
const FIREBASE_AUTH_EMULATOR_URL = 'http://localhost:9099';
const FIREBASE_EMULATOR_API_KEY = 'demo-api-key';

async function removeUserFromFirebaseAuth(emailAddress: string): Promise<void> {
  try {
    const signInResponse = await fetch(
      `${FIREBASE_AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_EMULATOR_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailAddress,
          password: 'password123',
          returnSecureToken: true,
        }),
      }
    );

    if (signInResponse.ok) {
      const userData = (await signInResponse.json()) as FirebaseAuthSignInResponse;
      const firebaseUserId = userData.localId;

      await fetch(
        `${FIREBASE_AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:delete?key=${FIREBASE_EMULATOR_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            localId: firebaseUserId,
          }),
        }
      );

      console.log(`  ✅ Removed ${emailAddress} from Firebase Auth`);
    }
  } catch (_error) {
    console.log(`  ℹ️  ${emailAddress} not found in Auth or could not be deleted`);
  }
}

async function createNewTestUser(
  username: string,
  emailAddress: string,
  password: string
): Promise<UserCredentials | null> {
  await removeUserFromFirebaseAuth(emailAddress);

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

  if (!registrationResponse.ok) {
    const errorData = (await registrationResponse.json()) as RegistrationResponse;
    console.log(`  ❌ Registration failed: ${errorData.error || 'Unknown error'}`);
    return null;
  }

  const registrationData = (await registrationResponse.json()) as RegistrationResponse;
  if (registrationData.uid) {
    console.log(`  ✅ Created user: ${emailAddress} (${registrationData.uid})`);
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
    return null;
  }

  const signInData = (await signInResponse.json()) as FirebaseAuthSignInResponse;
  return {
    idToken: signInData.idToken,
    userId: signInData.localId,
  };
}

async function main() {
  console.log('🧹 Cleaning up existing test users...\n');

  await removeUserFromFirebaseAuth('testuser@test.com');
  await removeUserFromFirebaseAuth('admin@test.com');

  console.log('\n👤 Creating fresh test users...\n');

  const regularUserCredentials = await createNewTestUser(
    'testuser',
    'testuser@test.com',
    'password123'
  );
  if (!regularUserCredentials) {
    console.log('❌ Failed to create regular user');
    process.exit(1);
  }

  const adminUserCredentials = await createNewTestUser('admin', 'admin@test.com', 'password123');
  if (!adminUserCredentials) {
    console.log('❌ Failed to create admin user');
    process.exit(1);
  }

  console.log('\n📝 Admin Flag Setup:');
  console.log('  Note: Set isAdmin=true in Firestore for admin@test.com');
  console.log('        Or use Firebase Emulator UI at http://localhost:4000');

  console.log('\n✅ Test users ready!');
  console.log(`\nRegular user token: ${regularUserCredentials.idToken.slice(0, 50)}...`);
  console.log(`Admin user token: ${adminUserCredentials.idToken.slice(0, 50)}...`);
  console.log('\nNext steps:');
  console.log('  1. Run: bun tests/scripts/test-authenticated-api.ts');
  console.log('  2. Use Postman collection with these tokens');
  console.log('  3. Test endpoints manually');
}

main().catch(console.error);
