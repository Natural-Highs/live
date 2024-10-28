<script lang="ts">
    import { goto } from "$app/navigation"; //import for reroute

    function addsurvey(surveyID: string) { //rerouting
        goto(`/admin/survey/templates/${surveyID}`);
    }

    import { page } from "$app/stores";
    let users = $page.data.users; //grab our users from the db from page.server.ts

    //console.log("script", users); (ucomment to see final array before it's inserted)

</script>

<div class="table-container">
    <table class="table">
        <thead style="font-size:large">
            <tr>
                <th>UUID</th>
                <th>Name</th>
                <th>Edit</th>
                <th>Administer</th>
            </tr>
        </thead>
        <tbody>
            {#each users as user}
                <tr>
                    <td>{user.id}</td>
                    <td>{user.username}</td>
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
<button style="padding-left: 40px" class="add-button" on:click={() => addsurvey("whateverthisidis")} ><i class="fa-solid fa-plus" /> Add Survey</button>

<style>
    .table-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex: 1;
        padding-top: 24px;
        padding-left: 24px;
        padding-right: 24px;
        padding-bottom: 12px;
    }

    .table {
        padding-left: 90%;
        border: 2px solid #333;
        height: 100%;
        width: 100%;
        font-size: medium;
    }

    .table th,
    .table td {
        padding: 10px;
        width: 25%;
    }
</style>
