const form = document.getElementById("closure-form");
const mistakeInput = document.getElementById("mistake");
const solutionInput = document.getElementById("solution");
const submitButton = document.getElementById("submit-button");
const successState = document.getElementById("success-state");

let resetTimer = null;

function closeFile() {
  const mistake = mistakeInput.value.trim();
  const solution = solutionInput.value.trim();

  if (!mistake || !solution) {
    if (!mistake) mistakeInput.focus();
    else solutionInput.focus();
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Closing...";

  form.hidden = true;
  successState.hidden = false;

  clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    mistakeInput.value = "";
    solutionInput.value = "";

    successState.hidden = true;
    form.hidden = false;

    submitButton.disabled = false;
    submitButton.textContent = "Close File";
    mistakeInput.focus();
  }, 2200);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  closeFile();
});

// Optional: allow Cmd/Ctrl + Enter to submit from either textarea.
[mistakeInput, solutionInput].forEach((field) => {
  field.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      form.requestSubmit();
    }
  });
});

// Put the cursor in the first box on load.
window.addEventListener("DOMContentLoaded", () => {
  mistakeInput.focus();
});