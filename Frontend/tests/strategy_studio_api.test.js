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
  const sessionValues = new Map([['flowsignal_tab_role', 'admin']]);
  const localValues = new Map([
    ['flowsignal_tab_admin_session:owner-tab-1', JSON.stringify({ token: 'owner-secret-token' })],
  ]);
  globalThis.sessionStorage = {
    getItem(key) { return sessionValues.get(key) || null; },
    setItem(key, value) { sessionValues.set(key, String(value)); },
    removeItem(key) { sessionValues.delete(key); },
  };
  globalThis.localStorage = {
    getItem(key) { return localValues.get(key) || null; },
    setItem(key, value) { localValues.set(key, String(value)); },
    removeItem(key) { localValues.delete(key); },
    key(index) { return Array.from(localValues.keys())[index] || null; },
    get length() { return localValues.size; },
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

test('tab-scoped owner token wins over stale customer state', async () => {
  const old = {
    sessionStorage: globalThis.sessionStorage,
    localStorage: globalThis.localStorage,
    name: globalThis.name,
    location: globalThis.location,
    fetch: globalThis.fetch,
    api: globalThis.StrategyStudioApi,
  };
  const calls = [];
  const sessionValues = new Map([
    ['flowsignal_tab_role', 'user'],
    ['flowsignal_user_session_token', 'stale-user-token'],
    ['flowsignal_csrf_token', 'stale-csrf'],
  ]);
  const localValues = new Map([
    ['flowsignal_role', 'user'],
    ['flowsignal_session_token', 'owner-secret-token'],
    ['flowsignal_tab_admin_session:owner-tab-stale', JSON.stringify({ token: 'owner-secret-token' })],
  ]);

  globalThis.name = 'flowsignal-tab:owner-tab-stale';
  globalThis.location = { hostname: 'www.nathauxfx.com', origin: 'https://www.nathauxfx.com' };
  globalThis.sessionStorage = {
    getItem(key) { return sessionValues.get(key) || null; },
    setItem(key, value) { sessionValues.set(key, String(value)); },
    removeItem(key) { sessionValues.delete(key); },
  };
  globalThis.localStorage = {
    getItem(key) { return localValues.get(key) || null; },
    setItem(key, value) { localValues.set(key, String(value)); },
    removeItem(key) { localValues.delete(key); },
    key(index) { return Array.from(localValues.keys())[index] || null; },
    get length() { return localValues.size; },
  };
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, strategies: [{ name: 'gold 931 v18' }] }),
    };
  };

  const modulePath = require.resolve('../strategy-studio/strategy-studio-api.js');
  delete require.cache[modulePath];
  try {
    const api = require(modulePath);
    const result = await api.listStrategies();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].init.headers.Authorization, 'Bearer owner-secret-token');
    assert.equal(sessionValues.get('flowsignal_tab_role'), 'admin');
    assert.equal(sessionValues.has('flowsignal_user_session_token'), false);
    assert.equal(sessionValues.has('flowsignal_csrf_token'), false);
    assert.equal(result.strategies[0].name, 'gold 931 v18');
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

test('Safari window.name loss and restoration keep explicit admin requests on the owner library', async () => {
  const vm = require('node:vm');
  const store = entries => { const values = new Map(entries); return {
    getItem: key => values.get(key) || null,
    setItem: (key,value) => values.set(key,String(value)),
    removeItem: key => values.delete(key), key: index => [...values.keys()][index],
    get length() { return values.size; },
  }; };
  const calls=[];
  const context={
    name:'',sessionStorage:store([['flowsignal_tab_role','admin'],['flowsignal_user_session_token','stale-customer']]),
    localStorage:store([['flowsignal_tab_admin_session:stable',JSON.stringify({token:'valid-owner'})]]),
    location:{hostname:'www.nathauxfx.com',origin:'https://www.nathauxfx.com'},
    fetch: async (_url,init) => { calls.push(init.headers.Authorization); return {ok:true,json:async()=>({strategies:[{name:'Gold 931'}]})}; },
  };
  vm.createContext(context);vm.runInContext(fs.readFileSync(apiPath,'utf8'),context);
  assert.equal((await context.StrategyStudioApi.listStrategies()).strategies[0].name,'Gold 931');
  context.name='flowsignal-tab:stable';
  assert.equal((await context.StrategyStudioApi.listStrategies()).strategies[0].name,'Gold 931');
  assert.deepEqual(calls,['Bearer valid-owner','Bearer valid-owner']);
});
