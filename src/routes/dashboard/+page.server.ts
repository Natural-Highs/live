import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async (event) => {
  // const user = auth.currentUser;
  // if (!user) {
  //   redirect(302, "/authentication");
  // }
};
