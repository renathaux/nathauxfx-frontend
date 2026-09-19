(function initManualReplayPosition(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ManualReplayPosition = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  function parseOptionalPrice(value) {
    if (value == null || String(value).trim() === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function defaultMinimumDistance(entry) {
    return Math.abs(Number(entry)) >= 100 ? 0.1 : 0.0001;
  }

  function createPositionDraft({ side, entry, visibleLow, visibleHigh, minimumDisplayDistance }) {
    const normalizedSide = side === 'SELL' ? 'SELL' : 'BUY';
    const fixedEntry = Number(entry);
    const low = Number(visibleLow);
    const high = Number(visibleHigh);
    if (![fixedEntry, low, high].every(Number.isFinite)) throw new Error('A visible candle range is required.');
    const visibleRange = Math.max(0, high - low);
    const minimum = Number.isFinite(Number(minimumDisplayDistance)) && Number(minimumDisplayDistance) > 0
      ? Number(minimumDisplayDistance)
      : defaultMinimumDistance(fixedEntry);
    const distance = Math.max(visibleRange * 0.2, minimum);
    return normalizedSide === 'BUY'
      ? { side: 'BUY', entry: fixedEntry, sl: fixedEntry - distance, tp: fixedEntry + distance * 2 }
      : { side: 'SELL', entry: fixedEntry, sl: fixedEntry + distance, tp: fixedEntry - distance * 2 };
  }

  function validatePositionLevel(draft, field, candidate, minimumDistance) {
    const value = parseOptionalPrice(candidate);
    const entry = Number(draft && draft.entry);
    if (value == null || !Number.isFinite(entry)) return null;
    const gap = Number.isFinite(Number(minimumDistance)) && Number(minimumDistance) > 0
      ? Number(minimumDistance)
      : defaultMinimumDistance(entry);
    const side = draft && draft.side === 'SELL' ? 'SELL' : 'BUY';
    if (field === 'sl') return side === 'BUY' ? Math.min(value, entry - gap) : Math.max(value, entry + gap);
    if (field === 'tp') return side === 'BUY' ? Math.max(value, entry + gap) : Math.min(value, entry - gap);
    return null;
  }

  function calculatePositionMetrics({ draft, riskMethod, riskValue, balance }) {
    const entry = parseOptionalPrice(draft && draft.entry);
    const sl = parseOptionalPrice(draft && draft.sl);
    const tp = parseOptionalPrice(draft && draft.tp);
    const side = draft && draft.side === 'SELL' ? 'SELL' : 'BUY';
    const value = Number(riskValue);
    const currentBalance = Number(balance);
    const directionValid = entry != null && sl != null && tp != null && (
      side === 'BUY' ? sl < entry && tp > entry : tp < entry && sl > entry
    );
    const riskDistance = directionValid ? Math.abs(entry - sl) : null;
    const rewardDistance = directionValid ? Math.abs(tp - entry) : null;
    const riskDollars = Number.isFinite(value) && value > 0 && Number.isFinite(currentBalance) && currentBalance > 0
      ? (riskMethod === 'FIXED' ? value : currentBalance * value / 100)
      : null;
    const rr = riskDistance && rewardDistance != null ? rewardDistance / riskDistance : null;
    return {
      valid: Boolean(directionValid && riskDistance > 0 && Number.isFinite(riskDollars)),
      riskDistance,
      rewardDistance,
      rr,
      riskDollars,
      rewardDollars: Number.isFinite(rr) && Number.isFinite(riskDollars) ? riskDollars * rr : null,
    };
  }

  function visibleCandleScale(candles) {
    const rows = (candles || []).filter((candle) =>
      [candle && candle.low, candle && candle.high].map(Number).every(Number.isFinite)
    );
    if (!rows.length) return null;
    const rawLow = Math.min(...rows.map((candle) => Number(candle.low)));
    const rawHigh = Math.max(...rows.map((candle) => Number(candle.high)));
    const rawSpan = rawHigh - rawLow || Math.max(Math.abs(rawHigh) * 0.001, 0.0001);
    const padding = rawSpan * 0.07;
    const low = rawLow - padding;
    const high = rawHigh + padding;
    return { rawLow, rawHigh, rawSpan, padding, low, high, span: high - low || 1 };
  }

  function clampPriceToScale(value, scale) {
    const number = Number(value);
    if (!Number.isFinite(number) || !scale) return null;
    return Math.min(Number(scale.high), Math.max(Number(scale.low), number));
  }

  return {
    parseOptionalPrice,
    createPositionDraft,
    validatePositionLevel,
    calculatePositionMetrics,
    visibleCandleScale,
    clampPriceToScale,
  };
});
