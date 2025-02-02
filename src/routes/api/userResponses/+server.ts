import { adminDb, adminAuth } from '$lib/firebase/firebase.admin';

export const GET = async ({ request, url, cookies }) => {
    const surveyId = url.searchParams.get("id");

    if (!surveyId) {
        return new Response(JSON.stringify({
            success: false,
            message: "No survey ID provided",
        }), { status: 400 });
    }

    const surveyDocRef = adminDb.collection("surveys");
    const surveyDoc = await surveyDocRef.doc(surveyId).get();
    if (!surveyDoc.exists) {
        return new Response(JSON.stringify({
            success: false,
            message: "Survey not found",
        }));
    }


    const cookie = cookies.get("session");

    if (!cookie) {
        return new Response(JSON.stringify({ success: false, message: "No browse cookie set!" }));
    }

    const decodedToken = await adminAuth.verifyIdToken(cookie);
    const uid = decodedToken.uid;

    const userRef = adminDb.collection("users");
    const userSnapshot = await userRef.where("uid", "==", uid).get();

    const userData = userSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));

    if (!userData) {
        return new Response(JSON.stringify({ success: false, message: "User not found!" }));
    }

    const userId = userData[0].id;
    const surveyResponseRef = adminDb.collection("surveyResponses");
    const responseSnapshot = await surveyResponseRef.where("userId", "==", userId).where("surveyId", "==", surveyId).get();

    const [response] = responseSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));

    if (!response.isComplete) {
        return new Response(JSON.stringify({
            success: true,
            response,
        }));
    }

    const questionResponseRef = adminDb.collection("responses");
    const questionResponseSnapshot = await questionResponseRef.where("surveyResponseId", "==", response.id).get();
    const questionResponses = questionResponseSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));

    const surveyRef = adminDb.collection("questions");
    const questions = await surveyRef.where("surveyId", "==", surveyId).get();
    const questionsData = questions.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));




    const responsesWithText = questionResponses.map(response => {
        const matchingQuestion = questionsData.find(q => q.id === response.questionId);
        return {
            ...response,
            questionText: matchingQuestion ? matchingQuestion.questionText : 'Question not found'
        };
    });

    return new Response(JSON.stringify({
        success: true,
        response,
        questionResponses: responsesWithText,
    }));
}

export const POST = async ({ request, url, cookies }) => {
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

    const userRef = adminDb.collection("users");
    const userSnapshot = await userRef.where("uid", "==", uid).get();

    const userData = userSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));

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