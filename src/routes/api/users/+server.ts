import { db } from '$lib/firebase/firebase.js';
import { auth } from '$lib/firebase/firebase.js';

export const GET = async ({request, url}) => {


    const userEmail = url.searchParams.get("user");

    const userRef = db.collection("users");
    const querySnapshot = await userRef.where("email", "==", userEmail).get();

    if(querySnapshot.empty) {
        return new Response(JSON.stringify({
            success: false,
            message: "User not found",
        }))
    }


    const [user] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }))

    try {
        const authUser = await auth.getUserByEmail(userEmail);
        await auth.setCustomUserClaims(authUser.uid, {
            admin: user.isAdmin,
            initialSurvey: user.completedInitialSurvey,
        });
        console.log("Custom claims set!");
    } catch(error) {
        console.log(error);
        return new Response(JSON.stringify({success: false, message: "Not today!"}));
    }

    console.log(user);

    return new Response(JSON.stringify({sucess: true, data: user}));
}