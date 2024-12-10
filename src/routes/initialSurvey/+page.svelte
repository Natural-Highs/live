<script>
  import { authStore } from "../../store/store";
  import { auth } from "$lib/firebase/firebase.app";
  import { signOut } from "firebase/auth";
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  $: if (browser && !$authStore.loading && !$authStore.user) {
    goto("/authentication");
  }

  onMount(async () => {
    const unsubscribe = authStore.subscribe(async ({ user, initialSurvey }) => {
      console.log($authStore);
      if (user) {
        if (initialSurvey) {
          return (window.location.href = "/dashboard");
        }
      }
    });

    return () => unsubscribe();
  });

  let selectedSexualIdentity = "";
  let selectedGender = "";
  let age = 0;

  let errorMessage = "";

  const submitSurvey = async () => {
    errorMessage = "";
    if (!selectedSexualIdentity || !selectedGender) {
      errorMessage = "Must fill out all fields!";
      return;
    }
    if (age <= 0) {
      errorMessage = "Invalid age!";
      return;
    }

    const result = await fetch(`/api/initialSurvey/?user=${$authStore.user}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sexualIdentity: selectedSexualIdentity,
        gender: selectedGender,
        age: age,
      }),
    });

    if (!result.ok) {
      errorMessage = "Something failed";
      return;
    }

    authStore.update((originalStore) => {
      return {
        ...originalStore,
        initialSurvey: true,
      };
    });

    const data = await result.json();
    console.log(data);
  };
</script>

<div class="flex flex-col items-center space-y-5 text-xl mb-10">
  <h1 class="mt-5 text-blue-500">
    Please fill out this intial survey to complete your account registration:
  </h1>
  <button
    on:click={async () => {
      await signOut(auth);
    }}
    class="btn btn-primary">Sign Out</button
  >
  <!-- Question Card -->
  <div class="card w-full max-w-md bg-base-100 shadow-lg">
    <div class="card-body">
      <h2 class="card-title">Question 1</h2>
      <p>Select your gender</p>

      <!-- Multiple Choice Options -->
      <div class="form-control">
        <label class="label cursor-pointer">
          <span class="label-text">Male</span>
          <input
            type="radio"
            name="question1"
            class="radio checked:bg-blue-500"
            bind:group={selectedGender}
            value="Male"
          />
        </label>
        <label class="label cursor-pointer">
          <span class="label-text">Female</span>
          <input
            type="radio"
            name="question1"
            class="radio checked:bg-blue-500"
            bind:group={selectedGender}
            value="Female"
          />
        </label>
        <label class="label cursor-pointer">
          <span class="label-text">Other</span>
          <input
            type="radio"
            name="question1"
            class="radio checked:bg-blue-500"
            bind:group={selectedGender}
            value="Other"
          />
        </label>
      </div>
    </div>
  </div>

  <div class="card w-full max-w-md bg-base-100 shadow-lg">
    <div class="card-body">
      <h2 class="card-title">Question 2</h2>
      <p>Select your sexual identity</p>

      <!-- Multiple Choice Options -->
      <div class="form-control">
        <label class="label cursor-pointer">
          <span class="label-text">Asexual</span>
          <input
            type="radio"
            name="question1"
            class="radio checked:bg-blue-500"
            bind:group={selectedSexualIdentity}
            value="Asexual"
          />
        </label>
        <label class="label cursor-pointer">
          <span class="label-text">Homosexual</span>
          <input
            type="radio"
            name="question1"
            class="radio checked:bg-blue-500"
            bind:group={selectedSexualIdentity}
            value="Homosexual"
          />
        </label>
        <label class="label cursor-pointer">
          <span class="label-text">Pansexual</span>
          <input
            type="radio"
            name="question1"
            class="radio checked:bg-blue-500"
            bind:group={selectedSexualIdentity}
            value="Pansexual"
          />
        </label>
        <label class="label cursor-pointer">
          <span class="label-text">Bisexual</span>
          <input
            type="radio"
            name="question1"
            class="radio checked:bg-blue-500"
            bind:group={selectedSexualIdentity}
            value="Bisexual"
          />
        </label>
        <label class="label cursor-pointer">
          <span class="label-text">Heterosexual</span>
          <input
            type="radio"
            name="question1"
            class="radio checked:bg-blue-500"
            bind:group={selectedSexualIdentity}
            value="Heteroxexual"
          />
        </label>
        <label class="label cursor-pointer">
          <span class="label-text">Other</span>
          <input
            type="radio"
            name="sexualIdentity"
            class="radio checked:bg-blue-500"
            bind:group={selectedSexualIdentity}
            value="Other"
          />
        </label>
      </div>
    </div>
  </div>

  <div class="card w-full max-w-md bg-base-100 shadow-lg">
    <div class="card-body">
      <h2 class="card-title">Question 3</h2>
      <p>Enter your age</p>
      <div class="form-control">
        <label class="label cursor-pointer">
          <span class="label-text">Age</span>
          <input
            type="number"
            name="age"
            class="input input-bordered w-full max-w-xs"
            min="0"
            bind:value={age}
          />
        </label>
      </div>
    </div>
  </div>

  <!-- Submit Button -->
  <button class="btn btn-primary" on:click={submitSurvey}> Submit </button>
</div>
