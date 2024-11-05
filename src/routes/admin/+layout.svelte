<!-- <script>
  import { getDoc, doc } from "firebase/firestore";
  import { onMount } from "svelte";
  import { auth, db } from "$lib/firebase/firebase.app";

  async function checkAdmin() {
    const user = auth.currentUser;

    console.log("Current user:", user?.uid);

    if (!user) {
      window.location.href = "/authentication";
    } else {
      const userDocRef = doc(db, "Users", user.uid);

      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (!userData.isAdmin) {
          window.location.href = "/authentication";
        }
      }
    }
  }

  onMount(() => {
    checkAdmin();
  });
</script> -->

<div>
  <slot />
</div>
