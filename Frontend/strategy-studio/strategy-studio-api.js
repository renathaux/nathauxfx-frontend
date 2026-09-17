(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.StrategyStudioApi = api;
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
    if (!root || !root.sessionStorage || !root.localStorage) return '';
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
    if (!root || !root.sessionStorage) return {};
    const owner = ownerToken();
    if (owner) return { Authorization: `Bearer ${owner}` };
    const rawToken = String(root.sessionStorage.getItem('flowsignal_user_session_token') || '').trim();
    const token = rawToken === COOKIE_SESSION_SENTINEL ? '' : rawToken;
    const csrf = String(root.sessionStorage.getItem('flowsignal_csrf_token') || '').trim();
    const headers = {};
    if (token) headers.Authorization = `FlowSignalUser ${token}`;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(String(method || 'GET').toUpperCase()) && csrf) {
      headers['X-FlowSignal-CSRF'] = csrf;
    }
    return headers;
  }

  async function request(path, options = {}) {
    if (!root || typeof root.fetch !== 'function') throw new Error('Network client unavailable');
    const method = String(options.method || 'GET').toUpperCase();
    const headers = {
      Accept: 'application/json',
      ...authHeaders(method),
      ...(options.headers || {}),
    };
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

  function bindSimulatorNavigation() {
    const document = root?.document;
    if (!document) return;
    const button = document.getElementById('simulatorBtn');
    const list = document.getElementById('savedStrategiesList');
    if (!button || !list) return;
    const help = document.querySelector('.simulator-help');

    const selectedCard = () => document.querySelector('.strategy-card.selected[data-strategy-id]');
    const sync = () => {
      const selected = selectedCard();
      button.disabled = !selected;
      button.title = selected ? 'Backtest this saved strategy' : 'Select a saved strategy first';
      if (help) help.textContent = selected
        ? 'Run Fast Backtest or bar-by-bar Replay. Simulator does not enable LIVE trading.'
        : 'Select a saved strategy to open Simulator.';
    };

    button.addEventListener('click', () => {
      const selected = selectedCard();
      const id = selected?.dataset?.strategyId;
      if (!id) return;
      root.location.assign(`/strategy-simulator.html?strategy=${encodeURIComponent(id)}`);
    });

    if (typeof root.MutationObserver === 'function') {
      new root.MutationObserver(sync).observe(list, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }
    sync();
  }

  if (root?.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', bindSimulatorNavigation);
    else root.setTimeout(bindSimulatorNavigation, 0);
  }

  const listStrategies = () => request('/strategy-studio/strategies');
  const validateStrategy = (name, definition) => request('/strategy-studio/validate', {
    method: 'POST', body: { name, definition },
  });
  const createStrategy = (name, definition) => request('/strategy-studio/strategies', {
    method: 'POST', body: { name, definition },
  });
  const getStrategy = (id) => request(`/strategy-studio/strategies/${encodeURIComponent(id)}`);
  const updateStrategy = (id, name, definition) => request(`/strategy-studio/strategies/${encodeURIComponent(id)}`, {
    method: 'PUT', body: { name, definition },
  });
  const cloneStrategy = (id, name) => request(`/strategy-studio/strategies/${encodeURIComponent(id)}/clone`, {
    method: 'POST', body: { name },
  });
  const activateStrategy = (id) => request(`/strategy-studio/strategies/${encodeURIComponent(id)}/activate`, {
    method: 'POST', body: { confirm: true },
  });
  const deactivateStrategy = (id) => request(`/strategy-studio/strategies/${encodeURIComponent(id)}/deactivate`, {
    method: 'POST', body: { confirm: true },
  });
  const deleteStrategy = (id) => request(`/strategy-studio/strategies/${encodeURIComponent(id)}`, {
    method: 'DELETE', body: { confirm: true },
  });
  const getLiveStatus = () => request('/strategy-studio/live-status');
  const setLiveHandoff = (id, enabled) => request('/strategy-studio/live-handoff', {
    method: 'POST',
    body: { strategy_id: id, enabled: Boolean(enabled), confirm: true },
  });

  return {
    listStrategies,
    validateStrategy,
    createStrategy,
    getStrategy,
    updateStrategy,
    cloneStrategy,
    activateStrategy,
    deactivateStrategy,
    deleteStrategy,
    getLiveStatus,
    setLiveHandoff,
  };
});