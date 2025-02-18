<script>
  import { auth } from "$lib/firebase/firebase.app";
  import { authStore } from "../../store/store";
  import { goto } from "$app/navigation";
  import { signOut } from "firebase/auth";
  import { browser } from "$app/environment";
  import { onMount } from "svelte";
  import { enhance } from "$app/forms";
  import { Html5QrcodeScanner } from "html5-qrcode";

  // $: if (browser && !$authStore.loading && !$authStore.user) {
  //   goto("/authentication");
  // }

  let surveys = [];
  let message = "";

  onMount(async () => {
    const results = await fetch("/api/surveys", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    console.log("On dashboard page");
    if (!results.ok) {
      message = "An error occurred whilst loading the surveys";
      return;
    }

    const data = await results.json();
    console.log("Data: ", data);
    surveys = data;
  });
  // onMount(async () => {
  //   const unsubscribe = authStore.subscribe(async ({ user, initialSurvey }) => {
  //     if (user) {
  //       // const clientAuth = getAuth();
  //       // const user = clientAuth.currentUser;
  //       // const idToken = await user?.getIdToken();
  //       // console.log(idToken);

  //       if (!initialSurvey) {
  //         return goto("/initialSurvey");
  //       }
  //       try {
  //         const results = await fetch(`/api/surveys/?user=${user}`, {
  //           method: "GET",
  //         });
  //         if (!results.ok) {
  //           return;
  //         }

  //         const data = await results.json();
  //         console.log(data);
  //         surveys = data;
  //       } catch (error) {
  //         console.log(error);
  //       }
  //     }
  //   });

  //   return () => unsubscribe();
  // });

  const submitAddSurvey = ({ form, data, action, cancel }) => {
    message = "";
    return async ({ result, formElement, update }) => {
      console.log(result);
      if (result.data.status === "success") {
        surveys = [...surveys, result.data.data];
      } else {
        message = result.data.message;
      }
      const surveyIdInput = formElement.querySelector('input[name="surveyId"]');
      if (surveyIdInput) {
        surveyIdInput.value = "";
      }
    };
  };

  let qrCodeResult = "";
  let isScannerOpen = false;
  let scanner = null;

  const closeScanner = () => {
    if (isScannerOpen && scanner) {
      scanner
        .clear() // Stops and clears the scanner
        .then(() => {
          isScannerOpen = false;
        })
        .catch((err) => console.log("Camera stop error:", err));
      scanner = null;
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
          window.location.href = "/authentication";
        } else {
          console.log("Something went wrong when deleting the cookie");
        }
      }
    } catch (error) {
      console.log(error);
    }
  };
  const startScanner = () => {
    isScannerOpen = true;
    scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      false,
    );
    scanner.render(
      (decodedText) => {
        qrCodeResult = decodedText;

        const surveyIdInput = document.querySelector('input[name="surveyId"]');
        if (surveyIdInput) {
          surveyIdInput.value = qrCodeResult;
        }

        // Automatically submit the form
        const form = document.querySelector("form");
        if (form) {
          form.submit();
        }

        // handle the decoded result
        scanner.clear();
        scanner = null;
        // Stops the scanner after a successful scan
      },
      (error) => console.log("QR code scan error:", error),
    );
  };
</script>

<div>

  <h1 class="text-center mt-20 text-blue-500 font-extrabold text-lg">
    Surveys
  </h1>
  <div class="flex flex-col items-center mt-3 space-y-3">
    {#if surveys.length == 0}
      <h1 class="text-gray-500">No Surveys to display!</h1>
    {/if}
    {#each surveys as survey}
      <a href={`/dashboard/${survey?.surveyId}`}>
        <div class="card bg-base-100 w-96 shadow-xl cursor-pointer">
          <div class="card-body flex flex-col">
            <p>Name: {survey?.surveyName}</p>
            <p>ID: {survey?.surveyId}</p>
          </div>
        </div>
      </a>
    {/each}
  </div>
  <div class="card flex flex-col items-center mt-10">
    <h1 class="card-title">Add Survey</h1>
    <div class="flex flex-row space-x-3 items-center">
      <div class="flex flex-col items-center space-y-3">
        <div id="qr-reader"></div>
        {#if !scanner}
          <button on:click={startScanner} class="btn btn-primary"
            >Scan Survey Code</button
          >
        {/if}

        {#if scanner}
          <button on:click={closeScanner} class="btn btn-primary"
            >Stop Scan</button
          >
        {/if}

        <p>{qrCodeResult ? `QR Code Result: ${qrCodeResult}` : ""}</p>
      </div>
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
</div>
