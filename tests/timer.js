const timerApi = {
  start(durationSeconds, onTick, onComplete) {
    let remaining = durationSeconds;
    onTick(remaining);
    const interval = setInterval(() => {
      remaining -= 1;
      onTick(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onComplete();
      }
    }, 1000);
    return () => clearInterval(interval);
  }
};
