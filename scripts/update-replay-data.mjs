#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SYMBOLS = ['EURUSD', 'XAUUSD'];
const TIMEFRAME = '5m';
const SOURCE = 'CTRADER_CLOSED_CANDLES_STATIC_EXPORT';
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_API_BASE = 'https://api.nathauxfx.com';
const REPLAY_ROOT = path.resolve('Frontend/replay-data');
const MANIFEST_PATH = path.join(REPLAY_ROOT, 'manifest.json');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthStart(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date, count) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1));
}

function fiveYearsStart(now, years) {
  return new Date(Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), 1));
}

function monthSequence(start, endInclusive) {
  const output = [];
  for (let cursor = monthStart(start); cursor <= monthStart(endInclusive); cursor = addMonths(cursor, 1)) {
    output.push(new Date(cursor));
  }
  return output;
}

function normalizeCandle(row) {
  const timestampMs = Date.parse(row?.timestamp);
  const open = Number(row?.open);
  const high = Number(row?.high);
  const low = Number(row?.low);
  const close = Number(row?.close);
  const volume = Number(row?.volume ?? 0);
  if (
    !Number.isFinite(timestampMs) ||
    ![open, high, low, close].every(Number.isFinite) ||
    high < Math.max(open, close) ||
    low > Math.min(open, close) ||
    low > high
  ) {
    return null;
  }
  return {
    timestamp: new Date(timestampMs).toISOString(),
    open,
    high,
    low,
    close,
    volume: Number.isFinite(volume) ? volume : 0,
  };
}

function canonicalCandles(rows, startMs = -Infinity, endMs = Infinity) {
  const byTime = new Map();
  for (const raw of rows || []) {
    const candle = normalizeCandle(raw);
    if (!candle) continue;
    const time = Date.parse(candle.timestamp);
    if (time < startMs || time >= endMs) continue;
    byTime.set(time, candle);
  }
  return [...byTime.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, candle]) => candle);
}

async function loadJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function loadManifest() {
  return await loadJson(MANIFEST_PATH, {
    version: 1,
    base_timeframe: TIMEFRAME,
    source: SOURCE,
    symbols: {},
  });
}

function ensureManifestSymbol(manifest, symbol) {
  manifest.symbols ||= {};
  manifest.symbols[symbol] ||= { months: [] };
  return manifest.symbols[symbol];
}

function updateManifestMonth(manifest, symbol, month, candles) {
  const symbolState = ensureManifestSymbol(manifest, symbol);
  if (!candles.length) {
    delete symbolState[month];
    symbolState.months = (symbolState.months || []).filter((value) => value !== month);
    return;
  }
  symbolState[month] = {
    count: candles.length,
    first_timestamp: candles[0].timestamp,
    last_timestamp: candles[candles.length - 1].timestamp,
  };
  symbolState.months = [...new Set([...(symbolState.months || []), month])].sort();
}

async function writeMonth(manifest, symbol, month, incoming, rangeStart, rangeEnd) {
  const directory = path.join(REPLAY_ROOT, symbol);
  const filePath = path.join(directory, `${month}.json`);
  await fs.mkdir(directory, { recursive: true });

  const existing = await loadJson(filePath, null);
  const combined = canonicalCandles(
    [
      ...(Array.isArray(existing?.candles) ? existing.candles : []),
      ...(incoming || []),
    ],
    rangeStart.getTime(),
    rangeEnd.getTime(),
  );

  if (!combined.length) return { changed: false, count: 0 };

  const payload = {
    version: 1,
    symbol,
    timeframe: TIMEFRAME,
    month,
    source: SOURCE,
    first_timestamp: combined[0].timestamp,
    last_timestamp: combined[combined.length - 1].timestamp,
    count: combined.length,
    candles: combined,
  };
  const next = JSON.stringify(payload);
  const previous = existing ? JSON.stringify(existing) : null;
  const changed = previous !== next;

  if (changed) await fs.writeFile(filePath, next);
  updateManifestMonth(manifest, symbol, month, combined);
  return { changed, count: combined.length };
}

async function fetchWindow({ apiBase, symbol, days, end, attempts = 4 }) {
  const url = new URL('/chart/candles-history', apiBase);
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('timeframe', TIMEFRAME);
  url.searchParams.set('days', String(Math.max(1, Math.min(62, days))));
  url.searchParams.set('end', end.toISOString());

  const backoffMs = [5000, 15000, 30000];
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'NathauxFX-Replay-Data-Updater/1.0',
        },
        signal: AbortSignal.timeout(120_000),
      });

      const text = await response.text();
      if (response.status === 503 && /returned no historical candles/i.test(text)) {
        console.warn(`No cTrader candles for ${symbol} ending ${end.toISOString()}`);
        return [];
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`);
      }

      const payload = JSON.parse(text);
      if (
        String(payload?.symbol || '').toUpperCase() !== symbol ||
        String(payload?.timeframe || '').toLowerCase() !== TIMEFRAME ||
        !Array.isArray(payload?.candles)
      ) {
        throw new Error('Unexpected cTrader history payload');
      }
      return payload.candles;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        const waitMs = backoffMs[Math.min(attempt - 1, backoffMs.length - 1)];
        console.warn(
          `Retry ${attempt}/${attempts - 1} for ${symbol} after ${error.message}; waiting ${waitMs / 1000}s`
        );
        await sleep(waitMs);
      }
    }
  }

  throw lastError || new Error('cTrader history fetch failed');
}

function requestedDays(start, end) {
  return Math.max(1, Math.min(62, Math.ceil((end.getTime() - start.getTime()) / DAY_MS)));
}

async function updateOneMonth({ manifest, apiBase, symbol, start, end }) {
  const month = monthKey(start);
  const rows = [];
  let chunkStart = new Date(start);

  while (chunkStart < end) {
    const chunkEnd = new Date(
      Math.min(end.getTime(), chunkStart.getTime() + 14 * DAY_MS)
    );
    const days = requestedDays(chunkStart, chunkEnd);
    console.log(
      `Fetching ${symbol} ${month}: ${chunkStart.toISOString()} -> ${chunkEnd.toISOString()} (${days} day(s))`
    );
    const chunkRows = await fetchWindow({
      apiBase,
      symbol,
      days,
      end: chunkEnd,
    });
    rows.push(...canonicalCandles(
      chunkRows,
      chunkStart.getTime(),
      chunkEnd.getTime(),
    ));
    chunkStart = chunkEnd;
    if (chunkStart < end) await sleep(2000);
  }

  const candles = canonicalCandles(rows, start.getTime(), end.getTime());
  const result = await writeMonth(
    manifest,
    symbol,
    month,
    candles,
    start,
    addMonths(start, 1),
  );
  console.log(
    `${symbol} ${month}: ${result.count} candles${result.changed ? ' (updated)' : ' (unchanged)'}`
  );
  return result;
}

function earliestManifestTimestamp(manifest) {
  const values = [];
  for (const symbol of SYMBOLS) {
    const state = manifest?.symbols?.[symbol] || {};
    for (const month of state.months || []) {
      const value = Date.parse(state?.[month]?.first_timestamp);
      if (Number.isFinite(value)) values.push(value);
    }
  }
  return values.length ? new Date(Math.min(...values)) : null;
}

async function runDaily({ manifest, apiBase, now }) {
  const months = [monthStart(now)];
  if (now.getUTCDate() <= 3) months.unshift(addMonths(monthStart(now), -1));

  for (const start of months) {
    const end = start.getUTCMonth() === now.getUTCMonth() && start.getUTCFullYear() === now.getUTCFullYear()
      ? now
      : addMonths(start, 1);
    if (end <= start) continue;
    for (const symbol of SYMBOLS) {
      await updateOneMonth({ manifest, apiBase, symbol, start, end });
      await sleep(300);
    }
  }
  manifest.last_refresh_at = now.toISOString();
  manifest.last_refresh_mode = 'daily';
}

async function runBackfill({ manifest, apiBase, now, years }) {
  const start = fiveYearsStart(now, years);
  const months = monthSequence(start, now);
  const previousBackfill = manifest.backfill || {};
  const completed = new Set(
    previousBackfill.complete === false &&
    Number(previousBackfill.requested_years) === years &&
    Array.isArray(previousBackfill.completed_keys)
      ? previousBackfill.completed_keys
      : []
  );
  const failures = [];
  let attemptedMonths = 0;

  for (const month of months) {
    const naturalEnd = addMonths(month, 1);
    const end = naturalEnd > now ? now : naturalEnd;
    if (end <= month) continue;

    for (const symbol of SYMBOLS) {
      const key = `${symbol}:${monthKey(month)}`;
      if (completed.has(key)) {
        console.log(`Skipping completed backfill month ${key}`);
        continue;
      }

      try {
        await updateOneMonth({ manifest, apiBase, symbol, start: month, end });
        completed.add(key);
      } catch (error) {
        console.error(`Backfill failed for ${key}: ${error.message}`);
        failures.push({ key, error: String(error.message || error).slice(0, 500) });
        await sleep(15_000);
      }
    }
    attemptedMonths += 1;
  }

  manifest.backfill = {
    requested_years: years,
    requested_start: start.toISOString(),
    completed_at: failures.length ? null : now.toISOString(),
    complete: failures.length === 0,
    months_attempted: attemptedMonths,
    completed_keys: [...completed].sort(),
    failures,
  };
  manifest.last_refresh_at = now.toISOString();
  manifest.last_refresh_mode = failures.length ? 'backfill_partial' : 'backfill';
}

async function main() {
  const requestedMode = String(process.argv[2] || 'auto').toLowerCase();
  const years = Math.max(1, Math.min(10, Number(process.argv[3] || process.env.BACKFILL_YEARS || 5)));
  const apiBase = String(process.env.REPLAY_HISTORY_API || DEFAULT_API_BASE).replace(/\/$/, '');
  const now = new Date();

  const manifest = await loadManifest();
  manifest.version = 1;
  manifest.base_timeframe = TIMEFRAME;
  manifest.source = SOURCE;

  let mode = requestedMode;
  if (mode === 'auto') {
    const doneYears = Number(manifest?.backfill?.requested_years || 0);
    const backfillComplete = manifest?.backfill?.complete === true;
    mode = backfillComplete && doneYears >= years ? 'daily' : 'backfill';
  }
  if (!['daily', 'backfill'].includes(mode)) {
    throw new Error('Mode must be auto, daily, or backfill');
  }

  const earliestBefore = earliestManifestTimestamp(manifest);
  console.log(`Replay updater mode=${mode} years=${years} earliest_before=${earliestBefore?.toISOString() || 'none'}`);

  if (mode === 'backfill') {
    await runBackfill({ manifest, apiBase, now, years });
  } else {
    await runDaily({ manifest, apiBase, now });
  }

  for (const symbol of SYMBOLS) {
    const symbolState = ensureManifestSymbol(manifest, symbol);
    symbolState.months = (symbolState.months || [])
      .filter((month) => symbolState[month]?.count > 0)
      .sort();
  }

  const earliestAfter = earliestManifestTimestamp(manifest);
  if (manifest.backfill) {
    manifest.backfill.earliest_available = earliestAfter?.toISOString() || null;
  }

  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Replay data update complete. earliest_after=${earliestAfter?.toISOString() || 'none'}`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export {
  addMonths,
  canonicalCandles,
  earliestManifestTimestamp,
  monthKey,
  monthSequence,
  normalizeCandle,
  requestedDays,
};
