import { getAuth } from "firebase/auth";
import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { adminAuth } from "../lib/firebase/admin";

export const load: PageServerLoad = async (event) => {
  // const user = auth.currentUser;
  // if (!user) {
  //   redirect(302, "/authentication");
  // }
  // redirect(302, "/dashboard");
};
