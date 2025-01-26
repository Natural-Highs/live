import { adminDb } from '$lib/firebase/firebase.admin.js';

export const PATCH = async ({request, url, cookies}) => {


    const data = await request.json();
    const newSurveyName = data.newSurveyName;
    const surveyId = url.searchParams.get("id");

    try {
        const surveyRef = adminDb.collection("surveys").doc(surveyId);
        await surveyRef.update({
            name: newSurveyName,
        })
        return new Response(
            JSON.stringify({success: true})
        )
    } catch(error) {
        return new Response(JSON.stringify({success: false
        }), { status: 500 });
    }
}