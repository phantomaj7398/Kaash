/**
 * Question Board App - Plain JS Single Page App
 * LocalStorage key: "kaash-question-board"
 */

const STORAGE_KEY = "kaash-question-board";

// Global App State
let state = {
  currentUser: "",
  currentRole: "ask", // 'ask' | 'answer'
  questions: []
};

// DOM Elements
const welcomeScreen = document.getElementById("welcomeScreen");
const boardView = document.getElementById("boardView");
const userNameInput = document.getElementById("userNameInput");
const nameError = document.getElementById("nameError");
const continueBtn = document.getElementById("continueBtn");
const roleBtns = document.querySelectorAll(".role-btn");

const welcomeHeading = document.getElementById("welcomeHeading");
const roleHint = document.getElementById("roleHint");
const backBtn = document.getElementById("backBtn");

const askPanel = document.getElementById("askPanel");
const answerPanel = document.getElementById("answerPanel");

const yesNoToggle = document.getElementById("yesNoToggle");
const questionInput = document.getElementById("questionInput");
const questionError = document.getElementById("questionError");
const addQuestionBtn = document.getElementById("addQuestionBtn");

const askerQuestionList = document.getElementById("askerQuestionList");
const askerQuestionCount = document.getElementById("askerQuestionCount");

const answererQuestionList = document.getElementById("answererQuestionList");
const answererQuestionCount = document.getElementById("answererQuestionCount");

// Initialize Application
function initApp() {
  loadQuestionsFromStorage();
  setupEventListeners();
}

// Storage Operations
function loadQuestionsFromStorage() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (rawData) {
      state.questions = JSON.parse(rawData);
    } else {
      state.questions = [];
    }
  } catch (err) {
    console.error("Failed to load questions from localStorage:", err);
    state.questions = [];
  }
}

function saveQuestionsToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.questions));
  } catch (err) {
    console.error("Failed to save questions to localStorage:", err);
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Role selection buttons on welcome screen
  roleBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      roleBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.currentRole = btn.getAttribute("data-role");
    });
  });

  // Name input clear error on typing
  userNameInput.addEventListener("input", () => {
    nameError.style.display = "none";
  });

  // Question input clear error on typing
  questionInput.addEventListener("input", () => {
    questionError.style.display = "none";
  });

  // Continue button click
  continueBtn.addEventListener("click", handleContinue);

  // Allow pressing Enter in name input to continue
  userNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleContinue();
    }
  });

  // Back button click
  backBtn.addEventListener("click", handleBack);

  // Add question button click
  addQuestionBtn.addEventListener("click", handleAddQuestion);

  // Sync across tabs/windows via storage event
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      loadQuestionsFromStorage();
      renderCurrentPanel();
    }
  });
}

// Handle Welcome -> Board View transition
function handleContinue() {
  const nameVal = userNameInput.value.trim();
  if (!nameVal) {
    nameError.style.display = "block";
    userNameInput.focus();
    return;
  }

  state.currentUser = nameVal;
  nameError.style.display = "none";

  // Hide welcome, show board
  welcomeScreen.style.display = "none";
  boardView.style.display = "block";

  // Set header info
  welcomeHeading.textContent = `Welcome, ${state.currentUser}!`;
  if (state.currentRole === "ask") {
    roleHint.textContent = "Asking Mode • Ask questions for answers";
  } else {
    roleHint.textContent = "Answering Mode • Provide answers to questions";
  }

  // Render view
  renderCurrentPanel();
}

// Handle Back Button -> Welcome Screen
function handleBack() {
  // Reset user & form state
  state.currentUser = "";
  userNameInput.value = "";
  nameError.style.display = "none";
  questionInput.value = "";
  questionError.style.display = "none";
  yesNoToggle.checked = true;

  // Reset role to default ask
  state.currentRole = "ask";
  roleBtns.forEach(b => {
    if (b.getAttribute("data-role") === "ask") {
      b.classList.add("active");
    } else {
      b.classList.remove("active");
    }
  });

  // Hide board, show welcome
  boardView.style.display = "none";
  welcomeScreen.style.display = "block";
}

// Handle Adding a Question
function handleAddQuestion() {
  const qText = questionInput.value.trim();
  if (!qText) {
    questionError.style.display = "block";
    questionInput.focus();
    return;
  }

  const newQuestion = {
    id: "q_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
    text: qText,
    yesNoOnly: yesNoToggle.checked,
    author: state.currentUser,
    createdAt: Date.now(),
    answerSignal: null, // null | 'Yes' | 'No'
    answerText: ""      // string
  };

  state.questions.unshift(newQuestion);
  saveQuestionsToStorage();

  // Clear input & reset form error
  questionInput.value = "";
  questionError.style.display = "none";

  // Re-render
  renderAskerPanel();
}

// Delete Question
function deleteQuestion(id) {
  state.questions = state.questions.filter(q => q.id !== id);
  saveQuestionsToStorage();
  renderAskerPanel();
}

// Save Answer Signal (Yes/No)
function setAnswerSignal(id, signal) {
  const target = state.questions.find(q => q.id === id);
  if (target) {
    // If clicking same answer again, keep it set or update it
    target.answerSignal = signal;
    saveQuestionsToStorage();
    renderAnswererPanel();
  }
}

// Save Answer Text for Detailed Questions
function setAnswerText(id, textVal) {
  const target = state.questions.find(q => q.id === id);
  if (target) {
    target.answerText = textVal;
    saveQuestionsToStorage();
    renderAnswererPanel();
  }
}

// Render Active Panel
function renderCurrentPanel() {
  if (state.currentRole === "ask") {
    askPanel.style.display = "block";
    answerPanel.style.display = "none";
    renderAskerPanel();
  } else {
    askPanel.style.display = "none";
    answerPanel.style.display = "block";
    renderAnswererPanel();
  }
}

// Render Asker Panel & Question Cards
function renderAskerPanel() {
  askerQuestionCount.textContent = state.questions.length;
  askerQuestionList.innerHTML = "";

  if (state.questions.length === 0) {
    askerQuestionList.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <p class="empty-text">No questions asked yet. Add your first question above!</p>
      </div>
    `;
    return;
  }

  state.questions.forEach(q => {
    const card = document.createElement("div");
    card.className = "q-card";

    // Signal status badge text and style
    let signalBadgeHtml = "";
    if (q.answerSignal === "Yes") {
      signalBadgeHtml = `<span class="status-pill yes">Yes</span>`;
    } else if (q.answerSignal === "No") {
      signalBadgeHtml = `<span class="status-pill no">No</span>`;
    } else {
      signalBadgeHtml = `<span class="status-pill waiting">Waiting for answer</span>`;
    }

    // Text answer display if detailed mode
    let textAnswerHtml = "";
    if (!q.yesNoOnly && q.answerText && q.answerText.trim() !== "") {
      textAnswerHtml = `<div class="text-answer-content">${escapeHtml(q.answerText)}</div>`;
    }

    card.innerHTML = `
      <div class="q-card-header">
        <span class="q-text">${escapeHtml(q.text)}</span>
        <button class="q-remove-btn" title="Remove question" data-id="${q.id}">×</button>
      </div>

      <div class="q-status-container">
        <div class="status-row">
          ${signalBadgeHtml}
        </div>
        ${textAnswerHtml}
      </div>
    `;

    // Remove listener
    const removeBtn = card.querySelector(".q-remove-btn");
    removeBtn.addEventListener("click", () => deleteQuestion(q.id));

    askerQuestionList.appendChild(card);
  });
}

// Render Answerer Panel & Question Cards
function renderAnswererPanel() {
  answererQuestionCount.textContent = state.questions.length;
  answererQuestionList.innerHTML = "";

  if (state.questions.length === 0) {
    answererQuestionList.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
        <p class="empty-text">No questions available to answer right now.</p>
      </div>
    `;
    return;
  }

  state.questions.forEach(q => {
    const card = document.createElement("div");
    card.className = "q-card";

    const isYesActive = q.answerSignal === "Yes" ? "yes-active" : "";
    const isNoActive = q.answerSignal === "No" ? "no-active" : "";

    // Detailed text input section if detailed mode
    let detailedSectionHtml = "";
    if (!q.yesNoOnly) {
      detailedSectionHtml = `
        <div class="detailed-input-group">
          <input 
            type="text" 
            class="form-control text-answer-input" 
            placeholder="Type text answer..." 
            value="${escapeHtml(q.answerText || '')}" 
            data-id="${q.id}"
          />
          <button class="btn btn-primary btn-save-text" data-id="${q.id}">Save</button>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="q-card-header">
        <span class="q-text">${escapeHtml(q.text)}</span>
      </div>

      <div class="answer-actions">
        <div class="yes-no-buttons">
          <button class="btn-answer-option btn-yes ${isYesActive}" data-id="${q.id}" data-signal="Yes">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Yes
          </button>
          <button class="btn-answer-option btn-no ${isNoActive}" data-id="${q.id}" data-signal="No">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            No
          </button>
        </div>
        ${detailedSectionHtml}
      </div>
    `;

    // Event listeners for Yes / No buttons
    const btnYes = card.querySelector(".btn-yes");
    const btnNo = card.querySelector(".btn-no");

    btnYes.addEventListener("click", () => setAnswerSignal(q.id, "Yes"));
    btnNo.addEventListener("click", () => setAnswerSignal(q.id, "No"));

    // Event listener for detailed text answer Save button
    if (!q.yesNoOnly) {
      const saveBtn = card.querySelector(".btn-save-text");
      const textInput = card.querySelector(".text-answer-input");

      saveBtn.addEventListener("click", () => {
        setAnswerText(q.id, textInput.value.trim());
      });

      // Save on enter inside text input
      textInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          setAnswerText(q.id, textInput.value.trim());
        }
      });
    }

    answererQuestionList.appendChild(card);
  });
}

// Utility: HTML Escape
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", initApp);
