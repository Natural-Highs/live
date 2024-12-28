import { RequestHandler } from '@sveltejs/kit';
import { adminAuth, adminDb } from '$lib/firebase/firebase.admin';

export const POST: RequestHandler = async ({cookies, request}) => {

    const data = await request.json();
    const token = data.token;


    const cookie = cookies.get("session");

    if(!cookie) {
        return new Response(JSON.stringify({success: false, message: "No browse cookie set!"}));
    }

    try {
        const decodedToken = await adminAuth.verifyIdToken(cookie);

        const email = decodedToken.email;
    
        const userRef = adminDb.collection("users");
        const querySnapshot = await userRef.where("email", "==", email).get();
    
    
        const [user] = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }))
    
        const userDocRef = userRef.doc(user.id);
    
        await userDocRef.update({
            completedInitialSurvey: true,
        })
    
        console.log("updating claims");
        await adminAuth.setCustomUserClaims(user.uid, {
            admin: user.isAdmin,
            initialSurvey: true,
        });
    
        cookies.delete("session", {path: "/"});
    
        
        return new Response(JSON.stringify({success: true}));
    } catch(error) {
        console.log(error);
        return new Response(JSON.stringify({success: false, error: error.code}));
    }
 
}