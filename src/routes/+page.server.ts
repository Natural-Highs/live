import { getAuth } from "firebase/auth";
import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { auth } from "../lib/firebase/firebase";

export const load: PageServerLoad = async (event) => {
  const user = auth.currentUser;
  if (!user) {
    redirect(302, "/authentication");
  }
  redirect(302, "/dashboard");
};
