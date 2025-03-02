<script>
  import "../app.css";
  import { auth } from "$lib/firebase/firebase.app";
  import { onAuthStateChanged } from "firebase/auth";
  import { onMount } from "svelte";

  onMount(async () => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.log("user is not here");

        const tokenResult = await fetch("/api/sessionLogin", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (tokenResult.ok) {
          const data = await tokenResult.json();
          if (!data.token) {
            return;
          }
        }
        const result = await fetch("/api/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (result.ok) {
          const data = await result.json();
          if (data.success) {
            window.location.href = "/authentication";
          } else {
            console.log("Something went wrong when deleting the cookie");
          }
        }
        return;
      }
      console.log("generating new token");
      const token = await user.getIdToken();
      const result = await fetch("/api/sessionLogin", {
        method: "POST",
        body: JSON.stringify({ idToken: token }),
        headers: { "Content-Type": "application/json" },
      });
      if (result.ok) {
        const data = await result.json();
        if (data.redirect) {
          window.location.href = "/dashboard";
        }
        return;
      } else {
        console.log("Something wrong with the api request");
      }
    });

    return () => unsubscribe();
  });
  import Navbar from "./navbar.svelte";
</script>
<Navbar />
<slot />
