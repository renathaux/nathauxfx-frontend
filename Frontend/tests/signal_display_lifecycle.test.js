const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'signal-display-state.js'), 'utf8');

const context = {
  window: {
    fetch: async () => ({ json: async () => ({}) }),
    requestAnimationFrame: (fn) => fn(),
    addEventListener: () => {},
    FlowSignalHistory: require(path.join(__dirname, '..', 'history.js')),
  },
  document: {
    readyState: 'loading',
    addEventListener: () => {},
    getElementById: () => null,
    body: {},
  },
  MutationObserver: class { observe() {} },
  URL,
  Request: class {},
};
context.window.window = context.window;
vm.runInNewContext(source, context);

const api = context.window.FlowSignalSignalDisplayState;
assert.ok(api, 'lifecycle display API is exported');

// A setup that changed before execution is no longer a fresh SELL: visible state must be WAIT.
let state = api.canonicalize('EURUSD', {
  strategy_decision: 'SELL',
  fresh_entry_available: false,
  execution_allowed: false,
  execution_status: 'BLOCKED',
  execution_block_reason: 'WAIT_SETUP_SWING_CHANGED_BEFORE_EXECUTION',
});
assert.equal(state.signal, 'WAIT');
assert.equal(api.displayLabel(state), 'WAIT');

// A running broker position must not force BUY/SELL into the strategy signal display.
state = api.canonicalize('XAUUSD', {
  strategy_decision: 'SELL',
  fresh_entry_available: false,
  execution_allowed: false,
  execution_status: 'BLOCKED',
  execution_block_reason: 'ACTIVE_TRADE_ALREADY_RUNNING',
  active_trade_direction: 'SELL',
  active_trade_id: '57804337',
  active_trade_status: 'RUNNING',
});
assert.equal(state.running, true);
assert.equal(state.signal, 'WAIT');
assert.equal(api.displayLabel(state), 'WAIT');

// BUY/SELL is visible only for a genuinely fresh setup.
state = api.canonicalize('EURUSD', {
  strategy_decision: 'BUY',
  fresh_entry_available: true,
  execution_allowed: true,
  execution_status: 'PENDING',
});
assert.equal(state.signal, 'BUY');
assert.equal(api.displayLabel(state), 'BUY');

state = api.canonicalize('EURUSD', {
  strategy_decision: 'WAIT',
  fresh_entry_available: false,
  execution_allowed: false,
  execution_status: 'NOT_APPLICABLE',
});
assert.equal(state.signal, 'WAIT');
assert.equal(api.displayLabel(state), 'WAIT');

// A later final safety result can invalidate what was initially a fresh signal.
api.ingest({
  EURUSD: {
    strategy_decision: 'SELL',
    fresh_entry_available: true,
    execution_status: 'PENDING',
  },
  XAUUSD: { strategy_decision: 'WAIT', fresh_entry_available: false },
  live_auto_status_by_symbol: {
    EURUSD: {
      symbol: 'EURUSD',
      signal: 'SELL',
      status: 'BLOCKED',
      reason: 'WAIT_SETUP_SWING_CHANGED_BEFORE_EXECUTION',
    },
  },
});
assert.equal(api.state.EURUSD.signal, 'WAIT');
assert.equal(api.state.EURUSD.fresh, false);
assert.equal(api.displayLabel(api.state.EURUSD), 'WAIT');

// The legacy WAIT/15m diagnostics must not erase a current, broker-blocked V3B BUY.
const now = Date.now();
api.ingest({
  EURUSD: {
    live_strategy_model: 'LIVE_V3B_M5_FROZEN',
    live_v3b_checked_at: now,
    live_v3b_reason: 'WAIT_BROKER_POSITION_EXISTS',
    live_v3b_status: 'BLOCKED',
    strategy_decision: 'WAIT',
    fresh_entry_available: false,
    blocked_reason: 'WAIT_NO_FRESH_15M_SMC_BREAK',
    live_v3b_details: { source_candidate: {
      signal_setup_id: 'setup-canonical',
      v3b_setup_state: {
        indicator_event_id: 'event-canonical',
        m5_confirmation_id: 'confirmation-canonical',
        lifecycle_state: 'BLOCKED',
        bos_candle_time: new Date(now - 20 * 60_000).toISOString(),
        has_bos: true, bos_body_pass: true,
        second_5m_same_direction: true,
        second_5m_stays_beyond_bos_level: true,
        structural_sl_found: true,
        signal: 'BUY', entry_ready: true,
      },
    } },
  },
  XAUUSD: { strategy_decision: 'WAIT' },
});
assert.equal(api.state.EURUSD.signal, 'BUY');
assert.equal(api.state.EURUSD.executionStatus, 'BLOCKED');
assert.equal(api.state.EURUSD.setupId, 'setup-canonical');

api.ingest({ EURUSD: {
  live_strategy_model: 'LIVE_V3B_M5_FROZEN',
  live_v3b_checked_at: now - 10 * 60_000,
  live_v3b_reason: 'V3B_READY',
  strategy_decision: 'BUY',
  live_v3b_details: { source_candidate: { v3b_setup_state: {
    indicator_event_id: 'old-event',
    lifecycle_state: 'ELIGIBLE',
    bos_candle_time: new Date(now - 20 * 60_000).toISOString(),
    signal: 'BUY', entry_ready: true,
  } } },
} });
assert.equal(api.state.EURUSD.signal, 'WAIT', 'an old cached candidate never revives BUY');
assert.equal(api.canonicalize('EURUSD', {
  live_strategy_model: 'LIVE_V3B_M5_FROZEN',
  strategy_decision: 'BUY',
}).signal, 'WAIT', 'V3B requires a current canonical setup before displaying BUY');

console.log('fresh signal lifecycle display tests passed');
