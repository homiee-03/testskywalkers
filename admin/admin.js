authApi.requireAuth({ role: "admin" });

const examForm = document.getElementById("examForm");
const shiftForm = document.getElementById("shiftForm");
const sectionForm = document.getElementById("sectionForm");
const questionForm = document.getElementById("questionForm");

const examStatus = document.getElementById("examStatus");
const shiftStatus = document.getElementById("shiftStatus");
const sectionStatus = document.getElementById("sectionStatus");
const questionStatus = document.getElementById("questionStatus");

const selects = {
  shiftExam: document.getElementById("shiftExam"),
  sectionExam: document.getElementById("sectionExam"),
  sectionShift: document.getElementById("sectionShift"),
  questionExam: document.getElementById("questionExam"),
  questionShift: document.getElementById("questionShift"),
  questionSection: document.getElementById("questionSection")
};

async function populateExams() {
  const exams = await firestoreApi.getExams();
  [selects.shiftExam, selects.sectionExam, selects.questionExam].forEach((select) => {
    select.innerHTML = exams
      .map((exam) => `<option value="${exam.id}">${exam.name || exam.id}</option>`)
      .join("");
  });
  await populateShifts();
}

async function populateShifts() {
  const examId = selects.sectionExam.value || selects.shiftExam.value;
  if (!examId) return;
  const shifts = await firestoreApi.getShifts(examId);
  [selects.sectionShift, selects.questionShift].forEach((select) => {
    select.innerHTML = shifts
      .map((shift) => `<option value="${shift.id}">${shift.name || shift.id}</option>`)
      .join("");
  });
  await populateSections();
}

async function populateSections() {
  const examId = selects.questionExam.value;
  const shiftId = selects.questionShift.value;
  if (!examId || !shiftId) return;
  const sections = await firestoreApi.getSections(examId, shiftId);
  selects.questionSection.innerHTML = sections
    .map((section) => `<option value="${section.id}">${section.name || section.id}</option>`)
    .join("");
}

selects.sectionExam.addEventListener("change", populateShifts);
selects.questionExam.addEventListener("change", populateShifts);
selects.questionShift.addEventListener("change", populateSections);

examForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  ui.showStatus(examStatus, "Saving exam...");
  try {
    const examId = document.getElementById("examId").value.trim();
    const name = document.getElementById("examName").value.trim();
    await firestoreApi.createExam(examId, { name, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    ui.showStatus(examStatus, "Exam saved.", "success");
    await populateExams();
  } catch (error) {
    ui.showStatus(examStatus, error.message, "error");
  }
});

shiftForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  ui.showStatus(shiftStatus, "Saving shift...");
  try {
    const examId = selects.shiftExam.value;
    const shiftId = document.getElementById("shiftId").value.trim();
    const name = document.getElementById("shiftName").value.trim();
    const durationMinutes = Math.min(90, Math.max(60, Number(document.getElementById("duration").value)));
    await firestoreApi.createShift(examId, shiftId, {
      name,
      durationMinutes,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    ui.showStatus(shiftStatus, "Shift saved.", "success");
    await populateShifts();
  } catch (error) {
    ui.showStatus(shiftStatus, error.message, "error");
  }
});

sectionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  ui.showStatus(sectionStatus, "Saving section...");
  try {
    const examId = selects.sectionExam.value;
    const shiftId = selects.sectionShift.value;
    const sectionId = document.getElementById("sectionId").value.trim();
    const name = document.getElementById("sectionName").value.trim();
    await firestoreApi.createSection(examId, shiftId, sectionId, {
      name,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    ui.showStatus(sectionStatus, "Section saved.", "success");
    await populateSections();
  } catch (error) {
    ui.showStatus(sectionStatus, error.message, "error");
  }
});

questionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  ui.showStatus(questionStatus, "Saving question...");
  try {
    const examId = selects.questionExam.value;
    const shiftId = selects.questionShift.value;
    const sectionId = selects.questionSection.value;
    const questionId = document.getElementById("questionId").value.trim();
    const text = document.getElementById("questionText").value.trim();
    const options = {
      A: document.getElementById("optA").value.trim(),
      B: document.getElementById("optB").value.trim(),
      C: document.getElementById("optC").value.trim(),
      D: document.getElementById("optD").value.trim()
    };
    const correct = document.getElementById("correct").value.trim().toUpperCase();
    const marks = Number(document.getElementById("marks").value);
    const negative = Number(document.getElementById("negative").value);
    const order = Number(document.getElementById("order").value);

    await firestoreApi.createQuestion(examId, shiftId, sectionId, questionId, {
      text,
      options,
      correct,
      marks,
      negative,
      order,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    ui.showStatus(questionStatus, "Question saved.", "success");
  } catch (error) {
    ui.showStatus(questionStatus, error.message, "error");
  }
});

async function loadAnalytics() {
  const exams = await firestoreApi.getExams();
  const avgScores = [];
  const labels = [];
  const timeAccuracy = [];
  const attemptDistribution = [];
  const difficultyIndex = [];

  for (const exam of exams) {
    const shifts = await firestoreApi.getShifts(exam.id);
    for (const shift of shifts) {
      const analytics = await firestoreApi.getAnalyticsByShift(exam.id, shift.id);
      const attempts = await firestoreApi.getAttemptsByShift(exam.id, shift.id);
      if (!analytics.length) continue;
      const avgScore = analytics.reduce((sum, item) => sum + item.score, 0) / analytics.length;
      const avgAccuracy = analytics.reduce((sum, item) => sum + item.accuracy, 0) / analytics.length;
      const avgTime = analytics.reduce((sum, item) => sum + item.timeTaken, 0) / analytics.length;
      labels.push(`${exam.id} ${shift.id}`);
      avgScores.push(avgScore.toFixed(2));
      timeAccuracy.push({ x: avgTime / 60, y: avgAccuracy });
      attemptDistribution.push(attempts.length);

      const sections = await firestoreApi.getSections(exam.id, shift.id);
      for (const section of sections) {
        const questions = await firestoreApi.getQuestions(exam.id, shift.id, section.id);
        questions.forEach((question) => {
          let correct = 0;
          let total = 0;
          attempts.forEach((attempt) => {
            const answer = attempt.answers?.[question.id];
            if (answer) {
              total += 1;
              if (answer === question.correct) correct += 1;
            }
          });
          const difficulty = total ? Math.round((correct / total) * 100) : 0;
          difficultyIndex.push({
            label: `${exam.id}/${shift.id}/${section.id}/${question.id}`,
            value: difficulty
          });
        });
      }
    }
  }

  const avgScoreCtx = document.getElementById("avgScoreChart");
  new Chart(avgScoreCtx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Average Score",
          data: avgScores,
          backgroundColor: "rgba(31, 94, 255, 0.6)"
        }
      ]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });

  const timeAccuracyCtx = document.getElementById("timeAccuracyChart");
  new Chart(timeAccuracyCtx, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Time vs Accuracy",
          data: timeAccuracy,
          backgroundColor: "rgba(20, 184, 166, 0.6)"
        }
      ]
    },
    options: {
      scales: {
        x: { title: { display: true, text: "Avg Time (minutes)" } },
        y: { title: { display: true, text: "Accuracy %" }, beginAtZero: true, max: 100 }
      }
    }
  });

  const distributionCtx = document.getElementById("attemptDistributionChart");
  new Chart(distributionCtx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Attempts",
          data: attemptDistribution,
          backgroundColor: "rgba(234, 88, 12, 0.6)"
        }
      ]
    },
    options: {
      scales: { y: { beginAtZero: true } }
    }
  });

  const difficultyList = document.getElementById("difficultyList");
  const sortedDifficulty = difficultyIndex.sort((a, b) => a.value - b.value).slice(0, 8);
  difficultyList.innerHTML = sortedDifficulty.length
    ? sortedDifficulty
        .map(
          (item) => `
          <div class="list-item">
            <div>
              <strong>${item.label}</strong>
              <div class="badge">Difficulty: ${item.value}%</div>
            </div>
          </div>`
        )
        .join("")
    : "<div class='list-item'>No analytics data yet.</div>";
}

populateExams();
loadAnalytics();
