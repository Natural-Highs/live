import { fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
// import { signInUser, registerUser } from "$lib/firebase/db/client/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth, db } from "$lib/firebase/firebase.app";
import { adminAuth, adminDb } from "$lib/firebase/firebase.admin";

export const load: PageServerLoad = async (event) => {
  //const user = auth.;
  // if (user) {
  //   redirect(302, "/dashboard");
  // }
};

export const actions: Actions = {
  handleAuth: async (event) => {
    const formData = await event.request.formData();
    const registerValue = String(formData.get("register"));
    const isRegister = registerValue.toLowerCase() === "true";
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");
    const confirmPassword = isRegister
      ? String(formData.get("confirmPass"))
      : "";
    console.log("Handling Auth");

    if (!email || !password) {
      return fail(400, {
        email,
        message: "Please enter an email and password.",
      });
    }

    if ((password != confirmPassword || (!confirmPassword)) && isRegister){
      return fail(400, {
        message: "Passwords do not match.",
      });
    }

    if( isRegister ){
      console.log("Creating user in Firebase Authentication...");

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
  
      const user = userCredential.user;

      try {
        // Add a User document to Firestore

        //change .doc().set to either .set merge or you want to update instead
        const testDoc = await adminDb
          .collection("Users")
          .add({
            message: "Hello from Firebase Admin SDK!",
            createdAt: new Date().toISOString(),
            userId: user.uid,
            userEmail: user.email,
            isAdmin: false
          });
        console.log("Test user created in Firestore");
      } catch (error) {
        console.error("Error in testAdminFunctions:", error);
      }
  
      console.log("User created successfully in Firebase Authentication:", user.uid);
      throw redirect(302, "/dashboard");
    }

    // const response = isRegister
      // ? await registerUser(email, password, confirmPassword)
      // : await signInUser(email, password);
    // const response = await registerUser(email, password, confirmPassword);
    // console.log("response from server: ", response);

    // if(response){
    //   console.log("Hola");
    // }
    // else{
    //   console.log("Bye");
    // }


    // console.log("IsRegister:", isRegister);
    // console.log("Email:", email);
    // console.log("Password:", password);
    // console.log("Response from auth:", response);

    // if (response) {
    //   throw redirect(302, "/dashboard");
    // }

    // return fail(400, {
    //   message: "Wrong email or password",
    // });
  },
};
