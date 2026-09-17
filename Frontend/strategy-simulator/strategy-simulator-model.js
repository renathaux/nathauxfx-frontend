(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.StrategySimulatorModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function copy(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function buildRunPayload({ strategyId, symbol, start, end, mode = 'FAST', riskOverride = null }) {
    if (!strategyId) throw new Error('Saved strategy is required');
    if (!symbol) throw new Error('Symbol is required');
    if (!start || !end) throw new Error('Start and end are required');
    const normalizedMode = String(mode || 'FAST').toUpperCase();
    if (!['FAST', 'REPLAY'].includes(normalizedMode)) throw new Error('Unsupported simulator mode');
    return {
      strategy_id: String(strategyId),
      symbol: String(symbol).toUpperCase(),
      start: String(start),
      end: String(end),
      mode: normalizedMode,
      risk_override: riskOverride ? copy(riskOverride) : null,
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

  function formatMetric(value, type = 'number') {
    if (value == null || value === '' || !Number.isFinite(Number(value))) return '—';
    const number = Number(value);
    if (type === 'money') return `$${number.toFixed(2)}`;
    if (type === 'percent') return `${number.toFixed(2)}%`;
    if (type === 'r') return `${number.toFixed(2)}R`;
    return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  return { buildRunPayload, equityPoints, replayFrame, formatMetric };
});
