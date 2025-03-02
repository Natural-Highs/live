<script>
  import { enhance } from "$app/forms";
  import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
  } from "firebase/auth";
  import { auth } from "$lib/firebase/firebase.app";
  import { authStore } from "../../store/store";
  import Layout from "../+layout.svelte";
  import { goto } from "$app/navigation";

  let register = false;
  let authenticating = false;
  let email = "";
  let password = "";
  let errorMessage = "";
  let password2 = "";

  function handleRegister() {
    register = !register;
  }

  // if ($authStore.loading && $authStore.user != null) {
  //   goto("/dashboard");
  // }

  async function handleSubmit(event) {
    errorMessage = "";
    event.preventDefault();
    if (register) {
      console.log("Closing");
      return;
    }

    if (!register) {
      try {
        const userRecord = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        const idToken = await userRecord.user.getIdToken();

        const result = await fetch("/api/sessionLogin", {
          method: "POST",
          body: JSON.stringify({ idToken }),
          headers: { "Content-Type": "application/json" },
        });

        if (result.ok) {
          const data = await result.json();
          if (data.success) {
            return (window.location.href = "/dashboard");
          }
        } else {
          errorMessage = "Something went wrong when adding cookie!";
        }
        authenticating = false;
        return;
      } catch (error) {
        errorMessage = "Invalid credentials!";
      }
      authenticating = false;
    }
  }
</script>

<div class="py-32 w-screen flex flex-row justify-center">
  <div
    class=" w-1/2 flex flex-col justify-self-center justify-items-center gap-4"
  >
    {#if register}
      <form
        class="flex flex-col justify-start w-full gap-2"
        action="?/createUser"
        method="POST"
      >
        <h1 class="text-grey dark:text-white text-center text-2xl font-semibold py-2">
          {register ? "Register" : "Login"}
        </h1>
        {#if errorMessage}
          <div class="flex flex-row justify-center">
            <p class="text-md font-semibold text-error">{errorMessage}</p>
          </div>
        {/if}
        <div class="flex flex-row justify-center">
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Email"
            class="w-1/2 mx-2 p-2 rounded-md bg-base-200 dark:bg-neutral"
            bind:value={email}
          />
        </div>
        <div class="flex flex-row justify-center">
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Password"
            class="w-1/2 mx-2 p-2 rounded-md bg-base-200 dark:bg-neutral"
            bind:value={password}
          />
        </div>
        <div class="flex flex-row justify-center">
          <input
            type="password"
            name="confirmPass"
            placeholder="Confirm Password"
            class="w-1/2 mx-2 p-2 rounded-md bg-base-200 dark:bg-neutral"
            bind:value={password2}
          />
        </div>

        <input type="hidden" id="regiester" name="register" value={register} />

        <div class="flex flex-row justify-center">
          <button
            disabled={authenticating}
            type="submit"
            class="w-1/2 btn btn-primary"
          >
            {#if authenticating}
              <p>Submitting</p>
            {:else}
              <p>Submit</p>
            {/if}
          </button>
        </div>
      </form>
    {/if}
    {#if !register}
      <form
        class="flex flex-col justify-start w-full gap-2"
        on:submit={handleSubmit}
      >
        <h1 class="text-grey dark:text-white text-center text-2xl font-semibold py-2">
          Login
        </h1>
        {#if errorMessage}
          <div class="flex flex-row justify-center">
            <p class="text-md font-semibold text-error">{errorMessage}</p>
          </div>
        {/if}
        <div class="flex flex-row justify-center">
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Email"
            class="w-1/2 mx-2 p-2 rounded-md bg-base-200 dark:bg-neutral"
            bind:value={email}
          />
        </div>
        <div class="flex flex-row justify-center opacity-100">
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Password"
            class="w-1/2 mx-2 p-2 rounded-md bg-base-200 dark:bg-neutral"
            bind:value={password}
          />
        </div>

        <input type="hidden" id="regiester" name="register" value={register} />

        <div class="flex flex-row justify-center opacity-100">
          <button
            disabled={authenticating}
            type="submit"
            class="w-1/2 btn btn-primary"
          >
            {#if authenticating}
              <p>Submitting</p>
            {:else}
              <p>Submit</p>
            {/if}
          </button>
        </div>
      </form>
    {/if}

    <div class="flex flex-row justify-center">
      {#if register}
        <div class="flex justify-center flex-wrap">
          <p class="text-grey dark:text-white font-semibold px-1">
            Already have an account?
          </p>
          <button
            on:click={handleRegister}
            on:keydown={() => {}}
            class="text-base text-primary font-semibold underline"
          >
            Login</button
          >
        </div>
      {:else}
        <div class="flex justify-center flex-wrap">
          <p class="text-grey dark:text-white font-semibold px-1">
            Don't have an account?
          </p>
          <button
            on:click={handleRegister}
            on:keydown={() => {}}
            class="text-base text-primary font-semibold underline"
          >
            Register</button
          >
        </div>
      {/if}
    </div>
  </div>
</div>

<button
  on:click={() => {
    console.log($authStore);
  }}>Test</button
>
