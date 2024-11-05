<!-- <script>
    import { getDoc, doc } from "firebase/firestore";
    import { onMount } from 'svelte';
    import { auth, db } from "$lib/firebase/firebase.app";
    import { onAuthStateChanged } from "firebase/auth";

    async function checkClient(user){
        if (!user) {
            window.location.href = "/authentication";
            return;
        }

        console.log("Current user:", user.uid);
        
        // Retrieve user document from Firestore
        const userDocRef = doc(db, "Users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            window.location.href = "/authentication";
        }
    }

    onMount(() => {
        // Use onAuthStateChanged to reliably get the auth state
        onAuthStateChanged(auth, (user) => {
            checkClient(user);
        });
    });
</script> -->

<div>
  <h1>Client Page</h1>
</div>
