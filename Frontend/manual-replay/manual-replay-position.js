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

  function validateActivePositionLevel(position, field, candidate, currentPrice, minimumDistance) {
    const value = parseOptionalPrice(candidate);
    const entry = Number(position && position.entry);
    const market = Number(currentPrice);
    if (value == null || !Number.isFinite(entry) || !Number.isFinite(market)) return null;
    const gap = Number.isFinite(Number(minimumDistance)) && Number(minimumDistance) > 0
      ? Number(minimumDistance)
      : defaultMinimumDistance(entry);
    const side = position && position.side === 'SELL' ? 'SELL' : 'BUY';

    if (field === 'sl') {
      // After entry the stop may cross entry to secure profit, but it must stay
      // on the non-triggered side of the current market price.
      return side === 'BUY'
        ? Math.min(value, market - gap)
        : Math.max(value, market + gap);
    }
    if (field === 'tp') {
      return side === 'BUY'
        ? Math.max(value, market + gap)
        : Math.min(value, market - gap);
    }
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

  function updateDraftLevel(draft, field, rawValue, minimumDistance) {
    if (!draft || (field !== 'sl' && field !== 'tp')) return draft || null;
    const parsed = parseOptionalPrice(rawValue);
    return {
      ...draft,
      [field]: parsed == null ? null : validatePositionLevel(draft, field, parsed, minimumDistance),
    };
  }

  function createVirtualTrade({
    draft, requestedSide, currentClose, entryIndex, entryTime, riskDollars, tradeId,
  }) {
    if (!draft || !['BUY', 'SELL'].includes(draft.side)) throw new Error('Create a long or short position first.');
    if (requestedSide && requestedSide !== draft.side) throw new Error('Requested side does not match the position draft.');
    const entry = parseOptionalPrice(currentClose);
    const sl = parseOptionalPrice(draft.sl);
    const tp = parseOptionalPrice(draft.tp);
    const directionValid = entry != null && sl != null && tp != null && (
      draft.side === 'BUY' ? sl < entry && tp > entry : tp < entry && sl > entry
    );
    if (!directionValid) throw new Error(`${draft.side} position levels are invalid at the current close.`);
    const risk = Number(riskDollars);
    if (!Number.isFinite(risk) || risk <= 0) throw new Error('Risk value must be greater than zero.');
    const initialRiskDistance = Math.abs(entry - sl);
    return {
      tradeId: tradeId || `manual_${Date.now()}`,
      side: draft.side,
      entryIndex: Number(entryIndex),
      entryTime,
      entry,
      sl,
      tp,
      initialSl: sl,
      initialTp: tp,
      initialRiskDistance,
      riskDollars: risk,
    };
  }

  function priceToChartY(value, scale, top, plotH) {
    const clamped = clampPriceToScale(value, scale);
    if (clamped == null) return null;
    return Number(top) + ((Number(scale.high) - clamped) / Number(scale.span)) * Number(plotH);
  }

  function chartYToPrice(y, scale, top, plotH) {
    const boundedY = Math.min(Number(top) + Number(plotH), Math.max(Number(top), Number(y)));
    return Number(scale.high) - ((boundedY - Number(top)) / Number(plotH)) * Number(scale.span);
  }

  function positionOverlayGeometry({ position, scale, plot }) {
    const entry = Number(position.entry);
    const sl = Number(position.sl);
    const tp = Number(position.tp);
    const entryY = priceToChartY(entry, scale, plot.top, plot.plotH);
    const slY = priceToChartY(sl, scale, plot.top, plot.plotH);
    const tpY = priceToChartY(tp, scale, plot.top, plot.plotH);
    const width = Math.max(0, Number(plot.endX) - Number(plot.startX));
    const rect = (firstY, secondY) => ({
      x: Number(plot.startX),
      y: Math.min(firstY, secondY),
      width,
      height: Math.abs(secondY - firstY),
    });
    return {
      entryY,
      slY,
      tpY,
      profitRect: rect(entryY, tpY),
      riskRect: rect(entryY, slY),
      entryOffscreen: entry < Number(scale.low) || entry > Number(scale.high),
      slOffscreen: sl < Number(scale.low) || sl > Number(scale.high),
      tpOffscreen: tp < Number(scale.low) || tp > Number(scale.high),
    };
  }

  function visibleReplayWindow(candles, index, count) {
    const safeIndex = Math.max(0, Math.min(Number(index) || 0, Math.max(0, (candles || []).length - 1)));
    const size = Math.max(1, Number(count) || 1);
    const end = safeIndex + 1;
    const start = Math.max(0, end - size);
    return { start, end, rows: (candles || []).slice(start, end) };
  }

  return {
    parseOptionalPrice,
    createPositionDraft,
    validatePositionLevel,
    validateActivePositionLevel,
    calculatePositionMetrics,
    visibleCandleScale,
    clampPriceToScale,
    updateDraftLevel,
    createVirtualTrade,
    priceToChartY,
    chartYToPrice,
    positionOverlayGeometry,
    visibleReplayWindow,
  };
});
