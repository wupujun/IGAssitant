const ALLOWED_PREFIXES = [
  "http://127.0.0.1:8765/",
  "http://localhost:8765/",
];

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "igca-api-fetch") return false;

  const { url, options = {} } = message;
  if (!ALLOWED_PREFIXES.some((prefix) => url.startsWith(prefix))) {
    sendResponse({ ok: false, status: 0, error: "Blocked non-local API URL." });
    return false;
  }

  fetch(url, options)
    .then(async (response) => {
      const text = await response.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }
      sendResponse({
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        data,
      });
    })
    .catch((error) => {
      sendResponse({ ok: false, status: 0, error: error.message || "Fetch failed." });
    });

  return true;
});
