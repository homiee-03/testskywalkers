const analyticsApi = {
  calculateScore(questions, answers) {
    let score = 0;
    let correctCount = 0;
    let incorrectCount = 0;

    questions.forEach((question) => {
      const selected = answers[question.id];
      if (!selected) return;
      if (selected === question.correct) {
        score += question.marks;
        correctCount += 1;
      } else {
        score -= question.negative || 0;
        incorrectCount += 1;
      }
    });

    const attempted = correctCount + incorrectCount;
    const accuracy = attempted ? (correctCount / attempted) * 100 : 0;

    return {
      score: Number(score.toFixed(2)),
      accuracy: Number(accuracy.toFixed(2)),
      correctCount,
      incorrectCount,
      attempted
    };
  },
  buildSectionPerformance(questions, answers) {
    const sections = {};
    questions.forEach((question) => {
      const sectionId = question.sectionId;
      if (!sections[sectionId]) {
        sections[sectionId] = { total: 0, correct: 0, score: 0 };
      }
      sections[sectionId].total += 1;
      const selected = answers[question.id];
      if (selected) {
        if (selected === question.correct) {
          sections[sectionId].correct += 1;
          sections[sectionId].score += question.marks;
        } else {
          sections[sectionId].score -= question.negative || 0;
        }
      }
    });
    return sections;
  },
  buildTimeSpent(timeMap) {
    return Object.values(timeMap || {}).reduce((sum, seconds) => sum + seconds, 0);
  }
};
