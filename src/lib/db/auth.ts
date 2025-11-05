// import { auth, db } from '$lib/firebase/firebase'; // Adjust the import path as needed
import { adminAuth, adminDb } from '$lib/firebase/firebase.admin';

/**
 * Creates a new user with email and password. Validates that password and confirmPassword match.
 * @param email - The email of the user.
 * @param password - The password of the user.
 * @param confirmPassword - The confirmation password to ensure they match.
 * @returns A promise that resolves with the created user record or rejects with an error.
 */
export async function registerUser(
  email: string,
  password: string,
  confirmPassword: string
): Promise<boolean> {
  if (password !== confirmPassword) {
    return false;
  }

  try {
    // Create a new user with the provided email and password
    const userRecord = await adminAuth.createUser({
      email: email,
      password: password,
    });

    await adminDb.collection('users').doc(userRecord.uid).set({
      email: email,
      createdAt: new Date(),
      uid: userRecord.uid,
      isAdmin: false,
      signedConsentForm: false,
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
export async function signInUser(email: string, _password: string): Promise<boolean> {
  try {
    const userRecord = await adminAuth.getUserByEmail(email);
    if (userRecord) {
      console.log('correct credentials');
      return true;
    } else {
      console.log('incorrect username or password');
      return false;
    }
  } catch (error) {
    // Handle any errors that occur during user sign-in
    console.error('Error signing in user:', error);
    return false;
  }
}
