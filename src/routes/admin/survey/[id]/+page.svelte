<script>
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import NewQuestionForm from "./NewQuestionForm.svelte";

  let questions = [];
  let message = "";

  let showModal = false;

  let questionEdit = {};

  const id = $page.params.id;

  onMount(async () => {
    const response = await fetch(`/api/surveyQuestions/?id=${id}`, {
      method: "GET",
    });
    if (response.ok) {
      const data = await response.json();
      questions = data.questions;
      console.log(data);
    } else {
      message = "Something went wrong when fetching survey questions";
    }
  });

  const handleAddQuestion = async (event) => {
    event.preventDefault();
    message = "";
    const data = event.detail;
    const newQuestion = {
      questionText: data.questionText,
      isMultipleChoice: data.isMultipleChoice,
      options: data.options,
    };
    const response = await fetch("/api/surveyQuestions", {
      method: "POST",
      body: JSON.stringify({
        newQuestion,
        surveyId: id,
      }),
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      message = "An error occurred while adding the question";
    } else {
      const data = await response.json();
      if (data.success) {
        questions = [
          ...questions,
          { ...newQuestion, surveyId: id, id: data.questionId },
        ];
      }
    }

    showModal = false;
  };

  const deleteQuestion = async (questionId) => {
    message = "";
    const response = await fetch("/api/surveyQuestions", {
      method: "DELETE",
      body: JSON.stringify({ questionId }),
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      message = "An error occurred deleting the question";
      return;
    }
    questions = questions.filter((question) => question.id !== questionId);
  };

  const handleQuestionEdit = (question) => {
    questionEdit = question;
    document.getElementById("my_modal_2").showModal();
  };

  const updateQuestion = async (question) => {
    message = "";
    const response = await fetch("/api/surveyQuestions", {
      method: "PATCH",
      body: JSON.stringify({ question }),
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      message = "An error occurred while updating the question";
      return;
    }
    questions = questions.map((currentQuestion) => {
      if (currentQuestion.id === question.questionId) {
        return { ...question, id: currentQuestion.id };
      }
      return currentQuestion;
    });
    questionEdit = {};
  };

  const handleQuestionAction = (event) => {
    event.preventDefault();
    const action = event.detail;
    if (!action.editMode) {
      handleAddQuestion(event);
    } else {
      updateQuestion({
        questionId: action.questionId,
        questionText: action.questionText,
        isMultipleChoice: action.isMultipleChoice,
        options: action.options,
      });
    }
  };
</script>

<div class="flex flex-col items-center mt-10 space-y-3">
  <button
    class="btn btn-primary"
    on:click={() => (window.location.href = "/admin/survey")}
    >All surveys</button
  >
  <h1>Survey ID: {id}</h1>
</div>

<div class="flex flex-col space-y-3 items-center mt-10">
  {#each questions as question, index (question.id)}
    <div class="card w-full max-w-md bg-base-100 shadow-lg">
      <div class="card-body flex flex-row justify-between items-center">
        <div>
          <h2 class="card-title">Question {index + 1}</h2>
          <p>{question.questionText}</p>
          {#if question.isMultipleChoice}
            <div class="ml-4">
              <p class="font-semibold">Options:</p>
              <ul class="list-disc pl-5">
                {#each question.options as answer}
                  <li>{answer}</li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
        <div class="space-x-2">
          <button on:click={async () => await deleteQuestion(question.id)}
            ><i class="fa-solid fa-trash" /></button
          >
          <button on:click={() => handleQuestionEdit(question)}
            ><i class="fa-solid fa-edit" /></button
          >
        </div>
      </div>
    </div>
  {/each}
  <button
    class="btn btn-primary"
    on:click={() => document.getElementById("my_modal_2").showModal()}
    ><i class="fa-plus fa-solid" /></button
  >
  <p class="text-red-500">{message}</p>

  <dialog id="my_modal_2" class="modal">
    <div class="modal-box">
      <NewQuestionForm
        {questionEdit}
        on:add-question={handleQuestionAction}
        on:close={() => {
          document.getElementById("my_modal_2").close();
          questionEdit = {};
        }}
      />
    </div>
  </dialog>
</div>
