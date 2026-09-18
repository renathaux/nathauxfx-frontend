(() => {
  'use strict';

  const STATIC_ROOT = '/replay-data';
  const BASE_TIMEFRAME = '5m';
  const SUPPORTED_SYMBOLS = new Set(['EURUSD', 'XAUUSD']);
  const SUPPORTED_TIMEFRAMES = new Set(['5m', '15m', '1h']);
  const FIVE_MINUTES_MS = 5 * 60 * 1000;
  const manifestCache = { value: null };
  const monthCache = new Map();

  function normalizeSymbol(value) {
    return String(value || '').trim().toUpperCase().replace('/', '');
  }

  function normalizeTimeframe(value) {
    return String(value || '').trim().toLowerCase();
  }

  function utcMonthKey(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  function monthKeys(start, end) {
    const keys = [];
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
    while (cursor <= last) {
      keys.push(utcMonthKey(cursor));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return keys;
  }

  async function fetchJson(path, options = {}) {
    const response = await fetch(path, {
      method: 'GET',
      credentials: 'same-origin',
      cache: options.cache || 'force-cache',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      const error = new Error(`Replay history file unavailable (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  async function loadManifest() {
    if (manifestCache.value) return manifestCache.value;
    const value = await fetchJson(`${STATIC_ROOT}/manifest.json`, { cache: 'no-cache' });
    if (!value || Number(value.version) !== 1 || value.base_timeframe !== BASE_TIMEFRAME) {
      throw new Error('Replay history manifest is invalid.');
    }
    manifestCache.value = value;
    return value;
  }

  async function loadMonth(symbol, month, mutableMonth) {
    const key = `${symbol}:${month}`;
    if (!mutableMonth && monthCache.has(key)) return monthCache.get(key);

    let payload;
    try {
      payload = await fetchJson(
        `${STATIC_ROOT}/${encodeURIComponent(symbol)}/${month}.json`,
        { cache: mutableMonth ? 'no-cache' : 'force-cache' }
      );
    } catch (error) {
      if (error && error.status === 404) {
        throw new Error(`Replay candles for ${symbol} ${month} have not been downloaded yet.`);
      }
      throw error;
    }

    if (
      !payload ||
      normalizeSymbol(payload.symbol) !== symbol ||
      normalizeTimeframe(payload.timeframe) !== BASE_TIMEFRAME ||
      !Array.isArray(payload.candles)
    ) {
      throw new Error(`Replay candle file ${symbol} ${month} is invalid.`);
    }

    if (!mutableMonth) monthCache.set(key, payload);
    return payload;
  }

  function canonicalCandles(rows, startMs, endMs) {
    const byTimestamp = new Map();
    for (const row of rows || []) {
      const timestampMs = Date.parse(row && row.timestamp);
      const open = Number(row && row.open);
      const high = Number(row && row.high);
      const low = Number(row && row.low);
      const close = Number(row && row.close);
      const volume = Number(row && row.volume);
      if (
        !Number.isFinite(timestampMs) ||
        timestampMs < startMs ||
        timestampMs >= endMs ||
        ![open, high, low, close].every(Number.isFinite)
      ) continue;
      byTimestamp.set(timestampMs, {
        timestamp: new Date(timestampMs).toISOString(),
        open, high, low, close,
        volume: Number.isFinite(volume) ? volume : 0,
      });
    }
    return [...byTimestamp.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, candle]) => candle);
  }

  function aggregateCandles(candles, timeframe, endMs) {
    if (timeframe === BASE_TIMEFRAME) return candles;
    const minutes = timeframe === '15m' ? 15 : timeframe === '1h' ? 60 : 0;
    if (!minutes) throw new Error('Manual replay timeframe is unsupported.');

    const durationMs = minutes * 60 * 1000;
    const required = durationMs / FIVE_MINUTES_MS;
    const source = new Map(candles.map((c) => [Date.parse(c.timestamp), c]));
    const bucketStarts = [...new Set(candles.map((c) => {
      const t = Date.parse(c.timestamp);
      return Math.floor(t / durationMs) * durationMs;
    }))].sort((a, b) => a - b);

    const output = [];
    for (const start of bucketStarts) {
      if (start + durationMs > endMs) continue;
      const rows = [];
      let complete = true;
      for (let index = 0; index < required; index += 1) {
        const row = source.get(start + index * FIVE_MINUTES_MS);
        if (!row) {
          complete = false;
          break;
        }
        rows.push(row);
      }
      if (!complete) continue;
      output.push({
        timestamp: new Date(start).toISOString(),
        open: rows[0].open,
        high: Math.max(...rows.map((row) => row.high)),
        low: Math.min(...rows.map((row) => row.low)),
        close: rows[rows.length - 1].close,
        volume: rows.reduce((sum, row) => sum + (Number(row.volume) || 0), 0),
      });
    }
    return output;
  }

  async function loadHistory(payload) {
    const symbol = normalizeSymbol(payload && payload.symbol);
    const timeframe = normalizeTimeframe(payload && payload.timeframe);
    const start = new Date(payload && payload.start);
    const end = new Date(payload && payload.end);

    if (!SUPPORTED_SYMBOLS.has(symbol)) throw new Error('Manual replay symbol is unsupported.');
    if (!SUPPORTED_TIMEFRAMES.has(timeframe)) throw new Error('Manual replay timeframe is unsupported.');
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      throw new Error('Choose a valid replay start and end.');
    }

    const manifest = await loadManifest();
    const available = manifest.symbols && manifest.symbols[symbol];
    if (!available) throw new Error(`No static replay history is available for ${symbol}.`);

    const requestedMonths = monthKeys(start, new Date(end.getTime() - 1));
    const availableMonths = new Set((available.months || []).map(String));
    for (const month of requestedMonths) {
      if (!availableMonths.has(month)) {
        throw new Error(`Replay candles for ${symbol} ${month} have not been downloaded yet.`);
      }
    }

    const currentMonth = utcMonthKey(new Date());
    const payloads = await Promise.all(
      requestedMonths.map((month) => loadMonth(symbol, month, month === currentMonth))
    );
    const startMs = start.getTime();
    const endMs = end.getTime();
    const fiveMinute = canonicalCandles(
      payloads.flatMap((item) => item.candles),
      startMs,
      endMs
    );
    const candles = aggregateCandles(fiveMinute, timeframe, endMs);
    if (candles.length < 2) throw new Error('Not enough downloaded candles for this replay range.');

    return {
      ok: true,
      mode: 'MANUAL_REPLAY',
      strategy_id: null,
      strategy_required: false,
      live_trading_enabled: false,
      broker_orders_enabled: false,
      symbol,
      timeframe,
      account_scope: 'STATIC_REPLAY_HISTORY',
      source: 'STATIC_JSON',
      start: start.toISOString(),
      end: end.toISOString(),
      candles,
    };
  }

  window.ManualReplayApi = { loadHistory };
})();