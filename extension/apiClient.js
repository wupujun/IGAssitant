const API_BASE = "http://127.0.0.1:8765";
const AUTOCOMPLETE_URL = `${API_BASE}/autocomplete`;
const CONFIG_URL = `${API_BASE}/config`;
const HEALTH_URL = `${API_BASE}/health`;

async function directFetch(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    data,
  };
}

function backgroundFetch(url, options = {}, runtime = globalThis.chrome?.runtime) {
  return new Promise((resolve, reject) => {
    if (!runtime?.sendMessage) {
      reject(new Error("Extension runtime is not available."));
      return;
    }

    runtime.sendMessage(
      {
        type: "igca-api-fetch",
        url,
        options,
      },
      (response) => {
        if (runtime.lastError) {
          reject(new Error(runtime.lastError.message));
          return;
        }
        if (!response) {
          reject(new Error("No response from extension background worker."));
          return;
        }
        resolve(response);
      },
    );
  });
}

async function apiFetch(url, options = {}, runtime = globalThis.chrome?.runtime, fetchImpl = directFetch) {
  try {
    const response = await backgroundFetch(url, options, runtime);
    if (response.ok || response.status !== 0) return response;
    const fallback = await fetchImpl(url, options);
    return {
      ...fallback,
      fallback: "direct",
      backgroundError: response.error || "Background fetch failed.",
    };
  } catch (error) {
    const fallback = await fetchImpl(url, options);
    return {
      ...fallback,
      fallback: "direct",
      backgroundError: error.message || "Background fetch failed.",
    };
  }
}

const apiClient = {
  API_BASE,
  AUTOCOMPLETE_URL,
  CONFIG_URL,
  HEALTH_URL,
  backgroundFetch,
  directFetch,
  apiFetch,
};

if (typeof module !== "undefined") {
  module.exports = apiClient;
}

if (typeof globalThis !== "undefined") {
  globalThis.IGCAApiClient = apiClient;
}
