import { adminDb } from "$lib/firebase/firebase.admin";

export const GET = async ({ request, url, cookies }) => {


    const surveyId = url.searchParams.get("id");

    try {
        const surveyRef = adminDb.collection("surveys");
        const surveyData = await surveyRef.doc(surveyId).get();
        if (!surveyData.exists) {
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
        return new Response(JSON.stringify({ questions }));
    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: "Something went wrong" }))
    }
}

export const POST = async ({ request, url, cookies }) => {
    const data = await request.json();

    const { newQuestion, surveyId } = data;

    try {

        const surveyRef = adminDb.collection("surveys");
        const surveyData = await surveyRef.doc(surveyId).get();
        if (!surveyData.exists) {
            console.log("Survey doesn't exist!");
            return new Response(JSON.stringify({
                success: false,
                message: "No survey exists!",
            }), { status: 500 });
        }

        const questionsRef = adminDb.collection("questions");
        const addedDoc = await questionsRef.add({
            ...newQuestion, surveyId
        })

        return new Response(JSON.stringify({ success: true, questionId: addedDoc.id }));
    } catch (error) {
        console.log(error);
        return new Response(JSON.stringify({ success: false, message: "An error occurred" }, { status: 500 }));
    }

}

export const DELETE = async ({ request, url, cookies }) => {

    const data = await request.json();
    const { questionId } = data;

    try {
        const questionsRef = adminDb.collection("questions");
        const documentRef = questionsRef.doc(questionId);
        await documentRef.delete();
        return new Response(JSON.stringify({ success: true }));
    } catch (error) {
        return new Response(JSON.stringify({ success: false }), { status: 500 })
    }
}

export const PATCH = async ({ request, url, cookies }) => {
    const data = await request.json();
    const { question } = data;

    console.log(question);
    const { isMultipleChoice, questionText, options, questionId } = question;

    try {
        const questionsRef = adminDb.collection("questions");
        const documentRef = questionsRef.doc(questionId);
        if (isMultipleChoice) {
            await documentRef.update({ questionText, options, isMultipleChoice });
        } else {
            await documentRef.update({ questionText, isMultipleChoice });
        }
        return new Response(JSON.stringify({ success: true }));
    } catch (error) {
        console.log(error);
        return new Response(JSON.stringify({ success: false }), { status: 500 });
    }

}
