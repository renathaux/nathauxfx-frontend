(function () {
  const FEATURE_FLAGS_KEY = "flowsignal_feature_flags";
  const DEFAULT_FLAGS = {
    brokerAccounts: true,
    liveTrading: true,
    flowAssistant: true,
    performance: true,
    settings: true,
    healthPage: true,
  };

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
    // script.js is parsed after state.js and owns the V2 shadow polling function.
    // Disable future shadow refreshes before removing the card so later symbol
    // changes and the 60-second poll cannot try to render into deleted elements.
    if (typeof window.fetchV2Shadow === "function") {
      window.fetchV2Shadow = async function () {
        return null;
      };
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

  function loadDashboardLayoutEditorExtra() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("layoutEdit") !== "1" || window.innerWidth < 701) return;
    if (document.querySelector('script[data-dashboard-layout-extra]')) return;
    const script = document.createElement("script");
    script.src = "dashboard-layout-editor-extra.js?v=1";
    script.dataset.dashboardLayoutExtra = "true";
    script.async = false;
    document.body.appendChild(script);
  }

  // The V2 shadow comparison card is no longer part of the dashboard UI.
  // Hide it immediately to prevent a flash, then remove it once all scripts load.
  hideV2ShadowCard();
  window.addEventListener("load", removeV2ShadowCard, { once: true });

  // script.js owns the legacy login handlers and is parsed after this file.
  // Load the per-tab role adapter only after the page has finished loading so
  // it can replace the global role guard without racing initial definitions.
  window.addEventListener("load", loadTabRoleSession, { once: true });
  window.addEventListener("load", loadDashboardLayoutEditorExtra, { once: true });

  window.FlowSignalState = {
    loadFeatureFlags,
    saveFeatureFlags,
  };
})();
