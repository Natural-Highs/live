<script lang="ts">
  export let data;
  import { goto } from "$app/navigation"; //import for reroute

  function addsurvey(surveyID: string) {
    //rerouting
    goto(`/admin/survey/templates/${surveyID}`);
  }

  import { page } from "$app/stores";
  let users = $page.data.users; //grab our users from the db from page.server.ts

  //console.log("script", users); (ucomment to see final array before it's inserted)
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
          <td>{survey.id}</td>
          <td>{survey.name}</td>
          <td><button> <i class="fa-solid fa-pencil" /></button></td>
          <td
            ><button>
              <i class="fa-solid fa-user-tie" />
            </button></td
          >
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<!-- not sure how we're adding in the survey id rout, but for now button takes you to a page with whatever parameter was passed in -->
<button
  class="add-button pl-12"
  on:click={() => addsurvey("whateverthisidis")}
  ><i class="fa-solid fa-plus" /> Add Survey</button
>
