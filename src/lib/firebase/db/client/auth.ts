// import { auth, db } from "$lib/firebase/firebase.app"; // Adjust the import path as needed

// import { doc, getDoc, setDoc } from "firebase/firestore"; // Import Firestore client methods
// import { fail, redirect } from "@sveltejs/kit";

// /**
//  * Creates a new user with email and password. Validates that password and confirmPassword match.
//  * @param email - The email of the user.
//  * @param password - The confirmation password to ensure they match.
//  * @param confirmPassword - The confirmation password to ensure they match.
//  * @returns A promise that resolves with the created user record or rejects with an error.
//  */
// export async function registerUser(
//   email: string,
//   password: string,
//   confirmPassword: string,
// ): Promise<boolean> {
//   // if (password !== confirmPassword) {
//   //   return false;
//   // }

//   // try {
//   //   // Create a new user with the provided email and password using Firebase client SDK
//   //   return true;
//   // } catch (error) {
//   //   console.error("Error creating new user:", error);
//   //   return false;
//   // }
//   if(email && (password == confirmPassword)){
//     return true;
//   }
//   else{
//     return false;
//   }
// }

// /**
//  * Signs in a user with email and password.
//  * @param email - The email of the user.
//  * @param password - The password of the user.
//  * @returns A promise that resolves with a sign-in result or rejects with an error.
//  */
// export async function signInUser(
//   email: string,
//   password: string,
// ): Promise<boolean> {
//   // try {
//   //   // Sign in the user with Firebase Authentication
//   //   // const userCredential = await signInWithEmailAndPassword(
//   //   //   auth,
//   //   //   email,
//   //   //   password,
//   //   // );
//   //   // const user = userCredential.user;

//   //   // const userDocRef = doc(db, "users", user.uid);

//   //   // const userDetails = await getDoc(userDocRef);

//   //   return true;
//   // } catch (error) {
//   //   // Handle any errors that occur during user sign-in
//   //   console.error("Error signing in user:");
//   //   return false;
//   // }
//   if(email && password){
//     return true;
//   }
//   else{
//     return false;
//   }
// }

// //     const userCredential = await createUserWithEmailAndPassword(auth, "client@test.com", "abc123");
// //     console.log("User Created:", userCredential.user.uid);

// //     const signedInUser = await signInWithEmailAndPassword(auth, "client@test.com", "abc123");
// //     console.log("Test user signed in:", signedInUser.user.uid);
