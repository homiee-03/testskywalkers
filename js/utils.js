const ui = {
  showStatus(target, message, type = "") {
    if (!target) return;
    target.textContent = message;
    target.className = `status ${type}`.trim();
  },
  toggleDisabled(target, disabled) {
    if (target) {
      target.disabled = disabled;
    }
  },
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  }
};

const storage = {
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  get(key, fallback = null) {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  },
  remove(key) {
    localStorage.removeItem(key);
  }
};
