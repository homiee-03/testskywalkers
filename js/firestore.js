const db = window.firebaseDb;

const firestoreApi = {
  async getExams() {
    const snapshot = await db.collection("exams").get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },
  async getShifts(examId) {
    const snapshot = await db.collection("exams").doc(examId).collection("shifts").get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },
  async getSections(examId, shiftId) {
    const snapshot = await db
      .collection("exams")
      .doc(examId)
      .collection("shifts")
      .doc(shiftId)
      .collection("sections")
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },
  async getQuestions(examId, shiftId, sectionId) {
    const snapshot = await db
      .collection("exams")
      .doc(examId)
      .collection("shifts")
      .doc(shiftId)
      .collection("sections")
      .doc(sectionId)
      .collection("questions")
      .orderBy("order", "asc")
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },
  async createAttempt(payload) {
    const ref = await db.collection("attempts").add(payload);
    return ref.id;
  },
  async updateAttempt(attemptId, payload) {
    await db.collection("attempts").doc(attemptId).update(payload);
  },
  async getAttempt(attemptId) {
    const doc = await db.collection("attempts").doc(attemptId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },
  async getAttemptsByUser(userId) {
    const snapshot = await db
      .collection("attempts")
      .where("userId", "==", userId)
      .orderBy("startedAt", "desc")
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },
  async getAttemptsByShift(examId, shiftId) {
    const snapshot = await db
      .collection("attempts")
      .where("examId", "==", examId)
      .where("shiftId", "==", shiftId)
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },
  async recordAnalytics(payload) {
    await db.collection("analytics").add(payload);
  },
  async getAnalyticsByShift(examId, shiftId) {
    const snapshot = await db
      .collection("analytics")
      .where("examId", "==", examId)
      .where("shiftId", "==", shiftId)
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },
  async setUserProfile(userId, payload) {
    await db.collection("users").doc(userId).set(payload, { merge: true });
  },
  async getUserProfile(userId) {
    const doc = await db.collection("users").doc(userId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },
  async createExam(examId, payload) {
    await db.collection("exams").doc(examId).set(payload, { merge: true });
  },
  async createShift(examId, shiftId, payload) {
    await db.collection("exams").doc(examId).collection("shifts").doc(shiftId).set(payload, { merge: true });
  },
  async createSection(examId, shiftId, sectionId, payload) {
    await db
      .collection("exams")
      .doc(examId)
      .collection("shifts")
      .doc(shiftId)
      .collection("sections")
      .doc(sectionId)
      .set(payload, { merge: true });
  },
  async createQuestion(examId, shiftId, sectionId, questionId, payload) {
    await db
      .collection("exams")
      .doc(examId)
      .collection("shifts")
      .doc(shiftId)
      .collection("sections")
      .doc(sectionId)
      .collection("questions")
      .doc(questionId)
      .set(payload, { merge: true });
  }
};
