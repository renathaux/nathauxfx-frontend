const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const navPath = path.join(root, "mobileNav.js");
const helperPath = path.join(root, "mobileV3bState.js");
const navSource = fs.readFileSync(navPath, "utf8");

const renderMatch = navSource.match(/function renderIsch\([\s\S]*?\n  }\n\n  function ischDetail/);
assert.ok(renderMatch, "mobile renderIsch function should exist");
const renderSource = renderMatch[0];

assert.match(renderSource, /5m BOS \/ CHOCH/);
assert.match(renderSource, /Break candle body ≥ 50%/);
assert.match(renderSource, /Next 5m same direction/);
assert.match(renderSource, /Close stays beyond broken level/);
assert.match(renderSource, /5m swing SL/);
assert.doesNotMatch(renderSource, /15m BOS\/CHOCH|15m close|Swing break/);
assert.match(renderSource, /NathauxMobileV3B/);

assert.ok(fs.existsSync(helperPath), "mobile V3B state helper should exist");
const { mobileV3bFacts } = require(helperPath);
assert.equal(typeof mobileV3bFacts, "function");

const waitingBos = mobileV3bFacts({
  live_strategy_model: "V3B",
  live_v3b_reason: "WAIT_V3B_PAPER_5M_BOS",
  live_v3b_details: {
    source_candidate: {
      source_indicator_event_id: "event-new",
      lifecycle_state: "WAITING_5M",
    },
  },
});
assert.deepEqual(
  [waitingBos.hasBos, waitingBos.bodyPass, waitingBos.secondSame, waitingBos.beyond, waitingBos.swingSl, waitingBos.signal],
  [false, false, false, false, false, "WAIT"]
);

const waitingConfirmation = mobileV3bFacts({
  live_strategy_model: "V3B",
  live_v3b_reason: "WAIT_V3B_PAPER_SECOND_5M",
  live_v3b_details: {
    source_candidate: {
      source_indicator_event_id: "event-confirm",
      lifecycle_state: "WAITING_SECOND_5M",
      five_m_bos_level: 1.1534,
      paper_entry_details: {
        bos_body_ratio: 0.64,
        minimum_bos_body_ratio: 0.5,
      },
    },
  },
});
assert.deepEqual(
  [waitingConfirmation.hasBos, waitingConfirmation.bodyPass, waitingConfirmation.secondSame, waitingConfirmation.beyond],
  [true, true, false, false]
);

const eligible = mobileV3bFacts({
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
});
assert.deepEqual(
  [eligible.hasBos, eligible.bodyPass, eligible.secondSame, eligible.beyond, eligible.swingSl, eligible.signal],
  [true, true, true, true, true, "SELL"]
);

const expired = mobileV3bFacts({
  live_strategy_model: "V3B",
  live_v3b_reason: "WAIT_V3B_RECOVERY_ENTRY_EXPIRED",
  live_v3b_details: {
    source_candidate: {
      source_indicator_event_id: "event-old",
      lifecycle_state: "EXPIRED",
      five_m_bos_detected: true,
      swing_sl_valid: true,
      final_signal: "BUY",
    },
  },
});
assert.deepEqual(
  [expired.hasBos, expired.bodyPass, expired.secondSame, expired.beyond, expired.swingSl, expired.signal],
  [false, false, false, false, false, "WAIT"]
);
assert.equal(expired.reason, "WAIT_V3B_RECOVERY_ENTRY_EXPIRED");

console.log("mobile V3B ISCH mapping tests: PASS");
