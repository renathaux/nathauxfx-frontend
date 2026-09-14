const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const historyPath = path.join(__dirname, "..", "history.js");
const scriptPath = path.join(__dirname, "..", "script.js");
const historySource = fs.readFileSync(historyPath, "utf8");
const scriptSource = fs.readFileSync(scriptPath, "utf8");
const { renderV3BPresentation } = require(historyPath);

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
  "main-smc-structure",
  "main-smc-trigger",
  "main-smc-waiting-list",
  "main-tp2",
  "main-rr",
];
const elements = Object.fromEntries(ids.map((id) => [id, element()]));
const summary = element();
const details = { querySelector: (selector) => selector === "summary" ? summary : null };
const header = element();

global.document = {
  getElementById: (id) => elements[id] || null,
  querySelector(selector) {
    if (selector === "details.entry-strategy-debug") return details;
    if (selector === ".main-smc-panel .smc-header") return header;
    const match = selector.match(/^#(.+)$/);
    return match ? elements[match[1]] || null : null;
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

const noEvent = render({
  live_strategy_model: "V3B",
  live_v3b_reason: "WAIT_V3B_PAPER_5M_BOS",
}, { tp2: "WAIT_DURABLE_EVENT_WATCH_INACTIVE", rr: "WAIT_DURABLE_EVENT_WATCH_INACTIVE" });
assert.deepEqual(noEvent, {
  bos: "WAIT", body: "WAIT", same: "WAIT", beyond: "WAIT", sl: "WAIT",
  signal: "WAIT", reason: "WAIT_V3B_PAPER_5M_BOS", tp2: "--", rr: "--",
});

const freshEvent = render({
  live_strategy_model: "V3B",
  live_v3b_reason: "WAIT_V3B_PAPER_BOS_BODY",
  live_v3b_details: { source_candidate: { source_indicator_event_id: "event-new", five_m_bos_level: 1.1534 } },
});
assert.equal(freshEvent.bos, "YES");
assert.equal(freshEvent.body, "WAIT");

const waitingConfirmation = render({
  live_strategy_model: "V3B",
  live_v3b_reason: "WAIT_V3B_PAPER_SECOND_5M",
  live_v3b_details: {
    source_candidate: {
      source_indicator_event_id: "event-new",
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
  live_v3b_details: { source_candidate: { five_m_bos_detected: false } },
});
assert.equal(expired.bos, "NO");
assert.equal(expired.body, "WAIT");
assert.equal(expired.reason, "WAIT_V3B_RECOVERY_ENTRY_EXPIRED");

const replacement = render({
  live_strategy_model: "V3B",
  live_v3b_reason: "WAIT_V3B_PAPER_BOS_BODY",
  live_v3b_details: { source_candidate: { source_indicator_event_id: "event-replacement" } },
});
assert.equal(replacement.bos, "YES");
assert.equal(replacement.body, "WAIT");
assert.equal(replacement.same, "WAIT");
assert.equal(replacement.signal, "WAIT");

assert.doesNotMatch(historySource, /installV3BObserver|refreshV3B|__NATHAUX_V3B_OBSERVER|\/dashboard-feed/);
assert.doesNotMatch(historySource, /setInterval\s*\(\s*\(\)\s*=>\s*applyV3BPresentation/);
assert.match(scriptSource, /FlowSignalHistory\?\.renderV3BPresentation\?\.\(data\)/);
assert.match(scriptSource, /numericTp2 === null \? "--"/);

console.log("canonical V3B dashboard mapping tests: PASS");
