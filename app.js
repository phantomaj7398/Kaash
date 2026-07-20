/**
 * Question Board App - Plain JS Single Page App
 * LocalStorage key: "kaash-question-board"
 * Real-time Cross-Device Cloud Sync
 */

const STORAGE_KEY = "kaash-question-board";
const CLOUD_API_URL = "https://jsonblob.com/api/jsonBlob/019f80b5-b6f4-7aac-b3a0-fe8c50badcbb";

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
  fetchFromCloud();
  // Poll cloud for real-time updates across devices every 2 seconds
  setInterval(fetchFromCloud, 2000);
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

// Deterministic Merging Algorithm (Cross-Device CRDT)
function mergeQuestions(localList, cloudList) {
  const map = new Map();

  // Load local questions
  (localList || []).forEach(q => {
    if (q && q.id) {
      map.set(q.id, q);
    }
  });

  // Merge cloud questions
  (cloudList || []).forEach(cq => {
    if (!cq || !cq.id) return;
    const lq = map.get(cq.id);
    if (!lq) {
      map.set(cq.id, cq);
    } else {
      const cloudTime = cq.updatedAt || cq.createdAt || 0;
      const localTime = lq.updatedAt || lq.createdAt || 0;

      if (cloudTime > localTime) {
        map.set(cq.id, cq);
      } else if (cloudTime === localTime) {
        if (cq.deleted) {
          map.set(cq.id, cq);
        } else if (cq.answerSignal && !lq.answerSignal) {
          map.set(cq.id, cq);
        } else if (cq.answerText && !lq.answerText) {
          map.set(cq.id, cq);
        }
      }
    }
  });

  // Sort by createdAt descending
  return Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

async function fetchFromCloud() {
  try {
    // Add cache-busting timestamp to prevent browser cache issues across devices
    const cacheBusterUrl = `${CLOUD_API_URL}?_t=${Date.now()}`;
    const res = await fetch(cacheBusterUrl, {
      cache: "no-store",
      headers: { "Pragma": "no-cache" }
    });
    if (!res.ok) return;

    const json = await res.json();
    if (json && Array.isArray(json.questions)) {
      const merged = mergeQuestions(state.questions, json.questions);
      
      if (JSON.stringify(merged) !== JSON.stringify(state.questions)) {
        state.questions = merged;
        saveQuestionsToStorage();
        if (state.currentUser) {
          renderCurrentPanel();
        }
      }
    }
  } catch (err) {
    // Silent fail if network issue
  }
}

async function syncToCloud() {
  try {
    await fetch(CLOUD_API_URL, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      },
      body: JSON.stringify({ questions: state.questions })
    });
  } catch (err) {
    console.error("Cloud sync error:", err);
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
  yesNoToggle.checked = false;

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
async function handleAddQuestion() {
  const qText = questionInput.value.trim();
  if (!qText) {
    questionError.style.display = "block";
    questionInput.focus();
    return;
  }

  const now = Date.now();
  const newQuestion = {
    id: "q_" + now + "_" + Math.random().toString(36).substr(2, 5),
    text: qText,
    yesNoOnly: yesNoToggle.checked,
    author: state.currentUser,
    createdAt: now,
    updatedAt: now,
    answerSignal: null, // null | 'Yes' | 'No'
    answerText: "",     // string
    deleted: false
  };

  // Sync latest from cloud first
  await fetchFromCloud();

  state.questions.unshift(newQuestion);
  saveQuestionsToStorage();

  // Clear input & reset form error
  questionInput.value = "";
  questionError.style.display = "none";
  yesNoToggle.checked = false;

  // Re-render & Push to Cloud
  renderAskerPanel();
  await syncToCloud();
}

// Delete Question
async function deleteQuestion(id) {
  const target = state.questions.find(q => q.id === id);
  if (target) {
    target.deleted = true;
    target.updatedAt = Date.now();
    saveQuestionsToStorage();
    renderAskerPanel();
    await syncToCloud();
  }
}

// Save Answer Signal (Yes/No)
async function setAnswerSignal(id, signal) {
  const target = state.questions.find(q => q.id === id);
  if (target) {
    target.answerSignal = signal;
    target.updatedAt = Date.now();
    saveQuestionsToStorage();
    renderAnswererPanel();
    await syncToCloud();
  }
}

// Save Answer Text for Detailed Questions
async function setAnswerText(id, textVal) {
  const target = state.questions.find(q => q.id === id);
  if (target) {
    target.answerText = textVal;
    target.updatedAt = Date.now();
    saveQuestionsToStorage();
    renderAnswererPanel();
    await syncToCloud();
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
  const activeQuestions = state.questions.filter(q => !q.deleted);
  askerQuestionCount.textContent = activeQuestions.length;
  askerQuestionList.innerHTML = "";

  if (activeQuestions.length === 0) {
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

  activeQuestions.forEach(q => {
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
  const activeQuestions = state.questions.filter(q => !q.deleted);
  answererQuestionCount.textContent = activeQuestions.length;
  answererQuestionList.innerHTML = "";

  if (activeQuestions.length === 0) {
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

  activeQuestions.forEach(q => {
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
