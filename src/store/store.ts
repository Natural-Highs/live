import { writable } from "svelte/store";
import {onAuthStateChanged, getIdTokenResult} from "firebase/auth";
import { auth } from "../lib/firebase/firebase.app";

export const authStore = writable({
  user: null,
  loading: true,
  initialSurvey: false,
  admin: false,
  data: {},
});


onAuthStateChanged(auth, async (user) => {
  console.log("Auth state changed");

    let claims = {
      initialSurvey: false,
      admin: false,
    }

    if(user) {
      await user.getIdToken(true);
      const idTokenResult = await getIdTokenResult(user);
      claims = idTokenResult.claims;
    }

    authStore.update((originalStore) => {
      return {
        ...originalStore, 
        user: user ? user.email : null,
        loading: false,
        initialSurvey: claims?.initialSurvey,
        admin: claims?.admin,
        data: {}
      }
    })
    // authStore.set({
    //   user: user ? user.email : null,
    //   loading: false,
    //   initialSurveyComplete: false,
    //   data: {}, // Include additional user data if needed
    // });
});
