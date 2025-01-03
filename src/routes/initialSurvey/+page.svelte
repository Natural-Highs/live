<script>
  import { authStore } from "../../store/store";
  import { auth } from "$lib/firebase/firebase.app";
  import { signOut } from "firebase/auth";
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  // $: if (browser && !$authStore.loading && !$authStore.user) {
  //   goto("/authentication");
  // }

  // onMount(async () => {
  //   const unsubscribe = authStore.subscribe(async ({ user, initialSurvey }) => {
  //     console.log($authStore);
  //     if (user) {
  //       if (initialSurvey) {
  //         return (window.location.href = "/dashboard");
  //       }
  //     }
  //   });

  //   return () => unsubscribe();
  // });

  let selectedSexualIdentity = "";
  let selectedGender = "";
  let age = 0;

  let errorMessage = "";

  const fillSurvey = async () => {
    errorMessage = "";
    const user = auth.currentUser;
    if (!user) {
      errorMessage = "No current user found!";
      return;
    }
    const token = await user.getIdToken();
    const result = await fetch("/api/initialSurvey", {
      method: "POST",
      body: JSON.stringify({ token }),
      headers: { "Content-Type": "application/json" },
    });
    if (result.ok) {
      const data = await result.json();
      if (!data.success) {
        errorMessage = "An error occured!";
        return;
      }
    } else {
      errorMessage = "An error occurred!";
      return;
    }

    const newToken = await user.getIdToken(true);
    const newSessionResult = await fetch("/api/sessionLogin", {
      method: "POST",
      body: JSON.stringify({ idToken: newToken }),
      headers: { "Content-Type": "application/json" },
    });
    if (newSessionResult.ok) {
      const data = await newSessionResult.json();
      if (data.success) {
        return (window.location.href = "/dashboard");
      }
      errorMessage = data.message;
    } else {
      errorMessage = "An error occurred";
    }
  };

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
          window.location.href = "/dashboard";
        } else {
          console.log("Something went wrong when deleting the cookie");
        }
      }
    } catch (error) {
      console.log(error);
    }
  };
</script>

<div class="flex flex-col items-center space-y-5 text-xl mb-10">
  <h1 class="mt-5 text-blue-500">
    Please fill out this intial survey to complete your account registration:
  </h1>
  <button on:click={logOut} class="btn btn-primary">Sign Out</button>

  <div class="card w-full max-w-md bg-base-100 shadow-lg">
    <div class="card-body">
      <h2 class="card-title">Question 1</h2>
      <p>Select your gender</p>

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

  <button class="btn btn-primary" on:click={fillSurvey}> Submit </button>
</div>
