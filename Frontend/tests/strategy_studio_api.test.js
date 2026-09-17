const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const apiPath = path.join(__dirname, '..', 'strategy-studio', 'strategy-studio-api.js');

test('Strategy Studio API wrapper exposes the CRUD endpoints', () => {
  const source = fs.readFileSync(apiPath, 'utf8');
  assert.match(source, /\/strategy-studio\/strategies/);
  assert.match(source, /\/strategy-studio\/validate/);
  assert.match(source, /activate/);
  assert.match(source, /deactivate/);
  assert.match(source, /clone/);
});

test('customer auth token and csrf are attached without LIVE execution endpoints', () => {
  const source = fs.readFileSync(apiPath, 'utf8');
  assert.match(source, /flowsignal_user_session_token/);
  assert.match(source, /flowsignal_csrf_token/);
  assert.match(source, /FlowSignalUser/);
  assert.doesNotMatch(source, /execute-live-order|place_market_order|live-auto-toggle/);
});

test('owner admin token authenticates Strategy Studio reads', async () => {
  const old = {
    sessionStorage: globalThis.sessionStorage,
    localStorage: globalThis.localStorage,
    name: globalThis.name,
    fetch: globalThis.fetch,
    api: globalThis.StrategyStudioApi,
  };
  const calls = [];
  globalThis.name = 'flowsignal-tab:owner-tab-1';
  globalThis.sessionStorage = {
    getItem(key) {
      if (key === 'flowsignal_tab_role') return 'admin';
      return null;
    },
  };
  globalThis.localStorage = {
    getItem(key) {
      if (key === 'flowsignal_tab_admin_session:owner-tab-1') {
        return JSON.stringify({ token: 'owner-secret-token' });
      }
      return null;
    },
  };
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => ({ ok: true, strategies: [] }) };
  };

  const modulePath = require.resolve('../strategy-studio/strategy-studio-api.js');
  delete require.cache[modulePath];
  try {
    const api = require(modulePath);
    await api.listStrategies();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].init.headers.Authorization, 'Bearer owner-secret-token');
  } finally {
    delete require.cache[modulePath];
    globalThis.sessionStorage = old.sessionStorage;
    globalThis.localStorage = old.localStorage;
    globalThis.name = old.name;
    globalThis.fetch = old.fetch;
    globalThis.StrategyStudioApi = old.api;
  }
});

test('customer Strategy Studio writes use same-origin proxy and established CSRF header', async () => {
  const old = {
    sessionStorage: globalThis.sessionStorage,
    localStorage: globalThis.localStorage,
    name: globalThis.name,
    location: globalThis.location,
    fetch: globalThis.fetch,
    api: globalThis.StrategyStudioApi,
  };
  const calls = [];
  globalThis.name = 'flowsignal-tab:user-tab-1';
  globalThis.location = { hostname: 'www.nathauxfx.com', origin: 'https://www.nathauxfx.com' };
  globalThis.sessionStorage = {
    getItem(key) {
      if (key === 'flowsignal_tab_role') return 'user';
      if (key === 'flowsignal_user_session_token') return 'user-token';
      if (key === 'flowsignal_csrf_token') return 'csrf-token';
      return null;
    },
  };
  globalThis.localStorage = { getItem() { return null; } };
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 201, json: async () => ({ ok: true, strategy: {} }) };
  };

  const modulePath = require.resolve('../strategy-studio/strategy-studio-api.js');
  delete require.cache[modulePath];
  try {
    const api = require(modulePath);
    await api.createStrategy('A', { schema_version: 1 });
    assert.equal(calls[0].url, 'https://www.nathauxfx.com/api/proxy/strategy-studio/strategies');
    assert.equal(calls[0].init.headers.Authorization, 'FlowSignalUser user-token');
    assert.equal(calls[0].init.headers['X-FlowSignal-CSRF'], 'csrf-token');
    assert.equal(calls[0].init.headers['X-CSRF-Token'], undefined);
  } finally {
    delete require.cache[modulePath];
    globalThis.sessionStorage = old.sessionStorage;
    globalThis.localStorage = old.localStorage;
    globalThis.name = old.name;
    globalThis.location = old.location;
    globalThis.fetch = old.fetch;
    globalThis.StrategyStudioApi = old.api;
  }
});

test('cookie-session sentinel is never sent as bearer credentials', async () => {
  const old = {
    sessionStorage: globalThis.sessionStorage,
    localStorage: globalThis.localStorage,
    name: globalThis.name,
    location: globalThis.location,
    fetch: globalThis.fetch,
    api: globalThis.StrategyStudioApi,
  };
  const calls = [];
  globalThis.name = 'flowsignal-tab:user-cookie-1';
  globalThis.location = { hostname: 'www.nathauxfx.com', origin: 'https://www.nathauxfx.com' };
  globalThis.sessionStorage = {
    getItem(key) {
      if (key === 'flowsignal_tab_role') return 'user';
      if (key === 'flowsignal_user_session_token') return '__flowsignal_cookie_session__';
      if (key === 'flowsignal_csrf_token') return 'cookie-csrf';
      return null;
    },
  };
  globalThis.localStorage = { getItem() { return null; } };
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => ({ ok: true, strategies: [] }) };
  };

  const modulePath = require.resolve('../strategy-studio/strategy-studio-api.js');
  delete require.cache[modulePath];
  try {
    const api = require(modulePath);
    await api.listStrategies();
    assert.equal(calls[0].url, 'https://www.nathauxfx.com/api/proxy/strategy-studio/strategies');
    assert.equal(calls[0].init.credentials, 'include');
    assert.equal(calls[0].init.headers.Authorization, undefined);
  } finally {
    delete require.cache[modulePath];
    globalThis.sessionStorage = old.sessionStorage;
    globalThis.localStorage = old.localStorage;
    globalThis.name = old.name;
    globalThis.location = old.location;
    globalThis.fetch = old.fetch;
    globalThis.StrategyStudioApi = old.api;
  }
});
