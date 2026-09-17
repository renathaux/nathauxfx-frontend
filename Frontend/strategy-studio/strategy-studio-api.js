(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.StrategyStudioApi = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  const BACKEND = 'https://api.nathauxfx.com';

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

  function authHeaders() {
    if (!root || !root.sessionStorage) return {};
    const owner = ownerToken();
    if (owner) return { Authorization: `Bearer ${owner}` };
    const token = String(root.sessionStorage.getItem('flowsignal_user_session_token') || '').trim();
    const csrf = String(root.sessionStorage.getItem('flowsignal_csrf_token') || '').trim();
    const headers = {};
    if (token) headers.Authorization = `FlowSignalUser ${token}`;
    if (csrf) headers['X-CSRF-Token'] = csrf;
    return headers;
  }

  async function request(path, options = {}) {
    if (!root || typeof root.fetch !== 'function') throw new Error('Network client unavailable');
    const headers = {
      Accept: 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    };
    if (options.body != null) headers['Content-Type'] = 'application/json';
    const response = await root.fetch(`${BACKEND}${path}`, {
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
  };
});
