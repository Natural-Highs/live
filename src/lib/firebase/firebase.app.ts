import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
  setDoc,
  doc,
  addDoc,
  collection,
} from "firebase/firestore";
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

console.log("Script is running");

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
let firebaseApp;
if (!getApps().length) {
  // No apps have been initialized, initialize one
  firebaseApp = initializeApp(firebaseConfig);
  console.log("Firebase Client SDK initialized");
} else {
  // If an app has already been initialized, use the existing one
  firebaseApp = getApp();
  console.log("Using existing Firebase app");
}

// Initialize Firestore and Auth
export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);

console.log("Environment Mode:", import.meta.env.MODE);
// // Connect to Firestore emulator if in development mode
if (import.meta.env.MODE === "development") {
  connectFirestoreEmulator(db, "localhost", 8080); // Use correct Firestore emulator port if different
  connectAuthEmulator(auth, "http://localhost:9099"); // Use correct Auth emulator port if different
  console.log("Connected to Firestore and Auth emulators");
}


// Test function to sign in a user and add a Firestore document
// async function testClientFunctions() {
//   try {
//     // Sign in with test user (created from the Admin SDK)
//     const userCredential = await createUserWithEmailAndPassword(auth, "client@test.com", "abc123");
//     console.log("User Created:", userCredential.user.uid);

//     const signedInUser = await signInWithEmailAndPassword(auth, "client@test.com", "abc123");
//     console.log("Test user signed in:", signedInUser.user.uid);
//   } catch (error) {
//     console.error("Error in testClientFunctions:", error);
//   }
// }

// // Call the test function to verify Firebase Client SDK functionality
// testClientFunctions();

// async function testFirestore() {
//   // try {
//   //   await setDoc(doc(db, "testCollection", "clientTestDoc"), {
//   //     message: "Hello from Firebase Client SDK!",
//   //     createdAt: new Date().toISOString(),
//   //   });
//   //   console.log("Test document created in Firestore from client");
//   // } catch(error) {
//   //   console.log("Error: ", error);
//   // }
//   try {
//     const usersRef = collection(db, "users");
    
//     // Adding a document to Firestore
//     const docRef = await addDoc(usersRef, {
//       first: "Ada",
//       last: "Lovelace",
//       born: 1815
//     });

//     console.log("Document written with ID: ", docRef.id);
//   } catch (error) {
//     console.error("Error adding document: ", error);
//   }
// }

// testFirestore();


// rules_version = '2';

// service cloud.firestore {
//   match /databases/{database}/documents {

//     // This rule allows anyone with your Firestore database reference to view, edit,
//     // and delete all data in your Firestore database. It is useful for getting
//     // started, but it is configured to expire after 30 days because it
//     // leaves your app open to attackers. At that time, all client
//     // requests to your Firestore database will be denied.
//     //
//     // Make sure to write security rules for your app before that time, or else
//     // all client requests to your Firestore database will be denied until you Update
//     // your rules
//     match /{document=**} {
//       allow read, write: if request.time < timestamp.date(2025, 12, 31);
//     }
//   }
// }