(function () {
  'use strict';

  if (window.__flowSignalSignalDisplayStateInstalled) return;
  window.__flowSignalSignalDisplayStateInstalled = true;

  const INVALIDATED_KEY = 'flowsignal_invalidated_setup_ids_v1';
  const EMPTY = () => ({
    signal: 'WAIT', rawSignal: 'WAIT', fresh: false,
    executionState: 'WAIT', executionStatus: 'NOT_APPLICABLE', executionAllowed: false,
    blockReason: '', running: false, direction: '', positionId: '', setupId: '', consumedSetupId: '', v3b: false,
  });

  const state = { EURUSD: EMPTY(), XAUUSD: EMPTY() };
  let invalidated = { EURUSD: '', XAUUSD: '' };
  try {
    invalidated = { ...invalidated, ...(JSON.parse(localStorage.getItem(INVALIDATED_KEY) || '{}') || {}) };
  } catch (_error) {}

  function saveInvalidated() {
    try { localStorage.setItem(INVALIDATED_KEY, JSON.stringify(invalidated)); } catch (_error) {}
  }

  function normalizeSymbol(value) {
    const text = String(value || '').toUpperCase();
    if (text.includes('XAUUSD') || text === 'GOLD') return 'XAUUSD';
    if (text.includes('EURUSD')) return 'EURUSD';
    return '';
  }

  function normalizeSignal(value) {
    const text = String(value || '').trim().toUpperCase();
    if (text === 'BUY' || text.startsWith('BUY ')) return 'BUY';
    if (text === 'SELL' || text.startsWith('SELL ')) return 'SELL';
    return 'WAIT';
  }

  function textValue(value) { return value === null || value === undefined ? '' : String(value).trim(); }
  function firstValue() { for (const value of arguments) { const text = textValue(value); if (text) return text; } return ''; }

  function executionDebug(obj) {
    if (!obj || typeof obj !== 'object') return {};
    for (const key of ['strategy_debug', 'entry_strategy_debug', 'signal_diagnostics']) {
      if (obj[key] && typeof obj[key] === 'object') return obj[key];
    }
    return {};
  }

  function activeSnapshot(obj) {
    const snapshot = obj && typeof obj === 'object' ? obj.executed_trade_setup_snapshot : null;
    if (!snapshot || typeof snapshot !== 'object') return null;
    const status = String(obj.smc_status || snapshot.status || 'RUNNING').toUpperCase();
    if (status.includes('CLOSED') || status.includes('EXIT')) return null;
    return snapshot;
  }

  function reasonInvalidatesFreshSignal(reason) {
    const value = String(reason || '').trim().toUpperCase();
    if (!value) return false;
    return value.includes('SWING_CHANGED') || value.includes('SETUP_CHANGED') || value.includes('SETUP_INVALID') ||
      value.includes('SETUP_EXPIRED') || value.includes('SETUP_STALE') || value.includes('FRESH_SETUP_REQUIRED') ||
      value.includes('CONSUMED_TRADE_SETUP') || value.includes('NO_LONGER_VALID') || value.includes('FINGERPRINT_CHANGED');
  }

  function setupIdFrom(obj) {
    if (!obj || typeof obj !== 'object') return '';
    return firstValue(
      obj.signal_setup_id,
      obj.setup_id,
      obj.setup_identity?.signal_setup_id,
      obj.setup_identity?.setup_id,
      obj.setup_identity?.id,
    );
  }

  function setupFingerprint(obj) {
    if (!obj || typeof obj !== 'object') return '';
    const identity = obj.setup_identity && typeof obj.setup_identity === 'object' ? obj.setup_identity : obj;
    const parts = [
      identity.symbol || obj.symbol,
      identity.direction || identity.side || obj.strategy_decision || obj.signal,
      identity.swing_type,
      identity.swing_timestamp,
      identity.swing_price,
      identity.bos_candle_timestamp || obj.fifteen_m_break_time,
      identity.bos_level,
      identity.confirmation_timestamp || obj.five_m_closed_candle_time,
    ].map(textValue);
    return parts.filter(Boolean).length >= 4 ? parts.join('|') : '';
  }

  function effectiveSetupId(obj) {
    return setupIdFrom(obj) || setupFingerprint(obj);
  }

  function canonicalize(symbol, obj) {
    if (!symbol || !obj || typeof obj !== 'object') return EMPTY();

    const debug = executionDebug(obj);
    const v3bCandidate = obj.live_v3b_details?.source_candidate;
    const v3bModel = String(obj.live_strategy_model || '').toUpperCase().includes('V3B');
    const hasCanonicalV3B = v3bModel && Boolean(v3bCandidate?.v3b_setup_state);
    const v3bFacts = hasCanonicalV3B ? window.FlowSignalHistory?.v3bFacts?.(obj) : null;
    const rawSignal = v3bModel
      ? normalizeSignal(v3bFacts?.signal)
      : normalizeSignal(obj.strategy_decision || obj.display_signal || obj.signal_display_state || obj.final_signal || obj.signal);
    const snapshot = activeSnapshot(obj);
    const direction = normalizeSignal(snapshot?.direction || snapshot?.side || obj.active_trade_direction || obj.active_trade_side);
    const positionId = firstValue(snapshot?.broker_position_id, snapshot?.position_id, obj.active_trade_id, obj.broker_position_id, obj.position_id);
    const activeStatus = firstValue(obj.active_trade_status, obj.smc_status, snapshot?.status).toUpperCase();
    const running = Boolean(snapshot || (direction !== 'WAIT' && positionId && !activeStatus.includes('CLOSED') && !activeStatus.includes('EXIT')));

    const executionStatus = firstValue(
      hasCanonicalV3B && obj.live_v3b_status,
      obj.execution_status, debug.execution_status,
      rawSignal === 'WAIT' ? 'NOT_APPLICABLE' : 'PENDING'
    ).toUpperCase();
    const blockReason = firstValue(
      hasCanonicalV3B && obj.live_v3b_reason,
      obj.execution_block_reason, debug.execution_block_reason,
      obj.blocked_reason, obj.block_reason, debug.blocked_reason, debug.block_reason
    );
    const explicitAllowed = obj.execution_allowed ?? debug.execution_allowed;
    const executionAllowed = explicitAllowed === true;
    const explicitFresh = obj.fresh_entry_available ?? debug.fresh_entry_available;

    const setupId = firstValue(hasCanonicalV3B && v3bCandidate?.signal_setup_id, effectiveSetupId(obj));
    const consumedSetupId = effectiveSetupId(snapshot);
    const sameConsumedSetup = Boolean(running && rawSignal !== 'WAIT' && setupId && consumedSetupId && setupId === consumedSetupId);
    const sameInvalidatedSetup = Boolean(setupId && invalidated[symbol] && setupId === invalidated[symbol]);

    if (setupId && invalidated[symbol] && setupId !== invalidated[symbol]) {
      invalidated[symbol] = '';
      saveInvalidated();
    }

    let fresh = rawSignal === 'BUY' || rawSignal === 'SELL';
    if (explicitFresh === false && !hasCanonicalV3B) fresh = false;
    if (v3bModel && !v3bFacts?.currentEvent) fresh = false;
    if (reasonInvalidatesFreshSignal(blockReason)) fresh = false;
    if (sameConsumedSetup) fresh = false;
    if (sameInvalidatedSetup) fresh = false;

    const signal = fresh ? rawSignal : 'WAIT';
    let executionState = signal === 'WAIT' ? 'WAIT' : 'SIGNAL';
    if (signal !== 'WAIT' && (executionStatus.includes('EXECUT') || executionStatus.includes('SUBMIT') || executionStatus.includes('ACCEPT') || executionStatus.includes('ORDER_SENT'))) {
      executionState = 'EXECUTING';
    }

    return {
      signal, rawSignal, fresh, executionState, executionStatus, executionAllowed, blockReason,
      running, direction: direction !== 'WAIT' ? direction : '', positionId, setupId, consumedSetupId,
      v3b: v3bModel,
    };
  }

  function remember(symbol, obj) {
    if (!symbol || !state[symbol] || !obj || typeof obj !== 'object') return;
    state[symbol] = canonicalize(symbol, obj);
  }

  function mergeAutoExecutionStatus(symbol, statusObj) {
    if (!state[symbol] || !statusObj || typeof statusObj !== 'object') return;
    const current = state[symbol];
    const status = firstValue(statusObj.status).toUpperCase();
    const reason = firstValue(statusObj.reason, statusObj.details?.reason, statusObj.details?.block_reason);
    current.executionStatus = status || current.executionStatus;
    if (reason) current.blockReason = reason;

    if (reasonInvalidatesFreshSignal(reason)) {
      if (current.setupId) {
        invalidated[symbol] = current.setupId;
        saveInvalidated();
      }
      current.signal = 'WAIT'; current.fresh = false; current.executionState = 'WAIT'; current.executionAllowed = false; return;
    }
    if (current.signal === 'WAIT') { current.executionState = 'WAIT'; return; }
    if (status === 'EXECUTED' || status === 'ORDER_SENT' || status === 'SUBMITTED' || status === 'ACCEPTED') {
      current.executionState = 'EXECUTING'; current.executionAllowed = true;
    }
  }

  function ingest(payload) {
    if (!payload || typeof payload !== 'object') return;
    if (payload.EURUSD && typeof payload.EURUSD === 'object') remember('EURUSD', payload.EURUSD);
    if (payload.XAUUSD && typeof payload.XAUUSD === 'object') remember('XAUUSD', payload.XAUUSD);

    const auto = payload.live_auto_status_by_symbol;
    if (auto && typeof auto === 'object') {
      mergeAutoExecutionStatus('EURUSD', auto.EURUSD);
      mergeAutoExecutionStatus('XAUUSD', auto.XAUUSD);
    }

    if (!payload.EURUSD || !payload.XAUUSD) {
      const queue = [payload]; const seen = new Set();
      while (queue.length) {
        const value = queue.shift();
        if (!value || typeof value !== 'object' || seen.has(value)) continue;
        seen.add(value);
        if (Array.isArray(value)) { queue.push(...value); continue; }
        const symbol = normalizeSymbol(value.symbol || value.instrument || value.pair);
        if (symbol && ('strategy_decision' in value || 'signal' in value)) remember(symbol, value);
        Object.values(value).forEach((child) => { if (child && typeof child === 'object') queue.push(child); });
      }
    }
  }

  function displayLabel(entry) { return entry && (entry.signal === 'BUY' || entry.signal === 'SELL') ? entry.signal : 'WAIT'; }
  function displayNote(entry) {
    if (!entry || entry.signal === 'WAIT') return '';
    if (entry.executionState === 'EXECUTING') return 'Fresh signal · order submitted';
    return entry.executionAllowed ? 'Fresh strategy signal · execution eligible' : 'Fresh strategy signal';
  }

  function applySignalElement(signalEl, noteEl, entry) {
    if (!signalEl || !entry) return;
    const label = displayLabel(entry);
    const executionState = entry.signal === 'WAIT' ? 'wait' : 'signal';
    if (signalEl.textContent !== label) signalEl.textContent = label;
    if (signalEl.dataset.executionState !== executionState) {
      signalEl.dataset.executionState = executionState;
    }
    if (noteEl) {
      const note = displayNote(entry);
      if (noteEl.textContent !== note) noteEl.textContent = note;
      if (noteEl.classList.contains('hidden') === Boolean(note)) {
        noteEl.classList.toggle('hidden', !note);
      }
    }
  }

  function precedingSymbol(element) {
    if (!element || typeof Node === 'undefined') return '';
    const candidates = [
      ['EURUSD', document.getElementById('eurusd-title')],
      ['XAUUSD', document.getElementById('gold-title')],
    ].filter(([, node]) => node && (node === element || Boolean(node.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING)));
    return candidates.length ? candidates[candidates.length - 1][0] : '';
  }

  function findLeaf(root, labels) {
    const wanted = labels.map((v) => v.toUpperCase());
    return Array.from(root?.querySelectorAll?.('*') || []).find((el) => {
      if (el.children.length) return false;
      return wanted.includes(String(el.textContent || '').trim().toUpperCase());
    }) || null;
  }

  function resetCheckRow(card, labels, value) {
    const label = findLeaf(card, labels);
    if (!label) return;
    const row = label.parentElement;
    if (!row) return;
    const leaves = Array.from(row.querySelectorAll('*')).filter((el) => el.children.length === 0 && el !== label);
    const status = leaves[leaves.length - 1] || row.lastElementChild;
    if (status && status.textContent !== value) status.textContent = value;
  }

  function resetEntryStrategyChecksForWaitSignals() {
    const headers = Array.from(document.querySelectorAll('*')).filter((el) => {
      if (el.children.length) return false;
      const text = String(el.textContent || '').trim().toUpperCase();
      return text === 'ENTRY STRATEGY CHECKS' || text.includes('STRATÉGIE D’ENTRÉE') || text.includes('ESTRATEGIA DE ENTRADA');
    });

    headers.forEach((header) => {
      const symbol = precedingSymbol(header);
      if (!symbol || state[symbol]?.signal !== 'WAIT') return;
      if (state[symbol]?.v3b) return;
      const card = header.closest('.entry-strategy-checks, .strategy-checks, .strategy-check-card, .card') || header.parentElement?.parentElement || header.parentElement;
      if (!card) return;

      resetCheckRow(card, ['15m BOS/CHOCH'], 'FAILED');
      resetCheckRow(card, ['Swing break', 'Cassure du swing', 'Ruptura del swing'], 'FAILED');
      resetCheckRow(card, ['15m close', 'Clôture 15 min', 'Cierre de 15 min'], 'NOT EVALUATED');
      resetCheckRow(card, ['5m confirm', 'Confirmation 5 min', 'Confirmación de 5 min'], 'NOT EVALUATED');
      resetCheckRow(card, ['Swing SL', 'SL du swing', 'SL del swing'], 'NOT CALCULATED YET');
      resetCheckRow(card, ['Signal'], 'WAIT');
      resetCheckRow(card, ['Reason', 'Raison', 'Motivo'], 'WAIT_NO_FRESH_15M_SMC_BREAK');
    });
  }

  function decorateSymbol(symbol) {
    const entry = state[symbol]; if (!entry) return;
    const prefix = symbol === 'XAUUSD' ? 'gold' : 'eurusd';
    applySignalElement(document.getElementById(`${prefix}-signal`), document.getElementById(`${prefix}-signal-note`), entry);
  }

  function decorateMain() {
    const title = document.getElementById('main-symbol-title');
    const signalEl = document.getElementById('main-signal');
    const noteEl = document.getElementById('main-signal-note');
    if (!title || !signalEl) return;
    const symbol = normalizeSymbol(title.textContent);
    const entry = state[symbol]; if (!entry) return;
    applySignalElement(signalEl, noteEl, entry);
  }

  function render() {
    decorateSymbol('EURUSD');
    decorateSymbol('XAUUSD');
    decorateMain();
    resetEntryStrategyChecksForWaitSignals();
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    const response = await nativeFetch(input, init);
    try {
      const raw = typeof input === 'string' || input instanceof URL ? String(input) : input instanceof Request ? input.url : '';
      const url = raw ? new URL(raw, window.location.href) : null;
      if (url && (url.pathname === '/dashboard-feed' || url.pathname === '/panel-data')) {
        const nativeJson = response.json.bind(response);
        response.json = async function () {
          const payload = await nativeJson();
          ingest(payload); window.requestAnimationFrame(render); return payload;
        };
      }
    } catch (_error) {}
    return response;
  };

  function installAlertGuard() {
    const original = window.playAlert;
    if (typeof original !== 'function' || original.__freshSignalGuarded) return;
    function guardedPlayAlert(symbol, signal) {
      const normalized = normalizeSymbol(symbol);
      const entry = normalized ? state[normalized] : null;
      if (entry && entry.signal === 'WAIT') return;
      return original.apply(this, arguments);
    }
    guardedPlayAlert.__freshSignalGuarded = true;
    window.playAlert = guardedPlayAlert;
  }

  // Signal state is rendered after each intercepted dashboard response below.
  // A body-wide MutationObserver made every price/countdown/text update scan the
  // entire document, continuously competing with scroll, drag, and zoom.
  const start = () => { installAlertGuard(); render(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
  window.addEventListener('load', installAlertGuard, { once: true });

  window.FlowSignalSignalDisplayState = {
    state, invalidated, ingest, canonicalize, mergeAutoExecutionStatus, reasonInvalidatesFreshSignal,
    setupIdFrom, setupFingerprint, effectiveSetupId, displayLabel, displayNote,
    resetEntryStrategyChecksForWaitSignals, render,
  };
})();
