<script>
  import { createEventDispatcher, onMount } from "svelte";

  const dispatch = createEventDispatcher();

  export let questionEdit = {};
  let questionText = "";
  let isMultipleChoice = false;

  let editMode = false;
  let initialized = false;

  $: if (!initialized && Object.keys(questionEdit).length !== 0) {
    initialized = true;
    editMode = true;
    questionText = questionEdit.questionText;
    isMultipleChoice = questionEdit.isMultipleChoice;
    if (questionEdit.options) {
      options = questionEdit.options;
    }
  }
  const cleanup = () => {
    initialized = false;
    editMode = false;
    questionText = "";
    questionEdit = {};
    isMultipleChoice = false;
    options = [];
    newOption = "";
    error = "";
  };

  const handleClose = () => {
    cleanup();
    dispatch("close");
  };

  let options = [];
  let newOption = "";
  let error = "";

  const handleSubmit = () => {
    if (!questionText) {
      error = "Please enter a question";
      return;
    } else if (isMultipleChoice && options.length < 2) {
      error = "Please enter at least 2 options";
      return;
    }

    if (isMultipleChoice) {
      dispatch("add-question", {
        questionId: questionEdit.id,
        questionText,
        isMultipleChoice,
        options,
        editMode,
      });
    } else {
      dispatch("add-question", {
        questionId: questionEdit.id,
        questionText,
        isMultipleChoice,
        editMode,
      });
    }
    cleanup();
    dispatch("close");
  };

  const handleAddOption = () => {
    if (newOption.trim() !== "") {
      options = [...options, newOption];
      newOption = "";
    }
  };
</script>

<div class="modal-box space-y-3">
  <h3 class="font-bold text-lg">
    {editMode ? "Edit Question" : "Add Question"}
  </h3>
  <input
    type="text"
    bind:value={questionText}
    class="input input-bordered w-full max-w-xs"
    placeholder="Enter question..."
  />
  <div class="form-control">
    <label class="cursor-pointer label">
      <span class="label-text">Is this a multiple choice question?</span>
      <input
        type="checkbox"
        class="checkbox theme-controller"
        bind:checked={isMultipleChoice}
      />
    </label>
    {#if isMultipleChoice}
      {#each options as option, index}
        <div class="flex justify-between space-x-2">
          <span class="text-base">{index + 1}: {option}</span>
          <button
            on:click={() => (options = options.filter((_, i) => i !== index))}
            ><i class="fa-trash fa-solid" /></button
          >
        </div>
      {/each}
      <div class="flex space-x-2">
        <input
          type="text"
          class="input input-bordered"
          placeholder="Add new option..."
          bind:value={newOption}
          on:keyup={(event) => {
            if (event.key === "Enter") handleAddOption();
          }}
        />
        <button class="btn btn-primary" on:click={handleAddOption}>Add</button>
      </div>
    {/if}
  </div>

  <div class="modal-action flex justify-center">
    <button class="btn btn-primary" on:click={handleSubmit}
      >{editMode ? "Update" : "Add"}</button
    >
    <button class="btn" on:click={handleClose}>Cancel</button>
  </div>
  {#if error}
    <p class="text-red-500 text-center">{error}</p>
  {/if}
</div>
