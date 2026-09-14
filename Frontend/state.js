(function () {
  const FEATURE_FLAGS_KEY = "flowsignal_feature_flags";
  const LANGUAGE_KEY = "flowsignal_lang";
  const DEFAULT_FLAGS = {
    brokerAccounts: true,
    liveTrading: true,
    flowAssistant: true,
    performance: true,
    settings: true,
    healthPage: true,
  };

  // Emergency dashboard safety lock.
  // The legacy FR/ES translator can stall the live dashboard in Safari.
  // Force the runtime back to English before script.js reads the persisted language,
  // and block dashboard language-change events from reaching the legacy handler.
  try {
    localStorage.setItem(LANGUAGE_KEY, "en");
    sessionStorage.removeItem("flowsignal_safe_language");
    document.documentElement.lang = "en";
  } catch (_error) {}

  // The legacy translator in script.js installs a body-wide MutationObserver even
  // while the dashboard is staying in English. That observer walks every node added
  // by live/V3B renders and can fight the other dashboard observers until Safari's
  // UI thread stops painting. Keep every other MutationObserver intact and suppress
  // only the translator observer whose callback explicitly calls both translation
  // helpers. The finite one-time English translation pass is still allowed.
  if (
    !window.__NATHAUX_TRANSLATION_OBSERVER_GUARD &&
    typeof window.MutationObserver === "function"
  ) {
    const NativeMutationObserver = window.MutationObserver;
    const functionToString = Function.prototype.toString;

    function GuardedMutationObserver(callback) {
      let effectiveCallback = callback;

      try {
        const source = functionToString.call(callback);
        if (
          source.includes("translateUiSubtree") &&
          source.includes("translateUiAttributes")
        ) {
          effectiveCallback = function () {};
          window.__NATHAUX_LEGACY_TRANSLATION_OBSERVER_BLOCKED = true;
        }
      } catch (_error) {}

      return new NativeMutationObserver(effectiveCallback);
    }

    GuardedMutationObserver.prototype = NativeMutationObserver.prototype;
    try { Object.setPrototypeOf(GuardedMutationObserver, NativeMutationObserver); } catch (_error) {}
    window.MutationObserver = GuardedMutationObserver;
    window.__NATHAUX_TRANSLATION_OBSERVER_GUARD = true;
  }

  function forceEnglishLanguageControls() {
    const appSelect = document.getElementById("langSelect");
    if (appSelect) {
      appSelect.value = "en";
      appSelect.title = "French/Spanish temporarily disabled while the dashboard translator is being repaired";
    }
    const landingSelect = document.getElementById("landingLang");
    if (landingSelect) {
      landingSelect.value = "EN";
      landingSelect.title = "French/Spanish temporarily disabled while the dashboard translator is being repaired";
    }
  }

  function blockUnsafeLanguageChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    if (target.id !== "langSelect" && target.id !== "landingLang") return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    try {
      localStorage.setItem(LANGUAGE_KEY, "en");
      sessionStorage.removeItem("flowsignal_safe_language");
      document.documentElement.lang = "en";
    } catch (_error) {}

    forceEnglishLanguageControls();
  }

  // Capture phase ensures the old script.js language listener never receives the event.
  document.addEventListener("change", blockUnsafeLanguageChange, true);

  if (document.readyState === "complete") {
    forceEnglishLanguageControls();
  } else {
    window.addEventListener("load", forceEnglishLanguageControls, { once: true });
  }

  function loadFeatureFlags() {
    try {
      return {
        ...DEFAULT_FLAGS,
        ...JSON.parse(localStorage.getItem(FEATURE_FLAGS_KEY) || "{}"),
      };
    } catch {
      return { ...DEFAULT_FLAGS };
    }
  }

  function saveFeatureFlags(flags) {
    localStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify({
      ...loadFeatureFlags(),
      ...(flags || {}),
    }));
  }

  function hideV2ShadowCard() {
    const card = document.getElementById("v2-shadow-card");
    if (!card) return;
    card.style.setProperty("display", "none", "important");
    card.setAttribute("aria-hidden", "true");
  }

  function removeV2ShadowCard() {
    if (typeof window.fetchV2Shadow === "function") {
      window.fetchV2Shadow = async function () { return null; };
    }
    document.getElementById("v2-shadow-card")?.remove();
  }

  function loadTabRoleSession() {
    if (window.FlowSignalTabRole || document.querySelector('script[data-flow-tab-role]')) return;
    const script = document.createElement("script");
    script.src = "tab-role-session.js?v=10";
    script.dataset.flowTabRole = "true";
    script.async = false;
    document.body.appendChild(script);
  }

  function loadDashboardLayout() {
    if (window.innerWidth < 701) return;
    if (document.querySelector('script[data-dashboard-layout-locked-v5]')) return;

    const script = document.createElement("script");
    script.src = "dashboard-layout-locked-v5.js?v=11";
    script.dataset.dashboardLayoutLockedV5 = "true";
    script.async = false;
    document.body.appendChild(script);
  }

  hideV2ShadowCard();
  window.addEventListener("load", removeV2ShadowCard, { once: true });
  window.addEventListener("load", loadTabRoleSession, { once: true });
  window.addEventListener("load", loadDashboardLayout, { once: true });

  window.FlowSignalState = {
    loadFeatureFlags,
    saveFeatureFlags,
    languageLockedToEnglish: true,
    translationObserverGuard: true,
  };
})();
