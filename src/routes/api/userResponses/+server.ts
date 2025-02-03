import { adminDb, adminAuth } from '$lib/firebase/firebase.admin';
import type { RequestHandler } from '@sveltejs/kit';
import { fetchByQuery } from '$lib/utils/firebaseCalls';

export const GET: RequestHandler = async ({ request, url, cookies }) => {
    const surveyId = url.searchParams.get("id");
    if (!surveyId) {
        return new Response(JSON.stringify({
            success: false,
            message: "No survey ID provided",
        }), { status: 400 });
    }

    try {
        const surveyDocRef = adminDb.collection("surveys");
        const surveyDoc = await surveyDocRef.doc(surveyId).get();
        if (!surveyDoc.exists) {
            return new Response(JSON.stringify({
                success: false,
                message: "Survey not found",
            }));
        }
    } catch (error) {
        console.error("Error fetching survey:", error);
        return new Response(JSON.stringify({
            success: false,
            message: "Error fetching survey",
        }), { status: 500 });
    }

    const cookie = cookies.get("session");

    if (!cookie) {
        return new Response(JSON.stringify({ success: false, message: "No browse cookie set!" }));
    }
    const decodedToken = await adminAuth.verifyIdToken(cookie);
    const uid = decodedToken.uid;

    const userData = await fetchByQuery("users", "uid", uid);

    if (!userData) {
        return new Response(JSON.stringify({ success: false, message: "User not found!" }));
    }

    const userId = userData[0].id;

    const surveyResponseRef = adminDb.collection("surveyResponses");
    const surveyResponseSnapshot = await surveyResponseRef
        .where("userId", "==", userId)
        .where("surveyId", "==", surveyId)
        .get();

    if (surveyResponseSnapshot.empty) {
        return new Response(JSON.stringify({
            success: false,
            message: "Survey response not found",
        }));
    }

    const response = surveyResponseSnapshot.docs[0].data();
    const responseId = surveyResponseSnapshot.docs[0].id;

    if (!response.isComplete) {
        return new Response(JSON.stringify({
            success: true,
            response: { ...response, id: responseId },
        }));
    }

    const questionResponses = await fetchByQuery("responses", "surveyResponseId", responseId);

    const questionsData = await fetchByQuery("questions", "surveyId", surveyId);

    const responsesWithText = questionResponses.map(response => {
        const matchingQuestion = questionsData.find(q => q.id === response.questionId);
        return {
            ...response,
            questionText: matchingQuestion ? matchingQuestion.questionText : 'Question not found',
            isMultipleChoice: matchingQuestion ? matchingQuestion.isMultipleChoice : false,
            options: matchingQuestion ? matchingQuestion.options : [],
        };
    });
    return new Response(JSON.stringify({
        success: true,
        response: { ...response, id: responseId },
        questionResponses: responsesWithText,
    }));
}

export const POST: RequestHandler = async ({ request, url, cookies }) => {
    const surveyId = url.searchParams.get("id");

    const { userResponses } = await request.json();

    if (!userResponses) {
        return new Response(JSON.stringify({
            success: false,
            message: "No user responses provided",
        }), { status: 400 });
    };


    if (!surveyId) {
        return new Response(JSON.stringify({
            success: false,
            message: "No survey ID provided",
        }), { status: 400 });
    }

    const cookie = cookies.get("session");

    if (!cookie) {
        return new Response(JSON.stringify({ success: false, message: "No browse cookie set!" }));
    }

    const decodedToken = await adminAuth.verifyIdToken(cookie);
    const uid = decodedToken.uid;

    const userData = await fetchByQuery("users", "uid", uid);

    if (!userData) {
        return new Response(JSON.stringify({ success: false, message: "User not found!" }));
    }

    const userId = userData[0].id;

    const surveyResponseRef = adminDb.collection("surveyResponses");
    const surveyResponseSnapshot = await surveyResponseRef.where("userId", "==", userId).where("surveyId", "==", surveyId).get();

    await surveyResponseRef.doc(surveyResponseSnapshot.docs[0].id).update({
        isComplete: true,
    });

    const surveyResponseId = surveyResponseSnapshot.docs[0].id;

    for (const response of userResponses) {
        await adminDb.collection("responses").add({
            surveyResponseId: surveyResponseId,
            ...response,
        });
    }

    return new Response(JSON.stringify({
        success: true,
        message: "Survey responses submitted successfully",
    }));
}


export const PATCH: RequestHandler = async ({ request, url, cookies }) => {
    const { responseId, responseText } = await request.json();

    try {
        await adminDb.collection("responses").doc(responseId).update({
            responseText,
        });
    } catch (error) {
        console.error("Error updating response:", error);
        return new Response(JSON.stringify({
            success: false,
            message: "Error updating response",
        }), { status: 500 });
    }


    return new Response(JSON.stringify({
        success: true,
        message: "Response updated successfully",
    }));
}