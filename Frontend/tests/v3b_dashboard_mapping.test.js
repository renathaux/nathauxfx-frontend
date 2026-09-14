const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const historyPath = path.join(__dirname, "..", "history.js");
const historySource = fs.readFileSync(historyPath, "utf8");
const { v3bFacts, renderV3BPresentation } = require(historyPath);

function classList() {
  const values = new Set();
  return {
    toggle(name, enabled) { enabled ? values.add(name) : values.delete(name); },
    remove(...names) { names.forEach((name) => values.delete(name)); },
    contains(name) { return values.has(name); },
  };
}

const registry = [];

function element(text = "", tagName = "STRONG") {
  const attrs = {};
  const styleValues = {};
  const node = {
    id: "",
    tagName,
    textContent: text,
    innerHTML: "",
    hidden: false,
    dataset: {},
    classList: classList(),
    previousElementSibling: { textContent: "" },
    style: {
      setProperty(name, value, priority = "") {
        styleValues[name] = { value, priority };
      },
      getPropertyValue(name) { return styleValues[name]?.value || ""; },
    },
    setAttribute(name, value) { attrs[name] = value; },
    getAttribute(name) { return attrs[name]; },
    append(...children) { this.children = [...(this.children || []), ...children]; },
    replaceChildren(...children) { this.children = [...children]; },
  };
  node.parentNode = {
    appendChild(child) {
      registry.push(child);
      child.parentNode = this;
      return child;
    },
  };
  return node;
}

function register(id, node = element()) {
  node.id = id;
  registry.push(node);
  return node;
}

const ids = [
  "strategy-debug-smc",
  "strategy-debug-swing-break",
  "strategy-debug-15m-close",
  "strategy-debug-5m-confirm",
  "strategy-debug-swing-sl",
  "strategy-debug-decision",
  "strategy-debug-block-reason",
  "main-tp2",
  "main-rr",
];
const elements = Object.fromEntries(ids.map((id) => [id, register(id)]));
const summary = element();
const details = element("", "DETAILS");
details.querySelector = (selector) => selector === "summary" ? summary : null;
const header = element();
const plan = register("main-smc-plan-intel", element("", "DIV"));

global.document = {
  getElementById: (id) => registry.find((node) => node.id === id) || null,
  createElement: (tagName) => element("", String(tagName || "span").toUpperCase()),
  querySelector(selector) {
    if (selector === "details.entry-strategy-debug") return details;
    if (selector === ".main-smc-panel .smc-header") return header;
    return null;
  },
};

function visible(id) {
  return global.document.getElementById(`v3b-${id}`) || elements[id];
}

function render(status, { tp2 = "--", rr = "--" } = {}) {
  visible("main-tp2").textContent = tp2;
  visible("main-rr").textContent = rr;
  renderV3BPresentation(status);
  return {
    bos: visible("strategy-debug-smc").textContent,
    body: visible("strategy-debug-swing-break").textContent,
    same: visible("strategy-debug-15m-close").textContent,
    beyond: visible("strategy-debug-5m-confirm").textContent,
    sl: visible("strategy-debug-swing-sl").textContent,
    signal: visible("strategy-debug-decision").textContent,
    reason: visible("strategy-debug-block-reason").textContent,
    tp2: visible("main-tp2").textContent,
    rr: visible("main-rr").textContent,
  };
}

const genericExpiredStatus = {
  live_strategy_model: "V3B",
  reason: "WAIT_INDICATOR_EVENT_EXPIRED",
  block_reason: "WAIT_INDICATOR_EVENT_EXPIRED",
  risk_reward: "WAIT_INDICATOR_EVENT_EXPIRED",
  tp2: "WAIT_INDICATOR_EVENT_EXPIRED",
  five_m_bos_detected: false,
  bos_detected: false,
  swing_sl_valid: false,
};

const genericExpired = render(genericExpiredStatus, {
  tp2: "WAIT_INDICATOR_EVENT_EXPIRED",
  rr: "WAIT_INDICATOR_EVENT_EXPIRED",
});
assert.deepEqual(genericExpired, {
  bos: "NO", body: "NO", same: "NO", beyond: "NO", sl: "NO",
  signal: "WAIT", reason: "WAIT_INDICATOR_EVENT_EXPIRED", tp2: "--", rr: "--",
});

const staleLiveCandidateStatus = {
  live_strategy_model: "V3B",
  reason: "WAIT_INDICATOR_EVENT_EXPIRED",
  block_reason: "WAIT_INDICATOR_EVENT_EXPIRED",
  live_v3b_details: {
    source_candidate: {
      source_indicator_event_id: "stale-live-candidate",
      five_m_bos_detected: false,
      swing_sl_valid: false,
      paper_entry_details: {
        bos_body_ratio: 0.21,
        minimum_bos_body_ratio: 0.5,
        second_5m_same_direction: false,
        second_5m_stays_beyond_bos_level: false,
      },
    },
  },
};
const staleLiveCandidateExpired = render(staleLiveCandidateStatus, {
  tp2: "WAIT_INDICATOR_EVENT_EXPIRED",
  rr: "WAIT_INDICATOR_EVENT_EXPIRED",
});
assert.deepEqual(staleLiveCandidateExpired, {
  bos: "NO", body: "NO", same: "NO", beyond: "NO", sl: "NO",
  signal: "WAIT", reason: "WAIT_INDICATOR_EVENT_EXPIRED", tp2: "--", rr: "--",
});

const noEventFacts = v3bFacts({
  live_strategy_model: "V3B",
  reason: "WAIT_INDICATOR_EVENT_EXPIRED",
  source_candidate: {
    source_indicator_event_id: "old-event",
    lifecycle_state: "EXPIRED",
    five_m_bos_detected: false,
    swing_sl_valid: false,
  },
});
assert.equal(noEventFacts.currentEvent, false);
assert.equal(noEventFacts.hasBos, null);
assert.equal(noEventFacts.swingSl, null);

const waitingForFiveMBos = render({
  live_strategy_model: "V3B",
  live_v3b_reason: "WAIT_V3B_PAPER_5M_BOS",
  live_v3b_details: {
    source_candidate: {
      source_indicator_event_id: "event-new",
      lifecycle_state: "WAITING_5M",
    },
  },
});
assert.equal(waitingForFiveMBos.bos, "NO");
assert.equal(waitingForFiveMBos.body, "NO");

const fiveMBos = render({
  live_strategy_model: "V3B",
  live_v3b_reason: "WAIT_V3B_PAPER_BOS_BODY",
  live_v3b_details: {
    source_candidate: {
      source_indicator_event_id: "event-new",
      lifecycle_state: "WAITING_BODY",
      five_m_bos_level: 1.1534,
    },
  },
});
assert.equal(fiveMBos.bos, "YES");
assert.equal(fiveMBos.body, "NO");

const waitingConfirmation = render({
  live_strategy_model: "V3B",
  live_v3b_reason: "WAIT_V3B_PAPER_SECOND_5M",
  live_v3b_details: {
    source_candidate: {
      source_indicator_event_id: "event-new",
      lifecycle_state: "WAITING_SECOND_5M",
      five_m_bos_level: 1.1534,
      paper_entry_details: { bos_body_ratio: 0.64, minimum_bos_body_ratio: 0.5 },
    },
  },
});
assert.equal(waitingConfirmation.bos, "YES");
assert.equal(waitingConfirmation.body, "YES");
assert.equal(waitingConfirmation.same, "NO");

const eligible = render({
  live_strategy_model: "V3B",
  live_v3b_reason: "V3B_READY",
  live_v3b_details: {
    source_candidate: {
      source_indicator_event_id: "event-ready",
      lifecycle_state: "ELIGIBLE",
      source_structure_event_type: "CHOCH",
      five_m_bos_level: 1.1534,
      stop_loss: 1.1544,
      final_signal: "SELL",
      paper_entry_details: {
        structure_event_type: "CHOCH",
        bos_body_ratio: 0.7,
        minimum_bos_body_ratio: 0.5,
        second_5m_same_direction: true,
        second_5m_stays_beyond_bos_level: true,
      },
    },
  },
}, { tp2: "1.1504", rr: "1:1.9" });
assert.deepEqual(
  [eligible.bos, eligible.body, eligible.same, eligible.beyond, eligible.sl, eligible.signal],
  ["YES", "YES", "YES", "YES", "YES", "SELL"]
);
assert.equal(eligible.tp2, "1.1504");
assert.equal(eligible.rr, "1:1.9");

const expired = render({
  live_strategy_model: "V3B",
  live_v3b_reason: "WAIT_V3B_RECOVERY_ENTRY_EXPIRED",
  live_v3b_details: {
    source_candidate: {
      source_indicator_event_id: "event-expired",
      lifecycle_state: "EXPIRED",
      five_m_bos_detected: false,
      swing_sl_valid: false,
    },
  },
});
assert.deepEqual(
  [expired.bos, expired.body, expired.same, expired.beyond, expired.sl, expired.signal],
  ["NO", "NO", "NO", "NO", "NO", "WAIT"]
);
assert.equal(expired.reason, "WAIT_V3B_RECOVERY_ENTRY_EXPIRED");

const replacement = render({
  live_strategy_model: "V3B",
  live_v3b_reason: "WAIT_V3B_PAPER_5M_BOS",
  live_v3b_details: {
    source_candidate: {
      source_indicator_event_id: "event-replacement",
      lifecycle_state: "WAITING_5M",
    },
  },
});
assert.deepEqual(
  [replacement.bos, replacement.body, replacement.same, replacement.beyond, replacement.sl, replacement.signal],
  ["NO", "NO", "NO", "NO", "NO", "WAIT"]
);

assert.equal(visible("strategy-debug-smc").previousElementSibling.textContent, "5m BOS / CHOCH");
assert.equal(visible("strategy-debug-swing-break").previousElementSibling.textContent, "Break candle body ≥ 50%");
assert.equal(visible("strategy-debug-5m-confirm").previousElementSibling.textContent, "Close stays beyond broken level");
assert.match(historySource, /Fresh 5m BOS \/ CHOCH/);
assert.doesNotMatch(historySource, /installV3BObserver|refreshV3B|__NATHAUX_V3B_OBSERVER|\/dashboard-feed/);
assert.doesNotMatch(historySource, /setInterval\s*\(\s*\(\)\s*=>\s*renderV3BPresentation/);
assert.doesNotMatch(historySource, /\|\|\s*status\s*\|\|\s*\{\}/);
assert.doesNotMatch(historySource, /status\?\.reason\s*\|\|\s*candidate\.paper_entry_reason/);
assert.match(historySource, /!isInactiveV3BState\(genericReason\)/);
assert.match(historySource, /const text = value === true \? "YES" : "NO"/);
assert.match(historySource, /setProperty\("display", "none", "important"\)/);
assert.equal(details.dataset.v3bViewVersion, "8");
assert.equal(plan.dataset.v3bPlanVersion, "3");

for (const legacyId of ids) {
  const sink = global.document.getElementById(legacyId);
  assert.ok(sink, `legacy sink ${legacyId} exists`);
  assert.equal(sink.hidden, true);
  assert.equal(sink.style.getPropertyValue("display"), "none");
}

console.log("canonical V3B dashboard mapping tests: PASS");
