const assert = require("node:assert/strict");
const test = require("node:test");

const { createDebugLogger } = require("../debugLog.js");

test("debug logger stores bounded entries", () => {
  const logger = createDebugLogger({
    rootId: "igca-root",
    limit: 2,
    documentRef: {},
    consoleRef: {},
    now: () => "10:00:00",
  });

  logger.debug("one");
  logger.debug("two");
  logger.debug("three");

  assert.deepEqual(
    logger.entries.map((entry) => entry.message),
    ["two", "three"],
  );
});

test("debug logger renders last entries into panel log", () => {
  const logElement = {
    textContent: "",
    scrollTop: 0,
    scrollHeight: 100,
  };
  const logger = createDebugLogger({
    rootId: "igca-root",
    documentRef: {
      querySelector(selector) {
        assert.equal(selector, "#igca-root .igca-debug-log");
        return logElement;
      },
    },
    consoleRef: {},
    now: () => "10:00:00",
  });

  logger.debug("health failed", { reason: "offline" });

  assert.equal(logElement.textContent, '10:00:00 health failed {"reason":"offline"}');
  assert.equal(logElement.scrollTop, 100);
});

