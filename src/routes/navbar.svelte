<script>
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { auth } from "$lib/firebase/firebase.app";
    import { authStore } from "../store/store";
    import { signOut } from "firebase/auth";


    let currentRoute = '';

    $: {
        $page.url.pathname;
        currentRoute = $page.url.pathname;
    }

    const logOut = async () => {
    try {
      await signOut(auth);
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
    } catch (error) {
      console.log(error);
    }
  };
</script>

<nav class="navbar bg-base-100">
    <div class="navbar-start">
        <a class="btn btn-ghost normal-case text-xl" href="/">Natural Highs</a>
    </div>
    <div class="navbar-center hidden lg:flex">
        <ul class="menu menu-horizontal p-0">
            {#if currentRoute.startsWith('/admin')}
                <li><a href="/admin">Home</a></li>
                <li><a href="/admin/responses">Responses</a></li>
                <li><a href="/admin/survey">Surveys</a></li>
            {:else}
                <li><a href="/dashboard">Home</a></li>
            {/if}
        </ul>
    </div>
    <div class="navbar-end">
        <h1> {$authStore.user ? "Hello " + $authStore.user + "!": ""}</h1> 
        <button class="btn" on:click={logOut}>Logout</button>
    </div>
</nav>