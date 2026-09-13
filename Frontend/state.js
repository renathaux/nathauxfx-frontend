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

  function loadDashboardLayout() {
    if (window.innerWidth < 701) return;
    if (document.querySelector('script[data-dashboard-layout-locked-v5]')) return;

    const script = document.createElement("script");
    script.src = "dashboard-layout-locked-v5.js?v=4";
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
  };
})();
