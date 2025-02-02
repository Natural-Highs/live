<script>
  import { page } from "$app/stores";
  import { onMount } from "svelte";

  const id = $page.params.id;

  let isComplete = false;
  let responses = [];
  let questions = [];
  let userResponses = [];
  let loading = true;
  let errorMessage = "";
  let surveyName = "";
  let loadErrorMessage = "";

  const handleOptionSelect = (questionId, option) => {
    const existingQuestionIndex = userResponses.findIndex(
      (r) => r.questionId === questionId,
    );
    if (existingQuestionIndex !== -1) {
      userResponses[existingQuestionIndex].responseText = option;
    } else {
      userResponses = [...userResponses, { questionId, responseText: option }];
    }
  };

  onMount(async () => {
    const response = await fetch(`/api/userResponses?id=${id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      loadErrorMessage = "Something went wrong whne loading the survey!";
      return;
    }
    const data = await response.json();
    if (!data.success) {
      loadErrorMessage = data.message;
      return;
    }
    console.log("Survey? ", data);

    isComplete = data.response.isComplete;
    surveyName = data.response.surveyName;
    if (isComplete) {
      responses = data.questionResponses;
      console.log(responses);
      return;
    }

    const questionsResponse = await fetch(`/api/surveyQuestions?id=${id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const questionsData = await questionsResponse.json();
    questions = questionsData.questions;
    loading = false;
  });

  const handleSubmit = async () => {
    errorMessage = "";
    if (userResponses.length < questions.length) {
      errorMessage = "Please answer all questions!";
      return;
    }
    const response = await fetch(`/api/userResponses?id=${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userResponses }),
    });
    const data = await response.json();
    if (data.success) {
      responses = questions.map((question) => ({
        questionText: question.questionText,
        responseText:
          userResponses.find((r) => r.questionId === question.id)
            ?.responseText || "",
      }));
      isComplete = true;
      return;
    }
    errorMessage = "Something went wrong when submitting the survey!";
  };
</script>

<div class="flex flex-col items-center space-y-5 text-xl mb-10 mt-10">
  <a href="/dashboard" class="btn btn-primary">Back to Dashboard</a>
  {#if loadErrorMessage}
    <p class="text-red-500">{loadErrorMessage}</p>
  {/if}
  <h1 class="text-2xl font-bold">{surveyName}</h1>
  {#if isComplete}
    <p>Survey is complete! 😉</p>
    <h2>Responses</h2>
    {#each responses as response, index (response.questionText)}
      <div
        class="card w-full max-w-md bg-base-100 shadow-lg hover:shadow-xl transition-shadow duration-200"
      >
        <div class="card-body">
          <h3 class="font-semibold text-lg text-primary mb-2">
            {index + 1}. {response.questionText}
          </h3>
          <div class="bg-base-200 p-3 rounded-lg">
            <p class="text-base">{response.responseText}</p>
          </div>
        </div>
      </div>
    {/each}
  {/if}

  {#if !isComplete && !loading}
    <h1>Questions</h1>
    {#each questions as question, index (question.id)}
      <div class="card w-full max-w-md bg-base-100 shadow-lg mt-5 p-4">
        <p>{index + 1}. {question.questionText}</p>
        {#if question.isMultipleChoice}
          <div class="form-control mt-4">
            {#each question.options as option}
              <label class="label cursor-pointer justify-start gap-2">
                <input
                  name="question_{question.id}"
                  value={option}
                  type="radio"
                  class="radio checked:bg-blue-500"
                  on:change={() => handleOptionSelect(question.id, option)}
                />
                {option}
              </label>
            {/each}
          </div>
        {:else}
          <div class="form-control mt-4">
            <input
              class="input input-bordered w-full max-w-xs"
              name="question_{question.id}"
              type="text"
              on:input={(e) =>
                handleOptionSelect(question.id, e.currentTarget.value)}
            />
          </div>
        {/if}
      </div>
    {/each}
    {#if !loading && !isComplete}
      <button class="btn btn-primary" on:click={handleSubmit}>Submit</button>
      {#if errorMessage}
        <p class="text-red-500">{errorMessage}</p>
      {/if}
    {/if}
  {/if}
</div>
