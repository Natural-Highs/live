import { RequestHandler } from '@sveltejs/kit';
import { adminAuth, adminDb } from '$lib/firebase/firebase.admin';

export const POST: RequestHandler = async({request, cookies}) => {

    const data = await request.json();

    const oldToken = cookies.get("session");
    if(oldToken) {
        return new Response(JSON.stringify({success: true}));
    }

    try {
        const idToken = data.idToken.toString();


        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const email = decodedToken.email;


        const userRef = adminDb.collection('users');
        const querySnapshot = await userRef.where("email", "==", email).get();

        const [user] = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }))

        await adminAuth.setCustomUserClaims(uid, {
            admin: user.isAdmin,
            initialSurvey: user.completedInitialSurvey,
        });
   

        const expiresIn = 60 * 60 * 24 * 5 * 1000;
        const options = { maxAge: expiresIn, httpOnly: true, secure: true, path: "/" };
    
        cookies.set('session', idToken, options);
    } catch(error) {
        console.log(error);
        return new Response(JSON.stringify({
            success: false
        }))
    }


    return new Response(JSON.stringify({
        success: true,
        redirect: true
    }));
}

export const GET: RequestHandler = async ({request, cookies}) => {
    const oldToken = cookies.get("session");
    if(oldToken) {
        return new Response(JSON.stringify({token: true}));
    }
    return new Response(JSON.stringify({token: false}));
}