import type { PageServerLoad } from "./$types";
import { Actions } from "@sveltejs/kit";
import {authStore} from "../../store/store";
import { db } from "$lib/firebase/firebase";



export const load: PageServerLoad = async ({ request, cookies }) => {
};


export const actions: Actions = {

    addSurvey: async ({request}) => {
        const formData = await request.formData();

        const userEmail = formData.get("userEmail");
        const surveyId = formData.get("surveyId");

        console.log(userEmail);
        console.log(surveyId);

        if(!userEmail || !surveyId) {
            return {
                status: "error",
                message: "Invalid fields!"
            }
        }

        const userRef = db.collection("users");
        const querySnapshot = await userRef.where("email", "==", userEmail).get();

        if(querySnapshot.empty) {
            return {
                status: "error",
                message: "Error validating user!"
            }
        }


        const [user] = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }))

        const userId = user.id;

        const surveyRef = db.collection("surveys").doc(surveyId);

        const foundSurvey = await surveyRef.get();

        if(!foundSurvey.exists) {
            return {
                status: "error",
                message: "Survey does not exist!"
            }
        }

        const foundSurveyData = foundSurvey.data();



        const newSurveyResponse = {
            surveyId: surveyId, // Replace with the actual survey ID
            userId: userId, // Replace with the actual user ID
            isComplete: false,
            surveyName: foundSurveyData.name,
            createdAt: new Date().toISOString(),
        };

        console.log(newSurveyResponse);

        const surveyResponseRef = db.collection("surveyResponses");

        const surveyAlreadyAddedSnapshot = await surveyResponseRef
        .where("surveyId", "==", surveyId)
        .where("userId", "==", userId)
        .get();

        if(!surveyAlreadyAddedSnapshot.empty) {
            return {
                status: "error",
                message: "Survey already added for user!"
            }
        }

        try {
            const newSurvey = await surveyResponseRef.add(newSurveyResponse);
            return {
                status: "success",
                data: newSurveyResponse,
            }
        } catch(error) {
            return {
                status: "error",
                message: "Something went wrong when adding the survey to the database",
            }
        }
        
        
        
    }

}