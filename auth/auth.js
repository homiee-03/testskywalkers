const auth = window.firebaseAuth;

const authApi = {
  async signup({ name, email, password }) {
    const credential = await auth.createUserWithEmailAndPassword(email, password);
    await firestoreApi.setUserProfile(credential.user.uid, {
      name,
      email,
      role: "student",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return credential.user;
  },
  async login({ email, password }) {
    const credential = await auth.signInWithEmailAndPassword(email, password);
    return credential.user;
  },
  async logout() {
    await auth.signOut();
    storage.remove("role");
  },
  async fetchRole(userId) {
    const profile = await firestoreApi.getUserProfile(userId);
    const role = profile?.role || "student";
    storage.set("role", role);
    return role;
  },
  onAuthChange(callback) {
    auth.onAuthStateChanged(callback);
  },
  requireAuth({ role, redirectTo = "/auth/login.html" } = {}) {
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        window.location.href = redirectTo;
        return;
      }
      const currentRole = storage.get("role") || (await authApi.fetchRole(user.uid));
      if (role && currentRole !== role) {
        window.location.href = "/index.html";
      }
    });
  }
};
