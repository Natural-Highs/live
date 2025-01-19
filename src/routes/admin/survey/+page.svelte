<script lang="ts">
  export let data;
  import { goto } from "$app/navigation"; //import for reroute
  import { page } from "$app/stores";
  import { enhance } from "$app/forms";
  let users = $page.data.users; //grab our users from the db from page.server.ts
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

<form method="POST" action="?/addSurvey" use:enhance>
  <button type="submit" class="add-button pl-12">
    <i class="fa-solid fa-plus" /> Create Survey
  </button>
</form>
