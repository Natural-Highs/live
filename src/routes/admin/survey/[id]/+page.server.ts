import { redirect } from "@sveltejs/kit";
import { adminDb } from "$lib/firebase/firebase.admin";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ params, cookies }) => {
    const surveyId = params.id;

    try {
      const surveyRef = adminDb.collection("surveys");
      const surveyData = await surveyRef.doc(surveyId).get();
      if(!surveyData.exists) {
        console.log("Survey doesn't exist!");
        return {
          questions: [],
          message: "No survey exists!"
        }
      }
      const questionRef = adminDb.collection("questions");
      const questionData = await questionRef.where("surveyId", "==", surveyId).get();
      const questions = questionData.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    return {
      questions: questions,
    }
    } catch(error) {
      console.log(error)
      return {
        questions: [],
        message: "An error occurred"
      }
    }
    

  };