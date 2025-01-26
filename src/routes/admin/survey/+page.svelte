<script lang="ts">
  export let data;
  import { goto } from "$app/navigation"; //import for reroute
  import { page } from "$app/stores";
  import { enhance } from "$app/forms";
  let users = $page.data.users; //grab our users from the db from page.server.ts

  let errorMessage = "";

  const addSurveyEnhance = ({ form, data, action, cancel }) => {
    errorMessage = "";
    return async ({ result, update }) => {
      console.log(result.data);
      if (result.data.success === false) {
        errorMessage = "Please enter a valid survey name!";
      } else if (result.data.success === true) {
        const surveyId = result.data.id;
        goto(`/admin/survey/${surveyId}`);
      }
    };
  };
</script>

<div class="overflow-x-auto px-8">
  <table class="table">
    <thead class="test-lg">
      <tr>
        <th>UUID</th>
        <th>Name</th>
        <th>Edit</th>
        <th>Administer</th>
      </tr>
    </thead>
    <tbody>
      {#each data?.surveys as survey}
        <tr>
          <td>{survey.id} </td>
          <td>{survey.name}</td>
          <td
            ><button>
              <a href={`/admin/survey/${survey.id}`}
                ><i class="fa-solid fa-pencil" /></a
              ></button
            ></td
          >
          <td
            ><button>
              <i class="fa-solid fa-user-tie" />
            </button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<div class="flex flex-col items-center">
  <button
    class="btn"
    on:click={() => document.getElementById("my_modal_1").showModal()}
    >Add Survey</button
  >
</div>

<dialog id="my_modal_1" class="modal">
  <div class="modal-box flex flex-col items-center">
    <form method="POST" action="?/addSurvey" use:enhance={addSurveyEnhance}>
      <input
        name="surveyName"
        type="text"
        placeholder="Survey name..."
        class="input input-bordered"
      />
      <button type="submit" class="add-button pl-12">
        <i class="fa-solid fa-plus" /> Create Survey
      </button>
    </form>
    <div class="modal-action">
      <form method="dialog">
        <button class="btn btn-primary">Close</button>
      </form>
    </div>
    <p class="text-red-500">{errorMessage}</p>
  </div>
</dialog>
