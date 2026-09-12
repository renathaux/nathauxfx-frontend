(function () {
  const BASE_URL =
    window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
      ? "http://127.0.0.1:8001"
      : "https://flowsignal-backend-3.onrender.com";

  let activeStrategySnapshot = null;
  let strategySyncRequest = 0;
  let riskSyncRequest = 0;

  window.FlowSignalSettings = {
    loadDashboardPreferences() {
      try {
        return JSON.parse(localStorage.getItem("flowsignal_dashboard_preferences") || "{}");
      } catch {
        return {};
      }
    },
    loadRiskPreferences() {
      try {
        return JSON.parse(localStorage.getItem("flowsignal_risk_preferences") || "{}");
      } catch {
        return {};
      }
    },
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function settingsFetch(url, options) {
    if (typeof window.authenticatedSettingsFetch === "function") {
      return window.authenticatedSettingsFetch(url, options);
    }
    return fetch(url, {
      credentials: "include",
      cache: "no-store",
      ...(options || {}),
    });
  }

  function installActiveStrategyStyles() {
    if (document.getElementById("activeV3bSettingsStyles")) return;
    const style = document.createElement("style");
    style.id = "activeV3bSettingsStyles";
    style.textContent = `
      .active-v3b-settings{display:grid;gap:14px}
      .active-v3b-banner{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:13px 15px;border:1px solid rgba(59,130,246,.35);border-radius:14px;background:rgba(20,45,80,.28)}
      .active-v3b-banner strong{display:block;color:#fff;font-size:16px}.active-v3b-banner small{display:block;margin-top:4px;color:#94a3b8}
      .active-v3b-badge{flex:0 0 auto;padding:7px 11px;border-radius:999px;border:1px solid rgba(34,197,94,.45);color:#4ade80;font-weight:800;font-size:11px}
      .active-v3b-edit-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
      .active-v3b-field{display:grid;gap:8px;padding:14px;border:1px solid rgba(148,163,184,.2);border-radius:14px;background:rgba(8,19,33,.74)}
      .active-v3b-field span{font-weight:800;color:#e2e8f0}.active-v3b-field small{color:#8fa0b7;line-height:1.35}
      .active-v3b-field input{width:100%;box-sizing:border-box;border:1px solid rgba(96,165,250,.35);border-radius:10px;background:#071421;color:#fff;padding:11px 12px;font-size:16px;font-weight:800}
      .active-v3b-field input[readonly]{opacity:.72;border-color:rgba(148,163,184,.25);cursor:not-allowed}
      .active-v3b-fixed{padding:14px;border:1px solid rgba(168,85,247,.28);border-radius:14px;background:rgba(46,20,75,.18)}
      .active-v3b-fixed h3{margin:0 0 10px;color:#d8b4fe}.active-v3b-fixed-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 12px}
      .active-v3b-fixed-grid div{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid rgba(148,163,184,.12)}
      .active-v3b-fixed-grid span{color:#94a3b8}.active-v3b-fixed-grid strong{color:#f8fafc;text-align:right}
      .active-v3b-notice{padding:11px 13px;border-radius:12px;background:rgba(245,158,11,.09);border:1px solid rgba(245,158,11,.25);color:#f8d58b;font-size:12px;line-height:1.45}
      .active-v3b-actions{display:flex;justify-content:flex-end;gap:10px}.active-v3b-actions button{min-height:42px;padding:0 16px;border-radius:10px;font-weight:800;cursor:pointer}
      .active-v3b-reset{border:1px solid rgba(148,163,184,.35);background:#0b1725;color:#dbe7f4}.active-v3b-save{border:1px solid #2563eb;background:linear-gradient(90deg,#2563eb,#7c3aed);color:white}
      .active-v3b-status{min-height:20px;color:#93c5fd;font-size:12px}.active-v3b-status.is-error{color:#fb7185}.active-v3b-status.is-ok{color:#4ade80}
      @media(max-width:700px){.active-v3b-edit-grid,.active-v3b-fixed-grid{grid-template-columns:1fr}.active-v3b-banner{align-items:flex-start}.active-v3b-actions{display:grid;grid-template-columns:1fr 1fr}.active-v3b-actions button{width:100%}}
    `;
    document.head.appendChild(style);
  }

  async function fetchActiveStrategy() {
    const response = await settingsFetch(`${BASE_URL}/strategy/settings`, { cache: "no-store" });
    if (!response) throw new Error("Could not establish the NathauxFX session.");
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Could not load active strategy settings");
    activeStrategySnapshot = data;
    return data;
  }

  function numberInput(key, data, help) {
    const current = data.current?.[key];
    const limit = data.limits?.[key] || {};
    const editable = Array.isArray(data.editable) ? data.editable.includes(key) : true;
    return `
      <label class="active-v3b-field">
        <span>${escapeHtml(limit.label || key)}</span>
        <input type="number" ${editable ? `data-v3b-strategy-setting="${escapeHtml(key)}"` : "readonly aria-readonly=\"true\""}
          value="${escapeHtml(current)}"
          ${limit.min !== undefined ? `min="${escapeHtml(limit.min)}"` : ""}
          ${limit.max !== undefined ? `max="${escapeHtml(limit.max)}"` : ""}
          ${limit.step !== undefined ? `step="${escapeHtml(limit.step)}"` : ""}>
        <small>${escapeHtml(help)}${limit.unit ? ` · ${escapeHtml(limit.unit)}` : ""}${editable ? "" : " · Fixed for the current broker profile"}</small>
      </label>`;
  }

  function renderActiveStrategy(data) {
    installActiveStrategyStyles();
    const pane = document.querySelector('[data-strategy-pane="parameters"]');
    if (!pane) return;
    const fixed = data.fixed_rules || {};
    const buffers = fixed.sl_buffer_points || {};
    const minimums = fixed.minimum_sl_distance_points || {};
    pane.innerHTML = `
      <div class="active-v3b-settings">
        <div class="active-v3b-banner">
          <div><strong>Active Strategy · ${escapeHtml(data.version || "V3B")}</strong><small>${escapeHtml(data.profile || "V3B_M5_FROZEN")} · Backend authoritative</small></div>
          <span class="active-v3b-badge">● ACTIVE</span>
        </div>
        <div class="active-v3b-edit-grid">
          ${numberInput("target_rr", data, "TP2 distance for future setups")}
          ${numberInput("protection_trigger_percent", data, "Arms profit protection; no partial close")}
          ${numberInput("protected_stop_percent", data, "Where SL moves after the protection trigger")}
        </div>
        <section class="active-v3b-fixed">
          <h3>V3B Entry Rules</h3>
          <div class="active-v3b-fixed-grid">
            <div><span>Setup timeframe</span><strong>${escapeHtml(fixed.setup_timeframe || "5m")}</strong></div>
            <div><span>Minimum BOS body</span><strong>${escapeHtml(fixed.bos_body_minimum_percent ?? 50)}%</strong></div>
            <div><span>Confirmation</span><strong>Immediate next 5m close</strong></div>
            <div><span>EMA / M15 dependency</span><strong>OFF</strong></div>
            <div><span>SL buffer</span><strong>EUR ${escapeHtml(buffers.EURUSD ?? 50)} pts · Gold ${escapeHtml(buffers.XAUUSD ?? 50)} pts</strong></div>
            <div><span>Minimum SL</span><strong>EUR ${escapeHtml(minimums.EURUSD ?? 100)} pts · Gold ${escapeHtml(minimums.XAUUSD ?? 100)} pts</strong></div>
            <div><span>Partial close at trigger</span><strong>NO</strong></div>
            <div><span>Event invalidation</span><strong>5m event-owned swing</strong></div>
          </div>
        </section>
        <div class="active-v3b-notice">Changes here apply to future V3B trades. They do not rewrite an already-open broker position. For an open trade, keep using the chart trade lines to move SL/TP and confirm the broker amendment.</div>
        <div id="activeV3bSettingsStatus" class="active-v3b-status">${data.last_updated ? `Last strategy change: ${escapeHtml(data.last_updated)}` : "Using V3B production defaults."}</div>
        <div class="active-v3b-actions">
          <button type="button" class="active-v3b-reset" data-v3b-reset>Reset V3B Defaults</button>
          <button type="button" class="active-v3b-save" data-v3b-save>✓ Save Strategy</button>
        </div>
      </div>`;

    const about = document.querySelector('[data-strategy-pane="about"]');
    if (about) {
      about.innerHTML = `<h3>About Active Strategy Settings</h3><p>The active production profile is <strong>${escapeHtml(data.profile || "V3B_M5_FROZEN")}</strong>. Editable management values are loaded from the backend, not hard-coded in this browser. A future strategy profile starts from its own new defaults instead of inheriting an older strategy's overrides.</p><p>Strategy Lab research remains frozen for reproducible backtests. Manual SL/TP changes on an already-open trade remain separate from these future-trade defaults.</p>`;
    }
  }

  function setStrategyStatus(message, kind) {
    const el = document.getElementById("activeV3bSettingsStatus");
    if (!el) return;
    el.textContent = message || "";
    el.classList.toggle("is-error", kind === "error");
    el.classList.toggle("is-ok", kind === "ok");
  }

  async function synchronizeStrategyPage() {
    const requestId = ++strategySyncRequest;
    try {
      const data = await fetchActiveStrategy();
      if (requestId !== strategySyncRequest) return;
      renderActiveStrategy(data);
    } catch (error) {
      setStrategyStatus(error.message || "Could not synchronize V3B settings", "error");
    }
  }

  async function saveStrategyFromUi() {
    const payload = {};
    document.querySelectorAll("[data-v3b-strategy-setting]").forEach((input) => {
      payload[input.dataset.v3bStrategySetting] = Number(input.value);
    });
    setStrategyStatus("Saving V3B settings…");
    try {
      const response = await settingsFetch(`${BASE_URL}/strategy/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Request-Source": "nathauxfx_settings_ui" },
        body: JSON.stringify({ settings: payload }),
      });
      if (!response) throw new Error("Could not establish the NathauxFX session.");
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not save V3B settings");
      activeStrategySnapshot = data;
      renderActiveStrategy(data);
      setStrategyStatus("V3B settings saved. Future PAPER/LIVE setups will use these values.", "ok");
      synchronizeRiskStrategyFields();
    } catch (error) {
      setStrategyStatus(error.message || "Could not save V3B settings", "error");
    }
  }

  async function resetStrategyDefaults() {
    setStrategyStatus("Restoring V3B defaults…");
    try {
      const response = await settingsFetch(`${BASE_URL}/strategy/settings/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Request-Source": "nathauxfx_settings_ui" },
        body: JSON.stringify({ confirm: true }),
      });
      if (!response) throw new Error("Could not establish the NathauxFX session.");
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not restore V3B defaults");
      activeStrategySnapshot = data;
      renderActiveStrategy(data);
      setStrategyStatus("V3B production defaults restored.", "ok");
      synchronizeRiskStrategyFields();
    } catch (error) {
      setStrategyStatus(error.message || "Could not restore V3B defaults", "error");
    }
  }

  function applyRiskStrategyValues(values) {
    if (!values) return;
    const trigger = document.querySelector('[data-risk-pref="tp1PercentOfTp2"]');
    const protectedInput = document.querySelector('[data-risk-pref="protectedSlPercentOfTp2"]');
    if (trigger && values.protection_trigger_percent !== undefined) {
      trigger.value = String(values.protection_trigger_percent);
      const card = trigger.closest(".risk-pro-card");
      const title = card?.querySelector("h3");
      const copy = card?.querySelector("p");
      if (title) title.textContent = "Protection Trigger (% of TP2)";
      if (copy) copy.textContent = "Arms V3B profit protection. No partial close is taken here.";
    }
    if (protectedInput && values.protected_stop_percent !== undefined) {
      protectedInput.value = String(values.protected_stop_percent);
      const card = protectedInput.closest(".risk-pro-card");
      const title = card?.querySelector("h3");
      const copy = card?.querySelector("p");
      if (title) title.textContent = "Protected SL (% of TP2)";
      if (copy) copy.textContent = "Where V3B moves the stop after the protection trigger.";
    }
  }

  async function synchronizeRiskStrategyFields(useDefaults) {
    const requestId = ++riskSyncRequest;
    try {
      const data = activeStrategySnapshot || (await fetchActiveStrategy());
      if (requestId !== riskSyncRequest) return;
      applyRiskStrategyValues(useDefaults ? data.defaults : data.current);
    } catch (error) {
      console.warn("V3B risk field synchronization failed", error);
    }
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("#menuStrategySettingsBtn")) {
      // Let the existing sidebar open the modal first, then replace its stale V1
      // parameter pane with the backend-authoritative active profile.
      window.setTimeout(synchronizeStrategyPage, 80);
      window.setTimeout(synchronizeStrategyPage, 450);
      return;
    }
    if (event.target.closest("#menuRiskSettingsBtn")) {
      // Legacy code still hydrates local defaults; run after it and make the
      // active strategy the final value shown for the two strategy-owned fields.
      window.setTimeout(() => synchronizeRiskStrategyFields(false), 180);
      window.setTimeout(() => synchronizeRiskStrategyFields(false), 800);
      return;
    }
    if (event.target.closest("[data-v3b-save]")) {
      event.preventDefault();
      event.stopPropagation();
      saveStrategyFromUi();
      return;
    }
    if (event.target.closest("[data-v3b-reset]")) {
      event.preventDefault();
      event.stopPropagation();
      resetStrategyDefaults();
      return;
    }
    if (event.target.closest("#riskResetBtn")) {
      // Reset means the current strategy's defaults, not stale V1 browser values.
      window.setTimeout(() => synchronizeRiskStrategyFields(true), 0);
      window.setTimeout(() => synchronizeRiskStrategyFields(true), 250);
      return;
    }
    if (event.target.closest("#riskSaveBtn")) {
      // The normal Risk save posts these fields to the backend, where they are
      // mapped to the active profile. Re-read afterward so UI and backend agree.
      activeStrategySnapshot = null;
      window.setTimeout(() => synchronizeRiskStrategyFields(false), 700);
      window.setTimeout(() => synchronizeRiskStrategyFields(false), 1600);
    }
  });

  window.addEventListener("pageshow", () => {
    // Home-screen/iOS panels may be restored from bfcache. Do not keep a stale
    // strategy snapshot across that restore.
    activeStrategySnapshot = null;
  });
})();
