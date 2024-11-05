<script>
  import QrScanner from "./QRScanner.svelte";
  import { enhance } from "$app/forms";
  import { writable } from "svelte/store";
  export let data;
  export let form;

  let fileDetails = writable(data.fileDetails);
  let message = "";

  const deleteQREnhance = ({ form, data, action, cancel }) => {
    return async ({ result, update }) => {
      console.log(result.data);

      if (result.data.status === "success") {
        fileDetails.update((details) => {
          return details.filter((detail) => detail.name != result.data.name);
        });
      }
    };
  };

  const submitAddQR = ({ form, data, action, cancel }) => {
    message = "";
    return async ({ result, formElement, update }) => {
      if (result.data.status === "success") {
        fileDetails.update((details) => {
          const updatedDetails = [
            ...details,
            {
              name: `survey-qr/${result.data.name}.png`,
              url: result.data.url,
              surveyLink: result.data.surveyLink,
            },
          ];
          console.log(updatedDetails);
          return updatedDetails;
        });
      }
      if (result.data.status === "error") {
        message = result.data.message;
      }
      formElement.reset();
      console.log(fileDetails);
    };
  };
</script>

<div>
  <QrScanner />

  <div class="flex flex-col items-center overflow-x-auto mt-10">
    <h1>QR Codes</h1>

    <table class="table mt-10">
      <thead>
        <tr>
          <th>UID</th>
          <th>Value</th>
          <th>Preview</th>
        </tr>
      </thead>
      <tbody>
        {#each $fileDetails as row}
          <tr>
            <td>{row.name}</td>
            <td>{row.surveyLink}</td>
            <td>
              <label for={row.url} class="btn">Show</label>
              <!-- Put this part before </body> tag -->
              <input type="checkbox" id={row.url} class="modal-toggle" />
              <div class="modal" role="dialog">
                <div
                  class="modal-box w-[300px] h-[300px] flex flex-col items-center justify-center"
                >
                  <img class="rounded-xl" width="200px" src={row.url} alt="" />
                </div>
                <label class="modal-backdrop" for={row.url}>Close</label>
              </div>
            </td>

            <td class="cursor-pointer">
              <form
                use:enhance={deleteQREnhance}
                method="POST"
                action="?/deleteSurvey"
              >
                <input name="surveyName" value={row.name} type="text" hidden />
                <button type="submit">×</button>
              </form>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="card">
    <form
      class="card-body form-control flex items-center space-y-3"
      method="POST"
      action="?/uploadSurvey"
      use:enhance={submitAddQR}
    >
      <input
        placeholder="Survey Name"
        name="surveyName"
        class="input input-bordered"
        type="text"
        required
      />
      <input
        class="input input-bordered"
        name="surveyLink"
        type="text"
        placeholder="Link"
        required
      />
      <button type="submit" class="btn btn-primary">Generate QR Code</button>
      {#if message}
        <p class="text-red-500">{message}</p>
      {/if}
    </form>
  </div>
</div>
