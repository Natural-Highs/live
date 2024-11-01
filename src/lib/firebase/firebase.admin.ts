// Import the functions you need from the SDKs you need
import type { ServiceAccount } from "firebase-admin";
import admin from "firebase-admin";
import serviceAccount from "../../../serviceAccount.json";

// Check if the app is already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as ServiceAccount),
    storageBucket: "sveltekit-fullstack-c259e.appspot.com",
  });
  const firestoreEmulatorHost = "localhost:8080"; // Default port for Firestore emulator
  admin.firestore().settings({
    host: firestoreEmulatorHost,
    ssl: false,
  });
}

// If running the Firebase Auth emulator, set the emulator host
if (import.meta.env.MODE === "development") {
  // Configure Firestore to use the emulator

  process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099"; // replace 9099 with your emulator port if it's different
  // console.log("Firestore Emulator Host:", process.env.FIRESTORE_EMULATOR_HOST);
  // console.log("Auth Emulator Host:", process.env.FIREBASE_AUTH_EMULATOR_HOST);
}

// Export the Firestore and Auth instances for use in your application
export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
// connectAuthEmulator(getAuth(), "http://127.0.0.1:9099");

// Test function to add a user and a Firestore document
async function testAdminFunctions() {
  try {
    // Create a test user
    try {
      const existingUser = await adminAuth.getUserByEmail("admin@example.com");
      console.log("Admin test user already created", existingUser.uid);
    } catch (error) {
      const userRecord = await adminAuth.createUser({
        email: "admin@example.com",
        password: "abc123",
      });
      console.log("Admin test user created", userRecord.uid);
    }

    // Add a test document to Firestore
    const testDoc = await adminDb
      .collection("testCollection")
      .doc("testDoc")
      .set({
        message: "Hello from Firebase Admin SDK!",
        createdAt: new Date().toISOString(),
        isAdmin: true
      });
    console.log("Test document created in Firestore");
  } catch (error) {
    console.error("Error in testAdminFunctions:", error);
  }
}

// // Call the test function to verify Firebase Admin SDK functionality
testAdminFunctions();
