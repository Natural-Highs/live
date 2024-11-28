import { fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { signInUser, registerUser } from "$lib/db/auth"
// import { auth, db } from "$lib/firebase/firebase";
import { addDoc, collection } from "firebase/firestore";

export const load: PageServerLoad = async (event) => {
  //const user = auth.;
  // if (user) {
  //   redirect(302, "/dashboard");
  // }
};

export const actions: Actions = {
  createUser: async (event) => {
    console.log("Creating user");
    const formData = await event.request.formData();

    const email = formData.get("email")?.toString();
    const password = formData.get("password")?.toString();
    const confirmPass = formData.get("confirmPass")?.toString();
    if(!email || !password || !confirmPass) {
      return {
        success: false,
        message: "Invalid fields",
      }
    }

    const success = registerUser(email, password, confirmPass);

    if(!success) {
      return {
        success: false,
        message: "An error occurred while registering user",
      }
    }

    return {
      success: true,
      message: "User successfully created!",
    }

  },
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
      console.log('successfully logged in');
      event.cookies.set("session", "your-session-token", {
        path: "/",
        httpOnly: true,
        sameSite: "strict",
        maxAge: 60 * 60 * 24, // Expires in 1 day
      });
      
      // Redirect to the dashboard
      throw redirect(302, "/dashboard");
    } else {
      return fail(400, {
        message: "Invalid Input"
      })
    }
  },
};
