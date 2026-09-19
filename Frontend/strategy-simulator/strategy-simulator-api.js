(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.StrategySimulatorApi = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  const DIRECT_BACKEND = 'https://api.nathauxfx.com';
  const LOCAL_BACKEND = 'http://127.0.0.1:8001';
  const COOKIE_SESSION_SENTINEL = '__flowsignal_cookie_session__';
  const STATIC_ROOT = '/replay-data';
  const STATIC_BASE_TIMEFRAME = '5m';
  const MAX_STATIC_RANGE_DAYS = 31;
  const manifestCache = { value: null };
  const monthCache = new Map();

  function backendBase() {
    const hostname = String(root?.location?.hostname || '');
    if (hostname === 'localhost' || hostname === '127.0.0.1') return LOCAL_BACKEND;
    const origin = String(root?.location?.origin || '').replace(/\/$/, '');
    return origin ? `${origin}/api/proxy` : DIRECT_BACKEND;
  }

  function ownerToken() {
    if (!root?.sessionStorage || !root?.localStorage) return '';
    if (String(root.sessionStorage.getItem('flowsignal_tab_role') || '').toLowerCase() !== 'admin') return '';
    const prefix = 'flowsignal-tab:';
    const windowName = String(root.name || '');
    if (!windowName.startsWith(prefix)) return '';
    const tabId = windowName.slice(prefix.length);
    if (!tabId) return '';
    try {
      const saved = JSON.parse(root.localStorage.getItem(`flowsignal_tab_admin_session:${tabId}`) || 'null');
      return String(saved?.token || '').trim();
    } catch (_error) {
      return '';
    }
  }

  function authHeaders(method = 'GET') {
    if (!root?.sessionStorage) return {};
    const owner = ownerToken();
    if (owner) return { Authorization: `Bearer ${owner}` };
    const rawToken = String(root.sessionStorage.getItem('flowsignal_user_session_token') || '').trim();
    const token = rawToken === COOKIE_SESSION_SENTINEL ? '' : rawToken;
    const csrf = String(root.sessionStorage.getItem('flowsignal_csrf_token') || '').trim();
    const headers = {};
    if (token) headers.Authorization = `FlowSignalUser ${token}`;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(String(method).toUpperCase()) && csrf) {
      headers['X-FlowSignal-CSRF'] = csrf;
    }
    return headers;
  }

  async function request(path, options = {}) {
    if (typeof root?.fetch !== 'function') throw new Error('Network client unavailable');
    const method = String(options.method || 'GET').toUpperCase();
    const headers = { Accept: 'application/json', ...authHeaders(method), ...(options.headers || {}) };
    if (options.body != null) headers['Content-Type'] = 'application/json';
    const response = await root.fetch(`${backendBase()}${path}`, {
      credentials: 'include',
      ...options,
      headers,
      body: options.body == null || typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body),
    });
    let payload = null;
    try { payload = await response.json(); } catch (_error) {}
    if (!response.ok) {
      const detail = payload && (payload.detail || payload.reason || payload.error);
      throw new Error(typeof detail === 'string' ? detail : `Request failed (${response.status})`);
    }
    return payload || {};
  }

  function normalizeSymbol(value) {
    return String(value || '').trim().toUpperCase().replace('/', '');
  }

  function monthKey(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  function requestedMonths(start, end) {
    const months = [];
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
    while (cursor <= last) {
      months.push(monthKey(cursor));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return months;
  }

  async function staticJson(path, options = {}) {
    if (typeof root?.fetch !== 'function') throw new Error('Network client unavailable');
    const response = await root.fetch(path, {
      method: 'GET',
      credentials: 'same-origin',
      cache: options.cache || 'force-cache',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      const error = new Error(`Static simulator history unavailable (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  async function loadManifest() {
    if (manifestCache.value) return manifestCache.value;
    const value = await staticJson(`${STATIC_ROOT}/manifest.json`, { cache: 'no-cache' });
    if (!value || Number(value.version) !== 1 || value.base_timeframe !== STATIC_BASE_TIMEFRAME) {
      throw new Error('Static replay manifest is invalid.');
    }
    manifestCache.value = value;
    return value;
  }

  async function loadMonth(symbol, month) {
    const key = `${symbol}:${month}`;
    const currentMonth = monthKey(new Date());
    if (month !== currentMonth && monthCache.has(key)) return monthCache.get(key);

    let payload;
    try {
      payload = await staticJson(
        `${STATIC_ROOT}/${encodeURIComponent(symbol)}/${month}.json`,
        { cache: month === currentMonth ? 'no-cache' : 'force-cache' }
      );
    } catch (error) {
      if (error?.status === 404) {
        throw new Error(`Static simulator candles for ${symbol} ${month} are not available yet.`);
      }
      throw error;
    }
    if (
      !payload ||
      normalizeSymbol(payload.symbol) !== symbol ||
      String(payload.timeframe || '').toLowerCase() !== STATIC_BASE_TIMEFRAME ||
      !Array.isArray(payload.candles)
    ) {
      throw new Error(`Static simulator file ${symbol} ${month} is invalid.`);
    }
    if (month !== currentMonth) monthCache.set(key, payload);
    return payload;
  }

  async function loadStatic5m(payload) {
    const symbol = normalizeSymbol(payload?.symbol);
    const start = new Date(payload?.start);
    const end = new Date(payload?.end);
    if (!['EURUSD', 'XAUUSD'].includes(symbol)) throw new Error('Simulator symbol is unsupported.');
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      throw new Error('Choose a valid simulation start and end.');
    }
    if (end.getTime() - start.getTime() > MAX_STATIC_RANGE_DAYS * 86400000) {
      throw new Error(`Static simulation range is limited to ${MAX_STATIC_RANGE_DAYS} days.`);
    }

    const manifest = await loadManifest();
    const available = manifest.symbols?.[symbol];
    if (!available) throw new Error(`No static simulator history is available for ${symbol}.`);

    const lastIncluded = new Date(end.getTime() - 1);
    const months = requestedMonths(start, lastIncluded);
    const availableMonths = new Set((available.months || []).map(String));
    for (const month of months) {
      if (!availableMonths.has(month)) {
        throw new Error(`Static simulator candles for ${symbol} ${month} have not been downloaded yet.`);
      }
    }

    const files = await Promise.all(months.map((month) => loadMonth(symbol, month)));
    const startMs = start.getTime();
    const endMs = end.getTime();
    const byTime = new Map();

    for (const row of files.flatMap((item) => item.candles)) {
      const timestampMs = Date.parse(row?.timestamp);
      const open = Number(row?.open);
      const high = Number(row?.high);
      const low = Number(row?.low);
      const close = Number(row?.close);
      const volume = Number(row?.volume);
      if (
        !Number.isFinite(timestampMs) ||
        timestampMs < startMs ||
        timestampMs >= endMs ||
        ![open, high, low, close].every(Number.isFinite)
      ) continue;
      byTime.set(timestampMs, {
        timestamp: new Date(timestampMs).toISOString(),
        open, high, low, close,
        volume: Number.isFinite(volume) ? volume : 0,
      });
    }

    const candles = [...byTime.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, candle]) => candle);

    if (candles.length < 2) throw new Error('Not enough static candles for this simulation range.');
    return candles;
  }

  const getStrategy = (id) => request(`/strategy-studio/strategies/${encodeURIComponent(id)}`);

  async function runSimulation(payload) {
    const candles = await loadStatic5m(payload);
    return request('/strategy-simulator/run', {
      method: 'POST',
      body: { ...payload, candles_5m: candles },
    });
  }

  return { getStrategy, runSimulation, loadStatic5m };
});
