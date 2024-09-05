import { fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../../lib/firebase/firebase";

export const load: PageServerLoad = async (event) => {
  const user = auth.currentUser;
  if (user) {
    redirect(302, "/dashboard");
  }
};

export const actions: Actions = {
  handleAuth: async (event) => {
    const formData = await event.request.formData();
    const register = String(formData.get("register"));
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));
    let success: boolean = false;
    console.log("Handling Auth");
    if (!email || !password) {
      return fail(400, {
        email,
        message: "Please enter an email and password",
      });
    }

    if (register == "false") {
      console.log("Entered If");
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          console.log("Signing in...");
          const user = userCredential.user;
          success = true;
        })
        .catch((error) => {
          console.log("Error Keys: " + Object.keys(error));
          const errorCode = error.code;
          const errorMessage = error.message;
          success = false;
          return fail(400, {
            errorCode,
            message: errorMessage,
          });
        });
    } else if (register == "true") {
      console.log("Entered Else If");
      const confirmPass = String(formData.get("confirmPass"));
      if (confirmPass != password) {
        return fail(400, {
          confirmPass,
          message: "Passwords do not match",
        });
      }

      const auth = getAuth();
      await createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          const user = userCredential.user;
          success = true;
        })
        .catch((error) => {
          const errorCode = error.code;
          const errorMessage = error.message;
          success = false;
          return fail(400, {
            errorCode,
            message: errorMessage,
          });
        });
    } else {
      console.log("Entered Else");
      return fail(400, {
        register,
        message: "Regiter is undefined",
      });
    }

    console.log("End: " + success);
    if (success) {
      redirect(302, "/dashboard");
    }
  },
};
