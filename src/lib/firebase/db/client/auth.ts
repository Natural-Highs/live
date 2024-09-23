import { auth, db } from '$lib/firebase/firebase.app'; // Adjust the import path as needed
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore'; // Import Firestore client methods

/**
 * Creates a new user with email and password. Validates that password and confirmPassword match.
 * @param email - The email of the user.
 * @param password - The confirmation password to ensure they match.
 * @param confirmPassword - The confirmation password to ensure they match.
 * @returns A promise that resolves with the created user record or rejects with an error.
 */
export async function registerUser(email: string, password: string, confirmPassword: string): Promise<boolean> {
  if (password !== confirmPassword) {
    return false;
  }

  try {
    // Create a new user with the provided email and password using Firebase client SDK
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Add user data to Firestore using client SDK
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      createdAt: new Date(),
    });

    return true;
  } catch (error) {
    console.error('Error creating new user:', error);
    return false;
  }
}

/**
 * Signs in a user with email and password.
 * @param email - The email of the user.
 * @param password - The password of the user.
 * @returns A promise that resolves with a sign-in result or rejects with an error.
 */
export async function signInUser(email: string, password: string): Promise<boolean> {
  try {
    // Sign in the user with Firebase Authentication
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    // Handle any errors that occur during user sign-in
    console.error('Error signing in user:', error);
    return false;
  }
}
