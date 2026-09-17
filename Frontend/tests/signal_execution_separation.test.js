const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const script = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
const start = script.indexOf("function getVisibleSignal");
const end = script.indexOf("function tMarketText", start);
assert.ok(start > 0 && end > start, "visible-signal helper is extractable");

const context = { window: { FlowSignalHistory: require(path.join(__dirname, "..", "history.js")) } };
vm.runInNewContext(
  `${script.slice(start, end)}\nthis.getVisibleSignal = getVisibleSignal;`,
  context,
);

assert.equal(
  context.getVisibleSignal({
    strategy_decision: "SELL",
    display_signal: "BUY",
    execution_allowed: false,
    execution_block_reason: "ACTIVE_TRADE_ALREADY_RUNNING",
  }),
  "SELL",
  "a blocked execution must still render the fresh strategy decision",
);
assert.equal(
  context.getVisibleSignal({
    strategy_decision: "BUY",
    signal: "WAIT",
    execution_allowed: false,
  }),
  "BUY",
);
assert.equal(
  context.getVisibleSignal({
    strategy_decision: "WAIT",
    signal: "BUY",
  }),
  "WAIT",
  "a genuine strategy WAIT remains WAIT",
);
assert.equal(context.getVisibleSignal({
  live_strategy_model: "LIVE_V3B_M5_FROZEN",
  strategy_decision: "BUY",
  signal: "BUY",
}), "WAIT", "legacy BUY without a canonical V3B candidate is not revived");
const now = Date.now();
assert.equal(context.getVisibleSignal({
  live_strategy_model: "LIVE_V3B_M5_FROZEN",
  live_v3b_checked_at: now,
  live_v3b_status: "BLOCKED",
  live_v3b_reason: "ACTIVE_TRADE_ALREADY_RUNNING",
  strategy_decision: "WAIT",
  signal: "WAIT",
  live_v3b_details: { source_candidate: { v3b_setup_state: {
    indicator_event_id: "current-v3b-bos",
    lifecycle_state: "BLOCKED",
    bos_candle_time: new Date(now - 20 * 60_000).toISOString(),
    has_bos: true, bos_body_pass: true,
    second_5m_same_direction: true,
    second_5m_stays_beyond_bos_level: true,
    structural_sl_found: true,
    signal: "BUY", entry_ready: true,
  } } },
}), "BUY", "the actual dashboard signal selector uses the current canonical V3B candidate");
assert.ok(
  script.includes('executionBlockReason === "ACTIVE_TRADE_ALREADY_RUNNING"'),
  "active-trade execution blocks are recognized canonically",
);

console.log("signal/execution separation tests passed");
