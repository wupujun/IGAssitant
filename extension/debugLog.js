function createDebugLogger({
  rootId,
  limit = 80,
  documentRef = globalThis.document,
  consoleRef = globalThis.console,
  now = () => new Date().toLocaleTimeString(),
}) {
  const entries = [];

  function debug(message, details = {}) {
    const entry = {
      time: now(),
      message,
      details,
    };
    entries.push(entry);
    if (entries.length > limit) entries.shift();
    consoleRef.debug?.("[IGCA]", message, details);

    const log = documentRef.querySelector?.(`#${rootId} .igca-debug-log`);
    if (!log) return;
    log.textContent = entries
      .slice(-12)
      .map((item) => {
        const detailText = Object.keys(item.details).length ? ` ${JSON.stringify(item.details)}` : "";
        return `${item.time} ${item.message}${detailText}`;
      })
      .join("\n");
    log.scrollTop = log.scrollHeight;
  }

  return {
    debug,
    entries,
  };
}

const debugLog = {
  createDebugLogger,
};

if (typeof module !== "undefined") {
  module.exports = debugLog;
}

if (typeof globalThis !== "undefined") {
  globalThis.IGCADebugLog = debugLog;
}

