import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ cookies }) => {
  const session = cookies.get("session");

  if (!session) {
    throw redirect(302, "/authentication"); // Redirect to auth page if not logged in
  }

  // Proceed to load dashboard data if session is valid
  return { message: "Hello, user" };
};
