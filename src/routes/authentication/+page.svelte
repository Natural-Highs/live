<script>
  import { enhance } from "$app/forms";
  export let form;

  let register = false;
  let authenticating = false;

  // async function handleAuthenticate() {
  //     if (authenticating) {
  //         return;
  //     }
  //     if (!email || !password || (register && !confirmPass)) {
  //         error = true;
  //         return;
  //     }
  //     authenticating = true;

  //     try {
  //         if (!register) {
  //             await authHandlers.login(email, password);
  //         } else {
  //             await authHandlers.signup(email, password);
  //         }
  //     } catch (err) {
  //         console.log("There was an auth error", err);
  //         error = true;
  //         authenticating = false;
  //     }
  // }

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
      {#if form?.message}
        <div class="flex flex-row justify-center">
          <p class="text-md font-semibold text-error">{form?.message}</p>
        </div>
      {/if}
      <div class="flex flex-row justify-center">
        <input
          type="email"
          id="email"
          name="email"
          placeholder="Email"
          class="w-1/2 mx-2 p-2 rounded-md"
        />
      </div>
      <div class="flex flex-row justify-center">
        <input
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
            type="password"
            name="confirmPass"
            placeholder="Confirm Password"
            class="w-1/2 mx-2 p-2 rounded-md"
          />
        </div>
      {/if}

      <input type="hidden" id="regiester" name="register" value={register} />

      <div class="flex flex-row justify-center">
        <button type="submit" class="w-1/2 btn btn-primary">
          {#if authenticating}
            <p>Submitting</p>
          {:else}
            <p>Submit</p>
          {/if}
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
