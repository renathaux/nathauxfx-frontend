(function () {
  const state = { lastApiCalled: null, statusCode: null, errorMessage: null };
  const DEFAULT_TIMEOUT_MS = 12000;
  const PRIMARY_BACKEND_ORIGIN = "https://api.nathauxfx.com";
  const LEGACY_BACKEND_ORIGIN = "https://flowsignal-backend-3.onrender.com";
  const TAB_WINDOW_PREFIX = "flowsignal-tab:";
  const TAB_ROLE_KEY = "flowsignal_tab_role";
  const OWNER_SESSION_KEY = "flowsignal_session_token";
  const OWNER_AUTH_ERRORS = new Set([
    "OWNER_SESSION_EXPIRED",
    "OWNER_SESSION_REQUIRED",
    "ADMIN_FOREX_MUTATION_REQUIRED",
  ]);
  const OWNER_MUTATION_PATHS = new Set([
    "/market-data-source",
    "/paper-auto-toggle",
    "/live-auto-toggle",
    "/execute-trade",
    "/execute-live-order",
    "/connect-ctrader",
    "/refresh-ctrader-accounts",
    "/set-active-ctrader-account",
    "/forget-ctrader-account",
    "/disconnect-ctrader",
    "/close-live-trade",
    "/modify-live-position-levels",
    "/ctrader/disconnect",
    "/ctrader/accounts/refresh",
    "/ctrader/accounts/active",
    "/ctrader/accounts/forget",
    "/ctrader/accounts/clear",
  ]);

  function canonicalBackendInput(input) {
    try {
      if (typeof input === "string" || input instanceof URL) {
        const url = new URL(String(input), window.location.href);
        if (url.origin !== LEGACY_BACKEND_ORIGIN) return input;
        const target = new URL(url.pathname + url.search + url.hash, PRIMARY_BACKEND_ORIGIN);
        return input instanceof URL ? target : target.toString();
      }
      if (input instanceof Request) {
        const url = new URL(input.url);
        if (url.origin !== LEGACY_BACKEND_ORIGIN) return input;
        const target = new URL(url.pathname + url.search + url.hash, PRIMARY_BACKEND_ORIGIN);
        return new Request(target.toString(), input);
      }
    } catch (_error) {}
    return input;
  }

  function requestUrl(input) {
    try {
      const raw = typeof input === "string" || input instanceof URL
        ? String(input)
        : input instanceof Request
          ? input.url
          : input?.url;
      return raw ? new URL(raw, window.location.href) : null;
    } catch (_error) {
      return null;
    }
  }

  function currentTabRole() {
    return String(
      sessionStorage.getItem(TAB_ROLE_KEY)
      || localStorage.getItem("flowsignal_role")
      || ""
    ).toLowerCase();
  }

  function currentTabId() {
    const current = String(window.name || "");
    if (!current.startsWith(TAB_WINDOW_PREFIX)) return "";
    return current.slice(TAB_WINDOW_PREFIX.length);
  }

  function ownerTabToken() {
    if (currentTabRole() !== "admin") return "";
    const tabId = currentTabId();
    if (!tabId) return "";
    try {
      const saved = JSON.parse(
        localStorage.getItem(`flowsignal_tab_admin_session:${tabId}`) || "null"
      );
      return String(saved?.token || "").trim();
    } catch (_error) {
      return "";
    }
  }

  function isOwnerMutation(url, method) {
    if (!url) return false;
    if (url.pathname.startsWith("/admin/access/")) return true;
    if (url.pathname.startsWith("/strategy-lab/")) return true;
    if (OWNER_MUTATION_PATHS.has(url.pathname)) return true;
    const writeMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "GET").toUpperCase());
    return writeMethod && (
      url.pathname.startsWith("/settings/")
      || url.pathname.startsWith("/strategy/settings")
    );
  }

  function applyOwnerAuthorization(input, requestInit) {
    const token = ownerTabToken();
    if (!token) return requestInit;
    const url = requestUrl(input);
    const method = String(
      requestInit?.method
      || (input instanceof Request ? input.method : "GET")
      || "GET"
    ).toUpperCase();
    if (!isOwnerMutation(url, method)) return requestInit;

    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(requestInit.headers || {}).forEach((value, key) => headers.set(key, value));
    headers.set("Authorization", `Bearer ${token}`);
    requestInit.headers = headers;

    // Keep legacy code from accidentally using a customer/access-code token
    // after a backend restart. The per-tab owner token is the authority here.
    localStorage.setItem(OWNER_SESSION_KEY, token);
    return requestInit;
  }

  function adminAccessCodeSessionResponse(input) {
    const url = requestUrl(input);
    const token = ownerTabToken();
    if (!token || url?.pathname !== "/session/access-code") return null;

    // Admin tabs must never silently downgrade themselves to an access-code
    // user session after a 401. Reuse the owner token and let true expiry be
    // handled as owner re-authentication instead.
    localStorage.setItem(OWNER_SESSION_KEY, token);
    return new Response(JSON.stringify({
      ok: true,
      token,
      role: "admin",
      auth_method: "owner_tab_session",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  function clearExpiredOwnerSession() {
    const tabId = currentTabId();
    if (tabId) localStorage.removeItem(`flowsignal_tab_admin_session:${tabId}`);
    localStorage.removeItem(OWNER_SESSION_KEY);
    sessionStorage.removeItem(TAB_ROLE_KEY);
  }

  async function redirectExpiredOwnerMutation(input, init, response) {
    if (currentTabRole() !== "admin") return false;
    const url = requestUrl(input);
    const method = String(
      init?.method
      || (input instanceof Request ? input.method : "GET")
      || "GET"
    ).toUpperCase();
    if (!isOwnerMutation(url, method) || ![401, 403].includes(response.status)) return false;

    let reason = "";
    try {
      const payload = await response.clone().json();
      reason = String(payload?.reason || payload?.detail || "").trim().toUpperCase();
    } catch (_error) {}
    if (!OWNER_AUTH_ERRORS.has(reason)) return false;

    clearExpiredOwnerSession();
    window.FlowSignalStartup?.record?.("owner_session_reauthentication_required", {
      path: url?.pathname || "",
      status: response.status,
      reason,
    });
    window.setTimeout(() => {
      window.location.replace("/owner.html?reason=session-expired");
    }, 0);
    return true;
  }

  const startupOwnerToken = ownerTabToken();
  if (startupOwnerToken) {
    localStorage.setItem(OWNER_SESSION_KEY, startupOwnerToken);
  }

  function requestWithTimeout(input, init = {}) {
    const routedInput = canonicalBackendInput(input);
    const timeoutMs = Number(init.timeoutMs || DEFAULT_TIMEOUT_MS);
    const requestInit = applyOwnerAuthorization(routedInput, { ...init });
    delete requestInit.timeoutMs;
    delete requestInit.suppressErrorPanel;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return window.FlowSignalApi.nativeFetch(routedInput, requestInit);
    const controller = new AbortController();
    const upstreamSignal = requestInit.signal;
    const abortFromUpstream = () => controller.abort(upstreamSignal?.reason);
    if (upstreamSignal) {
      if (upstreamSignal.aborted) abortFromUpstream();
      else upstreamSignal.addEventListener("abort", abortFromUpstream, { once: true });
    }
    requestInit.signal = controller.signal;
    const timeout = window.setTimeout(() => controller.abort("NathauxFX request timeout"), timeoutMs);
    return window.FlowSignalApi.nativeFetch(routedInput, requestInit)
      .catch((error) => {
        if (controller.signal.aborted && !upstreamSignal?.aborted) {
          const timeoutError = new Error(`Request timed out after ${timeoutMs}ms`);
          timeoutError.name = "TimeoutError";
          throw timeoutError;
        }
        throw error;
      })
      .finally(() => {
        window.clearTimeout(timeout);
        upstreamSignal?.removeEventListener?.("abort", abortFromUpstream);
      });
  }

  function ensureErrorPanel() {
    let panel = document.getElementById("frontendErrorPanel");
    if (panel) return panel;
    panel = document.createElement("div");
    panel.id = "frontendErrorPanel";
    panel.className = "frontend-error-panel hidden";
    panel.innerHTML = `<strong>API Error</strong><span id="frontendErrorApi">Last API: --</span><span id="frontendErrorStatus">Status: --</span><span id="frontendErrorMessage">Message: --</span><button id="frontendErrorDismiss" type="button">Dismiss</button>`;
    document.body.appendChild(panel);
    panel.querySelector("#frontendErrorDismiss")?.addEventListener("click", () => window.FlowSignalApi.clearError());
    return panel;
  }

  function renderErrorPanel() {
    const panel = ensureErrorPanel();
    const api = panel.querySelector("#frontendErrorApi");
    const status = panel.querySelector("#frontendErrorStatus");
    const message = panel.querySelector("#frontendErrorMessage");
    if (api) api.textContent = `Last API: ${state.lastApiCalled || "--"}`;
    if (status) status.textContent = `Status: ${state.statusCode || "--"}`;
    if (message) message.textContent = `Message: ${state.errorMessage || "--"}`;
    panel.classList.toggle("hidden", !state.errorMessage);
  }

  async function apiFetch(input, init) {
    const routedInput = canonicalBackendInput(input);
    const url = typeof routedInput === "string" ? routedInput : routedInput?.url;
    const ownerAccessCodeResponse = adminAccessCodeSessionResponse(routedInput);
    if (ownerAccessCodeResponse) return ownerAccessCodeResponse;

    const suppressErrorPanel = Boolean(
      init?.suppressErrorPanel
      || String(url || "").includes("/news-impact")
      || String(url || "").includes("/ctrader-status")
      || String(url || "").includes("/ctrader/status")
      || String(url || "").includes("/chart/live-ticks")
      || String(url || "").includes("/chart/smc-structure")
      || String(url || "").includes("/modify-live-position-levels")
    );
    if (!suppressErrorPanel) state.lastApiCalled = url || "unknown";
    try {
      const response = await requestWithTimeout(routedInput, init);
      await redirectExpiredOwnerMutation(routedInput, init, response);
      if (suppressErrorPanel) return response;
      state.statusCode = response.status;
      if (!response.ok) {
        state.errorMessage = `HTTP ${response.status}`;
        renderErrorPanel();
      } else if (state.errorMessage) {
        state.errorMessage = null;
        renderErrorPanel();
      }
      return response;
    } catch (error) {
      if (suppressErrorPanel) throw error;
      state.statusCode = "network";
      state.errorMessage = error.message || "Network request failed";
      renderErrorPanel();
      throw error;
    }
  }

  window.FlowSignalApi = {
    nativeFetch: window.fetch.bind(window),
    fetch: apiFetch,
    fetchWithTimeout: requestWithTimeout,
    getState: () => ({ ...state }),
    clearError: () => { state.errorMessage = null; renderErrorPanel(); },
  };
  window.fetch = apiFetch;
})();

(function installNathauxFXBrandCompatibility() {
  'use strict';
  const replacements = [
    [/FLOW SIGNAL/g, 'NATHAUXFX'],
    [/FlowSignal/g, 'NathauxFX'],
    [/nathaux\.Fx/g, 'NathauxFX'],
    [/nathaux\.fx/g, 'NathauxFX'],
  ];

  function rebrandText(value) {
    let next = String(value ?? '');
    replacements.forEach(([pattern, replacement]) => {
      next = next.replace(pattern, replacement);
    });
    return next;
  }

  function rebrandElement(element) {
    if (!(element instanceof Element)) return;
    ['title', 'aria-label', 'alt', 'placeholder'].forEach((attribute) => {
      if (!element.hasAttribute(attribute)) return;
      const current = element.getAttribute(attribute);
      const next = rebrandText(current);
      if (next !== current) element.setAttribute(attribute, next);
    });
  }

  function rebrandTree(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      const parent = root.parentElement;
      if (parent?.matches('script,style,noscript,textarea')) return;
      const next = rebrandText(root.nodeValue);
      if (next !== root.nodeValue) root.nodeValue = next;
      return;
    }
    if (root instanceof Element) rebrandElement(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentElement;
        if (parent?.matches('script,style,noscript,textarea')) continue;
        const next = rebrandText(node.nodeValue);
        if (next !== node.nodeValue) node.nodeValue = next;
      } else {
        rebrandElement(node);
      }
    }
  }

  function applyBrand() {
    const nextTitle = rebrandText(document.title || '');
    document.title = nextTitle && nextTitle !== 'nathaux.Fx' ? nextTitle : 'NathauxFX';
    rebrandTree(document.body);
  }

  if (document.body) applyBrand();
  else document.addEventListener('DOMContentLoaded', applyBrand, { once: true });

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'characterData') rebrandTree(mutation.target);
      mutation.addedNodes?.forEach?.(rebrandTree);
    });
  });
  const startObserver = () => {
    if (document.body) observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.body) startObserver();
  else document.addEventListener('DOMContentLoaded', startObserver, { once: true });

  try {
    const synth = window.speechSynthesis;
    if (synth && typeof synth.speak === 'function' && !synth.speak.__nathauxFXBrandGuard) {
      const upstreamSpeak = synth.speak.bind(synth);
      const brandedSpeak = function (utterance) {
        try {
          if (utterance && typeof utterance.text === 'string') {
            utterance.text = rebrandText(utterance.text);
          }
        } catch (_error) {}
        return upstreamSpeak(utterance);
      };
      brandedSpeak.__nathauxFXBrandGuard = true;
      synth.speak = brandedSpeak;
    }
  } catch (_error) {}

  window.NathauxFXBrand = { rebrandText, applyBrand };
})();
