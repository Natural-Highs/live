import type { ServiceAccount } from 'firebase-admin';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  // Service account can come from:
  // 1. Doppler secret (FIREBASE_SERVICE_ACCOUNT as JSON string)
  // 2. serviceAccount.json file (fallback for local dev)
  let serviceAccount: ServiceAccount;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Parse JSON string from Doppler
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) as ServiceAccount;
    } catch (error) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT from Doppler:', error);
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT format');
    }
  } else {
    // Fallback to serviceAccount.json file (for local dev without Doppler)
    try {
      serviceAccount = require('../../../serviceAccount.json') as ServiceAccount;
    } catch (error) {
      console.error('Failed to load serviceAccount.json:', error);
      throw new Error(
        'Firebase Admin requires either FIREBASE_SERVICE_ACCOUNT env var or serviceAccount.json file'
      );
    }
  }

  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET || serviceAccount.projectId
      ? `${serviceAccount.projectId}.appspot.com`
      : 'sveltekit-fullstack-c259e.appspot.com';

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket,
  });

  const firestoreEmulatorHost = 'localhost:8080';
  if (process.env.NODE_ENV === 'development') {
    admin.firestore().settings({
      host: firestoreEmulatorHost,
      ssl: false,
    });

    process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
    console.log('Firestore Emulator and Auth Emulator configured');
  }
}

if (process.env.NODE_ENV === 'development') {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();

// Test function for verifying Firestore and Auth functionality in development mode
async function testAdminFunctions() {
  if (process.env.NODE_ENV !== 'development') return;

  try {
    try {
      const existingUser = await adminAuth.getUserByEmail('admin@example.com');
      console.log('Admin test user already exists:', existingUser.uid);
    } catch (_error) {
      const userRecord = await adminAuth.createUser({
        email: 'admin@example.com',
        password: 'abc123',
      });
      console.log('Admin test user created:', userRecord.uid);
    }

    // Add a test document to Firestore
    await adminDb.collection('testCollection').doc('testDoc').set({
      message: 'Hello from Firebase Admin SDK!',
      createdAt: new Date().toISOString(),
      isAdmin: true,
    });
    console.log('Test document created in Firestore');
  } catch (error) {
    console.error('Error in testAdminFunctions:', error);
  }
}

if (process.env.NODE_ENV === 'development') {
  testAdminFunctions();
}
