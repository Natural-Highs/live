import type { ServiceAccount } from 'firebase-admin';
import admin from 'firebase-admin';
import serviceAccount from '../../../serviceAccount.json';

// Initialize Firebase Admin SDK only if it hasn't been initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as ServiceAccount),
    storageBucket: 'sveltekit-fullstack-c259e.appspot.com',
  });
  const firestoreEmulatorHost = 'localhost:8080'; // Default port for Firestore emulator
  // Set up Firestore and Auth emulators if running in development mode
  if (import.meta.env.MODE === 'development') {
    // Use Firestore emulator
    admin.firestore().settings({
      host: firestoreEmulatorHost,
      ssl: false,
    });

    // Use Auth emulator
    process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
    console.log('Firestore Emulator and Auth Emulator configured');
  }
}

// If running the Firebase Auth emulator, set the emulator host
if (import.meta.env.MODE === 'development') {
  // Configure Firestore to use the emulator

  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099'; // replace 9099 with your emulator port if it's different
  // console.log("Firestore Emulator Host:", process.env.FIRESTORE_EMULATOR_HOST);
  // console.log("Auth Emulator Host:", process.env.FIREBASE_AUTH_EMULATOR_HOST);
}

// Export the Firestore and Auth instances for use in your application
export const adminDb = admin.firestore();
export const adminAuth = admin.auth();

// Test function for verifying Firestore and Auth functionality in development mode
async function testAdminFunctions() {
  if (import.meta.env.MODE !== 'development') return; // Run this only in development

  try {
    // Check if the user already exists
    try {
      const existingUser = await adminAuth.getUserByEmail('admin@example.com');
      console.log('Admin test user already exists:', existingUser.uid);
    } catch (_error) {
      // Create a new user if not existing
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

// Call the test function in development mode
if (import.meta.env.MODE === 'development') {
  testAdminFunctions();
}
