(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.StrategySimulatorModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function copy(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function buildRunPayload({
    strategyId,
    strategyName = null,
    strategyDefinition = null,
    symbol,
    start,
    end,
    mode = 'FAST',
    riskOverride = null,
  }) {
    if (!strategyId) throw new Error('Saved strategy is required');
    if (!symbol) throw new Error('Symbol is required');
    if (!start || !end) throw new Error('Start and end are required');
    const normalizedMode = String(mode || 'FAST').toUpperCase();
    if (!['FAST', 'REPLAY'].includes(normalizedMode)) throw new Error('Unsupported simulator mode');
    const payload = {
      strategy_id: String(strategyId),
      symbol: String(symbol).toUpperCase(),
      start: String(start),
      end: String(end),
      mode: normalizedMode,
      risk_override: riskOverride ? copy(riskOverride) : null,
    };
    if (strategyName != null) payload.strategy_name = String(strategyName);
    if (strategyDefinition) payload.strategy_definition = copy(strategyDefinition);
    return payload;
  }

  const DIAGNOSTIC_STAGES = [
    'trend', 'structure', 'break_validation', 'confirmation',
    'entry', 'stop_loss', 'tp1', 'tp2', 'risk',
  ];

  function simulationMetrics(startingBalance, trades) {
    const start = Number(startingBalance);
    const safeStart = Number.isFinite(start) && start > 0 ? start : 0;
    const items = Array.isArray(trades) ? trades : [];
    let balance = safeStart;
    let peak = safeStart;
    let maxDrawdown = 0;
    const equityCurve = [{ trade: 0, balance: safeStart }];
    const resolved = [];

    items.forEach((item, index) => {
      if (item?.resolved === true) {
        balance += Number(item.pnl_dollars || 0);
        resolved.push(item);
      }
      peak = Math.max(peak, balance);
      maxDrawdown = Math.max(maxDrawdown, peak - balance);
      equityCurve.push({ trade: index + 1, balance });
    });

    const wins = resolved.filter((item) => Number(item.pnl_dollars || 0) > 0);
    const losses = resolved.filter((item) => Number(item.pnl_dollars || 0) < 0);
    const grossProfit = wins.reduce((sum, item) => sum + Number(item.pnl_dollars || 0), 0);
    const grossLoss = losses.reduce((sum, item) => sum + Number(item.pnl_dollars || 0), 0);
    const rValues = resolved
      .filter((item) => item.r != null && Number.isFinite(Number(item.r)))
      .map((item) => Number(item.r));

    return {
      metrics: {
        starting_balance: safeStart,
        ending_balance: balance,
        net_pl: balance - safeStart,
        win_rate: resolved.length ? wins.length / resolved.length * 100 : 0,
        total_resolved_trades: resolved.length,
        wins: wins.length,
        losses: losses.length,
        ambiguous_trades: items.filter((item) => item?.outcome === 'AMBIGUOUS_INTRABAR').length,
        average_r: rValues.length ? rValues.reduce((sum, value) => sum + value, 0) / rValues.length : 0,
        max_drawdown_dollars: maxDrawdown,
        max_drawdown_percent: peak > 0 ? maxDrawdown / peak * 100 : 0,
        profit_factor: grossLoss < 0 ? grossProfit / Math.abs(grossLoss) : null,
      },
      equity_curve: equityCurve,
    };
  }

  function mergeDiagnostics(results, metrics) {
    const setupMap = new Map();
    const noSetupReasons = {};
    let candles = 0;
    let evaluations = 0;
    let signals = 0;
    let tradesOpened = 0;
    let warmupCandles = 0;
    let historyStart = null;

    (results || []).forEach((result, resultIndex) => {
      const diagnostics = result?.diagnostics || {};
      candles += Number(diagnostics.candles_analyzed || 0);
      evaluations += Number(diagnostics.evaluations || 0);
      signals += Number(diagnostics.signals_emitted || 0);
      tradesOpened += Number(diagnostics.trades_opened || 0);
      if (resultIndex === 0) {
        warmupCandles = Number(diagnostics.warmup_candles || 0);
        historyStart = diagnostics.history_start || null;
      }

      Object.entries(diagnostics.no_setup_reasons || {}).forEach(([reason, count]) => {
        noSetupReasons[reason] = Number(noSetupReasons[reason] || 0) + Number(count || 0);
      });

      (diagnostics.setup_details || []).forEach((detail) => {
        if (!detail?.setup_id) return;
        const current = setupMap.get(detail.setup_id) || {
          setup_id: detail.setup_id,
          passed_stages: new Set(),
          last_state: null,
          last_reason: null,
          signaled: false,
        };
        (detail.passed_stages || []).forEach((stage) => current.passed_stages.add(stage));
        if (detail.last_state != null) current.last_state = detail.last_state;
        if (detail.last_reason != null) current.last_reason = detail.last_reason;
        current.signaled = current.signaled || Boolean(detail.signaled);
        setupMap.set(detail.setup_id, current);
      });
    });

    const setups = [...setupMap.values()];
    const stagePassCounts = Object.fromEntries(
      DIAGNOSTIC_STAGES.map((stage) => [
        stage,
        setups.filter((setup) => setup.passed_stages.has(stage)).length,
      ])
    );
    const rejectionReasons = {};
    let blocked = 0;
    let waiting = 0;
    setups.forEach((setup) => {
      if (setup.signaled) return;
      if (setup.last_state === 'BLOCKED') blocked += 1;
      if (setup.last_state === 'WAITING') waiting += 1;
      const reason = setup.last_reason || 'NO_VALID_ENTRY';
      rejectionReasons[reason] = Number(rejectionReasons[reason] || 0) + 1;
    });

    const finalDiagnostics = results?.[results.length - 1]?.diagnostics || {};
    return {
      candles_analyzed: candles,
      warmup_candles: warmupCandles,
      history_start: historyStart,
      evaluations,
      setups_detected: setups.length,
      signals_emitted: signals,
      trades_opened: tradesOpened,
      resolved_trades: Number(metrics?.total_resolved_trades || 0),
      open_trades_at_end: Number(finalDiagnostics.open_trades_at_end || 0),
      blocked_setups: blocked,
      waiting_setups: waiting,
      stage_pass_counts: stagePassCounts,
      rejection_reasons: rejectionReasons,
      no_setup_reasons: noSetupReasons,
      setup_details: setups.map((setup) => ({
        setup_id: setup.setup_id,
        passed_stages: [...setup.passed_stages].sort(),
        last_state: setup.last_state,
        last_reason: setup.last_reason,
        signaled: setup.signaled,
      })),
      chunk_count: Array.isArray(results) ? results.length : 0,
    };
  }

  function aggregateSimulationResults(results) {
    const chunks = Array.isArray(results) ? results.filter(Boolean) : [];
    if (!chunks.length) throw new Error('No backtest chunks were returned');
    const first = chunks[0];
    const last = chunks[chunks.length - 1];
    const trades = chunks.flatMap((result) => Array.isArray(result.trades) ? result.trades : []);
    const startingBalance = Number(
      first.starting_balance ?? first.metrics?.starting_balance ?? 0
    );
    const calculated = simulationMetrics(startingBalance, trades);
    return {
      ...last,
      starting_balance: startingBalance,
      trades,
      metrics: calculated.metrics,
      equity_curve: calculated.equity_curve,
      diagnostics: mergeDiagnostics(chunks, calculated.metrics),
      replay: undefined,
      batch_chunks: chunks.length,
    };
  }

  function equityPoints(curve, width = 600, height = 220, padding = 16) {
    const rows = Array.isArray(curve) ? curve.filter((row) => Number.isFinite(Number(row?.balance))) : [];
    if (!rows.length) return [];
    const safeWidth = Math.max(Number(width) || 0, padding * 2 + 1);
    const safeHeight = Math.max(Number(height) || 0, padding * 2 + 1);
    const values = rows.map((row) => Number(row.balance));
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const span = maximum - minimum || 1;
    const xSpan = Math.max(rows.length - 1, 1);
    return rows.map((row, index) => ({
      x: padding + (index / xSpan) * (safeWidth - padding * 2),
      y: padding + ((maximum - Number(row.balance)) / span) * (safeHeight - padding * 2),
      balance: Number(row.balance),
      trade: row.trade,
    }));
  }

  function replayFrame(frames, requestedIndex) {
    const items = Array.isArray(frames) ? frames : [];
    if (!items.length) return { index: 0, total: 0, frame: null };
    const raw = Number.isFinite(Number(requestedIndex)) ? Math.trunc(Number(requestedIndex)) : 0;
    const index = Math.min(Math.max(raw, 0), items.length - 1);
    return { index, total: items.length, frame: items[index] };
  }

  function fixed2(value) {
    const number = Number(value);
    const magnitude = Math.abs(number);
    // Shift in decimal notation before rounding so display values such as
    // 52.345 do not fall to 52.34 because of binary floating-point storage.
    const roundedMagnitude = Number(`${Math.round(Number(`${magnitude}e2`))}e-2`);
    const rounded = number < 0 ? -roundedMagnitude : roundedMagnitude;
    return rounded.toFixed(2);
  }

  function formatMetric(value, type = 'number') {
    if (value == null || value === '' || !Number.isFinite(Number(value))) return '—';
    const number = Number(value);
    if (type === 'money') return `$${fixed2(number)}`;
    if (type === 'percent') return `${fixed2(number)}%`;
    if (type === 'r') return `${fixed2(number)}R`;
    return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  return {
    buildRunPayload,
    simulationMetrics,
    aggregateSimulationResults,
    equityPoints,
    replayFrame,
    formatMetric,
  };
});
