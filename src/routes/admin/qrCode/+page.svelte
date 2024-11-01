<script>
  import QrScanner from "./QRScanner.svelte";
  import { enhance } from "$app/forms";
  export let data;
  export let form;

  let fileDetails = data.fileDetails;

  let message = "";

  let options = {
    result: async (response, formElement) => {},
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
        {#each fileDetails as row}
          <tr>
            <td>{row.name.split("/")[1]}</td>
            <td>{row.surveyLink}</td>
            <label for="my_modal_7" class="btn">Show</label>

            <!-- Put this part before </body> tag -->
            <input type="checkbox" id="my_modal_7" class="modal-toggle" />
            <div class="modal" role="dialog">
              <div
                class="modal-box w-[300px] h-[300px] flex flex-col items-center justify-center"
              >
                <img class="rounded-xl" width="200px" src={row.url} alt="" />
              </div>
              <label class="modal-backdrop" for="my_modal_7">Close</label>
            </div>
            <td class="cursor-pointer">×</td>
          </tr>
        {/each}

        <tr>
          <td>{form?.name ? form.name : ""}</td>
          <td>{form?.surveyLink ? form.surveyLink : ""}</td>

          <!-- Put this part before </body> tag -->
          {#if form?.url}
            <label for="my_modal_7" class="btn">Close</label>
            <input type="checkbox" id="my_modal_7" class="modal-toggle" />
            <div class="modal" role="dialog">
              <div
                class="modal-box w-[300px] h-[300px] flex flex-col items-center justify-center"
              >
                <img class="rounded-xl" width="200px" src={form?.url} alt="" />
              </div>
            </div>
          {/if}

          <td class="cursor-pointer">{form?.url ? "×" : ""}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="card">
    <form
      class="card-body form-control flex items-center space-y-3"
      method="POST"
      action="?/uploadSurvey"
      use:enhance={options.result}
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
      <button class="btn btn-primary">Generate QR Code</button>
      {#if message}
        <p class="text-red-300">{message}</p>
      {/if}
    </form>
  </div>
</div>
