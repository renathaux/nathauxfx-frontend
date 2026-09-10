(function () {
  const earlyParams = new URLSearchParams(window.location.search);
  const isPublicRoot = /^\/$/.test(window.location.pathname);
  const isAppRoute = /^\/app(?:\.html)?\/?$/i.test(window.location.pathname);
  const TAB_WINDOW_PREFIX = 'flowsignal-tab:';
  const USER_SESSION_KEY = 'flowsignal_user_session_token';
  const PERSISTED_USER_SESSION_KEY = 'flowsignal_user_session_persist';
  const CSRF_KEY = 'flowsignal_csrf_token';
  const TAB_ROLE_KEY = 'flowsignal_tab_role';

  // This must run before the /app route gate below. user-auth.js is loaded later
  // by tab-role-session.js, so relying on its recovery routine creates a boot
  // race: the route gate redirects before that script can restore this tab.
  function recoverThisTabBeforeRouteGate() {
    if (sessionStorage.getItem(USER_SESSION_KEY)) return;

    const current = String(window.name || '');
    const tabId = current.startsWith(TAB_WINDOW_PREFIX)
      ? current.slice(TAB_WINDOW_PREFIX.length)
      : '';

    if (tabId) {
      try {
        const customer = JSON.parse(localStorage.getItem(`flowsignal_tab_user_session:${tabId}`) || 'null');
        if (customer?.token) {
          sessionStorage.setItem(USER_SESSION_KEY, String(customer.token));
          if (customer.csrf) sessionStorage.setItem(CSRF_KEY, String(customer.csrf));
          sessionStorage.setItem(TAB_ROLE_KEY, 'user');
          sessionStorage.removeItem('flowsignal_public_home_mode');
          sessionStorage.removeItem('flowsignal_tab_signed_out');
          return;
        }
      } catch (_error) {}

      try {
        const owner = JSON.parse(localStorage.getItem(`flowsignal_tab_admin_session:${tabId}`) || 'null');
        if (owner?.token) {
          sessionStorage.setItem(TAB_ROLE_KEY, 'admin');
          localStorage.setItem('flowsignal_session_token', String(owner.token));
          sessionStorage.removeItem('flowsignal_public_home_mode');
          sessionStorage.removeItem('flowsignal_tab_signed_out');
          return;
        }
      } catch (_error) {}
    }

    try {
      const saved = JSON.parse(localStorage.getItem(PERSISTED_USER_SESSION_KEY) || 'null');
      if (!saved?.token) return;
      sessionStorage.setItem(USER_SESSION_KEY, String(saved.token));
      if (saved.csrf) sessionStorage.setItem(CSRF_KEY, String(saved.csrf));
      sessionStorage.setItem(TAB_ROLE_KEY, 'user');
      sessionStorage.removeItem('flowsignal_public_home_mode');
      sessionStorage.removeItem('flowsignal_tab_signed_out');

      if (!tabId) {
        const newTabId = (crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
        window.name = `${TAB_WINDOW_PREFIX}${newTabId}`;
        localStorage.setItem(`flowsignal_tab_user_session:${newTabId}`, JSON.stringify({
          token: String(saved.token),
          csrf: String(saved.csrf || '')
        }));
      }
    } catch (_error) {}
  }

  recoverThisTabBeforeRouteGate();
  const customerSessionToken = String(sessionStorage.getItem('flowsignal_user_session_token') || '').trim();
  const ownerRequested = earlyParams.get('owner') === '1';
  const legacyRole = String(sessionStorage.getItem('flowsignal_tab_role') || localStorage.getItem('flowsignal_role') || '').toLowerCase();

  // Browser-only background suspension. Render/cTrader keep running on the
  // server; this only stops hidden dashboard tabs from polling and speaking.
  if (isAppRoute && !window.__FLOWSIGNAL_BACKGROUND_PAUSE_INSTALLED) {
    const nativeSetInterval = window.setInterval.bind(window);
    const runtimeSuspended = () => Boolean(
      document.hidden || window.__FLOWSIGNAL_FRONTEND_SUSPENDED
    );

    window.__FLOWSIGNAL_FRONTEND_SUSPENDED = Boolean(document.hidden);
    window.__FLOWSIGNAL_BACKGROUND_PAUSE_INSTALLED = true;

    window.setInterval = function (callback, delay, ...args) {
      if (typeof callback !== 'function') {
        return nativeSetInterval(callback, delay, ...args);
      }
      return nativeSetInterval(function () {
        if (runtimeSuspended()) return;
        return callback.apply(this, args);
      }, delay);
    };

    try {
      const synth = window.speechSynthesis;
      if (
        synth &&
        typeof synth.speak === 'function' &&
        !synth.speak.__flowSignalVisibilityGuard
      ) {
        const nativeSpeak = synth.speak.bind(synth);
        const guardedSpeak = function (utterance) {
          if (runtimeSuspended()) return;
          return nativeSpeak(utterance);
        };
        guardedSpeak.__flowSignalVisibilityGuard = true;
        synth.speak = guardedSpeak;
      }
    } catch (_error) {}

    const updateFrontendVisibility = () => {
      const hidden = Boolean(document.hidden);
      window.__FLOWSIGNAL_FRONTEND_SUSPENDED = hidden;
      document.body?.classList.toggle('flowsignal-background-paused', hidden);
      if (hidden) {
        try { window.speechSynthesis?.cancel?.(); } catch (_error) {}
      }
      document.dispatchEvent(new CustomEvent(
        hidden ? 'flowsignal:frontend-paused' : 'flowsignal:frontend-resumed',
        { detail: { hidden, serverTradingContinues: true } }
      ));
    };

    document.addEventListener('visibilitychange', updateFrontendVisibility, true);
    window.addEventListener('pagehide', () => {
      window.__FLOWSIGNAL_FRONTEND_SUSPENDED = true;
      try { window.speechSynthesis?.cancel?.(); } catch (_error) {}
    }, true);
    window.addEventListener('pageshow', updateFrontendVisibility, true);
    updateFrontendVisibility();
  }

  // HARD PUBLIC HOME LOCK.
  // Production has a dedicated home.html route, but if Vercel/custom-domain routing
  // serves the legacy combined index at `/`, do not let any dashboard runtime boot.
  // startup.js is intentionally the last script allowed to execute on the public root.
  if (isPublicRoot) {
    try {
      window.speechSynthesis?.cancel?.();
      if (window.speechSynthesis) {
        try { window.speechSynthesis.speak = function () {}; } catch (_error) {}
      }
    } catch (_error) {}

    document.body?.classList.add('flowsignal-public-hard-lock');
    if (!document.getElementById('flowsignalPublicHardLockStyle')) {
      const style = document.createElement('style');
      style.id = 'flowsignalPublicHardLockStyle';
      style.textContent = `
        body.flowsignal-public-hard-lock #mainApp,
        body.flowsignal-public-hard-lock #smartExplain,
        body.flowsignal-public-hard-lock #assistantModal,
        body.flowsignal-public-hard-lock #tradeModal,
        body.flowsignal-public-hard-lock #adminModal,
        body.flowsignal-public-hard-lock #feedbackModal,
        body.flowsignal-public-hard-lock #feedbackToast,
        body.flowsignal-public-hard-lock #statsModal,
        body.flowsignal-public-hard-lock #settingsModal,
        body.flowsignal-public-hard-lock #newsModeConfirmModal,
        body.flowsignal-public-hard-lock #brokerAccountsModal,
        body.flowsignal-public-hard-lock #paperModal,
        body.flowsignal-public-hard-lock #tradeLevelConfirmModal,
        body.flowsignal-public-hard-lock #flowsignalTradingModeSelector,
        body.flowsignal-public-hard-lock .trade-modal,
        body.flowsignal-public-hard-lock .smart-explain,
        body.flowsignal-public-hard-lock .feedback-toast {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(style);
    }

    const wirePublicButtons = () => {
      const login = document.getElementById('openAdminLoginBtn') || document.getElementById('loginBtn');
      const signup = document.getElementById('openAccessBtn') || document.getElementById('signupBtn');
      const hero = document.getElementById('openAccessBtnHero') || document.getElementById('heroSignupBtn');
      if (login) {
        login.removeAttribute('onclick');
        login.textContent = 'Login';
        login.onclick = (event) => { event?.preventDefault?.(); window.location.href = '/account.html?mode=login'; };
      }
      if (signup) {
        signup.removeAttribute('onclick');
        signup.removeAttribute('data-open-access');
        signup.textContent = 'Get Started';
        signup.onclick = (event) => { event?.preventDefault?.(); window.location.href = '/account.html?mode=signup'; };
      }
      if (hero) {
        hero.removeAttribute('onclick');
        hero.removeAttribute('data-open-access');
        hero.textContent = 'Start Trading Now →';
        hero.onclick = (event) => { event?.preventDefault?.(); window.location.href = '/account.html?mode=signup'; };
      }

    };

    wirePublicButtons();
    try { window.stop(); } catch (_error) {}
    window.__FLOWSIGNAL_PUBLIC_HARD_LOCK = true;
    return;
  }

  // /app is never a public landing page. If this tab has no customer session and
  // is not intentionally entering Owner/Admin mode, leave before dashboard code boots.
  if (isAppRoute && !customerSessionToken && !ownerRequested && legacyRole !== 'admin') {
    window.location.replace('/');
    return;
  }

  if (ownerRequested) {
    sessionStorage.removeItem('flowsignal_user_session_token');
    sessionStorage.removeItem('flowsignal_binary_user_id');
    sessionStorage.removeItem('flowsignal_tab_signed_out');
    sessionStorage.removeItem('flowsignal_public_home_mode');
  }

  document.addEventListener('click', async (event) => {
    const target = event.target?.closest?.('#logoutBtn,#binaryLogoutBtn');
    if (!target) return;
    const token = String(sessionStorage.getItem('flowsignal_user_session_token') || '').trim();
    if (!token) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    try {
      await window.FlowSignalAuth?.logout?.();
    } catch (_error) {
      sessionStorage.removeItem('flowsignal_user_session_token');
      sessionStorage.removeItem('flowsignal_binary_user_id');
      sessionStorage.removeItem('flowsignal_csrf_token');
      sessionStorage.removeItem('flowsignal_tab_role');
    }
    try { window.speechSynthesis?.cancel?.(); } catch (_error) {}
    window.location.replace('/');
  }, true);

  try {
    const publicHome = earlyParams.get('home') === '1' || sessionStorage.getItem('flowsignal_public_home_mode') === '1';
    if (publicHome) {
      document.body?.classList.add('flowsignal-public-home');
      if (!document.getElementById('flowsignalEarlyPublicHomeStyle')) {
        const style = document.createElement('style');
        style.id = 'flowsignalEarlyPublicHomeStyle';
        style.textContent = `
          body.flowsignal-public-home #mainApp,
          body.flowsignal-public-home #smartExplain,
          body.flowsignal-public-home #assistantModal,
          body.flowsignal-public-home #tradeModal,
          body.flowsignal-public-home #adminModal,
          body.flowsignal-public-home #feedbackModal,
          body.flowsignal-public-home #feedbackToast,
          body.flowsignal-public-home #statsModal,
          body.flowsignal-public-home #settingsModal,
          body.flowsignal-public-home #newsModeConfirmModal,
          body.flowsignal-public-home #brokerAccountsModal,
          body.flowsignal-public-home #paperModal,
          body.flowsignal-public-home #tradeLevelConfirmModal,
          body.flowsignal-public-home #flowsignalTradingModeSelector,
          body.flowsignal-public-home .trade-modal,
          body.flowsignal-public-home .smart-explain,
          body.flowsignal-public-home .feedback-toast {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
        `;
        document.head.appendChild(style);
      }
      try { window.speechSynthesis?.cancel?.(); } catch (_error) {}
      window.__FLOWSIGNAL_PUBLIC_HOME_BOOT = true;
    }
  } catch (_error) {}

  if (!window.__flowSignalDashboardFetchPatched) {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      try {
        const method = String(init?.method || (input instanceof Request ? input.method : 'GET') || 'GET').toUpperCase();
        const raw = typeof input === 'string' || input instanceof URL
          ? String(input)
          : input instanceof Request
            ? input.url
            : '';
        if (method === 'GET' && raw) {
          const url = new URL(raw, window.location.href);
          if (url.pathname === '/panel-data') {
            url.pathname = '/dashboard-feed';
            if (input instanceof Request) {
              input = new Request(url.toString(), input);
            } else {
              input = url.toString();
            }
          }
        }
      } catch (_error) {}
      return nativeFetch(input, init);
    };
    window.__flowSignalDashboardFetchPatched = true;
  }

  if (document.readyState === "loading") {
    if (window.matchMedia("(min-width: 701px)").matches) {
      document.write('<link rel="stylesheet" href="desktop.css?v=3" media="(min-width: 701px)">');
    }
    if (!window.FlowSignalLiveCandles) {
      document.write('<script src="chart/live-candles/live-candle-controller.js?v=4"><\/script>');
    }
    document.write('<link rel="stylesheet" href="indicators/smc/smc.css?v=4">');
    document.write('<script src="indicators/smc/smc-settings.js?v=8"><\/script>');
    document.write('<script src="indicators/smc/smc-renderer.js?v=14"><\/script>');
    document.write('<script src="indicators/smc/smc-indicator.js?v=5"><\/script>');
    document.write('<script src="indicators/smc/smc-chart-bridge.js?v=6"><\/script>');
    document.write('<script src="indicators/smc/smc-local-engine.js?v=6"><\/script>');
    document.write('<script src="indicators/smc/smc-local-visual.js?v=8"><\/script>');
    document.write('<script src="signal-display-state.js?v=4"><\/script>');
  }

  function loadTabRoleSession() {
    if (window.FlowSignalTabRole || document.querySelector('script[data-flow-tab-role-session]')) return;
    const script = document.createElement("script");
    script.src = "tab-role-session.js?v=13";
    script.dataset.flowTabRoleSession = "true";
    script.async = false;
    document.body.appendChild(script);
  }

  function shouldUseSeparatedMobileDashboard() {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("desktop") === "1") return false;
      if (!window.matchMedia("(max-width: 700px)").matches) return false;
      if (/\/mobile\.html$/i.test(window.location.pathname)) return false;
      const access = JSON.parse(localStorage.getItem("flowsignal_access") || "null");
      const role = String(sessionStorage.getItem('flowsignal_tab_role') || localStorage.getItem("flowsignal_role") || "").toLowerCase();
      const userToken = String(sessionStorage.getItem('flowsignal_user_session_token') || '').trim();
      return Boolean(userToken) || access?.granted === true || role === "admin";
    } catch (_error) { return false; }
  }

  if (shouldUseSeparatedMobileDashboard()) {
    const target = new URL("mobile.html", window.location.href);
    target.searchParams.set("from", "dashboard");
    window.location.replace(target.toString());
    return;
  }

  const startedAt = new Date().toISOString();
  const events = [];
  let menuOpen = false;

  function safeDetail(detail) {
    if (!detail || typeof detail !== "object") return detail || null;
    const cleaned = {};
    Object.entries(detail).forEach(([key, value]) => {
      if (/token|secret|password|authorization/i.test(key)) return;
      cleaned[key] = value instanceof Error ? value.message : value;
    });
    return cleaned;
  }

  function record(event, detail) {
    const entry = { event, timestamp: new Date().toISOString(), detail: safeDetail(detail) };
    events.push(entry);
    if (events.length > 100) events.shift();
    console.info("FLOWSIGNAL_STARTUP", entry);
    return entry;
  }

  function setMenuOpen(open) {
    const sideMenu = document.getElementById("sideMenu");
    const mainApp = document.getElementById("mainApp");
    if (!sideMenu) return false;
    menuOpen = Boolean(open);
    sideMenu.classList.toggle("hidden", !menuOpen);
    sideMenu.classList.toggle("is-open", menuOpen);
    sideMenu.setAttribute("aria-hidden", menuOpen ? "false" : "true");
    mainApp?.classList.toggle("menu-drawer-open", menuOpen);
    document.body?.classList.toggle("menu-drawer-open", menuOpen);
    document.dispatchEvent(new CustomEvent("flowsignal:menu-state", { detail: { open: menuOpen } }));
    return true;
  }

  function attachMenu() {
    const button = document.getElementById("menuToggleBtn");
    const sideMenu = document.getElementById("sideMenu");
    if (!button || !sideMenu) {
      record("menu_listener_missing", { button: Boolean(button), sideMenu: Boolean(sideMenu) });
      return false;
    }
    if (button.dataset.flowSignalShellBound === "true") return true;
    button.dataset.flowSignalShellBound = "true";
    button.disabled = false;
    button.setAttribute("aria-controls", "sideMenu");
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setMenuOpen(!menuOpen);
    });
    record("menu_listener_attached");
    return true;
  }

  function openRequestedDesktopPanel() {
    let requested = "";
    let mobilePanelRoute = false;
    try {
      const params = new URLSearchParams(window.location.search);
      requested = params.get("open") || "";
      mobilePanelRoute =
        window.matchMedia("(max-width: 700px)").matches &&
        params.get("desktop") === "1" &&
        params.get("from") === "mobile";
    } catch (_error) { return; }
    if (!requested) return;
    const allowed = new Set(["menuDashboardBtn","menuAssistantBtn","menuPaperBtn","menuFeedbackBtn","menuHistoryBtn","menuStatsBtn","menuGeneralSettingsBtn","menuRiskSettingsBtn","menuBrokerAccountsBtn","menuNotificationsSettingsBtn","menuStrategySettingsBtn"]);
    if (!allowed.has(requested)) return;
    let attempts = 0;
    const tryOpen = () => {
      attempts += 1;
      const target = document.getElementById(requested);
      if (target && typeof target.click === "function") {
        const mobilePanelModalMap = {
          menuAssistantBtn: "assistantModal",
          menuPaperBtn: "paperModal",
          menuFeedbackBtn: "feedbackModal",
          menuStatsBtn: "statsModal",
          menuGeneralSettingsBtn: "settingsModal",
          menuRiskSettingsBtn: "settingsModal",
          menuBrokerAccountsBtn: "brokerAccountsModal",
          menuNotificationsSettingsBtn: "settingsModal",
          menuStrategySettingsBtn: "settingsModal",
        };
        const modal = mobilePanelRoute
          ? document.getElementById(mobilePanelModalMap[requested] || "")
          : null;
        let modalWasOpen = Boolean(modal && !modal.classList.contains("hidden"));
        let modalObserver = null;

        if (mobilePanelRoute && modal) {
          modalObserver = new MutationObserver(() => {
            const visible = !modal.classList.contains("hidden") && modal.style.display !== "none";
            if (visible) modalWasOpen = true;
            if (modalWasOpen && !visible) {
              modalObserver?.disconnect();
              window.location.replace("/mobile.html?from=panel");
            }
          });
          modalObserver.observe(modal, { attributes: true, attributeFilter: ["class", "style"] });
        }

        target.click();
        if (mobilePanelRoute && modal && !modal.classList.contains("hidden")) modalWasOpen = true;
        record("requested_desktop_panel_opened", { requested, mobilePanelRoute });
        try {
          const url = new URL(window.location.href);
          if (!mobilePanelRoute) url.searchParams.delete("open");
          history.replaceState(null, "", url.toString());
        } catch (_error) {}
        return;
      }
      if (attempts < 30) {
        window.setTimeout(tryOpen, 100);
      } else if (mobilePanelRoute) {
        window.location.replace("/mobile.html?from=panel-error");
      }
    };
    window.setTimeout(tryOpen, 150);
  }

  function setTransportStatus(state, message) {
    const status = document.getElementById("status");
    if (!status) return;
    status.dataset.transportState = state;
    status.title = message;
    status.textContent = message;
  }

  function attachDesktopChartFullscreen() {
    if (!window.matchMedia("(min-width: 701px)").matches) return false;
    const chartSection = document.querySelector(".chart-panel .chart-section");
    const controls = chartSection?.querySelector(".chart-controls");
    if (!chartSection || !controls) {
      record("desktop_chart_fullscreen_missing", { chartSection: Boolean(chartSection), controls: Boolean(controls) });
      return false;
    }
    if (document.getElementById("desktopChartFullscreenBtn")) return true;

    const button = document.createElement("button");
    button.id = "desktopChartFullscreenBtn";
    button.className = "desktop-chart-fullscreen-btn";
    button.type = "button";
    button.setAttribute("aria-label", "Open chart in full screen");
    button.setAttribute("aria-pressed", "false");
    button.innerHTML = '<span aria-hidden="true">⛶</span><span class="desktop-chart-fullscreen-label">Full Screen</span>';
    controls.appendChild(button);

    let fallbackActive = false;
    const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
    const isNativeFullscreen = () => fullscreenElement() === chartSection;
    const isActive = () => isNativeFullscreen() || fallbackActive;
    const notifyChartResize = () => window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
      window.setTimeout(() => window.dispatchEvent(new Event("resize")), 120);
    });
    const renderState = () => {
      const active = isActive();
      chartSection.classList.toggle("is-desktop-chart-fullscreen", active);
      document.body.classList.toggle("desktop-chart-fullscreen-open", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
      button.setAttribute("aria-label", active ? "Exit chart full screen" : "Open chart in full screen");
      button.innerHTML = active
        ? '<span aria-hidden="true">✕</span><span class="desktop-chart-fullscreen-label">Exit Full Screen</span>'
        : '<span aria-hidden="true">⛶</span><span class="desktop-chart-fullscreen-label">Full Screen</span>';
      window.FlowSignalSmcSettings?.syncHost?.();
      notifyChartResize();
    };
    const leaveFallback = () => {
      if (!fallbackActive) return;
      fallbackActive = false;
      renderState();
    };

    button.addEventListener("click", async () => {
      if (isActive()) {
        if (isNativeFullscreen()) {
          try {
            if (document.exitFullscreen) await document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
          } catch (error) {
            record("desktop_chart_fullscreen_exit_error", { message: error?.message });
          }
        } else {
          leaveFallback();
        }
        return;
      }
      try {
        if (chartSection.requestFullscreen) await chartSection.requestFullscreen({ navigationUI: "hide" });
        else if (chartSection.webkitRequestFullscreen) chartSection.webkitRequestFullscreen();
        else {
          fallbackActive = true;
          renderState();
        }
      } catch (error) {
        record("desktop_chart_fullscreen_request_error", { message: error?.message });
        fallbackActive = true;
        renderState();
      }
    });

    document.addEventListener("fullscreenchange", renderState);
    document.addEventListener("webkitfullscreenchange", renderState);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && fallbackActive) leaveFallback();
    });
    record("desktop_chart_fullscreen_attached");
    return true;
  }

  window.addEventListener("error", (event) => record("uncaught_initialization_error", {
    message: event.message || "Unknown JavaScript error",
    source: event.filename || null,
    line: event.lineno || null,
  }));
  window.addEventListener("unhandledrejection", (event) => record("unhandled_initialization_rejection", {
    message: event.reason?.message || String(event.reason || "Unknown rejection"),
  }));
  window.addEventListener("load", openRequestedDesktopPanel, { once: true });
  window.addEventListener("load", attachDesktopChartFullscreen, { once: true });

  if (ownerRequested) {
    window.addEventListener('load', () => {
      let attempts = 0;
      const openOwner = () => {
        attempts += 1;
        if (typeof window.openFlowSignalAdminLogin === 'function') {
          window.openFlowSignalAdminLogin();
          return;
        }
        if (attempts < 30) window.setTimeout(openOwner, 100);
      };
      openOwner();
    }, { once: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadTabRoleSession, { once: true });
  } else {
    loadTabRoleSession();
  }

  window.FlowSignalStartup = {
    startedAt,
    record,
    events: () => events.slice(),
    attachMenu,
    setMenuOpen,
    isMenuOpen: () => menuOpen,
    setTransportStatus,
    attachDesktopChartFullscreen,
  };

  record("application_initialization_started");
  record("dashboard_transport_ready", { transport: "isolated_cache_feed", path: "/dashboard-feed" });
  record("live_chart_tick_transport_ready", { transport: "ctrader_tick_snapshot", pollMs: 250 });
  record("smc_overlay_module_ready", { observationOnly: true, affectsStrategy: false, singleInstance: true });
  attachMenu();
})();

