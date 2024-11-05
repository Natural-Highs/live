import { fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { signInUser, registerUser } from "$lib/db/auth"
import { auth, db } from "$lib/firebase/firebase";
import { addDoc, collection } from "firebase/firestore";

export const load: PageServerLoad = async (event) => {
};
