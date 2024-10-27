import { redirect } from "@sveltejs/kit";
import { adminAuth } from "$lib/firebase/firebase.admin";
// import { auth } from "/firebase/firebase.app";

export const handle = async({event, resolve}) => {
  const requestedPath = event.url.pathname;
  const cookies = event.cookies;

  // Restrict all routes under /admin
  if(requestedPath.includes("/admin")) {
    console.log("Trying to access admin route");
    const isTokenValid = await validateTokenFunction(cookies, true);
    if(!isTokenValid) {
        console.log("Couldn't Validate Token");
        throw redirect(303, "/authentication");
    }
    else{
      console.log("Succesfully validated admin token!");
    }
  }
  else if(requestedPath.includes("/dashboard")){
    const isTokenValid = await validateTokenFunction(cookies, false);
    if(!isTokenValid) {
        console.log("Couldn't Validate Token");
        throw redirect(303, "/authentication");
    }
    else{
      console.log("Succesfully validated token!");
    }
  }

  const response = await resolve(event);

  console.log("Response: ", response);

  return response;
}

const validateTokenFunction = async (cookies, checkAdmin) => {
  // This will look for the user's cookies and see if the auth token exists
  const currentToken = cookies.get("auth-token");

  const isEmulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (isEmulator) {
    console.log("Using Firebase Auth Emulator, skipping token verification.");
    return true; // Skip verification if using emulator
  }

  if(!currentToken){
    return false;
  }
  else{
    try{
        await adminAuth.verifyIdToken(currentToken);
        return true;
    }
    catch(err){
        console.error("Token verification failed:", err);
        return false;
    }
  }
}