<script>
  import { page } from "$app/stores";
  import { onMount } from "svelte";

  let questions = [];
  let message = "";

  const id = $page.params.id;

  onMount(async () => {
    const response = await fetch(`/api/surveyQuestions/?id=${id}`);
    if (response.ok) {
      const data = await response.json();
      questions = data.questions;
      console.log(data);
    } else {
      message = "Something went wrong when fetching survey questions";
    }
  });
</script>

<p>Survey {id}</p>

<div class="flex flex-col space-y-3">
  {#each questions as question}
    <div>
      <p>{question.questionText}</p>
    </div>
  {/each}
  <p class="text-red-500">{message}</p>
</div>
