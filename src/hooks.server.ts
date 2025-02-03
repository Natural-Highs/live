import { redirect } from "@sveltejs/kit";
import { adminAuth } from "$lib/firebase/firebase.admin";

export async function handle({ event, resolve }) {

    const protectedRoutes = ["/dashboard", "/", "/admin", "/initialSurvey"];

    const requestedPath = event.url.pathname;
    const cookies = event.cookies;

    if (requestedPath.startsWith("/api")) {
        return await resolve(event);
    }

    const sessionToken = cookies.get("session");

    if (protectedRoutes.includes(requestedPath) && !sessionToken) {
        throw redirect(303, "/authentication");
    }
    if (requestedPath.startsWith("/admin") && !sessionToken) {
        throw redirect(303, "/authentication");
    }

    let reroute = false;
    let reroutePath = "";
    try {
        if (sessionToken) {
            const decodedToken = await adminAuth.verifyIdToken(sessionToken);
            if (!decodedToken.initialSurvey && protectedRoutes.includes(requestedPath) && requestedPath !== "/initialSurvey") {
                reroute = true;
                reroutePath = "/initialSurvey";
            }
            if (decodedToken.initialSurvey && requestedPath == "/initialSurvey") {
                reroute = true;
                reroutePath = "/dashboard";
            }
            if (requestedPath === "/authentication" && decodedToken) {
                reroute = true;
                reroutePath = "/dashboard";
            }
            if (requestedPath.startsWith("/admin") && !decodedToken.admin) {
                reroute = true;
                reroutePath = "/dashboard";
            }
        }
    } catch (error) {
        console.log("Uh oh", error);
        cookies.delete("session", { path: "/" });
        if (error.code === "auth/id-token-expired" || error.code === "auth/argument-error") {
            console.log("Expired token!");
            cookies.delete("session", { path: "/" });
        }
    }
    if (reroute) {
        throw redirect(303, reroutePath);
    }


    const response = await resolve(event)
    return response;
}