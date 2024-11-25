import { redirect } from "@sveltejs/kit";
import { adminDb } from "$lib/firebase/firebase.admin";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ cookies }) => {
    const session = cookies.get("session");
  
    if (!session) {
      throw redirect(302, "/authentication"); // Redirect to auth page if not logged in
    }
     
    return;
  };