const assert = require("node:assert/strict");
const test = require("node:test");

const { createSessionStore, loadJson, saveJson } = require("../sessionStore.js");
const { clampHistoryLimit } = require("../history.js");

function memoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
  };
}

test("loadJson returns fallback when stored JSON is invalid", () => {
  const storage = memoryStorage({ sessions: "{" });

  assert.deepEqual(loadJson(storage, "sessions", {}), {});
});

test("saveJson stores encoded values", () => {
  const storage = memoryStorage();

  saveJson(storage, "sessions", { a: 1 });

  assert.equal(storage.getItem("sessions"), '{"a":1}');
});

test("createSessionStore loads, saves, and ensures sessions", () => {
  const storage = memoryStorage();
  const store = createSessionStore({
    storage,
    sessionsKey: "sessions",
    historyLimitKey: "historyLimit",
    defaultHistoryLimit: 10,
    clampHistoryLimit,
  });

  const session = store.ensureSession("jane", "Jane");
  session.draftText = "hello";
  store.saveSessions();

  assert.equal(JSON.parse(storage.getItem("sessions")).jane.draftText, "hello");
});

test("saveHistoryLimit clamps value and trims stored histories", () => {
  const storage = memoryStorage({
    sessions: JSON.stringify({
      jane: {
        id: "jane",
        name: "Jane",
        messageHistory: [
          { role: "partner", content: "one" },
          { role: "me", content: "two" },
          { role: "partner", content: "three" },
          { role: "me", content: "four" },
          { role: "partner", content: "five" },
          { role: "me", content: "six" },
        ],
      },
    }),
  });
  const store = createSessionStore({
    storage,
    sessionsKey: "sessions",
    historyLimitKey: "historyLimit",
    defaultHistoryLimit: 10,
    clampHistoryLimit,
  });

  const saved = store.saveHistoryLimit(5);

  assert.equal(saved, 5);
  assert.equal(storage.getItem("historyLimit"), "5");
  assert.deepEqual(JSON.parse(storage.getItem("sessions")).jane.messageHistory, [
    { role: "me", content: "two" },
    { role: "partner", content: "three" },
    { role: "me", content: "four" },
    { role: "partner", content: "five" },
    { role: "me", content: "six" },
  ]);
});

