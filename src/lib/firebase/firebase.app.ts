import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

console.log('Script is running');

// Firebase configuration (client-side)
const firebaseConfig = {
  apiKey: process.env.VITE_APIKEY,
  authDomain: process.env.VITE_AUTH_DOMAIN,
  projectId: process.env.VITE_PROJECT_ID,
  storageBucket: process.env.VITE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_APP_ID,
};

let firebaseApp: ReturnType<typeof initializeApp> | undefined;
if (!getApps().length) {
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

console.log('Environment Mode:', process.env.MODE);
if (process.env.MODE === 'development') {
  connectFirestoreEmulator(db, 'localhost', 8080); // Use correct Firestore emulator port if different
  connectAuthEmulator(auth, 'http://localhost:9099'); // Use correct Auth emulator port if different
  console.log('Connected to Firestore and Auth emulators');
}
