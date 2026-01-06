const auth = window.firebaseAuth;

auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

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

const authUi = {
  showStatus(target, message, type = "") {
    if (!target) return;
    if (window.ui?.showStatus) {
      ui.showStatus(target, message, type);
    } else {
      target.textContent = message;
      target.className = `status ${type}`.trim();
    }
  }
};

function bindNav() {
  const loggedOutLinks = document.getElementById("loggedOutLinks");
  const loggedInLinks = document.getElementById("loggedInLinks");
  if (!loggedOutLinks || !loggedInLinks) return;
  authApi.onAuthChange((user) => {
    const isLoggedIn = Boolean(user);
    loggedOutLinks.hidden = isLoggedIn;
    loggedInLinks.hidden = !isLoggedIn;
  });
}

function bindLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return;
  logoutBtn.addEventListener("click", async () => {
    await authApi.logout();
    window.location.href = "/index.html";
  });
}

function bindLoginForm() {
  const form = document.getElementById("loginForm");
  const status = document.getElementById("status");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    authUi.showStatus(status, "Signing you in...");
    try {
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const user = await authApi.login({ email, password });
      const role = await authApi.fetchRole(user.uid);
      authUi.showStatus(status, "Login successful! Redirecting...", "success");
      window.location.href = role === "admin" ? "/admin/admin.html" : "/student/dashboard.html";
    } catch (error) {
      authUi.showStatus(status, error.message, "error");
    }
  });
}

function bindSignupForm() {
  const form = document.getElementById("signupForm");
  const status = document.getElementById("status");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    authUi.showStatus(status, "Creating your account...");
    try {
      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      await authApi.signup({ name, email, password });
      authUi.showStatus(status, "Account created! Redirecting...", "success");
      window.location.href = "/student/dashboard.html";
    } catch (error) {
      authUi.showStatus(status, error.message, "error");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindNav();
  bindLogout();
  bindLoginForm();
  bindSignupForm();
});
