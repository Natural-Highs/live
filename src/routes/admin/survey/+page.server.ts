//need this page to move data logic to server side (getting error bc of client vs server)
import { db } from "../../../lib/firebase/firebase"; 
import type { PageServerLoad } from "./$types";

async function getUsers(){
    let users = [];
        const all_docs = await db.collection("users").get(); //get documents from users collection (doc contains fields for a user)
                                                            //await so this finishes fetching the documents (promise) before moving on
        if (!all_docs.empty) {
            users = all_docs.docs.map(doc => ({ //.doc gives array of the document objects for each user, map for new array
                id: doc.data().id, //.data() to get data from document
                username: doc.data().username
            }));
            return users;
        } else {
            return []; //empty array if no documents found
        }
}

export const load: PageServerLoad = async () => {
    const users = (await getUsers()) ?? []; //execute getusers, await because we need this data before moving on
                                            //nullish coalescing operator (??) will return the right hand side if the left is null
    return {users}; //return users object with document data, that will be available in a prop named users in +page.svelte
};