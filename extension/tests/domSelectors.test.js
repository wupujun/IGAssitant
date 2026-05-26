const assert = require("node:assert/strict");
const test = require("node:test");

const { createDomSelectors } = require("../domSelectors.js");
const { isConversationNoise, normalizeMessageText } = require("../history.js");

class FakeElement {
  constructor({
    id = "",
    text = "",
    rect = { left: 0, right: 100, top: 0, bottom: 20, width: 100, height: 20 },
    offsetParent = {},
    parentElement = null,
    closestMatches = {},
    queryResults = {},
  } = {}) {
    this.id = id;
    this.innerText = text;
    this.textContent = text;
    this.offsetParent = offsetParent;
    this.parentElement = parentElement;
    this.queryResults = queryResults;
    this.closestMatches = closestMatches;
    this.rect = rect;
  }

  getBoundingClientRect() {
    return this.rect;
  }

  closest(selector) {
    return this.closestMatches[selector] || null;
  }

  querySelector(selector) {
    return this.queryResults[selector]?.[0] || null;
  }

  querySelectorAll(selector) {
    return this.queryResults[selector] || [];
  }
}

function fakeDocument(queryResults = {}) {
  return {
    body: { id: "body" },
    documentElement: { id: "html" },
    querySelectorAll(selector) {
      return queryResults[selector] || [];
    },
  };
}

function createSelectors({ documentRef = fakeDocument(), pathname = "/direct/t/123" } = {}) {
  return createDomSelectors({
    rootId: "igca-root",
    documentRef,
    windowRef: {
      innerHeight: 800,
      innerWidth: 1200,
    },
    locationRef: {
      pathname,
    },
    normalizeMessageText,
    isConversationNoise,
  });
}

test("getComposer returns the last visible composer outside the assistant root", () => {
  const hidden = new FakeElement({ offsetParent: null });
  const insideAssistant = new FakeElement({ closestMatches: { "#igca-root": {} } });
  const visible = new FakeElement({ text: "composer" });
  const documentRef = fakeDocument({
    'div[contenteditable="true"][aria-label*="Message" i]': [hidden, insideAssistant, visible],
  });

  const selectors = createSelectors({ documentRef });

  assert.equal(selectors.getComposer(), visible);
});

test("shouldRenderAssistant is true for direct route even before composer is found", () => {
  const selectors = createSelectors({
    pathname: "/direct/t/123",
    documentRef: fakeDocument(),
  });

  assert.equal(selectors.shouldRenderAssistant(), true);
});

test("shouldRenderAssistant is false without direct route or composer", () => {
  const selectors = createSelectors({
    pathname: "/",
    documentRef: fakeDocument(),
  });

  assert.equal(selectors.shouldRenderAssistant(), false);
});

test("classifyMessageElement falls back to known media markers", () => {
  const imageElement = new FakeElement({
    queryResults: {
      img: [{}],
    },
  });
  const linkElement = new FakeElement({
    queryResults: {
      'a[href]': [{}],
    },
  });
  const selectors = createSelectors();

  assert.equal(selectors.classifyMessageElement(imageElement), "img");
  assert.equal(selectors.classifyMessageElement(linkElement), "link");
});

test("isMessageCandidate rejects assistant, composer, controls, and out-of-thread elements", () => {
  const selectors = createSelectors();
  const thread = {
    left: 0,
    right: 600,
    bottom: 600,
  };

  assert.equal(selectors.isMessageCandidate(new FakeElement({ closestMatches: { "#igca-root": {} } }), thread), false);
  assert.equal(
    selectors.isMessageCandidate(new FakeElement({ closestMatches: { '[contenteditable="true"]': {} } }), thread),
    false,
  );
  assert.equal(selectors.isMessageCandidate(new FakeElement({ closestMatches: { "button, nav, header, footer": {} } }), thread), false);
  assert.equal(
    selectors.isMessageCandidate(
      new FakeElement({
        rect: { left: 700, right: 800, top: 10, bottom: 30, width: 100, height: 20 },
      }),
      thread,
    ),
    false,
  );
});

test("isIncomingMessageCandidate uses left side of thread center", () => {
  const selectors = createSelectors();
  const thread = {
    left: 0,
    right: 600,
    center: 300,
    bottom: 600,
  };

  const incoming = new FakeElement({
    rect: { left: 20, right: 220, top: 10, bottom: 40, width: 200, height: 30 },
  });
  const outgoing = new FakeElement({
    rect: { left: 380, right: 580, top: 10, bottom: 40, width: 200, height: 30 },
  });

  assert.equal(selectors.isIncomingMessageCandidate(incoming, thread), true);
  assert.equal(selectors.isIncomingMessageCandidate(outgoing, thread), false);
});

