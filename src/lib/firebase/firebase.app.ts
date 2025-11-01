import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

console.log('Script is running');

// Firebase configuration (client-side)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_APIKEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
};

// Check if Firebase has already been initialized
let firebaseApp: ReturnType<typeof initializeApp> | undefined;
if (!getApps().length) {
  // No apps have been initialized, initialize one
  firebaseApp = initializeApp(firebaseConfig);
  console.log('Firebase Client SDK initialized');
} else {
  // If an app has already been initialized, use the existing one
  firebaseApp = getApp();
  console.log('Using existing Firebase app');
}

// Initialize Firestore and Auth
export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);

console.log('Environment Mode:', import.meta.env.MODE);
// // Connect to Firestore emulator if in development mode
if (import.meta.env.MODE === 'development') {
  connectFirestoreEmulator(db, 'localhost', 8080); // Use correct Firestore emulator port if different
  connectAuthEmulator(auth, 'http://localhost:9099'); // Use correct Auth emulator port if different
  console.log('Connected to Firestore and Auth emulators');
}
