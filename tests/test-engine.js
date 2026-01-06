authApi.requireAuth({ role: "student" });

const palette = document.getElementById("palette");
const questionText = document.getElementById("questionText");
const optionsContainer = document.getElementById("options");
const sectionLabel = document.getElementById("sectionLabel");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");
const markReviewBtn = document.getElementById("markReview");
const timerDisplay = document.getElementById("timer");
const saveStatus = document.getElementById("saveStatus");

const params = new URLSearchParams(window.location.search);
const examId = params.get("exam");
const shiftId = params.get("shift");

if (!examId || !shiftId) {
  window.location.href = "/student/dashboard.html";
}

const state = {
  questions: [],
  currentIndex: 0,
  answers: {},
  reviewFlags: {},
  timeSpent: {},
  activeSince: Date.now(),
  attemptId: null,
  durationSeconds: 3600,
  timerStop: null
};

function updatePalette() {
  palette.innerHTML = state.questions
    .map((question, index) => {
      const classes = ["palette-button"];
      if (state.answers[question.id]) classes.push("answered");
      if (state.reviewFlags[question.id]) classes.push("review");
      if (index === state.currentIndex) classes.push("active");
      return `<button class="${classes.join(" ")}" data-index="${index}">${index + 1}</button>`;
    })
    .join("");

  palette.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      jumpToQuestion(Number(btn.dataset.index));
    });
  });
}

function renderQuestion() {
  const question = state.questions[state.currentIndex];
  if (!question) return;
  sectionLabel.textContent = question.sectionName || question.sectionId;
  questionText.textContent = question.text;

  optionsContainer.innerHTML = Object.entries(question.options)
    .map(([key, value]) => {
      const selected = state.answers[question.id] === key ? "selected" : "";
      return `
        <div class="option ${selected}" data-option="${key}">
          <strong>${key}.</strong>
          <span>${value}</span>
        </div>`;
    })
    .join("");

  optionsContainer.querySelectorAll(".option").forEach((option) => {
    option.addEventListener("click", () => {
      selectAnswer(question.id, option.dataset.option);
    });
  });

  updatePalette();
}

function updateTimeSpent() {
  const question = state.questions[state.currentIndex];
  if (!question) return;
  const now = Date.now();
  const elapsed = Math.floor((now - state.activeSince) / 1000);
  state.timeSpent[question.id] = (state.timeSpent[question.id] || 0) + elapsed;
  state.activeSince = now;
}

async function selectAnswer(questionId, answer) {
  state.answers[questionId] = answer;
  renderQuestion();
  await autosave();
}

function jumpToQuestion(index) {
  updateTimeSpent();
  state.currentIndex = index;
  renderQuestion();
}

markReviewBtn.addEventListener("click", async () => {
  const question = state.questions[state.currentIndex];
  state.reviewFlags[question.id] = !state.reviewFlags[question.id];
  renderQuestion();
  await autosave();
});

prevBtn.addEventListener("click", () => {
  if (state.currentIndex > 0) {
    jumpToQuestion(state.currentIndex - 1);
  }
});

nextBtn.addEventListener("click", () => {
  if (state.currentIndex < state.questions.length - 1) {
    jumpToQuestion(state.currentIndex + 1);
  }
});

submitBtn.addEventListener("click", async () => {
  await submitTest();
});

async function autosave() {
  if (!state.attemptId) return;
  ui.showStatus(saveStatus, "Saving progress...");
  await firestoreApi.updateAttempt(state.attemptId, {
    answers: state.answers,
    reviewFlags: state.reviewFlags,
    timeSpent: state.timeSpent,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  ui.showStatus(saveStatus, "Progress saved.", "success");
}

async function submitTest(isAutoSubmit = false) {
  if (!state.attemptId) return;
  updateTimeSpent();
  if (state.timerStop) state.timerStop();

  const scoreData = analyticsApi.calculateScore(state.questions, state.answers);
  const sectionPerformance = analyticsApi.buildSectionPerformance(state.questions, state.answers);
  const timeTaken = analyticsApi.buildTimeSpent(state.timeSpent);

  await firestoreApi.updateAttempt(state.attemptId, {
    ...scoreData,
    sectionPerformance,
    timeSpent: state.timeSpent,
    status: "submitted",
    autoSubmitted: isAutoSubmit,
    timeTaken,
    submittedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  await firestoreApi.recordAnalytics({
    examId,
    shiftId,
    score: scoreData.score,
    accuracy: scoreData.accuracy,
    timeTaken,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  window.location.href = "/student/dashboard.html";
}

async function startTest(user) {
  const shift = await firestoreApi.getShifts(examId);
  const shiftData = shift.find((item) => item.id === shiftId);
  state.durationSeconds = Math.min(90, Math.max(60, shiftData?.durationMinutes || 60)) * 60;

  const sections = await firestoreApi.getSections(examId, shiftId);
  const questions = [];
  for (const section of sections) {
    const sectionQuestions = await firestoreApi.getQuestions(examId, shiftId, section.id);
    sectionQuestions.forEach((question) => {
      questions.push({
        ...question,
        sectionId: section.id,
        sectionName: section.name
      });
    });
  }

  state.questions = questions;
  state.activeSince = Date.now();

  state.attemptId = await firestoreApi.createAttempt({
    userId: user.uid,
    examId,
    shiftId,
    answers: {},
    reviewFlags: {},
    timeSpent: {},
    status: "in_progress",
    startedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  state.timerStop = timerApi.start(state.durationSeconds, (remaining) => {
    timerDisplay.textContent = ui.formatTime(remaining);
  }, async () => {
    await submitTest(true);
  });

  renderQuestion();
}

authApi.onAuthChange((user) => {
  if (user) {
    startTest(user);
  }
});
