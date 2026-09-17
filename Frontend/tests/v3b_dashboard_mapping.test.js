const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const historyPath = path.join(__dirname, "..", "history.js");
const historySource = fs.readFileSync(historyPath, "utf8");
const appHtml = fs.readFileSync(path.join(__dirname, "..", "app.html"), "utf8");
assert.match(appHtml, /history\.js\?v=5/, "dashboard loads the new V3B presenter");
assert.match(appHtml, /script\.js\?v=132/, "dashboard loads the new V3B blocker wiring");
const { v3bFacts, renderV3BPresentation, v3bPanelBlocker } = require(historyPath);

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
  "main-plan-type",
  "main-entry-price",
  "main-sl",
  "main-tp1",
  "main-blocked-reason",
  "main-tp2",
  "main-rr",
];
const elements = Object.fromEntries(ids.map((id) => [id, register(id)]));
const summary = element();
const details = element("", "DETAILS");
details.querySelector = (selector) => selector === "summary" ? summary : null;
const header = element();
const plan = register("main-smc-plan-intel", element("", "DIV"));
register("v3b-main-smc-trigger");

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

// A cached V3B_READY snapshot must not resurrect an old actionable direction.
function readySnapshot(checkedAt, bosTime) {
  return {
    live_strategy_model: "V3B",
    live_v3b_reason: "V3B_READY",
    live_v3b_checked_at: checkedAt,
    live_v3b_details: { source_candidate: {
      source_indicator_event_id: "freshness-event",
      final_signal: "BUY",
      five_m_bos_level: 1.1534,
      stop_loss: 1.15,
      paper_entry_details: {
        bos_candle_time: bosTime,
        bos_body_ratio: 0.7,
        second_5m_same_direction: true,
        second_5m_stays_beyond_bos_level: true,
      },
    } },
  };
}
const snapshotNow = Date.now();
for (const [label, checkedAt, bosTime] of [
  ["two-day-old ready snapshot", snapshotNow - 2 * 86400_000, snapshotNow - 2 * 86400_000 - 300_000],
  ["missing BOS timestamp", snapshotNow, undefined],
  ["malformed BOS timestamp", snapshotNow, "not-a-date"],
  ["missing evaluation timestamp", undefined, snapshotNow - 300_000],
  ["malformed evaluation timestamp", "not-a-date", snapshotNow - 300_000],
  ["future snapshot", snapshotNow + 300_000, snapshotNow + 100_000],
]) {
  const stale = readySnapshot(checkedAt, bosTime);
  assert.equal(v3bFacts(stale).currentEvent, false, label);
  assert.equal(render(stale).signal, "WAIT", label);
  assert.equal(visible("main-plan-type").textContent, "--", label);
}
assert.equal(render(readySnapshot(snapshotNow / 1000, (snapshotNow - 300_000) / 1000)).signal, "BUY",
  "fresh production Unix-second timestamps preserve the current candidate");

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
  signal: "WAIT", reason: "WAIT_V3B_RUNTIME_UNAVAILABLE", tp2: "--", rr: "--",
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
  signal: "WAIT", reason: "WAIT_V3B_RUNTIME_UNAVAILABLE", tp2: "--", rr: "--",
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
  live_v3b_checked_at: Date.now(),
  live_v3b_reason: "WAIT_V3B_PAPER_BOS_BODY",
  live_v3b_details: {
    source_candidate: {
      source_indicator_event_id: "event-new",
      lifecycle_state: "WAITING_BODY",
      five_m_break_time: Date.now() - 300_000,
      five_m_bos_level: 1.1534,
    },
  },
});
assert.equal(fiveMBos.bos, "YES");
assert.equal(fiveMBos.body, "WAITING");

const waitingConfirmation = render({
  live_strategy_model: "V3B",
  live_v3b_checked_at: Date.now(),
  live_v3b_reason: "WAIT_V3B_PAPER_SECOND_5M",
  live_v3b_details: {
    source_candidate: {
      source_indicator_event_id: "event-new",
      lifecycle_state: "WAITING_SECOND_5M",
      five_m_break_time: Date.now() - 300_000,
      five_m_bos_level: 1.1534,
      paper_entry_details: { bos_body_ratio: 0.64, minimum_bos_body_ratio: 0.5 },
    },
  },
});
assert.equal(waitingConfirmation.bos, "YES");
assert.equal(waitingConfirmation.body, "YES");
assert.equal(waitingConfirmation.same, "WAITING");

const canonicalWaiting = render({
  live_strategy_model: "LIVE_V3B_M5_FROZEN",
  live_v3b_checked_at: Date.now(),
  live_v3b_reason: "WAIT_V3B_PAPER_SECOND_5M",
  live_v3b_details: {
    source_candidate: {
      v3b_setup_state: {
        indicator_event_id: "canonical-bos",
        lifecycle_state: "WAITING_CONFIRMATION",
        bos_candle_time: new Date(Date.now() - 20 * 60_000).toISOString(),
        has_bos: true,
        bos_body_pass: true,
        second_5m_same_direction: null,
        second_5m_stays_beyond_bos_level: null,
        structural_sl_found: null,
        signal: "WAIT",
        entry_ready: false,
      },
    },
  },
});
assert.deepEqual(
  [canonicalWaiting.bos, canonicalWaiting.body, canonicalWaiting.same,
    canonicalWaiting.beyond, canonicalWaiting.sl, canonicalWaiting.signal],
  ["YES", "YES", "WAITING", "WAITING", "WAITING", "WAIT"]
);

const canonicalBlocked = render({
  live_strategy_model: "LIVE_V3B_M5_FROZEN",
  live_v3b_checked_at: Date.now(),
  live_v3b_reason: "WAIT_BROKER_POSITION_EXISTS",
  live_v3b_details: {
    source_candidate: {
      entry_price: 1.1480, stop_loss: 1.1460, tp1: 1.1494, tp2: 1.1518,
      v3b_setup_state: {
        indicator_event_id: "canonical-buy",
        m5_confirmation_id: "canonical-confirmation",
        lifecycle_state: "BLOCKED",
        bos_candle_time: new Date(Date.now() - 20 * 60_000).toISOString(),
        has_bos: true, bos_body_pass: true,
        second_5m_same_direction: true,
        second_5m_stays_beyond_bos_level: true,
        structural_sl_found: true,
        signal: "BUY", entry_ready: true,
        execution_status: "BLOCKED",
        execution_block_reason: "WAIT_BROKER_POSITION_EXISTS",
      },
    },
  },
});
assert.equal(canonicalBlocked.signal, "BUY");
assert.equal(visible("main-plan-type").textContent, "BUY");
assert.equal(canonicalBlocked.reason, "WAIT_BROKER_POSITION_EXISTS");
assert.match(global.document.getElementById("v3b-main-smc-trigger").textContent,
  /BUY SETUP COMPLETE.*EXECUTION BLOCKED/);
assert.deepEqual(v3bPanelBlocker({
  live_strategy_model: "LIVE_V3B_M5_FROZEN",
  live_v3b_status: "BLOCKED",
  live_v3b_reason: "WAIT_BROKER_POSITION_EXISTS",
}, "BUY"), { show: true, reason: "WAIT_BROKER_POSITION_EXISTS" },
"a valid BUY remains visible with its separate execution blocker");
assert.deepEqual(v3bPanelBlocker({
  live_strategy_model: "LIVE_V3B_M5_FROZEN",
  live_v3b_status: "RECONCILIATION_REQUIRED",
  live_v3b_reason: "broker outcome ambiguous",
}, "BUY"), { show: true, reason: "broker outcome ambiguous" },
"an ambiguous broker outcome must remain visibly blocked pending reconciliation");

const staleCanonical = render({
  live_strategy_model: "LIVE_V3B_M5_FROZEN",
  live_v3b_checked_at: Date.now() - 10 * 60_000,
  live_v3b_reason: "V3B_READY",
  live_v3b_details: { source_candidate: { v3b_setup_state: {
    indicator_event_id: "stale-canonical",
    lifecycle_state: "ELIGIBLE",
    bos_candle_time: new Date(Date.now() - 20 * 60_000).toISOString(),
    has_bos: true, bos_body_pass: true,
    second_5m_same_direction: true,
    second_5m_stays_beyond_bos_level: true,
    structural_sl_found: true,
    signal: "BUY", entry_ready: true,
  } } },
});
assert.equal(staleCanonical.signal, "WAIT", "old cached BUY cannot be resurrected");
assert.equal(visible("main-plan-type").textContent, "--");

const failedConfirmation = render({
  live_strategy_model: "LIVE_V3B_M5_FROZEN",
  live_v3b_checked_at: Date.now(),
  live_v3b_reason: "WAIT_V3B_PAPER_SECOND_5M",
  live_v3b_details: { source_candidate: { v3b_setup_state: {
    indicator_event_id: "failed-confirmation",
    lifecycle_state: "INVALIDATED",
    bos_candle_time: new Date(Date.now() - 5 * 60_000).toISOString(),
    has_bos: true, bos_body_pass: true,
    second_5m_same_direction: false,
    second_5m_stays_beyond_bos_level: true,
    structural_sl_found: null,
    signal: "WAIT", entry_ready: false,
  } } },
});
assert.deepEqual(
  [failedConfirmation.bos, failedConfirmation.body, failedConfirmation.same,
    failedConfirmation.beyond, failedConfirmation.signal],
  ["YES", "YES", "NO", "YES", "WAIT"],
  "a failed next candle shows its precise failed condition"
);

const recentBos = new Date(Date.now() - 5 * 60_000).toISOString();
const nestedWaitWithLegacy15mFailure = render({
  live_strategy_model: "LIVE_V3B_M5_FROZEN",
  live_v3b_checked_at: Date.now(),
  live_v3b_reason: "WAIT_V3B_PAPER_SECOND_5M",
  block_reason: "WAIT_NO_FRESH_15M_SMC_BREAK",
  blocked_reason: "WAIT_INDICATOR_EVENT_EXPIRED",
  live_v3b_details: {
    source_candidate: {
      signal: "WAIT",
      paper_entry_reason: "WAIT_V3B_PAPER_SECOND_5M",
      paper_entry_details: {
        source_indicator_event_id: "fresh-5m-event",
        bos_candle_time: recentBos,
        broken_level: 1.1534,
        bos_body_ratio: 0.64,
        minimum_bos_body_ratio: 0.5,
        second_5m_same_direction: false,
        second_5m_stays_beyond_bos_level: true,
      },
    },
  },
});
assert.deepEqual(
  [nestedWaitWithLegacy15mFailure.bos, nestedWaitWithLegacy15mFailure.body,
    nestedWaitWithLegacy15mFailure.same, nestedWaitWithLegacy15mFailure.beyond,
    nestedWaitWithLegacy15mFailure.reason, visible("main-blocked-reason").textContent],
  ["YES", "YES", "NO", "YES", "WAIT_V3B_PAPER_SECOND_5M", "WAIT_V3B_PAPER_SECOND_5M"]
);
assert.deepEqual(v3bPanelBlocker({
  live_strategy_model: "LIVE_V3B_M5_FROZEN",
  live_v3b_reason: "WAIT_V3B_PAPER_SECOND_5M",
  blocked_reason: "WAIT_NO_FRESH_15M_SMC_BREAK",
}, "WAIT"), { show: true, reason: "WAIT_V3B_PAPER_SECOND_5M" });
assert.deepEqual(v3bPanelBlocker({
  live_strategy_model: "LIVE_V3B_M5_FROZEN",
  live_v3b_reason: null,
  blocked_reason: "WAIT_NO_FRESH_15M_SMC_BREAK",
}, "WAIT"), { show: false, reason: "" });

const eligible = render({
  live_strategy_model: "V3B",
  live_v3b_checked_at: Date.now(),
  live_v3b_reason: "V3B_READY",
  live_v3b_details: {
    source_candidate: {
      source_indicator_event_id: "event-ready",
      lifecycle_state: "ELIGIBLE",
      five_m_break_time: Date.now() - 300_000,
      source_structure_event_type: "CHOCH",
      five_m_bos_level: 1.1534,
      entry_price: 1.1524,
      stop_loss: 1.1544,
      tp1: 1.1514,
      tp2: 1.1504,
      risk_reward: "1:1.9",
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
assert.equal(visible("main-plan-type").textContent, "SELL");
assert.equal(visible("main-entry-price").textContent, "1.15240");
assert.equal(visible("main-sl").textContent, "1.15440");
assert.equal(visible("main-tp1").textContent, "1.15140");

const executedDirection = render({
  live_strategy_model: "V3B",
  live_v3b_reason: "V3B_READY",
  executed_trade_setup_snapshot: { status: "OPEN", side: "BUY", entry: 1.1531, sl: 1.1511 },
});
assert.equal(visible("main-plan-type").textContent, "BUY");

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

const authorityStale = render({
  live_strategy_model: "V3B",
  live_v3b_reason: "WAIT_V3B_5M_AUTHORITY_STALE",
  live_v3b_details: {
    source_candidate: {
      source_indicator_event_id: "stale-authority-event",
      final_signal: "BUY",
      five_m_bos_detected: true,
      stop_loss: 1.1,
      paper_entry_details: { bos_body_ratio: 0.8, second_5m_same_direction: true, second_5m_stays_beyond_bos_level: true },
    },
  },
});
assert.equal(authorityStale.signal, "WAIT");
assert.equal(authorityStale.bos, "NO");
assert.equal(authorityStale.reason, "WAIT_V3B_5M_AUTHORITY_STALE");

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
assert.doesNotMatch(historySource, /!isInactiveV3BState\(genericReason\)/);
assert.match(historySource, /value === false \? "NO" : "WAITING"/);
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
