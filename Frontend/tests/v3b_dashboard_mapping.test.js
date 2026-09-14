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

function element(text = "") {
  return {
    textContent: text,
    innerHTML: "",
    dataset: {},
    classList: classList(),
    previousElementSibling: { textContent: "" },
  };
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
const elements = Object.fromEntries(ids.map((id) => [id, element()]));
const summary = element();
const details = element();
details.querySelector = (selector) => selector === "summary" ? summary : null;
const header = element();

global.document = {
  getElementById: (id) => elements[id] || null,
  querySelector(selector) {
    if (selector === "details.entry-strategy-debug") return details;
    if (selector === ".main-smc-panel .smc-header") return header;
    return null;
  },
};

function render(status, { tp2 = "--", rr = "--" } = {}) {
  elements["main-tp2"].textContent = tp2;
  elements["main-rr"].textContent = rr;
  renderV3BPresentation(status);
  return {
    bos: elements["strategy-debug-smc"].textContent,
    body: elements["strategy-debug-swing-break"].textContent,
    same: elements["strategy-debug-15m-close"].textContent,
    beyond: elements["strategy-debug-5m-confirm"].textContent,
    sl: elements["strategy-debug-swing-sl"].textContent,
    signal: elements["strategy-debug-decision"].textContent,
    reason: elements["strategy-debug-block-reason"].textContent,
    tp2: elements["main-tp2"].textContent,
    rr: elements["main-rr"].textContent,
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
  bos: "WAIT", body: "WAIT", same: "WAIT", beyond: "WAIT", sl: "WAIT",
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
  bos: "WAIT", body: "WAIT", same: "WAIT", beyond: "WAIT", sl: "WAIT",
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

const fresh15mEvent = render({
  live_strategy_model: "V3B",
  live_v3b_reason: "WAIT_V3B_PAPER_5M_BOS",
  live_v3b_details: {
    source_candidate: {
      source_indicator_event_id: "event-new",
      lifecycle_state: "WAITING_5M",
    },
  },
});
assert.equal(fresh15mEvent.bos, "WAIT");
assert.equal(fresh15mEvent.body, "WAIT");

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
assert.equal(fiveMBos.body, "WAIT");

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
assert.equal(waitingConfirmation.same, "WAIT");

const eligible = render({
  live_strategy_model: "V3B",
  live_v3b_reason: "V3B_READY",
  live_v3b_details: {
    source_candidate: {
      source_indicator_event_id: "event-ready",
      lifecycle_state: "ELIGIBLE",
      five_m_bos_level: 1.1534,
      stop_loss: 1.1544,
      final_signal: "SELL",
      paper_entry_details: {
        bos_body_ratio: 0.7,
        minimum_bos_body_ratio: 0.5,
        second_5m_same_direction: true,
        second_5m_stays_beyond_bos_level: true,
      },
    },
  },
}, { tp2: "1.1504", rr: "1:1.75" });
assert.deepEqual(
  [eligible.bos, eligible.body, eligible.same, eligible.beyond, eligible.sl, eligible.signal],
  ["YES", "YES", "YES", "YES", "YES", "SELL"]
);
assert.equal(eligible.tp2, "1.1504");
assert.equal(eligible.rr, "1:1.75");

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
  ["WAIT", "WAIT", "WAIT", "WAIT", "WAIT", "WAIT"]
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
  ["WAIT", "WAIT", "WAIT", "WAIT", "WAIT", "WAIT"]
);

assert.doesNotMatch(historySource, /installV3BObserver|refreshV3B|__NATHAUX_V3B_OBSERVER|\/dashboard-feed/);
assert.doesNotMatch(historySource, /setInterval\s*\(\s*\(\)\s*=>\s*applyV3BPresentation/);
assert.doesNotMatch(historySource, /\|\|\s*status\s*\|\|\s*\{\}/);
assert.doesNotMatch(historySource, /status\?\.reason\s*\|\|\s*candidate\.paper_entry_reason/);
assert.match(historySource, /!isInactiveV3BState\(genericReason\)/);
assert.match(historySource, /queueFinalV3BPresentation/);
assert.match(historySource, /queueMicrotask/);

// Reproduce the browser ordering failure: legacy code rewrites the same DOM
// later in the synchronous turn. The one queued microtask must restore V3B.
render(staleLiveCandidateStatus, {
  tp2: "WAIT_INDICATOR_EVENT_EXPIRED",
  rr: "WAIT_INDICATOR_EVENT_EXPIRED",
});
for (const id of [
  "strategy-debug-smc",
  "strategy-debug-swing-break",
  "strategy-debug-15m-close",
  "strategy-debug-5m-confirm",
  "strategy-debug-swing-sl",
]) {
  elements[id].textContent = "NO";
}
elements["main-rr"].textContent = "WAIT_INDICATOR_EVENT_EXPIRED";
header.textContent = "⚡ SMC PLAN";

Promise.resolve().then(() => {
  assert.deepEqual(
    [
      elements["strategy-debug-smc"].textContent,
      elements["strategy-debug-swing-break"].textContent,
      elements["strategy-debug-15m-close"].textContent,
      elements["strategy-debug-5m-confirm"].textContent,
      elements["strategy-debug-swing-sl"].textContent,
    ],
    ["WAIT", "WAIT", "WAIT", "WAIT", "WAIT"]
  );
  assert.equal(elements["main-rr"].textContent, "--");
  assert.equal(elements["main-tp2"].textContent, "--");
  assert.equal(elements["strategy-debug-block-reason"].textContent, "WAIT_INDICATOR_EVENT_EXPIRED");
  assert.equal(header.textContent, "⚡ V3B PLAN");
  assert.equal(details.dataset.v3bViewVersion, "3");
  console.log("canonical V3B dashboard mapping tests: PASS");
});
