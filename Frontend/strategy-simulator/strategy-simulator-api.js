(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.StrategySimulatorApi = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  const DIRECT_BACKEND = 'https://api.nathauxfx.com';
  const LOCAL_BACKEND = 'http://127.0.0.1:8001';
  const COOKIE_SESSION_SENTINEL = '__flowsignal_cookie_session__';

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

  const getStrategy = (id) => request(`/strategy-studio/strategies/${encodeURIComponent(id)}`);
  const runSimulation = (payload) => request('/strategy-simulator/run', { method: 'POST', body: payload });

  return { getStrategy, runSimulation };
});
