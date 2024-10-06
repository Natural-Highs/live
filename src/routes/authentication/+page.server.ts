import { fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { signInUser, registerUser } from "$lib/db/auth"
import { auth, db } from "$lib/firebase/firebase";
import { addDoc, collection } from "firebase/firestore";

export const load: PageServerLoad = async (event) => {
  //const user = auth.;
  // if (user) {
  //   redirect(302, "/dashboard");
  // }
};

export const actions: Actions = {
  handleAuth: async (event) => {
    const formData = await event.request.formData();
    const registerValue = String(formData.get('register'));
    const isRegister = registerValue.toLowerCase() === 'true';
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));
    const confirmPassword = isRegister ? String(formData.get("confirmPass")) : "";
    console.log("Handling Auth");
    if (!email || !password) {
      return fail(400, {
        email,
        message: "Please enter an email and password",
      });
    }

    const response = isRegister ? registerUser(email, password, confirmPassword) : signInUser(email, password);

    if (await response) {
      redirect(302, "/dashboard");
    } else {
      return fail(400, {
        message: "Invalid Input"
      })
    }
  },
};
