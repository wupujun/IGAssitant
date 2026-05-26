const assert = require("node:assert/strict");
const test = require("node:test");

const {
  API_BASE,
  AUTOCOMPLETE_URL,
  CONFIG_URL,
  HEALTH_URL,
  apiFetch,
  backgroundFetch,
} = require("../apiClient.js");

test("API URLs are local backend endpoints", () => {
  assert.equal(API_BASE, "http://127.0.0.1:8765");
  assert.equal(AUTOCOMPLETE_URL, "http://127.0.0.1:8765/autocomplete");
  assert.equal(CONFIG_URL, "http://127.0.0.1:8765/config");
  assert.equal(HEALTH_URL, "http://127.0.0.1:8765/health");
});

test("backgroundFetch sends expected background message", async () => {
  const runtime = {
    lastError: null,
    sendMessage(message, callback) {
      assert.deepEqual(message, {
        type: "igca-api-fetch",
        url: HEALTH_URL,
        options: { cache: "no-store" },
      });
      callback({ ok: true, status: 200, data: { status: "ok" } });
    },
  };

  const response = await backgroundFetch(HEALTH_URL, { cache: "no-store" }, runtime);

  assert.deepEqual(response, { ok: true, status: 200, data: { status: "ok" } });
});

test("backgroundFetch rejects when runtime reports an error", async () => {
  const runtime = {
    lastError: { message: "background unavailable" },
    sendMessage(_message, callback) {
      callback(null);
    },
  };

  await assert.rejects(backgroundFetch(HEALTH_URL, {}, runtime), /background unavailable/);
});

test("apiFetch falls back to direct fetch when runtime is missing", async () => {
  const response = await apiFetch(HEALTH_URL, {}, null, async () => ({
    ok: true,
    status: 200,
    data: { status: "ok" },
  }));

  assert.deepEqual(response, {
    ok: true,
    status: 200,
    data: { status: "ok" },
    fallback: "direct",
    backgroundError: "Extension runtime is not available.",
  });
});

test("apiFetch falls back to direct fetch after background status zero", async () => {
  const runtime = {
    lastError: null,
    sendMessage(_message, callback) {
      callback({ ok: false, status: 0, error: "Fetch failed." });
    },
  };

  const response = await apiFetch(HEALTH_URL, {}, runtime, async () => ({
    ok: true,
    status: 200,
    data: { status: "ok" },
  }));

  assert.equal(response.ok, true);
  assert.equal(response.fallback, "direct");
  assert.equal(response.backgroundError, "Fetch failed.");
});
