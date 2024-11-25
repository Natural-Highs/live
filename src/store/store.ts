import { writable } from "svelte/store";
import {onAuthStateChanged} from "firebase/auth";
import { auth } from "../lib/firebase/firebase.app";

export const authStore = writable({
  user: null,
  loading: true,
  data: {},
});


onAuthStateChanged(auth, (user) => {
  console.log("Auth state changed");
    authStore.set({
      user: user ? user.email : null,
      loading: false,
      data: {}, // Include additional user data if needed
    });
});
