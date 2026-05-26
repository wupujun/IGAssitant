function createDomSelectors({
  rootId,
  debug = () => {},
  documentRef = globalThis.document,
  windowRef = globalThis.window,
  locationRef = globalThis.location,
  normalizeMessageText = globalThis.IGCAHistory?.normalizeMessageText,
  isConversationNoise = globalThis.IGCAHistory?.isConversationNoise,
}) {
  function getComposer() {
    const candidates = [
      'div[contenteditable="true"][aria-label*="Message" i]',
      'div[contenteditable="true"][data-lexical-editor="true"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][aria-label]',
      "textarea",
    ];

    for (const selector of candidates) {
      const elements = [...documentRef.querySelectorAll(selector)];
      const visible = elements
        .filter((element) => element.offsetParent !== null)
        .filter((element) => !element.closest(`#${rootId}`));
      if (visible.length) {
        debug("composer found", { selector, count: visible.length });
        return visible[visible.length - 1];
      }
    }

    debug("composer not found");
    return null;
  }

  function getChatSurface(composer = getComposer()) {
    if (!composer) return documentRef;

    let current = composer.parentElement;
    let best = null;
    while (current && current !== documentRef.body && current !== documentRef.documentElement) {
      if (current.id === rootId) {
        current = current.parentElement;
        continue;
      }
      const rect = current.getBoundingClientRect();
      const looksLikeFloatingChat =
        rect.width >= 280 &&
        rect.width <= 620 &&
        rect.height >= 260 &&
        rect.height <= windowRef.innerHeight &&
        rect.right > windowRef.innerWidth * 0.45;
      const looksLikeDirectPane =
        locationRef.pathname.startsWith("/direct/") &&
        rect.width >= 320 &&
        rect.height >= 360;

      if (looksLikeFloatingChat || looksLikeDirectPane) {
        best = current;
      }
      current = current.parentElement;
    }

    return best || documentRef;
  }

  function hasActiveChat() {
    return Boolean(getComposer());
  }

  function shouldRenderAssistant() {
    return locationRef.pathname.startsWith("/direct/") || hasActiveChat();
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
        right: windowRef.innerWidth,
        center: windowRef.innerWidth / 2,
        bottom: windowRef.innerHeight,
      };
    }

    const rect = composer.getBoundingClientRect();
    const surfaceRect =
      surface === documentRef ? { left: 0, right: windowRef.innerWidth } : surface.getBoundingClientRect();
    return {
      left: Math.max(0, surfaceRect.left),
      right: Math.min(windowRef.innerWidth, surfaceRect.right),
      center: surfaceRect.left + (surfaceRect.right - surfaceRect.left) / 2,
      bottom: rect.top,
    };
  }

  function isIncomingMessageCandidate(element, thread) {
    if (element.closest(`#${rootId}`)) return false;
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
    if (element.closest(`#${rootId}`)) return false;
    if (element.closest('[contenteditable="true"]')) return false;
    if (element.closest("button, nav, header, footer")) return false;

    const rect = element.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return false;
    if (rect.bottom > thread.bottom - 6) return false;
    if (rect.right < thread.left || rect.left > thread.right) return false;
    return true;
  }

  return {
    getComposer,
    getChatSurface,
    hasActiveChat,
    shouldRenderAssistant,
    classifyMessageElement,
    elementLooksLikeMessageBubble,
    getThreadGeometry,
    isIncomingMessageCandidate,
    isMessageCandidate,
  };
}

const domSelectors = {
  createDomSelectors,
};

if (typeof module !== "undefined") {
  module.exports = domSelectors;
}

if (typeof globalThis !== "undefined") {
  globalThis.IGCADomSelectors = domSelectors;
}

