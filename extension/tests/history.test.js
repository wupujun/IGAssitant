const assert = require("node:assert/strict");
const test = require("node:test");

const {
  clampHistoryLimit,
  formatMessageHistory,
  isConversationNoise,
  mergeMessageHistory,
  normalizeHistoryItem,
  normalizeMessageText,
  normalizePartnerName,
  slugifySession,
} = require("../history.js");

test("clampHistoryLimit bounds invalid and extreme values", () => {
  assert.equal(clampHistoryLimit("bad"), 10);
  assert.equal(clampHistoryLimit(1), 5);
  assert.equal(clampHistoryLimit(500), 200);
  assert.equal(clampHistoryLimit(12.6), 13);
});

test("slugifySession creates stable compact ids", () => {
  assert.equal(slugifySession("Jane Doe!!"), "jane-doe");
  assert.equal(slugifySession(""), "unknown");
});

test("normalizePartnerName filters Instagram chrome labels", () => {
  assert.equal(normalizePartnerName("Instagram\nJane Doe\nActive now"), "Jane Doe");
  assert.equal(normalizePartnerName(""), "Unknown chat");
});

test("normalizeMessageText collapses whitespace", () => {
  assert.equal(normalizeMessageText(" hi\u00a0 there \n friend "), "hi there friend");
});

test("isConversationNoise detects statuses and timestamps", () => {
  assert.equal(isConversationNoise("Seen"), true);
  assert.equal(isConversationNoise("12:30 PM"), true);
  assert.equal(isConversationNoise("john_doe123"), true);
  assert.equal(isConversationNoise("that sounds good"), false);
});

test("normalizeHistoryItem rejects noise and defaults unknown roles to partner", () => {
  assert.equal(normalizeHistoryItem({ role: "me", content: "Seen" }), null);
  assert.deepEqual(normalizeHistoryItem({ role: "other", content: " hello " }), {
    role: "partner",
    content: "hello",
  });
});

test("mergeMessageHistory deduplicates and respects history limit", () => {
  const existing = [
    { role: "partner", content: "one" },
    { role: "me", content: "two" },
    { role: "partner", content: "hi" },
  ];
  const visible = [
    { role: "partner", content: "hi" },
    { role: "me", content: "hello" },
    { role: "partner", content: "how are you" },
    { role: "me", content: "good" },
    { role: "partner", content: "nice" },
  ];

  assert.deepEqual(mergeMessageHistory(existing, visible, 5), [
    { role: "partner", content: "hi" },
    { role: "me", content: "hello" },
    { role: "partner", content: "how are you" },
    { role: "me", content: "good" },
    { role: "partner", content: "nice" },
  ]);
});

test("formatMessageHistory renders friendly labels", () => {
  assert.equal(formatMessageHistory([]), "No message history found.");
  assert.equal(
    formatMessageHistory([
      { role: "partner", content: "hi" },
      { role: "me", content: "hello" },
    ]),
    "Partner: hi\nMe: hello",
  );
});
