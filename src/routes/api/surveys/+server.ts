import { db } from "$lib/firebase/firebase";
import { adminAuth } from "$lib/firebase/firebase.admin.js";


export const GET = async ({request, url, cookies}) => {

    const session = cookies.get("session");

    const decodedToken = await adminAuth.verifyIdToken(session);
    const userEmail = decodedToken.email;


    const userRef = db.collection("users");
    const querySnapshot = await userRef.where("email", "==", userEmail).get();

    const [user] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }))
    
    const userId = user.id;

    const surveyResponseRef = db.collection("surveyResponses");
    const responseSnapshot = await surveyResponseRef.where("userId", "==", userId).get();

    const surveyResponses = responseSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));

    return new Response(JSON.stringify(surveyResponses))
}