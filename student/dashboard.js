authApi.requireAuth({ role: "student" });

const examList = document.getElementById("examList");
const analyticsCards = document.getElementById("analyticsCards");
const attemptList = document.getElementById("attemptList");
const attemptDetail = document.getElementById("attemptDetail");
const logoutBtn = document.getElementById("logoutBtn");

logoutBtn.addEventListener("click", async () => {
  await authApi.logout();
  window.location.href = "/index.html";
});

async function renderExams() {
  const exams = await firestoreApi.getExams();
  if (!exams.length) {
    examList.innerHTML = "<div class='card'>No exams published yet.</div>";
    return;
  }

  const cards = await Promise.all(
    exams.map(async (exam) => {
      const shifts = await firestoreApi.getShifts(exam.id);
      const shiftButtons = shifts
        .map(
          (shift) => `
          <div class="list-item">
            <div>
              <strong>${shift.name || shift.id}</strong>
              <div class="badge">${shift.durationMinutes || 60} mins</div>
            </div>
            <button data-exam="${exam.id}" data-shift="${shift.id}">Start Test</button>
          </div>`
        )
        .join("");

      return `
        <div class="card">
          <h3>${exam.name || exam.id}</h3>
          <div class="list">${shiftButtons || "No shifts available."}</div>
        </div>`;
    })
  );

  examList.innerHTML = cards.join("");
  examList.querySelectorAll("button[data-exam]").forEach((button) => {
    button.addEventListener("click", () => {
      const examId = button.dataset.exam;
      const shiftId = button.dataset.shift;
      window.location.href = `/tests/test.html?exam=${examId}&shift=${shiftId}`;
    });
  });
}

function renderAnalyticsSummary(attempts) {
  if (!attempts.length) {
    analyticsCards.innerHTML = "<div class='analytics-card'>No attempts yet.</div>";
    return;
  }
  const latest = attempts[0];
  const avgScore = attempts.reduce((sum, item) => sum + (item.score || 0), 0) / attempts.length;
  const avgAccuracy = attempts.reduce((sum, item) => sum + (item.accuracy || 0), 0) / attempts.length;

  analyticsCards.innerHTML = `
    <div class="analytics-card">
      <h4>Latest Score</h4>
      <p>${latest.score || 0}</p>
    </div>
    <div class="analytics-card">
      <h4>Average Score</h4>
      <p>${avgScore.toFixed(2)}</p>
    </div>
    <div class="analytics-card">
      <h4>Average Accuracy</h4>
      <p>${avgAccuracy.toFixed(2)}%</p>
    </div>
    <div class="analytics-card">
      <h4>Total Attempts</h4>
      <p>${attempts.length}</p>
    </div>
  `;
}

function renderAttemptDetail(attempt) {
  if (!attempt) {
    attemptDetail.innerHTML = "<h3>Latest Attempt Details</h3><p>No attempt data yet.</p>";
    return;
  }
  const sectionPerformance = attempt.sectionPerformance || {};
  const sectionRows = Object.entries(sectionPerformance)
    .map(
      ([sectionId, data]) => `
      <div class="list-item">
        <div>
          <strong>${sectionId}</strong>
          <div class="badge">Score: ${data.score.toFixed(2)}</div>
        </div>
        <span>${data.correct}/${data.total} correct</span>
      </div>`
    )
    .join("");

  const timeEntries = Object.entries(attempt.timeSpent || {});
  const averageTime = timeEntries.length
    ? (timeEntries.reduce((sum, [, value]) => sum + value, 0) / timeEntries.length).toFixed(1)
    : 0;

  attemptDetail.innerHTML = `
    <h3>Latest Attempt Details</h3>
    <p>Accuracy: ${attempt.accuracy || 0}% · Time Taken: ${Math.round((attempt.timeTaken || 0) / 60)} mins</p>
    <div class="list">${sectionRows || "<div class='list-item'>No section data yet.</div>"}</div>
    <p>Avg time per question: ${averageTime} sec</p>
  `;
}

function renderAttemptHistory(attempts) {
  if (!attempts.length) {
    attemptList.innerHTML = "<div class='list-item'>No attempts yet.</div>";
    return;
  }
  attemptList.innerHTML = attempts
    .map(
      (attempt) => `
      <div class="list-item">
        <div>
          <strong>${attempt.examId} · ${attempt.shiftId}</strong>
          <div class="badge">Score: ${attempt.score || 0}</div>
        </div>
        <span>${attempt.status || "submitted"}</span>
      </div>`
    )
    .join("");
}

async function loadAttempts() {
  authApi.onAuthChange(async (user) => {
    if (!user) return;
    const attempts = await firestoreApi.getAttemptsByUser(user.uid);
    renderAnalyticsSummary(attempts);
    renderAttemptDetail(attempts[0]);
    renderAttemptHistory(attempts);
  });
}

renderExams();
loadAttempts();
