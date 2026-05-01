(() => {
  const API_BASE = "http://127.0.0.1:8765";
  const AUTOCOMPLETE_URL = `${API_BASE}/autocomplete`;
  const CONFIG_URL = `${API_BASE}/config`;
  const HEALTH_URL = `${API_BASE}/health`;
  const ROOT_ID = "igca-root";
  const VERSION = "0.3.13";
  const POSITION_KEY = "igca-panel-position";
  const SESSIONS_KEY = "igca-conversation-sessions";
  const HISTORY_LIMIT_KEY = "igca-history-limit";
  const DEFAULT_HISTORY_LIMIT = 10;
  const DEBUG_LIMIT = 80;
  const HEARTBEAT_MS = 30000;

  if (window.__igcaLoaded) return;
  window.__igcaLoaded = true;

  let selectedStyle = "ig";
  let minimized = false;
  let draftText = "";
  let lastPartnerMessage = "";
  let messageHistory = [];
  let currentSessionId = "unknown";
  let currentSessionName = "Unknown chat";
  let historyLimit = loadHistoryLimit();
  let lastPathname = "";
  let autocompleteTimer = 0;
  let autocompleteRequestId = 0;
  let lastAutocompleteKey = "";
  let connectivityTimer = 0;
  let lastSuggestion = "";
  let apiOnline = false;
  let heartbeatCount = 0;
  let dragState = null;
  const debugEntries = [];
  const sessions = loadSessions();

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function debug(message, details = {}) {
    const entry = {
      time: new Date().toLocaleTimeString(),
      message,
      details,
    };
    debugEntries.push(entry);
    if (debugEntries.length > DEBUG_LIMIT) debugEntries.shift();
    console.debug("[IGCA]", message, details);

    const log = document.querySelector(`#${ROOT_ID} .igca-debug-log`);
    if (!log) return;
    log.textContent = debugEntries
      .slice(-12)
      .map((item) => {
        const detailText = Object.keys(item.details).length ? ` ${JSON.stringify(item.details)}` : "";
        return `${item.time} ${item.message}${detailText}`;
      })
      .join("\n");
    log.scrollTop = log.scrollHeight;
  }

  debug("content script loaded", { version: VERSION, path: location.pathname });

  function apiFetch(url, options = {}) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: "igca-api-fetch",
          url,
          options,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
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

  function loadSessions() {
    try {
      return JSON.parse(localStorage.getItem(SESSIONS_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveSessions() {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  }

  function loadHistoryLimit() {
    const value = Number(localStorage.getItem(HISTORY_LIMIT_KEY));
    if (!Number.isFinite(value)) return DEFAULT_HISTORY_LIMIT;
    return Math.min(200, Math.max(5, Math.round(value)));
  }

  function saveHistoryLimit(value) {
    historyLimit = Math.min(200, Math.max(5, Math.round(Number(value) || DEFAULT_HISTORY_LIMIT)));
    localStorage.setItem(HISTORY_LIMIT_KEY, String(historyLimit));
    Object.values(sessions).forEach((session) => {
      session.messageHistory = (session.messageHistory || []).slice(-historyLimit);
    });
    saveSessions();
    debug("history limit saved", { historyLimit });
  }

  function slugifySession(value) {
    return (value || "unknown")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "unknown";
  }

  function normalizePartnerName(value) {
    const parts = (value || "")
      .split(/\n|\s{2,}/)
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((part) => !/^(instagram|active|active\s+\d+|message|messages|send|switch|follow|following|see all|online|home|search|explore|reels|notifications|profile)$/i.test(part));
    return (parts[0] || value || "Unknown chat").trim().slice(0, 80);
  }

  function candidatePartnerNameFromElement(element) {
    const text = normalizePartnerName((element.innerText || element.textContent || "").trim());
    if (!text || text === "Unknown chat") return "";
    if (/instagram/i.test(text)) return "";
    if (text.length > 40) return "";
    return text;
  }

  function getSessionFromSurface(surface = getChatSurface()) {
    const composer = getComposer();
    const composerRect = composer?.getBoundingClientRect();
    const candidates = [...surface.querySelectorAll("header a, header span, header div, h1, h2, a[role='link'], span, div")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          name: candidatePartnerNameFromElement(element),
          top: rect.top,
          left: rect.left,
          distance: composerRect ? Math.abs(rect.top - composerRect.top) : 0,
        };
      })
      .filter((item) => item.name)
      .filter((item) => !composerRect || item.top < composerRect.top)
      .sort((a, b) => {
        const headerBiasA = a.top < window.innerHeight * 0.55 ? 0 : 1000;
        const headerBiasB = b.top < window.innerHeight * 0.55 ? 0 : 1000;
        return headerBiasA - headerBiasB || a.distance - b.distance || a.left - b.left;
      });
    const headerText = candidates[0]?.name || "";
    const name = normalizePartnerName(headerText || (location.pathname.startsWith("/direct/t/") ? "Direct thread" : "Floating chat"));
    if (location.pathname.startsWith("/direct/t/")) {
      const threadId = location.pathname.split("/").filter(Boolean).at(-1);
      return { id: threadId, name };
    }
    return { id: slugifySession(name), name };
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

  function persistCurrentSession() {
    const session = ensureSession(currentSessionId, currentSessionName);
    session.draftText = draftText;
    session.lastPartnerMessage = lastPartnerMessage;
    session.messageHistory = messageHistory.slice(-historyLimit);
    session.lastSuggestion = lastSuggestion;
    session.selectedStyle = selectedStyle;
    session.updatedAt = Date.now();
    saveSessions();
  }

  function switchSessionIfNeeded(root) {
    const sessionInfo = getSessionFromSurface();
    if (sessionInfo.id === currentSessionId) return false;

    if (currentSessionId !== "unknown") persistCurrentSession();
    currentSessionId = sessionInfo.id;
    currentSessionName = sessionInfo.name;
    const session = ensureSession(currentSessionId, currentSessionName);
    draftText = session.draftText || "";
    lastPartnerMessage = session.lastPartnerMessage || "";
    messageHistory = (session.messageHistory || []).slice(-historyLimit);
    lastSuggestion = session.lastSuggestion || "";
    selectedStyle = session.selectedStyle || "ig";
    saveSessions();
    debug("session switched", { id: currentSessionId, name: currentSessionName });

    const sessionBox = root?.querySelector(".igca-session-name");
    if (sessionBox) sessionBox.textContent = currentSessionId;
    return true;
  }

  function loadPosition() {
    try {
      return JSON.parse(localStorage.getItem(POSITION_KEY) || "null");
    } catch {
      debug("position parse failed");
      return null;
    }
  }

  function savePosition(left, top) {
    localStorage.setItem(POSITION_KEY, JSON.stringify({ left, top }));
    debug("position saved", { left: Math.round(left), top: Math.round(top) });
  }

  function applyPosition(root) {
    const position = loadPosition();
    if (!position) {
      root.style.left = "";
      root.style.top = "";
      root.style.right = "18px";
      root.style.bottom = "18px";
      debug("position default applied");
      return;
    }

    const maxLeft = Math.max(12, window.innerWidth - root.offsetWidth - 12);
    const maxTop = Math.max(12, window.innerHeight - root.offsetHeight - 12);
    root.style.left = `${Math.min(Math.max(12, position.left), maxLeft)}px`;
    root.style.top = `${Math.min(Math.max(12, position.top), maxTop)}px`;
    root.style.right = "auto";
    root.style.bottom = "auto";
    debug("position restored", { left: root.style.left, top: root.style.top });
  }

  function installDragging(root, handle) {
    handle.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button")) return;
      const rect = root.getBoundingClientRect();
      dragState = {
        startX: event.clientX,
        startY: event.clientY,
        left: rect.left,
        top: rect.top,
      };
      handle.setPointerCapture(event.pointerId);
      root.classList.add("igca-dragging");
      debug("drag start", { left: Math.round(rect.left), top: Math.round(rect.top) });
    });

    handle.addEventListener("pointermove", (event) => {
      if (!dragState) return;
      const nextLeft = dragState.left + event.clientX - dragState.startX;
      const nextTop = dragState.top + event.clientY - dragState.startY;
      const maxLeft = window.innerWidth - root.offsetWidth - 12;
      const maxTop = window.innerHeight - root.offsetHeight - 12;
      const left = Math.min(Math.max(12, nextLeft), Math.max(12, maxLeft));
      const top = Math.min(Math.max(12, nextTop), Math.max(12, maxTop));
      root.style.left = `${left}px`;
      root.style.top = `${top}px`;
      root.style.right = "auto";
      root.style.bottom = "auto";
    });

    handle.addEventListener("pointerup", () => {
      if (!dragState) return;
      const rect = root.getBoundingClientRect();
      savePosition(rect.left, rect.top);
      dragState = null;
      root.classList.remove("igca-dragging");
      debug("drag end", { left: Math.round(rect.left), top: Math.round(rect.top) });
    });
  }

  function getComposer() {
    const candidates = [
      'div[contenteditable="true"][aria-label*="Message" i]',
      'div[contenteditable="true"][data-lexical-editor="true"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][aria-label]',
      'textarea',
    ];

    for (const selector of candidates) {
      const elements = [...document.querySelectorAll(selector)];
      const visible = elements
        .filter((element) => element.offsetParent !== null)
        .filter((element) => !element.closest(`#${ROOT_ID}`));
      if (visible.length) {
        debug("composer found", { selector, count: visible.length });
        return visible[visible.length - 1];
      }
    }

    debug("composer not found");
    return null;
  }

  function getChatSurface(composer = getComposer()) {
    if (!composer) return document;

    let current = composer.parentElement;
    let best = null;
    while (current && current !== document.body && current !== document.documentElement) {
      if (current.id === ROOT_ID) {
        current = current.parentElement;
        continue;
      }
      const rect = current.getBoundingClientRect();
      const looksLikeFloatingChat =
        rect.width >= 280 &&
        rect.width <= 620 &&
        rect.height >= 260 &&
        rect.height <= window.innerHeight &&
        rect.right > window.innerWidth * 0.45;
      const looksLikeDirectPane =
        location.pathname.startsWith("/direct/") &&
        rect.width >= 320 &&
        rect.height >= 360;

      if (looksLikeFloatingChat || looksLikeDirectPane) {
        best = current;
      }
      current = current.parentElement;
    }

    return best || document;
  }

  function hasActiveChat() {
    return Boolean(getComposer());
  }

  function shouldRenderAssistant() {
    return location.pathname.startsWith("/direct/") || hasActiveChat();
  }

  function classifyMessageElement(element) {
    const text = normalizeMessageText(element.innerText || element.textContent || "");
    if (text) return text;
    if (element.querySelector("img")) return "img";
    if (element.querySelector("a[href]")) return "link";
    if (element.querySelector("video")) return "video";
    if (element.querySelector("audio")) return "audio";
    return "";
  }

  function normalizeMessageText(text) {
    return (text || "")
      .replace(/[\u00a0\u202f]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isConversationNoise(text) {
    const value = normalizeMessageText(text).toLowerCase();
    if (!value) return true;
    return (
      /^(seen|sent|delivered|read)(\s+\d+\s*(sec|secs|second|seconds|min|mins|minute|minutes|hr|hrs|hour|hours|d|day|days|w|week|weeks|mo|month|months|y|yr|yrs|year|years|s|m|h)\s*ago)?$/i.test(value) ||
      /^(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+\d{1,2}:\d{2}\s*(am|pm)$/i.test(value) ||
      /^(yesterday|today)\s+\d{1,2}:\d{2}\s*(am|pm)$/i.test(value) ||
      /^\d{1,2}:\d{2}\s*(am|pm)$/i.test(value) ||
      /^\d+\s*(sec|secs|second|seconds|min|mins|minute|minutes|hr|hrs|hour|hours|d|day|days|w|week|weeks|mo|month|months|y|yr|yrs|year|years|s|m|h)\s*ago$/i.test(value) ||
      /^(active|active\s+\d+\s*(m|h|d|min|mins|hr|hrs|day|days)\s*ago)$/i.test(value) ||
      /^[a-z]{3}\s+\d{1,2}:\d{2}\s*(am|pm)$/i.test(value) ||
      /^notifications?:/i.test(value) ||
      /^.+\s+sent an attachment\.?$/i.test(value) ||
      /^[a-z0-9._-]{3,40}$/i.test(value) && /[._]|\d/.test(value)
    );
  }

  function normalizeHistoryItem(item) {
    const role = item?.role === "me" ? "me" : "partner";
    const content = normalizeMessageText(item?.content || "");
    if (!content || isConversationNoise(content)) return null;
    return { role, content };
  }

  function elementLooksLikeMessageBubble(element, content) {
    if (isConversationNoise(content)) return false;
    const rect = element.getBoundingClientRect();
    const parentText = normalizeMessageText(element.parentElement?.innerText || "");
    if (parentText && parentText !== content && isConversationNoise(parentText)) return false;
    if (rect.height < 12 || rect.width < 16) return false;
    return true;
  }

  function getThreadGeometry() {
    const composer = getComposer();
    const surface = getChatSurface(composer);
    if (!composer) {
      return {
        left: 0,
        right: window.innerWidth,
        center: window.innerWidth / 2,
        bottom: window.innerHeight,
      };
    }

    const rect = composer.getBoundingClientRect();
    const surfaceRect = surface === document
      ? { left: 0, right: window.innerWidth }
      : surface.getBoundingClientRect();
    return {
      left: Math.max(0, surfaceRect.left),
      right: Math.min(window.innerWidth, surfaceRect.right),
      center: surfaceRect.left + (surfaceRect.right - surfaceRect.left) / 2,
      bottom: rect.top,
    };
  }

  function isIncomingMessageCandidate(element, thread) {
    if (element.closest(`#${ROOT_ID}`)) return false;
    if (element.closest('[contenteditable="true"]')) return false;
    if (element.closest("button, nav, header, footer")) return false;

    const rect = element.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return false;
    if (rect.bottom > thread.bottom - 6) return false;
    if (rect.right < thread.left || rect.left > thread.right) return false;

    const center = rect.left + rect.width / 2;
    return center < thread.center;
  }

  function isMessageCandidate(element, thread) {
    if (element.closest(`#${ROOT_ID}`)) return false;
    if (element.closest('[contenteditable="true"]')) return false;
    if (element.closest("button, nav, header, footer")) return false;

    const rect = element.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return false;
    if (rect.bottom > thread.bottom - 6) return false;
    if (rect.right < thread.left || rect.left > thread.right) return false;
    return true;
  }

  function getVisibleMessageHistory() {
    const selectors = [
      'div[role="row"]',
      'div[role="listitem"]',
      'div[dir="auto"]',
      'span[dir="auto"]',
    ];
    const thread = getThreadGeometry();
    const surface = getChatSurface();
    const items = [];
    const seen = new Set();

    selectors.forEach((selector) => {
      surface.querySelectorAll(selector).forEach((element) => {
        if (!isMessageCandidate(element, thread)) return;
        const content = classifyMessageElement(element);
        if (!content || content.length > 500) return;
        if (!elementLooksLikeMessageBubble(element, content)) return;
        const rect = element.getBoundingClientRect();
        const role = rect.left + rect.width / 2 < thread.center ? "partner" : "me";
        const key = `${role}:${content}:${Math.round(rect.top)}`;
        if (seen.has(key)) return;
        seen.add(key);
        items.push({ role, content, top: rect.top });
      });
    });

    return items
      .sort((a, b) => a.top - b.top)
      .map(({ role, content }) => ({ role, content }))
      .slice(-historyLimit);
  }

  function mergeMessageHistory(existing, visible) {
    const merged = (existing || []).map(normalizeHistoryItem).filter(Boolean);
    visible.forEach((item) => {
      const normalized = normalizeHistoryItem(item);
      if (!normalized) return;
      const previous = merged.at(-1);
      if (previous?.role === normalized.role && previous?.content === normalized.content) return;
      if (merged.some((entry) => entry.role === normalized.role && entry.content === normalized.content)) return;
      merged.push(normalized);
    });
    return merged.slice(-historyLimit);
  }

  function formatMessageHistory() {
    return messageHistory
      .map((item) => `${item.role === "partner" ? "Partner" : "Me"}: ${item.content}`)
      .join("\n") || "No message history found.";
  }

  function applyCleanedHistory(root, cleanedHistory) {
    if (!Array.isArray(cleanedHistory)) return;
    const normalized = cleanedHistory
      .map(normalizeHistoryItem)
      .filter(Boolean)
      .slice(-historyLimit);

    messageHistory = normalized;
    lastPartnerMessage = [...messageHistory].reverse().find((item) => item.role === "partner")?.content || lastPartnerMessage;
    const box = root.querySelector(".igca-last-message");
    if (box) box.value = formatMessageHistory();
    persistCurrentSession();
    debug("cleaned history applied", { count: messageHistory.length });
  }

  function getLastReceivedMessage() {
    const history = getVisibleMessageHistory();
    const result = [...history].reverse().find((item) => item.role === "partner")?.content || "";
    debug("last incoming message scanned", {
      candidates: history.length,
      result: result.slice(0, 80),
    });
    return result;
  }

  function refreshLastMessage(root) {
    switchSessionIfNeeded(root);
    messageHistory = mergeMessageHistory(messageHistory, getVisibleMessageHistory());
    lastPartnerMessage = getLastReceivedMessage();
    const box = root.querySelector(".igca-last-message");
    if (box) box.value = formatMessageHistory();
    persistCurrentSession();
    debug("message history refreshed", { count: messageHistory.length, lastPartnerLength: lastPartnerMessage.length });
  }

  function setNativeValue(element, value) {
    const prototype = element.tagName === "TEXTAREA"
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    descriptor.set.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function insertIntoComposer(text) {
    const composer = getComposer();
    if (!composer) {
      throw new Error("Could not find the Instagram message input. Click the Instagram composer and try again.");
    }

    composer.focus();

    if (composer.tagName === "TEXTAREA" || composer.tagName === "INPUT") {
      setNativeValue(composer, text);
      debug("inserted into native composer", { length: text.length });
      return;
    }

    const selection = window.getSelection();
    const range = document.createRange();
    composer.textContent = "";
    range.selectNodeContents(composer);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("insertText", false, text);
    composer.dispatchEvent(new Event("input", { bubbles: true }));
    debug("inserted into contenteditable composer", { length: text.length });
  }

  function getSendButton() {
    const root = document.getElementById(ROOT_ID);
    const surface = getChatSurface();
    const candidates = [
      'div[role="button"]',
      'button',
    ];

    for (const selector of candidates) {
      const elements = [...surface.querySelectorAll(selector)];
      const visible = elements
        .filter((element) => element.offsetParent !== null)
        .filter((element) => !root?.contains(element))
        .filter((element) => {
          const label = [
            element.innerText,
            element.textContent,
            element.getAttribute("aria-label"),
            element.getAttribute("title"),
          ]
            .filter(Boolean)
            .join(" ")
            .trim()
            .toLowerCase();
          return label === "send" || label.includes("send");
        });
      if (visible.length) {
        debug("send button found", { selector, count: visible.length });
        return visible[visible.length - 1];
      }
    }

    debug("send button not found");
    return null;
  }

  function clickSendButton() {
    const sendButton = getSendButton();
    if (!sendButton) {
      throw new Error("Could not find Instagram's Send button after inserting the message.");
    }
    sendButton.click();
    debug("send button clicked");
  }

  function setStatus(root, message, state = "idle") {
    const status = root.querySelector(".igca-status");
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state;
  }

  function setActivity(root, message, state = "idle") {
    const activity = root.querySelector(".igca-activity");
    if (!activity) return;
    activity.textContent = message;
    activity.dataset.state = state;
  }

  async function checkConnectivity(root) {
    heartbeatCount += 1;
    const heartbeatLabel = `heartbeat #${heartbeatCount}`;
    try {
      debug("health request start", { heartbeat: heartbeatCount });
      const response = await apiFetch(HEALTH_URL, { cache: "no-store" });
      const data = response.data || {};
      if (!response.ok) throw new Error(response.error || `HTTP ${response.status}`);
      apiOnline = true;
      const keyState = data.openai_configured ? "OpenAI ready" : "OpenAI key missing";
      const time = new Date().toLocaleTimeString();
      setStatus(root, `API online - ${keyState} - ${data.model || "model unknown"} - ${heartbeatLabel} at ${time}`, "ok");
      debug("health request ok", { status: response.status, model: data.model, openaiConfigured: data.openai_configured, via: "background" });
    } catch {
      apiOnline = false;
      const time = new Date().toLocaleTimeString();
      setStatus(root, `API offline - ${heartbeatLabel} failed at ${time} - ${API_BASE}`, "error");
      debug("health request failed", { apiBase: API_BASE, heartbeat: heartbeatCount });
    }
  }

  function startConnectivityChecks(root) {
    window.clearInterval(connectivityTimer);
    checkConnectivity(root);
    connectivityTimer = window.setInterval(() => checkConnectivity(root), HEARTBEAT_MS);
  }

  function setBusy(root, busy) {
    root.querySelectorAll("button, textarea").forEach((element) => {
      element.disabled = busy;
    });
  }

  function syncStyleButtons(root) {
    selectedStyle = "ig";
  }

  function updateSuggestion(root, suggestion) {
    lastSuggestion = suggestion || "";
    const box = root.querySelector(".igca-suggestion");
    const button = root.querySelector(".igca-apply-suggestion");
    if (box) box.value = lastSuggestion || "";
    if (button) button.disabled = !lastSuggestion;
    persistCurrentSession();
    debug("suggestion updated", { length: lastSuggestion.length });
  }

  function focusDraftInput(root, textarea) {
    const target = textarea || root.querySelector(".igca-draft-input");
    if (!target) return;

    [0, 80, 250, 600].forEach((delay) => {
      window.setTimeout(() => {
        if (!document.contains(target)) return;
        target.focus({ preventScroll: true });
        const cursorPosition = target.value.length;
        target.setSelectionRange(cursorPosition, cursorPosition);
        debug("draft input focused", { delay });
      }, delay);
    });
  }

  function scheduleAutocomplete(root, textarea) {
    window.clearTimeout(autocompleteTimer);
    autocompleteTimer = window.setTimeout(async () => {
      const text = textarea.value.trim();
      if (!text) {
        lastAutocompleteKey = "";
        updateSuggestion(root, "");
        debug("autocomplete skipped", { reason: "empty draft" });
        return;
      }
      if (!/[a-z0-9\u4e00-\u9fff]/i.test(text)) {
        debug("autocomplete skipped", { reason: "no text-like characters", length: text.length });
        return;
      }
      if (!apiOnline) {
        debug("autocomplete skipped", { reason: "api offline", length: text.length });
        return;
      }

      const requestKey = JSON.stringify([currentSessionId, lastPartnerMessage, text]);
      if (requestKey === lastAutocompleteKey) {
        debug("autocomplete skipped", { reason: "duplicate request" });
        return;
      }
      lastAutocompleteKey = requestKey;

      const requestId = ++autocompleteRequestId;
      const startedAt = performance.now();
      try {
        debug("autocomplete request start", { length: text.length, lastMessageLength: lastPartnerMessage.length, style: "ig" });
        const response = await apiFetch(AUTOCOMPLETE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            last_message: lastPartnerMessage,
            message_history: [],
            style: "ig",
            session_id: currentSessionId,
            session_name: currentSessionName,
          }),
        });
        if (requestId !== autocompleteRequestId) {
          debug("autocomplete response ignored", { requestId, currentRequestId: autocompleteRequestId });
          return;
        }
        const data = response.data || {};
        if (!response.ok) throw new Error(response.error || data.detail || `API returned ${response.status}`);
        const durationMs = Math.round(performance.now() - startedAt);
        updateSuggestion(root, data.suggestion || "");
        setActivity(root, `Autocomplete ${durationMs}ms.`);
        debug("autocomplete request ok", {
          status: response.status,
          suggestionLength: (data.suggestion || "").length,
          durationMs,
        });
      } catch (error) {
        if (requestId !== autocompleteRequestId) {
          debug("stale autocomplete failure ignored", { requestId, currentRequestId: autocompleteRequestId });
          return;
        }
        lastAutocompleteKey = "";
        updateSuggestion(root, "");
        setActivity(root, error.message || "Autocomplete failed.", "error");
        debug("autocomplete request failed", { message: error.message, durationMs: Math.round(performance.now() - startedAt) });
      }
    }, 350);
  }

  function insertDraft(root, textarea) {
    const text = textarea.value.trim();
    if (!text) {
      setActivity(root, "Nothing to insert.", "error");
      focusDraftInput(root, textarea);
      return;
    }

    insertIntoComposer(text);
    draftText = "";
    textarea.value = "";
    updateSuggestion(root, "");
    persistCurrentSession();
    setActivity(root, "Inserted and cleared.");
    focusDraftInput(root, textarea);
    debug("draft inserted and cleared", { length: text.length });
  }

  function sendDraft(root, textarea, useSuggestion = true) {
    const suggestionBox = root.querySelector(".igca-suggestion");
    const suggestionText = (suggestionBox?.value || lastSuggestion || "").trim();
    const draftValue = textarea.value.trim();
    const text = (useSuggestion ? suggestionText || draftValue : draftValue).trim();
    const usedSuggestion = useSuggestion && Boolean(suggestionText);
    if (!text) {
      setActivity(root, "Nothing to send.", "error");
      focusDraftInput(root, textarea);
      return;
    }

    window.clearTimeout(autocompleteTimer);
    autocompleteRequestId += 1;
    lastAutocompleteKey = "";
    insertIntoComposer(text);
    window.setTimeout(() => {
      try {
        clickSendButton();
        messageHistory = mergeMessageHistory(messageHistory, [{ role: "me", content: text }]);
        draftText = "";
        textarea.value = "";
        updateSuggestion(root, "");
        persistCurrentSession();
        focusDraftInput(root, textarea);
        setActivity(root, usedSuggestion ? "Sent autocomplete and cleared." : "Sent draft and cleared.");
        debug("draft sent and cleared", { length: text.length, usedSuggestion });
      } catch (error) {
        setActivity(root, error.message, "error");
        focusDraftInput(root, textarea);
        debug("send failed", { message: error.message });
      }
    }, 120);
  }

  function render() {
    debug("render start", { path: location.pathname, minimized });
    if (!shouldRenderAssistant()) {
      document.getElementById(ROOT_ID)?.remove();
      debug("render skipped without active chat", { path: location.pathname });
      return;
    }

    let root = document.getElementById(ROOT_ID);
    if (!root) {
      root = createElement("div");
      root.id = ROOT_ID;
      document.documentElement.appendChild(root);
    }
    switchSessionIfNeeded(root);

    root.innerHTML = "";

    if (minimized) {
      const holder = createElement("div", "igca-minimized");
      const button = createElement("button", "igca-fab", `AI v${VERSION}`);
      button.type = "button";
      button.title = "Open chat assistant";
      button.addEventListener("click", () => {
        minimized = false;
        render();
      });
      holder.appendChild(button);
      root.appendChild(holder);
      applyPosition(root);
      debug("rendered minimized");
      return;
    }

    const panel = createElement("section", "igca-panel");
    const header = createElement("div", "igca-header");
    const title = createElement("div", "igca-title", `Instagram Chat Assistant v${VERSION}`);
    const minimize = createElement("button", "igca-button", "Hide");
    minimize.type = "button";
    minimize.addEventListener("click", () => {
      minimized = true;
      render();
    });
    header.append(title, minimize);

    const body = createElement("div", "igca-body");
    const sessionLabel = createElement("label", "igca-field-label", "Session");
    const sessionName = createElement("div", "igca-session-name", currentSessionId);

    const sessionMeta = createElement("div", "igca-session-row");
    const historyLabel = createElement("label", "igca-field-label", "History");
    const historyInput = createElement("input", "igca-history-limit");
    historyInput.type = "number";
    historyInput.min = "5";
    historyInput.max = "200";
    historyInput.step = "1";
    historyInput.value = String(historyLimit);
    historyInput.title = "Number of recent messages to keep per conversation";
    historyInput.addEventListener("change", () => {
      saveHistoryLimit(historyInput.value);
      refreshLastMessage(root);
      scheduleAutocomplete(root, textarea);
    });
    sessionMeta.append(sessionName, historyLabel, historyInput);

    const lastLabel = createElement("label", "igca-field-label", `Recent messages`);
    const lastMessage = createElement("textarea", "igca-textarea igca-last-message");
    lastMessage.readOnly = true;
    lastMessage.value = formatMessageHistory();

    const draftLabel = createElement("label", "igca-field-label", "Draft");
    const textarea = createElement("textarea", "igca-textarea igca-draft-input");
    textarea.placeholder = "Write a draft... Enter sends autocomplete, Ctrl+Enter sends draft.";
    textarea.value = draftText;
    textarea.addEventListener("input", () => {
      draftText = textarea.value;
      persistCurrentSession();
      scheduleAutocomplete(root, textarea);
    });
    textarea.addEventListener("keydown", (event) => {
      if (event.shiftKey && event.key === "Enter") return;
      if (event.key === "Enter") {
        event.preventDefault();
        try {
          sendDraft(root, textarea, !event.ctrlKey);
        } catch (error) {
          setActivity(root, error.message, "error");
        }
      }
    });

    const suggestionWrap = createElement("div", "igca-suggestion-row");
    const suggestion = createElement("textarea", "igca-suggestion");
    suggestion.placeholder = "Autocomplete suggestion will appear here.";
    suggestion.value = lastSuggestion;
    suggestion.addEventListener("input", () => {
      lastSuggestion = suggestion.value;
      persistCurrentSession();
    });
    const applySuggestion = createElement("button", "igca-button igca-apply-suggestion", "Apply");
    applySuggestion.type = "button";
    applySuggestion.disabled = !lastSuggestion;
    applySuggestion.addEventListener("click", () => {
      const editedSuggestion = suggestion.value.trim();
      if (!editedSuggestion) return;
      draftText = editedSuggestion;
      textarea.value = draftText;
      updateSuggestion(root, "");
      persistCurrentSession();
      textarea.focus();
    });
    suggestionWrap.append(suggestion, applySuggestion);

    const styleRow = createElement("div", "igca-style-row");

    const debugToggle = createElement("button", "igca-button igca-debug-button", "Debug");
    debugToggle.type = "button";
    debugToggle.addEventListener("click", () => {
      const debugPanel = root.querySelector(".igca-debug");
      debugPanel?.classList.toggle("igca-debug-open");
      debug("debug panel toggled", { open: debugPanel?.classList.contains("igca-debug-open") });
    });
    styleRow.append(debugToggle);

    const backendLink = createElement("button", "igca-button igca-backend-button", "Backend");
    backendLink.type = "button";
    backendLink.title = "Open backend server UI";
    backendLink.addEventListener("click", () => {
      window.open(CONFIG_URL, "_blank", "noopener");
      debug("backend ui opened", { url: CONFIG_URL });
    });
    styleRow.append(backendLink);

    const activity = createElement("div", "igca-activity", "Ready.");
    activity.dataset.state = "idle";
    const status = createElement("div", "igca-status", `Checking API - ${API_BASE}`);
    status.dataset.state = "idle";
    const debugPanel = createElement("div", "igca-debug");
    const debugHeader = createElement("div", "igca-debug-title", "Debug log");
    const debugLog = createElement("pre", "igca-debug-log");
    debugPanel.append(debugHeader, debugLog);

    body.append(sessionLabel, sessionMeta, lastLabel, lastMessage, draftLabel, textarea, suggestionWrap, styleRow);
    panel.append(header, body, activity, status, debugPanel);
    root.appendChild(panel);
    applyPosition(root);
    installDragging(root, header);
    refreshLastMessage(root);
    startConnectivityChecks(root);
    updateSuggestion(root, lastSuggestion);
    scheduleAutocomplete(root, textarea);
    debug("render complete", { version: VERSION });
    focusDraftInput(root, textarea);
  }

  function installRouteWatcher() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    function onRouteChange() {
      if (lastPathname === location.pathname) return;
      lastPathname = location.pathname;
      debug("route changed", { path: location.pathname });
      window.setTimeout(render, 50);
    }

    history.pushState = function pushState(...args) {
      const result = originalPushState.apply(this, args);
      onRouteChange();
      return result;
    };

    history.replaceState = function replaceState(...args) {
      const result = originalReplaceState.apply(this, args);
      onRouteChange();
      return result;
    };

    window.addEventListener("popstate", onRouteChange);
    window.setInterval(() => {
      onRouteChange();
      const root = document.getElementById(ROOT_ID);
      if (!root && shouldRenderAssistant()) {
        debug("active floating chat detected");
        render();
      }
      if (root && !shouldRenderAssistant()) {
        debug("active chat no longer detected");
        render();
      }
    }, 1000);
    window.setInterval(() => {
      const root = document.getElementById(ROOT_ID);
      if (root && shouldRenderAssistant()) refreshLastMessage(root);
    }, 2000);
  }

  lastPathname = location.pathname;
  installRouteWatcher();
  render();
})();
