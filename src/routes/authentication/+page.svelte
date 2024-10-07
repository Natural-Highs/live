<script>
  import { enhance } from "$app/forms";
  import { getDoc, doc } from "firebase/firestore";
  // import { registerUser, signInUser } from '../../lib/firebase/db/client/auth'
  import { auth } from '../../lib/firebase/firebase.app'
  import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
  import { fail, redirect } from "@sveltejs/kit";

  export let form;

  let register = false;
  let authenticating = false;
  let email = "";
  let password = "";
  let confirmPass = "";
  let error = false;

  async function handleAuthenticate() {
    if(authenticating){
      return;
    }

    if (!email || !password || (register && !confirmPass)){
      error = true;
      console.log("invalid inputs");
      return;
    }

    authenticating = true;

    try {
      if (!register){
        try{
          const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password,
          );

          const user = userCredential.user;

          const token = await user.getIdToken();

          const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
          });

          if (response.ok) {
            error = false;
            window.location.href = "/dashboard";
          } else {
            console.error('Login failed');
          }
        }
        catch(err){
          error = true;
          console.error("Error logging in user:", err);
        }
      }
    } catch (err) {
      error = true;
      console.log('There was an auth error', err);
      authenticating = false;
    }
  }

  function handleRegister() {
    register = !register;
  }
</script>

<div class="py-32 w-screen flex flex-row justify-center">
  <div
    class=" w-1/2 flex flex-col justify-self-center justify-items-center gap-4"
  >
    <form
      class="flex flex-col justify-start w-full gap-2"
      method="POST"
      action="?/handleAuth"
      use:enhance
    >
      <h1 class="text-white text-center text-2xl font-semibold py-2">
        {register ? "Register" : "Login"}
      </h1>
      {#if error}
        <p class="text-center text-red-500 font-semibold">The information you have entered is not correct</p>
      {/if}
      <div class="flex flex-row justify-center">
        <input
          bind:value={email}
          type="email"
          id="email"
          name="email"
          placeholder="Email"
          class="w-1/2 mx-2 p-2 rounded-md"
        />
      </div>
      <div class="flex flex-row justify-center">
        <input
          bind:value={password}
          type="password"
          id="password"
          name="password"
          placeholder="Password"
          class="w-1/2 mx-2 p-2 rounded-md"
        />
      </div>
      {#if register}
        <div class="flex flex-row justify-center">
          <input
            bind:value={confirmPass}
            type="password"
            name="confirmPass"
            placeholder="Confirm Password"
            class="w-1/2 mx-2 p-2 rounded-md"
          />
        </div>
      {/if}

      <input type="hidden" id="register" name="register" value={register} />

      <div class="flex flex-row justify-center">
        <button on:click={handleAuthenticate} type="submit" class="w-1/2 btn btn-primary">
          <!-- {#if authenticating}
            <i class="fa-solid fa-spinner spin"/>
          {:else}
              Submit
          {/if} -->
          Submit
        </button>
      </div>
    </form>

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
