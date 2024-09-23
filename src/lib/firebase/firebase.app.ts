import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, setDoc, doc } from "firebase/firestore";
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from "firebase/auth";

// Firebase configuration (client-side)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_APIKEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
};

// Initialize Firebase client app
const firebaseApp = initializeApp(firebaseConfig);

// Initialize Firestore and Auth
export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);

console.log("Environment Mode:", import.meta.env.MODE);
// Connect to Firestore emulator if in development mode
if (import.meta.env.MODE === "development") {
  connectFirestoreEmulator(db, "localhost", 8080); // Use correct Firestore emulator port if different
  connectAuthEmulator(auth, "http://localhost:9099"); // Use correct Auth emulator port if different
}``


// Test function to sign in a user and add a Firestore document
async function testClientFunctions() {
  try {
    // Sign in with test user (created from the Admin SDK)
    const userCredential = await createUserWithEmailAndPassword(auth, "client@test.com", "abc123");
    console.log("Test user signed in:", userCredential.user.uid);

    // Add a test document to Firestore
    await setDoc(doc(db, "testCollection", "clientTestDoc"), {
      message: "Hello from Firebase Client SDK!",
      createdAt: new Date().toISOString(),
    });
    console.log("Test document created in Firestore from client");
  } catch (error) {
    console.error("Error in testClientFunctions:", error);
  }
}

// Call the test function to verify Firebase Client SDK functionality
testClientFunctions();