(() => {
  'use strict';

  const Model = window.StrategyStudioModel;
  const Api = window.StrategyStudioApi;
  if (!Model || !Api) return;

  const state = {
    strategies: [],
    currentId: null,
    draft: Model.blankStrategy(),
    baseline: Model.blankStrategy(),
    name: '',
    baselineName: '',
    serverErrors: {},
    busy: false,
    liveStatus: { enabled: false, parity_status: 'REQUIRES_VERIFICATION' },
  };

  const $ = (id) => document.getElementById(id);
  const builderFields = $('builderFields');
  const saveButton = $('saveStrategyBtn');
  const simulatorUnavailableText = 'Simulator becomes available after the shared evaluator is installed.';

  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function currentStrategy() {
    return state.strategies.find((item) => item.strategy_id === state.currentId) || null;
  }

  function parityVerified(status = state.liveStatus) {
    const value = String(status?.parity_status || '').toUpperCase();
    return status?.parity_verified === true || ['VERIFIED', 'PASS', 'GREEN', 'MATCH', 'MATCHED'].includes(value);
  }

  function renderLiveHandoffState() {
    const node = $('studioLiveReadiness');
    const button = $('goLiveStrategyBtn');
    if (!node || !button) return;
    const current = currentStrategy();
    const status = state.liveStatus || {};
    const locked = Boolean(current?.locked);
    const live_handoff_enabled = Boolean(
      current?.live_handoff_enabled
      || (status.enabled && (!status.enabled_strategy_id || status.enabled_strategy_id === current?.strategy_id))
    );
    if (live_handoff_enabled) {
      node.textContent = 'Strategy Studio LIVE enabled — this saved strategy is the gated LIVE candidate source.';
      node.className = 'notice studio-live-readiness success';
      button.textContent = 'Studio LIVE Enabled';
    } else if (parityVerified(status)) {
      node.textContent = 'Parity verified — Go Live requires confirmation';
      node.className = 'notice studio-live-readiness success';
      button.textContent = 'Go Live';
    } else {
      node.textContent = 'Simulator ready — LIVE still uses current V3B';
      node.className = 'notice studio-live-readiness';
      button.textContent = 'Go Live';
    }
    button.disabled = Boolean(
      state.busy || !current || current.state !== 'ACTIVE' || locked
      || live_handoff_enabled || !parityVerified(status)
    );
    button.title = !current
      ? 'Select and activate a saved strategy first'
      : current.state !== 'ACTIVE'
        ? 'Activate this strategy in Studio first'
        : locked
          ? 'This strategy is locked while its Studio-managed position is open'
          : live_handoff_enabled
            ? 'Strategy Studio LIVE is already enabled for this strategy'
            : parityVerified(status)
              ? 'Review and explicitly confirm the Strategy Studio LIVE handoff'
              : 'Parity verification is required before Go Live';
  }

  async function loadLiveStatus() {
    try {
      state.liveStatus = await Api.getLiveStatus();
    } catch (error) {
      state.liveStatus = { enabled: false, parity_status: 'REQUIRES_VERIFICATION', error: error.message };
    }
    renderLiveHandoffState();
  }

  function notice(message, kind = '') {
    const node = $('studioNotice');
    node.textContent = message || '';
    node.className = `notice ${kind}`.trim();
    node.classList.toggle('hidden', !message);
  }

  function toNumber(id) {
    const raw = $(id).value.trim();
    if (raw === '') return null;
    const number = Number(raw);
    return Number.isFinite(number) ? number : null;
  }

  function checkedValues(containerId) {
    return Array.from(document.querySelectorAll(`#${containerId} input:checked`)).map((input) => input.value);
  }

  function setCheckedValues(containerId, values) {
    const selected = new Set(values || []);
    document.querySelectorAll(`#${containerId} input`).forEach((input) => {
      input.checked = selected.has(input.value);
    });
  }

  function collectDraft() {
    const draft = state.draft;
    state.name = $('strategyName').value;
    draft.symbols = checkedValues('symbolChoices');
    draft.trading_timeframe = document.querySelector('input[name="tradingTf"]:checked')?.value || null;
    draft.trend.methods = checkedValues('trendMethodChoices');
    draft.trend.timeframe = $('trendTimeframe').value || null;
    draft.structure.break_validation = checkedValues('breakValidationChoices');
    draft.structure.minimum_body_percent = toNumber('breakBody');
    draft.structure.minimum_distance_pips = toNumber('breakDistance');
    draft.confirmation.rules = checkedValues('confirmationChoices');
    draft.confirmation.minimum_body_percent = toNumber('confirmationBody');
    draft.entry.method = $('entryMethod').value || null;
    draft.stop_loss.method = $('stopMethod').value || null;
    draft.stop_loss.buffer_pips = toNumber('stopBuffer');
    draft.stop_loss.fixed_distance = toNumber('fixedStopDistance');
    draft.tp1.enabled = $('tp1Enabled').checked;
    draft.tp1.target_basis = $('tp1TargetBasis').value || 'SL_DISTANCE';
    draft.tp1.target_r = Model.percentToR(toNumber('tp1Target'));
    draft.tp1.close_percent = toNumber('tp1Close');
    draft.tp1.protection_mode = $('tp1ProtectionMode').value || 'FIXED';
    if (draft.tp1.protection_mode === 'TP2_STEPS') {
      draft.tp1.protection_r = null;
      draft.tp1.protection_steps = [
        { trigger_percent: toNumber('tp1Step1Trigger'), secure_percent: toNumber('tp1Step1Secure') },
        { trigger_percent: toNumber('tp1Step2Trigger'), secure_percent: toNumber('tp1Step2Secure') },
        { trigger_percent: toNumber('tp1Step3Trigger'), secure_percent: toNumber('tp1Step3Secure') },
      ];
    } else {
      draft.tp1.protection_r = Model.percentToR(toNumber('tp1Protection'));
      draft.tp1.protection_steps = [];
    }
    draft.tp2.method = $('tp2Method').value || null;
    draft.tp2.value = toNumber('tp2Value');
    draft.risk.method = $('riskMethod').value || null;
    draft.risk.value = toNumber('riskValue');
    if (!draft.fundamentals) draft.fundamentals = {};
    draft.fundamentals.mode = $('fundamentalMode').value || 'BLOCK_OPPOSITE';
    state.serverErrors = {};
    renderDraftState();
  }

  function assignDraftToForm() {
    const value = state.draft;
    $('strategyName').value = state.name || '';
    setCheckedValues('symbolChoices', value.symbols);
    document.querySelectorAll('input[name="tradingTf"]').forEach((input) => {
      input.checked = input.value === value.trading_timeframe;
    });
    setCheckedValues('trendMethodChoices', value.trend.methods);
    populateTrendTimeframes(value.trading_timeframe, value.trend.timeframe);
    setCheckedValues('breakValidationChoices', value.structure.break_validation);
    $('breakBody').value = value.structure.minimum_body_percent ?? '';
    $('breakDistance').value = value.structure.minimum_distance_pips ?? '';
    setCheckedValues('confirmationChoices', value.confirmation.rules);
    $('confirmationBody').value = value.confirmation.minimum_body_percent ?? '';
    $('entryMethod').value = value.entry.method || '';
    $('stopMethod').value = value.stop_loss.method || '';
    $('stopBuffer').value = value.stop_loss.buffer_pips ?? '';
    $('fixedStopDistance').value = value.stop_loss.fixed_distance ?? '';
    $('tp1Enabled').checked = Boolean(value.tp1.enabled);
    $('tp1TargetBasis').value = value.tp1.target_basis || 'SL_DISTANCE';
    $('tp1Target').value = Model.rToPercent(value.tp1.target_r) ?? '';
    $('tp1Close').value = value.tp1.close_percent ?? '';
    $('tp1ProtectionMode').value = value.tp1.protection_mode || 'FIXED';
    $('tp1Protection').value = Model.rToPercent(value.tp1.protection_r) ?? '';
    const steps = Array.isArray(value.tp1.protection_steps) && value.tp1.protection_steps.length
      ? value.tp1.protection_steps
      : [
          { trigger_percent: 70, secure_percent: 50 },
          { trigger_percent: 80, secure_percent: 60 },
          { trigger_percent: 90, secure_percent: 70 },
        ];
    $('tp1Step1Trigger').value = steps[0]?.trigger_percent ?? 70;
    $('tp1Step1Secure').value = steps[0]?.secure_percent ?? 50;
    $('tp1Step2Trigger').value = steps[1]?.trigger_percent ?? 80;
    $('tp1Step2Secure').value = steps[1]?.secure_percent ?? 60;
    $('tp1Step3Trigger').value = steps[2]?.trigger_percent ?? 90;
    $('tp1Step3Secure').value = steps[2]?.secure_percent ?? 70;
    $('tp2Method').value = value.tp2.method || '';
    $('tp2Value').value = value.tp2.value ?? '';
    $('riskMethod').value = value.risk.method || '';
    $('riskValue').value = value.risk.value ?? '';
    $('fundamentalMode').value = value.fundamentals?.mode || 'BLOCK_OPPOSITE';
    renderDraftState();
  }

  function populateTrendTimeframes(tradingTimeframe, selected) {
    const select = $('trendTimeframe');
    const options = Model.trendTimeframeOptions(tradingTimeframe);
    select.innerHTML = '<option value="">Choose higher timeframe</option>' +
      options.map((item) => `<option value="${item}">${item}</option>`).join('');
    select.value = options.includes(selected) ? selected : '';
    if (selected && !options.includes(selected)) state.draft.trend.timeframe = null;
  }

  function renderConditionalFields() {
    const visible = Model.visibleFields(state.draft);
    $('trendTimeframeField').classList.toggle('hidden', !visible.trendTimeframe);
    $('breakBodyField').classList.toggle('hidden', !visible.breakBody);
    $('breakDistanceField').classList.toggle('hidden', !visible.breakDistance);
    $('confirmationBodyField').classList.toggle('hidden', !visible.confirmationBody);
    $('stopBufferField').classList.toggle('hidden', !visible.stopBuffer);
    $('fixedStopField').classList.toggle('hidden', !visible.fixedStopDistance);
    $('tp1Fields').classList.toggle('hidden', !visible.tp1);
    $('tp1FixedProtectionField').classList.toggle('hidden', !visible.tp1FixedProtection);
    $('tp1StepProtectionFields').classList.toggle('hidden', !visible.tp1StepProtection);
    $('tp2ValueField').classList.toggle('hidden', !visible.tp2Value);
    $('riskValueField').classList.toggle('hidden', !visible.riskValue);
    $('riskValueLabel').textContent = state.draft.risk.method === 'FIXED_DOLLARS' ? 'Fixed $ Risk' : 'Risk % of Balance';

    const tp1Basis = state.draft.tp1?.target_basis || 'SL_DISTANCE';
    const stepOption = Array.from($('tp1ProtectionMode').options).find((option) => option.value === 'TP2_STEPS');
    if (stepOption) stepOption.disabled = tp1Basis !== 'TP2_DISTANCE';
    if (tp1Basis !== 'TP2_DISTANCE' && state.draft.tp1?.protection_mode === 'TP2_STEPS') {
      state.draft.tp1.protection_mode = 'FIXED';
      state.draft.tp1.protection_steps = [];
      $('tp1ProtectionMode').value = 'FIXED';
      $('tp1FixedProtectionField').classList.remove('hidden');
      $('tp1StepProtectionFields').classList.add('hidden');
    }
    if (tp1Basis === 'TP2_DISTANCE') {
      $('tp1TargetLabel').textContent = 'TP1 Trigger (% of TP2)';
      $('tp1TargetHint').textContent = '70% = TP1 is 70% of the path from Entry to TP2.';
      $('tp1ProtectionLabel').textContent = 'Secure Profit (% of TP2)';
      $('tp1ProtectionHint').textContent = '50% moves SL to 50% of the Entry→TP2 path.';
    } else {
      $('tp1TargetLabel').textContent = 'TP1 Trigger (% of SL)';
      $('tp1TargetHint').textContent = '70% = 0.70R from entry.';
      $('tp1ProtectionLabel').textContent = 'Secure Profit (% of SL)';
      $('tp1ProtectionHint').textContent = '0% = breakeven; 20% = +0.20R.';
    }

    const confirmations = state.draft.confirmation.rules || [];
    Array.from($('entryMethod').options).forEach((option) => {
      if (!option.value) return;
      option.disabled = (
        (option.value === 'CONFIRMATION_CLOSE' && confirmations.length === 0) ||
        (option.value === 'RETEST' && !confirmations.includes('RETEST_LEVEL')) ||
        (option.value === 'BOS_CHOCH_CLOSE' && confirmations.length > 0)
      );
    });
  }

  function combinedErrors() {
    const errors = Model.clientValidation(state.draft);
    if (!state.name.trim()) errors.name = 'Strategy name is required';
    if (state.name.trim().length > 120) errors.name = 'Strategy name must be 120 characters or fewer';
    return { ...errors, ...state.serverErrors };
  }

  function renderErrors() {
    const errors = combinedErrors();
    document.querySelectorAll('[data-error-for]').forEach((node) => {
      node.textContent = errors[node.dataset.errorFor] || '';
    });
    return errors;
  }

  function renderSummary(errors) {
    const summary = Model.buildSummary(state.draft);
    $('summaryName').textContent = state.name.trim() || 'Untitled Strategy';
    $('strategyFlow').textContent = summary || 'Choose your trading timeframe and rules to build the strategy flow.';

    const checks = [
      ['Symbols', !errors.symbols],
      ['Timeframe', !errors.trading_timeframe],
      ['Entry', !errors['entry.method']],
      ['Stop Loss', !errors['stop_loss.method'] && !errors['stop_loss.fixed_distance']],
      ['TP2', !errors['tp2.method'] && !errors['tp2.value']],
      ['Risk', !errors['risk.method'] && !errors['risk.value']],
      ['Fundamentals', !errors['fundamentals.mode']],
    ];
    const ready = checks.filter((item) => item[1]).length;
    $('ruleHealthCount').textContent = `${ready} / ${checks.length} ready`;
    $('ruleHealthList').innerHTML = checks.map(([label, ok]) =>
      `<div class="health-row ${ok ? 'ready' : ''}"><span><i class="health-dot"></i>${label}</span><b>${ok ? 'READY' : 'MISSING'}</b></div>`
    ).join('');
    const complete = Object.keys(errors).length === 0;
    $('summaryStatus').textContent = complete ? 'READY TO SAVE' : 'INCOMPLETE';
    $('summaryStatus').className = `summary-status ${complete ? 'ready' : 'incomplete'}`;
  }

  function renderActionState(errors) {
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

  function renderDraftState() {
    renderConditionalFields();
    const errors = renderErrors();
    renderSummary(errors);
    renderActionState(errors);
  }

  function renderSavedStrategies() {
    const list = $('savedStrategiesList');
    if (!state.strategies.length) {
      list.innerHTML = '<div class="empty-state">No saved strategies yet.<br>Create a blank strategy to begin.</div>';
      return;
    }
    list.innerHTML = state.strategies.map((item) => {
      const tf = item.definition?.trading_timeframe || '—';
      const symbols = (item.definition?.symbols || []).join(' + ') || 'No symbols';
      const risk = item.definition?.risk || {};
      const riskText = risk.method === 'PERCENT_BALANCE' ? `${risk.value}% balance` : risk.method === 'FIXED_DOLLARS' ? `${risk.value}` : 'Risk —';
      const fundamentalMode = item.definition?.fundamentals?.mode || 'BLOCK_OPPOSITE';
      const fundamentalText = fundamentalMode === 'REQUIRE_ALIGNMENT' ? 'Fundamental alignment required' : 'Fundamentals block opposite';
      return `<article class="strategy-card ${item.strategy_id === state.currentId ? 'selected' : ''} ${item.state === 'ACTIVE' ? 'active' : ''}" data-strategy-id="${item.strategy_id}">
        <div class="strategy-card-top"><strong>${escapeHtml(item.name)}</strong><span class="mini-status ${item.state === 'ACTIVE' ? 'active' : ''}">${item.state}</span></div>
        <small>${symbols} • ${tf}<br>${riskText}<br>${fundamentalText}</small>
      </article>`;
    }).join('');
    list.querySelectorAll('[data-strategy-id]').forEach((card) => {
      card.addEventListener('click', () => openSaved(card.dataset.strategyId));
    });
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
    })[char]);
  }

  function newStrategy() {
    state.currentId = null;
    state.name = '';
    state.baselineName = '';
    state.draft = Model.blankStrategy();
    state.baseline = copy(state.draft);
    state.serverErrors = {};
    renderSavedStrategies();
    assignDraftToForm();
    notice('');
  }

  function openSaved(id) {
    const strategy = state.strategies.find((item) => item.strategy_id === id);
    if (!strategy) return;
    state.currentId = id;
    state.name = strategy.name;
    state.baselineName = strategy.name;
    state.draft = Model.normalizeForApi(copy(strategy.definition));
    state.baseline = copy(state.draft);
    state.serverErrors = {};
    renderSavedStrategies();
    assignDraftToForm();
    notice(strategy.locked
      ? 'This strategy is locked while its Studio-managed position is open. Edit, delete, and deactivate are blocked; Clone remains available.'
      : strategy.state === 'ACTIVE'
        ? 'Active strategies are locked. Deactivate it before editing, or Clone it to create an editable copy.'
        : '');
  }

  async function loadStrategies(selectId = state.currentId) {
    state.busy = true;
    renderDraftState();
    try {
      const payload = await Api.listStrategies();
      state.strategies = Array.isArray(payload.strategies) ? payload.strategies : [];
      renderSavedStrategies();
      const target = state.strategies.find((item) => item.strategy_id === selectId);
      if (target) openSaved(target.strategy_id);
      else if (!state.currentId) newStrategy();
    } catch (error) {
      notice(`Strategy Studio could not load: ${error.message}`, 'error');
      renderSavedStrategies();
    } finally {
      state.busy = false;
      renderDraftState();
    }
  }

  function showConfirmation({ title, message, confirmLabel = 'Confirm', danger = false }) {
    return new Promise((resolve) => {
      const modal = $('confirmModal');
      const accept = $('confirmAccept');
      const cancel = $('confirmCancel');
      $('confirmTitle').textContent = title;
      $('confirmMessage').textContent = message;
      accept.textContent = confirmLabel;
      accept.classList.toggle('danger-soft', danger);
      modal.classList.remove('hidden');

      const finish = (value) => {
        modal.classList.add('hidden');
        accept.removeEventListener('click', onAccept);
        cancel.removeEventListener('click', onCancel);
        resolve(value);
      };
      const onAccept = () => finish(true);
      const onCancel = () => finish(false);
      accept.addEventListener('click', onAccept);
      cancel.addEventListener('click', onCancel);
    });
  }

  async function saveStrategy() {
    collectDraft();
    const localErrors = combinedErrors();
    if (Object.keys(localErrors).length) return;
    const saveTargetId = state.currentId;
    const saveName = state.name.trim();
    const definition = Model.normalizeForApi(state.draft);
    state.busy = true;
    renderDraftState();
    try {
      const validation = await Api.validateStrategy(saveName, definition);
      if (!validation.valid) {
        state.serverErrors = validation.errors || {};
        renderDraftState();
        notice('Fix the highlighted settings before saving.', 'error');
        return;
      }
      const response = saveTargetId
        ? await Api.updateStrategy(saveTargetId, saveName, validation.normalized_definition)
        : await Api.createStrategy(saveName, validation.normalized_definition);
      const saved = response.strategy;
      notice(`Saved ${saved.name}.`, 'success');
      await loadStrategies(saved.strategy_id);
    } catch (error) {
      notice(`Save failed: ${error.message}`, 'error');
    } finally {
      state.busy = false;
      renderDraftState();
    }
  }

  async function cloneCurrent() {
    const current = currentStrategy();
    if (!current) return;
    const proposed = window.prompt('Name the cloned strategy:', `${current.name} Copy`);
    if (!proposed?.trim()) return;
    state.busy = true;
    renderDraftState();
    try {
      const response = await Api.cloneStrategy(current.strategy_id, proposed.trim());
      notice('Strategy cloned. The copy is inactive and editable.', 'success');
      await loadStrategies(response.strategy.strategy_id);
    } catch (error) {
      notice(`Clone failed: ${error.message}`, 'error');
    } finally {
      state.busy = false;
      renderDraftState();
    }
  }

  async function activateCurrent() {
    const current = currentStrategy();
    if (!current) return;
    const ok = await showConfirmation({
      title: 'Activate Strategy in Studio?',
      message: 'Stage 1 activation only marks this saved strategy as active inside Strategy Studio. It does not change LIVE trading or the current V3B strategy.',
      confirmLabel: 'Activate',
    });
    if (!ok) return;
    await runSensitiveAction(() => Api.activateStrategy(current.strategy_id), 'Strategy activated inside Studio only.');
  }

  async function deactivateCurrent() {
    const current = currentStrategy();
    if (!current) return;
    const ok = await showConfirmation({
      title: 'Deactivate Strategy?',
      message: 'This removes the active marker inside Strategy Studio. It does not change LIVE trading or the current V3B strategy.',
      confirmLabel: 'Deactivate',
    });
    if (!ok) return;
    await runSensitiveAction(() => Api.deactivateStrategy(current.strategy_id), 'Strategy deactivated.');
  }

  async function deleteCurrent() {
    const current = currentStrategy();
    if (!current) return;
    const ok = await showConfirmation({
      title: 'Delete Strategy Permanently?',
      message: `Delete “${current.name}”? This is permanent and there is no restore or trash.`,
      confirmLabel: 'Delete permanently',
      danger: true,
    });
    if (!ok) return;
    await runSensitiveAction(() => Api.deleteStrategy(current.strategy_id), 'Strategy deleted.', true);
  }

  async function goLiveCurrent() {
    const current = currentStrategy();
    if (!current) return;
    if (current.state !== 'ACTIVE') {
      notice('Activate this strategy inside Strategy Studio before Go Live.', 'error');
      return;
    }
    if (current.locked) {
      notice('This strategy is locked while its Studio-managed position is open.', 'error');
      return;
    }
    if (!parityVerified()) {
      notice('Parity verification is required before Strategy Studio can Go Live.', 'error');
      return;
    }
    const ok = await showConfirmation({
      title: 'Go Live with this Strategy?',
      message: `Future LIVE entries will use “${current.name}” as the Strategy Studio candidate source. Its saved fundamental policy will be enforced again immediately before broker submission. This does not toggle LIVE Auto and does not modify an existing broker position.`,
      confirmLabel: 'Go Live',
    });
    if (!ok) return;
    state.busy = true;
    renderDraftState();
    try {
      const response = await Api.setLiveHandoff(current.strategy_id, true);
      state.liveStatus = response.state || response.live_state || response;
      notice('Strategy Studio LIVE handoff enabled for this strategy.', 'success');
      await loadStrategies(current.strategy_id);
      await loadLiveStatus();
    } catch (error) {
      notice(`Go Live blocked: ${error.message}`, 'error');
    } finally {
      state.busy = false;
      renderDraftState();
    }
  }

  async function resetDraft() {
    const ok = await showConfirmation({
      title: 'Reset Draft?',
      message: 'Reset all unsaved changes and restore the last saved strategy values. For a new strategy, this returns to a blank builder.',
      confirmLabel: 'Reset',
    });
    if (!ok) return;
    state.name = state.baselineName;
    state.draft = copy(state.baseline);
    state.serverErrors = {};
    assignDraftToForm();
    notice('Draft reset.');
  }

  async function runSensitiveAction(action, successMessage, clearSelection = false) {
    state.busy = true;
    renderDraftState();
    try {
      const response = await action();
      notice(successMessage, 'success');
      const id = clearSelection ? null : response.strategy?.strategy_id || state.currentId;
      if (clearSelection) newStrategy();
      await loadStrategies(id);
    } catch (error) {
      notice(error.message, 'error');
    } finally {
      state.busy = false;
      renderDraftState();
    }
  }

  function bindInputs() {
    $('strategyName').addEventListener('input', collectDraft);
    document.querySelectorAll('#symbolChoices input, input[name="tradingTf"], #breakValidationChoices input, #confirmationChoices input').forEach((input) => input.addEventListener('change', () => {
      const previousTf = state.draft.trading_timeframe;
      collectDraft();
      if (previousTf !== state.draft.trading_timeframe) {
        populateTrendTimeframes(state.draft.trading_timeframe, state.draft.trend.timeframe);
        state.draft.trend.timeframe = $('trendTimeframe').value || null;
        renderDraftState();
      }
    }));

    document.querySelectorAll('#trendMethodChoices input').forEach((input) => input.addEventListener('change', (event) => {
      if (event.target.value === 'ALL' && event.target.checked) {
        document.querySelectorAll('#trendMethodChoices input').forEach((other) => { other.checked = other === event.target; });
      } else if (event.target.checked) {
        const all = document.querySelector('#trendMethodChoices input[value="ALL"]');
        if (all) all.checked = false;
      }
      collectDraft();
    }));

    ['trendTimeframe', 'entryMethod', 'stopMethod', 'tp1TargetBasis', 'tp1ProtectionMode', 'tp2Method', 'riskMethod', 'fundamentalMode'].forEach((id) => $(id).addEventListener('change', collectDraft));
    ['breakBody', 'breakDistance', 'confirmationBody', 'stopBuffer', 'fixedStopDistance', 'tp1Target', 'tp1Close', 'tp1Protection', 'tp1Step1Trigger', 'tp1Step1Secure', 'tp1Step2Trigger', 'tp1Step2Secure', 'tp1Step3Trigger', 'tp1Step3Secure', 'tp2Value', 'riskValue'].forEach((id) => $(id).addEventListener('input', collectDraft));
    $('tp1Enabled').addEventListener('change', collectDraft);
  }

  function bindActions() {
    $('newStrategyBtn').addEventListener('click', newStrategy);
    $('newStrategyWideBtn').addEventListener('click', newStrategy);
    $('saveStrategyBtn').addEventListener('click', saveStrategy);
    $('cloneStrategyBtn').addEventListener('click', cloneCurrent);
    $('activateStrategyBtn').addEventListener('click', activateCurrent);
    $('deactivateStrategyBtn').addEventListener('click', deactivateCurrent);
    $('deleteStrategyBtn').addEventListener('click', deleteCurrent);
    $('resetDraftBtn').addEventListener('click', resetDraft);
    $('goLiveStrategyBtn').addEventListener('click', goLiveCurrent);
    $('simulatorBtn').title = simulatorUnavailableText;
  }

  bindInputs();
  bindActions();
  assignDraftToForm();
  loadStrategies();
  loadLiveStatus();
})();
