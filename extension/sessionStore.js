function loadJson(storage, key, fallback) {
  try {
    return JSON.parse(storage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function saveJson(storage, key, value) {
  storage.setItem(key, JSON.stringify(value));
}

function createSessionStore({
  storage,
  sessionsKey,
  historyLimitKey,
  defaultHistoryLimit,
  clampHistoryLimit,
}) {
  const sessions = loadJson(storage, sessionsKey, {});

  function saveSessions() {
    saveJson(storage, sessionsKey, sessions);
  }

  function loadHistoryLimit() {
    return clampHistoryLimit(storage.getItem(historyLimitKey), defaultHistoryLimit);
  }

  function saveHistoryLimit(value) {
    const historyLimit = clampHistoryLimit(value, defaultHistoryLimit);
    storage.setItem(historyLimitKey, String(historyLimit));
    Object.values(sessions).forEach((session) => {
      session.messageHistory = (session.messageHistory || []).slice(-historyLimit);
    });
    saveSessions();
    return historyLimit;
  }

  function ensureSession(sessionId, sessionName) {
    if (!sessions[sessionId]) {
      sessions[sessionId] = {
        id: sessionId,
        name: sessionName,
        draftText: "",
        lastPartnerMessage: "",
        messageHistory: [],
        lastSuggestion: "",
        selectedStyle: "ig",
        updatedAt: Date.now(),
      };
    }
    sessions[sessionId].name = sessionName;
    return sessions[sessionId];
  }

  return {
    sessions,
    saveSessions,
    loadHistoryLimit,
    saveHistoryLimit,
    ensureSession,
  };
}

const sessionStore = {
  createSessionStore,
  loadJson,
  saveJson,
};

if (typeof module !== "undefined") {
  module.exports = sessionStore;
}

if (typeof globalThis !== "undefined") {
  globalThis.IGCASessionStore = sessionStore;
}

