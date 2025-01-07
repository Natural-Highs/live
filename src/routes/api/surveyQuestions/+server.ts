import { adminDb } from "$lib/firebase/firebase.admin";

export const GET = async ({request, url, cookies}) => {


    const surveyId = url.searchParams.get("id");

    try {
        const surveyRef = adminDb.collection("surveys");
        const surveyData = await surveyRef.doc(surveyId).get();
        if(!surveyData.exists) {
          console.log("Survey doesn't exist!");
          return new Response(JSON.stringify({
            success: false,
            message: "No survey exists!",
          }))
        }
        const questionRef = adminDb.collection("questions");
        const questionData = await questionRef.where("surveyId", "==", surveyId).get();
        const questions = questionData.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
      }));
    return new Response(JSON.stringify({questions}));
    } catch(error) {
        return new Response(JSON.stringify({success: false, message: "Something went wrong"}))
    }
}
