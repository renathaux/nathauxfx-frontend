(() => {
  'use strict';
  const DIRECT_BACKEND = 'https://api.nathauxfx.com';
  const LOCAL_BACKEND = 'http://127.0.0.1:8001';
  const COOKIE_SESSION_SENTINEL = '__flowsignal_cookie_session__';

  function backendBase() {
    const hostname = String(window.location.hostname || '');
    if (hostname === 'localhost' || hostname === '127.0.0.1') return LOCAL_BACKEND;
    const origin = String(window.location.origin || '').replace(/\/$/, '');
    return origin ? `${origin}/api/proxy` : DIRECT_BACKEND;
  }

  function restoreStandaloneAuth() {
    try {
      if (sessionStorage.getItem('flowsignal_user_session_token')) return;

      const currentRole = String(sessionStorage.getItem('flowsignal_tab_role') || '').toLowerCase();
      if (currentRole === 'admin') return;

      const persistentRole = String(localStorage.getItem('flowsignal_role') || '').toLowerCase();
      const persistentAdminToken = String(localStorage.getItem('flowsignal_session_token') || '').trim();
      if (persistentRole === 'admin' && persistentAdminToken) {
        const prefix = 'flowsignal-tab:';
        let current = String(window.name || '');
        let tabId = current.startsWith(prefix) ? current.slice(prefix.length) : '';
        if (!tabId) {
          tabId = window.crypto?.randomUUID?.()
            || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
          window.name = `${prefix}${tabId}`;
        }
        localStorage.setItem(
          `flowsignal_tab_admin_session:${tabId}`,
          JSON.stringify({ token: persistentAdminToken })
        );
        sessionStorage.setItem('flowsignal_tab_role', 'admin');
        sessionStorage.removeItem('flowsignal_public_home_mode');
        sessionStorage.removeItem('flowsignal_tab_signed_out');
        return;
      }

      try {
        const saved = JSON.parse(localStorage.getItem('flowsignal_user_session_persist') || 'null');
        if (saved?.token) {
          sessionStorage.setItem('flowsignal_user_session_token', String(saved.token));
          if (saved.csrf) sessionStorage.setItem('flowsignal_csrf_token', String(saved.csrf));
          sessionStorage.setItem('flowsignal_tab_role', 'user');
          sessionStorage.removeItem('flowsignal_public_home_mode');
          sessionStorage.removeItem('flowsignal_tab_signed_out');
          return;
        }
      } catch (_error) {}

      const hasLoginHint = document.cookie
        .split(';')
        .some((part) => part.trim() === 'flowsignal_login_hint=1');
      if (hasLoginHint) {
        sessionStorage.setItem('flowsignal_user_session_token', COOKIE_SESSION_SENTINEL);
        sessionStorage.setItem('flowsignal_tab_role', 'user');
        sessionStorage.removeItem('flowsignal_public_home_mode');
        sessionStorage.removeItem('flowsignal_tab_signed_out');
      }
    } catch (_error) {}
  }

  restoreStandaloneAuth();

  function ownerToken() {
    if (String(sessionStorage.getItem('flowsignal_tab_role') || '').toLowerCase() !== 'admin') return '';
    const prefix = 'flowsignal-tab:';
    const windowName = String(window.name || '');
    if (!windowName.startsWith(prefix)) return '';
    const tabId = windowName.slice(prefix.length);
    if (!tabId) return '';
    try {
      const saved = JSON.parse(localStorage.getItem(`flowsignal_tab_admin_session:${tabId}`) || 'null');
      return String(saved?.token || '').trim();
    } catch (_error) {
      return '';
    }
  }

  function authHeaders(method = 'GET') {
    const owner = ownerToken();
    if (owner) return { Authorization: `Bearer ${owner}` };
    const rawToken = String(sessionStorage.getItem('flowsignal_user_session_token') || '').trim();
    const token = rawToken === COOKIE_SESSION_SENTINEL ? '' : rawToken;
    const csrf = String(sessionStorage.getItem('flowsignal_csrf_token') || '').trim();
    const headers = {};
    if (token) headers.Authorization = `FlowSignalUser ${token}`;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(String(method).toUpperCase()) && csrf) headers['X-FlowSignal-CSRF'] = csrf;
    return headers;
  }

  async function request(path, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const headers = { Accept: 'application/json', ...authHeaders(method), ...(options.headers || {}) };
    if (options.body != null) headers['Content-Type'] = 'application/json';
    const response = await fetch(`${backendBase()}${path}`, {
      credentials: 'include',
      ...options,
      headers,
      body: options.body == null || typeof options.body === 'string' ? options.body : JSON.stringify(options.body),
    });
    let payload = null;
    try { payload = await response.json(); } catch (_error) {}
    if (!response.ok) {
      const detail = payload && (payload.detail || payload.reason || payload.error);
      throw new Error(typeof detail === 'string' ? detail : `Request failed (${response.status})`);
    }
    return payload || {};
  }

  window.ManualReplayApi = {
    loadHistory(payload) {
      return request('/strategy-simulator/manual-history', { method: 'POST', body: payload });
    },
  };
})();
