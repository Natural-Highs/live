//need this page to move data logic to server side (getting error bc of client vs server)
import { db } from "../../../lib/firebase/firebase"; 
import type { PageServerLoad } from "./$types";

async function getSurveys(){
    let surveys = [];
        const all_docs = await db.collection("surveys").get(); //get documents from users collection (doc contains fields for a user)
                                                            //await so this finishes fetching the documents (promise) before moving on
        if (!all_docs.empty) {
            surveys = all_docs.docs.map(doc => ({ //.doc gives array of the document objects for each user, map for new array
                id: doc.id, //.data() to get data from document
                name: doc.data().name
            }));
            return surveys;
        } else {
            return []; //empty array if no documents found
        }
}

export const load: PageServerLoad = async () => {
    const surveys = (await getSurveys()) ?? []; //execute getusers, await because we need this data before moving on
                                            //nullish coalescing operator (??) will return the right hand side if the left is null
    return {surveys}; //return users object with document data, that will be available in a prop named users in +page.svelte
};