const DEFAULT_HISTORY_LIMIT = 10;

function clampHistoryLimit(value, fallback = DEFAULT_HISTORY_LIMIT) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(200, Math.max(5, Math.round(numeric)));
}

function slugifySession(value) {
  return (
    (value || "unknown")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "unknown"
  );
}

function normalizePartnerName(value) {
  const parts = (value || "")
    .split(/\n|\s{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter(
      (part) =>
        !/^(instagram|active|active\s+\d+|message|messages|send|switch|follow|following|see all|online|home|search|explore|reels|notifications|profile)$/i.test(
          part,
        ),
    );
  return (parts[0] || value || "Unknown chat").trim().slice(0, 80);
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
    (/^[a-z0-9._-]{3,40}$/i.test(value) && /[._]|\d/.test(value))
  );
}

function normalizeHistoryItem(item) {
  const role = item?.role === "me" ? "me" : "partner";
  const content = normalizeMessageText(item?.content || "");
  if (!content || isConversationNoise(content)) return null;
  return { role, content };
}

function mergeMessageHistory(existing, visible, historyLimit) {
  const limit = clampHistoryLimit(historyLimit);
  const merged = (existing || []).map(normalizeHistoryItem).filter(Boolean);
  visible.forEach((item) => {
    const normalized = normalizeHistoryItem(item);
    if (!normalized) return;
    const previous = merged.at(-1);
    if (previous?.role === normalized.role && previous?.content === normalized.content) return;
    if (merged.some((entry) => entry.role === normalized.role && entry.content === normalized.content)) return;
    merged.push(normalized);
  });
  return merged.slice(-limit);
}

function formatMessageHistory(messageHistory) {
  return (
    messageHistory.map((item) => `${item.role === "partner" ? "Partner" : "Me"}: ${item.content}`).join("\n") ||
    "No message history found."
  );
}

const historyUtils = {
  DEFAULT_HISTORY_LIMIT,
  clampHistoryLimit,
  slugifySession,
  normalizePartnerName,
  normalizeMessageText,
  isConversationNoise,
  normalizeHistoryItem,
  mergeMessageHistory,
  formatMessageHistory,
};

if (typeof module !== "undefined") {
  module.exports = historyUtils;
}

if (typeof globalThis !== "undefined") {
  globalThis.IGCAHistory = historyUtils;
}

