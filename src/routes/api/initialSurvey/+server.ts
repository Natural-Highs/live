import { db } from "$lib/firebase/firebase";
import { auth } from '$lib/firebase/firebase.js';

export const POST = async ({request, url}) => 
{


    const userData = await request.json();
    const userEmail = url.searchParams.get("user");

    const userRef = db.collection("users");
    const querySnapshot = await userRef.where("email", "==", userEmail).get();


    const userDoc = querySnapshot.docs[0];

    const userDocData = userDoc.data();

    await userDoc.ref.update({
        completedInitialSurvey: true,
        sexualIdentity: userData.sexualIdentity,
        gender: userData.gender,
        age: userData.age
    });

    await auth.setCustomUserClaims(userDocData.uid, {
        admin: userDocData.isAdmin,
        initialSurvey: true,
    });

    return new Response(JSON.stringify({
        success: true,
        message: "User data successfully updated!" 
    }))

}