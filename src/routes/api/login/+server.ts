import { adminAuth} from "$lib/firebase/firebase.admin";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

// ADMIN SDK

export async function POST({request, cookies}: RequestEvent) {
  const { idToken } = await request.json();

  const isEmulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  
  if (isEmulator) {
    console.log("Using Firebase Auth Emulator, skipping token verification.");
    cookies.set('session', idToken, {
      path: '/authentication',
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });
    return json({ success: true });
  }

  try{
    const verifyToken = await adminAuth.verifyIdToken(idToken);

    cookies.set('session', idToken, {
      path: '/authentication',
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }
  catch(err){
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
  }
}