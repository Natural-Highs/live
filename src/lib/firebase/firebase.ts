import type { ServiceAccount } from 'firebase-admin';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  // Service account can come from:
  // 1. Doppler secret (FIREBASE_SERVICE_ACCOUNT as JSON string)
  // 2. serviceAccount.json file (fallback for local dev)
  let serviceAccount: ServiceAccount;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT
      ) as ServiceAccount;
    } catch (error) {
      console.error(
        'Failed to parse FIREBASE_SERVICE_ACCOUNT from Doppler:',
        error
      );
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT format');
    }
  } else {
    try {
      serviceAccount =
        require('../../../serviceAccount.json') as ServiceAccount;
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
  admin.firestore().settings({
    host: firestoreEmulatorHost,
    ssl: false,
  });
}

if (process.env.MODE === 'development') {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
}

export const db = admin.firestore();
export const auth = admin.auth();
export const bucket = admin.storage().bucket();
// connectAuthEmulator(getAuth(), "http://127.0.0.1:9099");
