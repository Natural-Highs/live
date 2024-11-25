<script>
  import { auth } from "$lib/firebase/firebase.app";
  import { authStore } from "../../store/store";
  import { goto } from "$app/navigation";
  import { signOut } from "firebase/auth";
  import { browser } from "$app/environment";
  import { onMount } from "svelte";
  import { getAuth } from "firebase/auth";
  import { enhance } from "$app/forms";

  $: if (browser && !$authStore.loading && !$authStore.user) {
    goto("/authentication");
  }

  let surveys = [];
  let message = "";

  onMount(async () => {
    const unsubscribe = authStore.subscribe(async ({ user }) => {
      if (user) {
        // const clientAuth = getAuth();
        // const user = clientAuth.currentUser;
        // const idToken = await user?.getIdToken();
        // console.log(idToken);
        try {
          const results = await fetch(`/api/surveys/?user=${user}`, {
            method: "GET",
          });
          if (!results.ok) {
            return;
          }

          const data = await results.json();
          console.log(data);
          surveys = data;
        } catch (error) {
          console.log(error);
        }
      }
    });

    return () => unsubscribe();
  });

  const submitAddSurvey = ({ form, data, action, cancel }) => {
    message = "";
    return async ({ result, formElement, update }) => {
      console.log(result);
      if (result.data.status === "success") {
        surveys = [...surveys, result.data.data];
      } else {
        message = result.data.message;
      }
      formElement.reset();
    };
  };
</script>

<div>
  <div class="flex flex-col items-center space-y-3 mt-5">
    <h1>Hello {$authStore.user ? $authStore.user : ""}</h1>
    <button
      on:click={async () => {
        await signOut(auth);
      }}
      class="btn btn-primary">Sign Out</button
    >
  </div>

  <h1 class="text-center mt-20 text-blue-500 font-extrabold text-lg">
    Surveys
  </h1>
  <div class="flex flex-col items-center mt-3 space-y-3">
    {#if surveys.length == 0}
      <h1 class="text-gray-500">No Surveys to display!</h1>
    {/if}
    {#each surveys as survey}
      <div class="card bg-base-100 w-96 shadow-xl">
        <div class="card-body flex flex-col">
          <p>Name: {survey?.surveyName}</p>
          <p>ID: {survey?.surveyId}</p>
        </div>
      </div>
    {/each}
  </div>
  <div class="card flex flex-col items-center mt-10">
    <h1 class="card-title">Add Survey</h1>
    <form
      class="card-body form-control flex items-center space-y-3"
      method="POST"
      action="?/addSurvey"
      use:enhance={submitAddSurvey}
    >
      <input
        class="input input-bordered"
        type="text"
        name="surveyId"
        required
        placeholder="Survey Id..."
      />
      <input hidden name="userEmail" value={$authStore.user} />
      <button class="btn btn-primary">Submit</button>
      <p class="text-red-500">{message}</p>
    </form>
  </div>
</div>
