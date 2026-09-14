(function () {
  const FEATURE_FLAGS_KEY = "flowsignal_feature_flags";
  const LANGUAGE_KEY = "flowsignal_lang";
  const SAFE_LANGUAGE_KEY = "flowsignal_safe_language";
  const SAFE_LANGUAGES = new Set(["en", "fr", "es"]);
  const DEFAULT_FLAGS = {
    brokerAccounts: true,
    liveTrading: true,
    flowAssistant: true,
    performance: true,
    settings: true,
    healthPage: true,
  };

  function normalizeLanguage(value) {
    const lang = String(value || "en").toLowerCase();
    return SAFE_LANGUAGES.has(lang) ? lang : "en";
  }

  // Safari safety guard.
  // The legacy language handler in script.js walks/re-writes the entire live dashboard.
  // On a running dashboard that can collide with the V3B/live-render observers and stall
  // Safari's render loop. Boot script.js in EN, preserve the user's requested language,
  // and handle language-select changes through the lightweight path below instead.
  const requestedLanguage = normalizeLanguage(localStorage.getItem(LANGUAGE_KEY));
  sessionStorage.setItem(SAFE_LANGUAGE_KEY, requestedLanguage);
  if (requestedLanguage !== "en") {
    localStorage.setItem(LANGUAGE_KEY, "en");
  }

  function languageCopy(lang) {
    if (lang === "fr") {
      return {
        dashboard: "Tableau de bord",
        assistant: "Assistant Flow",
        liveTrading: "Trading réel",
        feedback: "Avis",
        history: "Historique",
        performance: "Performance",
        settings: "Paramètres",
        general: "Général",
        risk: "Gestion du risque",
        broker: "Comptes de courtier",
        notifications: "Notifications",
        strategy: "Stratégie",
        logout: "Déconnexion",
        daily: "P/L QUOTIDIEN",
        weekly: "P/L HEBDOMADAIRE",
        monthly: "P/L MENSUEL",
        floating: "P/L RÉEL (FLOTTANT)",
        openTrades: "TRADES OUVERTS",
        bullish: "Biais haussier",
        bearish: "Biais baissier",
        strength: "Force du biais",
        biasNote: "Biais de marché seulement — l’entrée exige les contrôles de stratégie.",
        buy: "Acheter",
        sell: "Vendre",
        historyTitle: "Historique récent des signaux",
        time: "Heure de Toronto",
        symbol: "Symbole",
        signal: "Signal",
        result: "Résultat",
        pips: "Pips",
      };
    }
    if (lang === "es") {
      return {
        dashboard: "Panel",
        assistant: "Asistente Flow",
        liveTrading: "Trading real",
        feedback: "Comentario",
        history: "Historial",
        performance: "Rendimiento",
        settings: "Configuración",
        general: "General",
        risk: "Gestión de riesgo",
        broker: "Cuentas del bróker",
        notifications: "Notificaciones",
        strategy: "Estrategia",
        logout: "Cerrar sesión",
        daily: "P/G DIARIO",
        weekly: "P/G SEMANAL",
        monthly: "P/G MENSUAL",
        floating: "P/G REAL (FLOTANTE)",
        openTrades: "OPERACIONES ABIERTAS",
        bullish: "Sesgo alcista",
        bearish: "Sesgo bajista",
        strength: "Fuerza del sesgo",
        biasNote: "Solo sesgo de mercado: la entrada requiere controles de estrategia.",
        buy: "Comprar",
        sell: "Vender",
        historyTitle: "Historial reciente de señales",
        time: "Hora de Toronto",
        symbol: "Símbolo",
        signal: "Señal",
        result: "Resultado",
        pips: "Pips",
      };
    }
    return {
      dashboard: "Dashboard",
      assistant: "Flow Assistant",
      liveTrading: "Live Trading",
      feedback: "Feedback",
      history: "History",
      performance: "Performance",
      settings: "Settings",
      general: "General",
      risk: "Risk Management",
      broker: "Broker Accounts",
      notifications: "Notifications",
      strategy: "Strategy",
      logout: "Logout",
      daily: "DAILY P/L",
      weekly: "WEEKLY P/L",
      monthly: "MONTHLY P/L",
      floating: "LIVE P/L (FLOATING)",
      openTrades: "OPEN TRADES",
      bullish: "Bullish Bias",
      bearish: "Bearish Bias",
      strength: "Bias Strength",
      biasNote: "Market bias only - entry requires strategy checks.",
      buy: "Buy",
      sell: "Sell",
      historyTitle: "Recent Signal History",
      time: "Toronto Time",
      symbol: "Symbol",
      signal: "Signal",
      result: "Result",
      pips: "Pips",
    };
  }

  function setText(selector, text) {
    const el = document.querySelector(selector);
    if (el && el.textContent !== text) el.textContent = text;
  }

  function pinLegacyLanguageEngineToEnglish() {
    try {
      // Keep the old whole-page translator on its proven-stable EN path. The user-facing
      // preference is rendered separately below without walking the complete live DOM.
      currentLang = "en";
    } catch (_error) {}
  }

  function applySafeLanguage(value) {
    const lang = normalizeLanguage(value);
    const copy = languageCopy(lang);

    sessionStorage.setItem(SAFE_LANGUAGE_KEY, lang);
    localStorage.setItem(LANGUAGE_KEY, lang);
    document.documentElement.lang = lang;
    window.__NATHAUX_SAFE_LANGUAGE = lang;
    pinLegacyLanguageEngineToEnglish();

    const appSelect = document.getElementById("langSelect");
    if (appSelect && appSelect.value !== lang) appSelect.value = lang;
    const landingSelect = document.getElementById("landingLang");
    if (landingSelect && landingSelect.value !== lang.toUpperCase()) {
      landingSelect.value = lang.toUpperCase();
    }

    const menuLabels = [
      ["#menuDashboardBtn .menu-row-text", copy.dashboard],
      ["#menuAssistantBtn .menu-row-text", copy.assistant],
      ["#menuPaperBtn .menu-row-text", copy.liveTrading],
      ["#menuFeedbackBtn .menu-row-text", copy.feedback],
      ["#menuHistoryBtn .menu-row-text", copy.history],
      ["#menuStatsBtn .menu-row-text", copy.performance],
      ["#menuSettingsBtn .menu-row-text", copy.settings],
      ["#menuGeneralSettingsBtn", copy.general],
      ["#menuRiskSettingsBtn", copy.risk],
      ["#menuBrokerAccountsBtn", copy.broker],
      ["#menuNotificationsSettingsBtn", copy.notifications],
      ["#menuStrategySettingsBtn", copy.strategy],
      ["#logoutBtn .menu-row-text", copy.logout],
    ];
    menuLabels.forEach(([selector, text]) => setText(selector, text));

    const performanceLabels = document.querySelectorAll(".performance-copy > span");
    [copy.daily, copy.weekly, copy.monthly, copy.floating, copy.openTrades].forEach((text, index) => {
      const el = performanceLabels[index];
      if (el && el.textContent !== text) el.textContent = text;
    });

    const metrics = document.querySelectorAll(".main-metrics span");
    [copy.bullish, copy.bearish, copy.strength].forEach((text, index) => {
      const el = metrics[index];
      if (el && el.textContent !== text) el.textContent = text;
    });
    setText(".bias-only-note", copy.biasNote);
    document.querySelectorAll(".buy-button").forEach((el) => { el.textContent = copy.buy; });
    document.querySelectorAll(".sell-button").forEach((el) => { el.textContent = copy.sell; });

    setText(".history-header h2", copy.historyTitle);
    const headers = document.querySelectorAll(".history-table thead th");
    [copy.time, copy.symbol, copy.signal, copy.strength, copy.result, copy.pips].forEach((text, index) => {
      const el = headers[index];
      if (el && el.textContent !== text) el.textContent = text;
    });

    // Ask the V3B presentation layer to repaint its own state after static labels change.
    // This avoids translating state-bearing DOM nodes with a whole-page MutationObserver.
    try { window.__NATHAUX_APPLY_V3B?.(); } catch (_error) {}
  }

  function interceptLanguageChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    if (target.id !== "langSelect" && target.id !== "landingLang") return;

    // Capture phase runs before script.js's legacy change handler.
    // Stop only this select's legacy handler; all other change events are untouched.
    event.stopImmediatePropagation();
    event.stopPropagation();
    applySafeLanguage(target.value);
  }

  document.addEventListener("change", interceptLanguageChange, true);

  function restoreRequestedLanguage() {
    const desired = normalizeLanguage(
      sessionStorage.getItem(SAFE_LANGUAGE_KEY) || requestedLanguage
    );
    applySafeLanguage(desired);
  }

  if (document.readyState === "complete") {
    queueMicrotask(restoreRequestedLanguage);
  } else {
    window.addEventListener("load", restoreRequestedLanguage, { once: true });
  }

  // Live data refreshes can replace a few labels. Re-apply only this small selector set;
  // never run the legacy full-body translation observer.
  setInterval(() => {
    const desired = normalizeLanguage(
      sessionStorage.getItem(SAFE_LANGUAGE_KEY) || requestedLanguage
    );
    if (desired !== "en") applySafeLanguage(desired);
  }, 1000);

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
    applySafeLanguage,
    languageGuard: true,
  };
})();
