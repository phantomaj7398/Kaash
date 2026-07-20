/**
 * Question Board App - Plain JS Single Page App
 * LocalStorage key: "kaash-question-board"
 * Firebase Realtime Database Multi-Device Synchronization
 */

const STORAGE_KEY = "kaash-question-board";
const FIREBASE_URL_KEY = "kaash-firebase-db-url";

// Default Firebase Realtime Database URL
let DEFAULT_FIREBASE_URL = "https://kaash-question-board-default-rtdb.firebaseio.com";

// Global App State
let state = {
  currentUser: "",
  currentRole: "ask", // 'ask' | 'answer'
  questions: []
};

// Firebase Instance
let firebaseApp = null;
let firebaseDb = null;

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

const syncStatusBadge = document.getElementById("syncStatusBadge");
const syncText = document.getElementById("syncText");
const syncDot = document.querySelector(".sync-dot");
const cloudModal = document.getElementById("cloudModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const saveFirebaseBtn = document.getElementById("saveFirebaseBtn");
const firebaseUrlInput = document.getElementById("firebaseUrlInput");
const cloudJsonContent = document.getElementById("cloudJsonContent");

// Initialize Application
function initApp() {
  loadQuestionsFromStorage();
  setupEventListeners();
  initFirebase();
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

function setSyncState(isSyncing, label = "Firebase Live") {
  if (syncDot && syncText) {
    if (isSyncing) {
      syncDot.classList.add("syncing");
      syncText.textContent = "Connecting...";
    } else {
      syncDot.classList.remove("syncing");
      syncText.textContent = label;
    }
  }
}

// Initialize Firebase Realtime Database
function initFirebase() {
  const customUrl = localStorage.getItem(FIREBASE_URL_KEY) || DEFAULT_FIREBASE_URL;
  if (firebaseUrlInput) {
    firebaseUrlInput.value = customUrl;
  }

  setSyncState(true);

  try {
    if (typeof firebase !== "undefined" && firebase.initializeApp) {
      // Re-initialize if already initialized
      if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp({ databaseURL: customUrl });
      } else {
        firebaseApp = firebase.app();
      }
      firebaseDb = firebase.database(firebaseApp);

      // Listen for real-time WebSocket updates across all devices
      firebaseDb.ref("questions").on("value", (snapshot) => {
        const val = snapshot.val();
        setSyncState(false, "Firebase Live");

        if (val) {
          const cloudQuestions = Object.values(val);
          state.questions = cloudQuestions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          saveQuestionsToStorage();

          if (cloudModal && cloudModal.style.display !== "none") {
            cloudJsonContent.textContent = JSON.stringify({ questions: state.questions }, null, 2);
          }

          if (state.currentUser) {
            renderCurrentPanel();
          }
        }
      }, (error) => {
        console.warn("Firebase listener error:", error);
        setSyncState(false, "Offline");
      });
    } else {
      setSyncState(false, "Local Mode");
    }
  } catch (err) {
    console.error("Firebase init failed:", err);
    setSyncState(false, "Offline");
  }
}

// Push item modification to Firebase Realtime DB
function pushToFirebase(questionObj) {
  if (firebaseDb && questionObj && questionObj.id) {
    firebaseDb.ref("questions/" + questionObj.id).set(questionObj).catch(err => {
      console.error("Firebase write error:", err);
    });
  }
}

// Setup Event Listeners
function setupEventListeners() {
  roleBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      roleBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.currentRole = btn.getAttribute("data-role");
    });
  });

  userNameInput.addEventListener("input", () => {
    nameError.style.display = "none";
  });

  questionInput.addEventListener("input", () => {
    questionError.style.display = "none";
  });

  continueBtn.addEventListener("click", handleContinue);

  userNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleContinue();
    }
  });

  backBtn.addEventListener("click", handleBack);
  addQuestionBtn.addEventListener("click", handleAddQuestion);

  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      loadQuestionsFromStorage();
      renderCurrentPanel();
    }
  });

  // Modal Event Listeners
  if (syncStatusBadge) {
    syncStatusBadge.addEventListener("click", () => {
      cloudModal.style.display = "flex";
      cloudJsonContent.textContent = JSON.stringify({ questions: state.questions }, null, 2);
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
      cloudModal.style.display = "none";
    });
  }

  if (saveFirebaseBtn) {
    saveFirebaseBtn.addEventListener("click", () => {
      const newUrl = firebaseUrlInput.value.trim();
      if (newUrl) {
        localStorage.setItem(FIREBASE_URL_KEY, newUrl);
        DEFAULT_FIREBASE_URL = newUrl;
        initFirebase();
        cloudModal.style.display = "none";
      }
    });
  }

  if (cloudModal) {
    cloudModal.addEventListener("click", (e) => {
      if (e.target === cloudModal) {
        cloudModal.style.display = "none";
      }
    });
  }
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

  welcomeScreen.style.display = "none";
  boardView.style.display = "block";

  welcomeHeading.textContent = `Welcome, ${state.currentUser}!`;
  if (state.currentRole === "ask") {
    roleHint.textContent = "Asking Mode • Ask questions for answers";
  } else {
    roleHint.textContent = "Answering Mode • Provide answers to questions";
  }

  renderCurrentPanel();
}

// Handle Back Button -> Welcome Screen
function handleBack() {
  state.currentUser = "";
  userNameInput.value = "";
  nameError.style.display = "none";
  questionInput.value = "";
  questionError.style.display = "none";
  yesNoToggle.checked = false;

  state.currentRole = "ask";
  roleBtns.forEach(b => {
    if (b.getAttribute("data-role") === "ask") {
      b.classList.add("active");
    } else {
      b.classList.remove("active");
    }
  });

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

  state.questions.unshift(newQuestion);
  saveQuestionsToStorage();
  pushToFirebase(newQuestion);

  questionInput.value = "";
  questionError.style.display = "none";
  yesNoToggle.checked = false;

  renderAskerPanel();
}

// Delete Question
function deleteQuestion(id) {
  const target = state.questions.find(q => q.id === id);
  if (target) {
    target.deleted = true;
    target.updatedAt = Date.now();
    saveQuestionsToStorage();
    renderAskerPanel();
    pushToFirebase(target);
  }
}

// Save Answer Signal (Yes/No)
function setAnswerSignal(id, signal) {
  const target = state.questions.find(q => q.id === id);
  if (target) {
    target.answerSignal = signal;
    target.updatedAt = Date.now();
    saveQuestionsToStorage();
    renderAnswererPanel();
    pushToFirebase(target);
  }
}

// Save Answer Text for Detailed Questions
function setAnswerText(id, textVal) {
  const target = state.questions.find(q => q.id === id);
  if (target) {
    target.answerText = textVal;
    target.updatedAt = Date.now();
    saveQuestionsToStorage();
    renderAnswererPanel();
    pushToFirebase(target);
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

    let signalBadgeHtml = "";
    if (q.answerSignal === "Yes") {
      signalBadgeHtml = `<span class="status-pill yes">Yes</span>`;
    } else if (q.answerSignal === "No") {
      signalBadgeHtml = `<span class="status-pill no">No</span>`;
    } else {
      signalBadgeHtml = `<span class="status-pill waiting">Waiting for answer</span>`;
    }

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

    const btnYes = card.querySelector(".btn-yes");
    const btnNo = card.querySelector(".btn-no");

    btnYes.addEventListener("click", () => setAnswerSignal(q.id, "Yes"));
    btnNo.addEventListener("click", () => setAnswerSignal(q.id, "No"));

    if (!q.yesNoOnly) {
      const saveBtn = card.querySelector(".btn-save-text");
      const textInput = card.querySelector(".text-answer-input");

      saveBtn.addEventListener("click", () => {
        setAnswerText(q.id, textInput.value.trim());
      });

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
