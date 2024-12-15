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

  if ($authStore.loading && $authStore.user != null) {
    goto("/dashboard");
  }

  async function handleSubmit(event) {
    errorMessage = "";
    event.preventDefault();
    if (register) {
      console.log("Closing");
      return;
    }
    authenticating = true;
    authStore.update((store) => {
      return {
        ...store,
        loading: true,
      };
    });

    if (!register) {
      try {
        const user = await signInWithEmailAndPassword(auth, email, password);
        const result = await fetch(`/api/users/?user=${email}`, {
          method: "GET",
        });
        if (!result.ok) {
          await signOut(auth);
          console.log("Result not okay");
        } else {
          const data = await result.json();
          const hasFilledOutSurvey = data?.data?.completedInitialSurvey;
          console.log("Filled out survey?", hasFilledOutSurvey);
          authStore.update((currentStore) => {
            return {
              ...currentStore,
              initialSurveyComplete:
                hasFilledOutSurvey ?? currentStore.initialSurvey,
            };
          });
        }
        authenticating = false;
        console.log($authStore);
        return;
      } catch (error) {
        console.log(error);
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
        <h1 class="text-white text-center text-2xl font-semibold py-2">
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
            class="w-1/2 mx-2 p-2 rounded-md"
            bind:value={email}
          />
        </div>
        <div class="flex flex-row justify-center">
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Password"
            class="w-1/2 mx-2 p-2 rounded-md"
            bind:value={password}
          />
        </div>
        <div class="flex flex-row justify-center">
          <input
            type="password"
            name="confirmPass"
            placeholder="Confirm Password"
            class="w-1/2 mx-2 p-2 rounded-md"
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
        <h1 class="text-white text-center text-2xl font-semibold py-2">
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
            class="w-1/2 mx-2 p-2 rounded-md"
            bind:value={email}
          />
        </div>
        <div class="flex flex-row justify-center">
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Password"
            class="w-1/2 mx-2 p-2 rounded-md"
            bind:value={password}
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

    <div class="flex flex-row justify-center">
      {#if register}
        <div class="flex flex-row">
          <p class="text-lg text-white font-semibold px-1">
            Already have an account?
          </p>
          <button
            on:click={handleRegister}
            on:keydown={() => {}}
            class="text-lg text-primary font-semibold"
          >
            Login</button
          >
        </div>
      {:else}
        <div class="flex flex-row">
          <p class="text-lg text-white font-semibold px-1">
            Don't have an account?
          </p>
          <button
            on:click={handleRegister}
            on:keydown={() => {}}
            class="text-lg text-primary font-semibold"
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
