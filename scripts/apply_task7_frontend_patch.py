from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one anchor, found {count}")
    return text.replace(old, new, 1)


root = Path(__file__).resolve().parents[1]

html_path = root / "Frontend/strategy-studio.html"
html = html_path.read_text(encoding="utf-8")
html = replace_once(
    html,
    '<div class="stage-badge"><span></span> Stage 1 • Studio only</div>',
    '<div class="stage-badge"><span></span> Stage 3 • Gated LIVE</div>',
    "stage badge",
)
html = replace_once(
    html,
    '    <div id="studioNotice" class="notice hidden" role="status"></div>\n',
    '    <div id="studioNotice" class="notice hidden" role="status"></div>\n'
    '    <div id="studioLiveReadiness" class="notice studio-live-readiness" role="status">Simulator ready — LIVE still uses current V3B</div>\n',
    "live readiness banner",
)
html = replace_once(
    html,
    '          <div class="summary-note"><strong>Stage 1 safety</strong><p>Saving or activating here does not change LIVE trading. Current V3B remains authoritative.</p></div>',
    '          <div class="summary-note"><strong>Gated LIVE safety</strong><p>V3B remains the LIVE authority until parity is verified and you explicitly confirm Go Live.</p></div>',
    "summary safety copy",
)
html = replace_once(
    html,
    '          <button id="simulatorBtn" class="button simulator-button" type="button" disabled>Simulator</button>',
    '          <button id="goLiveStrategyBtn" class="button primary" type="button" disabled>Go Live</button>\n'
    '          <button id="simulatorBtn" class="button simulator-button" type="button" disabled>Simulator</button>',
    "go live button",
)
html_path.write_text(html, encoding="utf-8")

studio_path = root / "Frontend/strategy-studio/strategy-studio.js"
studio = studio_path.read_text(encoding="utf-8")
studio = replace_once(
    studio,
    "    serverErrors: {},\n    busy: false,\n",
    "    serverErrors: {},\n    busy: false,\n    liveStatus: { enabled: false, parity_status: 'REQUIRES_VERIFICATION' },\n",
    "live status state",
)
studio = replace_once(
    studio,
    "  function currentStrategy() {\n    return state.strategies.find((item) => item.strategy_id === state.currentId) || null;\n  }\n",
    "  function currentStrategy() {\n    return state.strategies.find((item) => item.strategy_id === state.currentId) || null;\n  }\n\n"
    "  function parityVerified(status = state.liveStatus) {\n"
    "    const value = String(status?.parity_status || '').toUpperCase();\n"
    "    return status?.parity_verified === true || ['VERIFIED', 'PASS', 'GREEN', 'MATCH', 'MATCHED'].includes(value);\n"
    "  }\n\n"
    "  function renderLiveHandoffState() {\n"
    "    const node = $('studioLiveReadiness');\n"
    "    const button = $('goLiveStrategyBtn');\n"
    "    if (!node || !button) return;\n"
    "    const current = currentStrategy();\n"
    "    const status = state.liveStatus || {};\n"
    "    const locked = Boolean(current?.locked);\n"
    "    const live_handoff_enabled = Boolean(\n"
    "      current?.live_handoff_enabled\n"
    "      || (status.enabled && (!status.enabled_strategy_id || status.enabled_strategy_id === current?.strategy_id))\n"
    "    );\n"
    "    if (live_handoff_enabled) {\n"
    "      node.textContent = 'Strategy Studio LIVE enabled — this saved strategy is the gated LIVE candidate source.';\n"
    "      node.className = 'notice studio-live-readiness success';\n"
    "      button.textContent = 'Studio LIVE Enabled';\n"
    "    } else if (parityVerified(status)) {\n"
    "      node.textContent = 'Parity verified — Go Live requires confirmation';\n"
    "      node.className = 'notice studio-live-readiness success';\n"
    "      button.textContent = 'Go Live';\n"
    "    } else {\n"
    "      node.textContent = 'Simulator ready — LIVE still uses current V3B';\n"
    "      node.className = 'notice studio-live-readiness';\n"
    "      button.textContent = 'Go Live';\n"
    "    }\n"
    "    button.disabled = Boolean(\n"
    "      state.busy || !current || current.state !== 'ACTIVE' || locked\n"
    "      || live_handoff_enabled || !parityVerified(status)\n"
    "    );\n"
    "    button.title = !current\n"
    "      ? 'Select and activate a saved strategy first'\n"
    "      : current.state !== 'ACTIVE'\n"
    "        ? 'Activate this strategy in Studio first'\n"
    "        : locked\n"
    "          ? 'This strategy is locked while its Studio-managed position is open'\n"
    "          : live_handoff_enabled\n"
    "            ? 'Strategy Studio LIVE is already enabled for this strategy'\n"
    "            : parityVerified(status)\n"
    "              ? 'Review and explicitly confirm the Strategy Studio LIVE handoff'\n"
    "              : 'Parity verification is required before Go Live';\n"
    "  }\n\n"
    "  async function loadLiveStatus() {\n"
    "    try {\n"
    "      state.liveStatus = await Api.getLiveStatus();\n"
    "    } catch (error) {\n"
    "      state.liveStatus = { enabled: false, parity_status: 'REQUIRES_VERIFICATION', error: error.message };\n"
    "    }\n"
    "    renderLiveHandoffState();\n"
    "  }\n",
    "live status helpers",
)
old_action = """  function renderActionState(errors) {
    const current = currentStrategy();
    const active = current?.state === 'ACTIVE';
    const valid = Object.keys(errors).length === 0;
    builderFields.disabled = Boolean(active || state.busy);
    $('builderStateBadge').textContent = active ? 'ACTIVE • LOCKED' : current ? 'INACTIVE' : 'NEW';
    $('cloneStrategyBtn').disabled = !current || state.busy;
    $('deleteStrategyBtn').disabled = !current || active || state.busy;
    $('activateStrategyBtn').disabled = !current || active || state.busy;
    $('activateStrategyBtn').classList.toggle('hidden', Boolean(active));
    $('deactivateStrategyBtn').classList.toggle('hidden', !active);
    $('deactivateStrategyBtn').disabled = !active || state.busy;
    saveButton.disabled = !valid || active || state.busy;
  }
"""
new_action = """  function renderActionState(errors) {
    const current = currentStrategy();
    const active = current?.state === 'ACTIVE';
    const locked = Boolean(current?.locked);
    const valid = Object.keys(errors).length === 0;
    builderFields.disabled = Boolean(active || locked || state.busy);
    $('builderStateBadge').textContent = locked
      ? 'LIVE • LOCKED'
      : active ? 'ACTIVE • LOCKED' : current ? 'INACTIVE' : 'NEW';
    $('cloneStrategyBtn').disabled = !current || state.busy;
    $('deleteStrategyBtn').disabled = !current || active || locked || state.busy;
    $('activateStrategyBtn').disabled = !current || active || locked || state.busy;
    $('activateStrategyBtn').classList.toggle('hidden', Boolean(active));
    $('deactivateStrategyBtn').classList.toggle('hidden', !active);
    $('deactivateStrategyBtn').disabled = !active || locked || state.busy;
    saveButton.disabled = !valid || active || locked || state.busy;
    renderLiveHandoffState();
  }
"""
studio = replace_once(studio, old_action, new_action, "locked action state")
studio = replace_once(
    studio,
    "    notice(strategy.state === 'ACTIVE' ? 'Active strategies are locked. Deactivate it before editing, or Clone it to create an editable copy.' : '');\n",
    "    notice(strategy.locked\n"
    "      ? 'This strategy is locked while its Studio-managed position is open. Edit, delete, and deactivate are blocked; Clone remains available.'\n"
    "      : strategy.state === 'ACTIVE'\n"
    "        ? 'Active strategies are locked. Deactivate it before editing, or Clone it to create an editable copy.'\n"
    "        : '');\n",
    "locked strategy notice",
)
studio = replace_once(
    studio,
    "  async function resetDraft() {\n",
    "  async function goLiveCurrent() {\n"
    "    const current = currentStrategy();\n"
    "    if (!current) return;\n"
    "    if (current.state !== 'ACTIVE') {\n"
    "      notice('Activate this strategy inside Strategy Studio before Go Live.', 'error');\n"
    "      return;\n"
    "    }\n"
    "    if (current.locked) {\n"
    "      notice('This strategy is locked while its Studio-managed position is open.', 'error');\n"
    "      return;\n"
    "    }\n"
    "    if (!parityVerified()) {\n"
    "      notice('Parity verification is required before Strategy Studio can Go Live.', 'error');\n"
    "      return;\n"
    "    }\n"
    "    const ok = await showConfirmation({\n"
    "      title: 'Go Live with this Strategy?',\n"
    "      message: `Future LIVE entries will use “${current.name}” as the Strategy Studio candidate source. This does not toggle LIVE Auto and does not modify an existing broker position.`,\n"
    "      confirmLabel: 'Go Live',\n"
    "    });\n"
    "    if (!ok) return;\n"
    "    state.busy = true;\n"
    "    renderDraftState();\n"
    "    try {\n"
    "      const response = await Api.setLiveHandoff(current.strategy_id, true);\n"
    "      state.liveStatus = response.state || response.live_state || response;\n"
    "      notice('Strategy Studio LIVE handoff enabled for this strategy.', 'success');\n"
    "      await loadStrategies(current.strategy_id);\n"
    "      await loadLiveStatus();\n"
    "    } catch (error) {\n"
    "      notice(`Go Live blocked: ${error.message}`, 'error');\n"
    "    } finally {\n"
    "      state.busy = false;\n"
    "      renderDraftState();\n"
    "    }\n"
    "  }\n\n"
    "  async function resetDraft() {\n",
    "go live action",
)
studio = replace_once(
    studio,
    "    $('resetDraftBtn').addEventListener('click', resetDraft);\n    $('simulatorBtn').title = simulatorUnavailableText;\n",
    "    $('resetDraftBtn').addEventListener('click', resetDraft);\n"
    "    $('goLiveStrategyBtn').addEventListener('click', goLiveCurrent);\n"
    "    $('simulatorBtn').title = simulatorUnavailableText;\n",
    "bind go live action",
)
studio = replace_once(
    studio,
    "  assignDraftToForm();\n  loadStrategies();\n})();\n",
    "  assignDraftToForm();\n  loadStrategies();\n  loadLiveStatus();\n})();\n",
    "load live status",
)
studio_path.write_text(studio, encoding="utf-8")

dashboard_path = root / "Frontend/script.js"
dashboard = dashboard_path.read_text(encoding="utf-8")
old_switch = """    const result = await postBrokerAccountAction("ctrader/accounts/active", {
      accountId: selectedAccountId,
    });

    if (!result.ok) {
      setBrokerStatusMessage(`Connection Status: ${result.reason || "Could not set active account."}`, true);
      return;
    }
"""
new_switch = """    let result = await postBrokerAccountAction("ctrader/accounts/active", {
      accountId: selectedAccountId,
    });

    if (result.confirmation_required) {
      const confirmed = confirm(result.warning || 'Switch accounts and suspend Strategy Studio app management for the current account?');
      if (!confirmed) {
        setBrokerStatusMessage('Connection Status: account switch cancelled; current cTrader account remains active.');
        return;
      }
      result = await postBrokerAccountAction("ctrader/accounts/active", {
        accountId: selectedAccountId,
        confirmed: true,
      });
    }

    if (!result.ok) {
      setBrokerStatusMessage(`Connection Status: ${result.reason || "Could not set active account."}`, true);
      return;
    }
"""
dashboard = replace_once(dashboard, old_switch, new_switch, "account switch confirmation")
dashboard_path.write_text(dashboard, encoding="utf-8")

print("Task 7 frontend patch applied")
