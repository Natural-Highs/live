// Import the functions you need from the SDKs you need
import type { ServiceAccount } from "firebase-admin";
import admin from "firebase-admin";
import serviceAccount from "../../../serviceAccount.json";
import { getAuth, connectAuthEmulator } from "firebase/auth";

// // Your web app's Firebase configuration
// const firebaseConfig = {
//   apiKey: import.meta.env.VITE_APIKEY,
//   authDomain: import.meta.env.VITE_AUTH_DOMAIN,
//   projectId: import.meta.env.VITE_PROJECT_ID,
//   storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
//   messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
//   appId: import.meta.env.VITE_APP_ID,
// };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as ServiceAccount),
});

// Configure Firestore to use the emulator
const firestoreEmulatorHost = "localhost:8080"; // Default port for Firestore emulator
admin.firestore().settings({
  host: firestoreEmulatorHost,
  ssl: false,
});

// If running the Firebase Auth emulator, set the emulator host
if (process.env.MODE === 'development') {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099'; // replace 9099 with your emulator port if it's different
}

// Export the Firestore and Auth instances for use in your application
export const db = admin.firestore();
export const auth = admin.auth();
// connectAuthEmulator(getAuth(), "http://127.0.0.1:9099");
