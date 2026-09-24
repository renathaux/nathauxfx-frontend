(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.StrategyStudioModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TREND_METHODS = ['BOS_CHOCH', 'EMA_50', 'EMA_200', 'SWING_STRUCTURE'];
  const TF_OPTIONS = {
    '5m': ['15m', '1h', '4h'],
    '15m': ['1h', '4h'],
    '1h': ['4h'],
  };

  function blankStrategy() {
    return {
      schema_version: 1,
      symbols: [],
      trading_timeframe: null,
      structure_timeframe: null,
      trend: { timeframe: null, methods: [] },
      structure: {
        trigger: 'BOS_CHOCH',
        break_validation: [],
        minimum_body_percent: null,
        minimum_distance_pips: null,
      },
      confirmation: { rules: [], minimum_body_percent: null, max_setup_age_bars: null },
      entry: { method: null, remember_bos_on_confirmation_failure: false },
      stop_loss: { method: null, buffer_pips: null, fixed_distance: null, distance_filter: { enabled: false, mode: "PERCENT_ENTRY", minimum: null, maximum: null } },
      tp1: {
        enabled: false,
        target_r: null,
        target_basis: 'SL_DISTANCE',
        close_percent: null,
        protection_r: null,
        protection_mode: 'FIXED',
        protection_steps: [],
      },
      tp2: { method: null, value: null },
      risk: { method: null, value: null },
      fundamentals: { mode: 'BLOCK_OPPOSITE' },
    };
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function trendTimeframeOptions(tradingTimeframe) {
    return (TF_OPTIONS[tradingTimeframe] || []).slice();
  }

  function visibleFields(definition) {
    const value = definition || blankStrategy();
    const breakRules = (value.structure && value.structure.break_validation) || [];
    const confirmations = (value.confirmation && value.confirmation.rules) || [];
    const stopMethod = value.stop_loss && value.stop_loss.method;
    const tp2Method = value.tp2 && value.tp2.method;
    const riskMethod = value.risk && value.risk.method;

    return {
      trendTimeframe: true,
      breakBody: breakRules.includes('MIN_BODY_PERCENT'),
      breakDistance: breakRules.includes('MIN_DISTANCE'),
      confirmationBody: confirmations.includes('MIN_BODY_PERCENT'),
      rememberBos: value.entry?.method === 'CONFIRMATION_CLOSE' && confirmations.includes('NEXT_SAME_DIRECTION'),
      stopBuffer: stopMethod === 'LAST_SWING',
      fixedStopDistance: stopMethod === 'FIXED_DISTANCE',
      tp1: Boolean(value.tp1 && value.tp1.enabled),
      tp1FixedProtection: Boolean(value.tp1 && value.tp1.enabled && (value.tp1.protection_mode || 'FIXED') === 'FIXED'),
      tp1StepProtection: Boolean(value.tp1 && value.tp1.enabled && value.tp1.protection_mode === 'TP2_STEPS'),
      tp2Value: tp2Method === 'FIXED_R' || tp2Method === 'FIXED_DISTANCE',
      riskValue: riskMethod === 'PERCENT_BALANCE' || riskMethod === 'FIXED_DOLLARS',
    };
  }

  function normalizeForApi(definition) {
    const value = deepClone(definition || blankStrategy());
    value.schema_version = 1;
    value.structure_timeframe = value.structure_timeframe || value.trading_timeframe;
    if (value.confirmation) value.confirmation.max_setup_age_bars ??= null;
    if (value.stop_loss) value.stop_loss.distance_filter = {
      enabled: false, mode: 'PERCENT_ENTRY', minimum: null, maximum: null,
      ...value.stop_loss.distance_filter,
    };

    if (!value.trend) value.trend = { timeframe: null, methods: [] };
    if (!value.trend.timeframe) value.trend.methods = [];
    const methods = Array.isArray(value.trend.methods) ? value.trend.methods : [];
    if (methods.includes('ALL')) {
      value.trend.methods = TREND_METHODS.slice();
    } else {
      value.trend.methods = methods.filter((method, index) =>
        TREND_METHODS.includes(method) && methods.indexOf(method) === index
      );
    }

    if (!value.entry) value.entry = blankStrategy().entry;
    value.entry.remember_bos_on_confirmation_failure = Boolean(
      value.entry.remember_bos_on_confirmation_failure
    );

    if (!value.tp1) value.tp1 = blankStrategy().tp1;
    value.tp1.target_basis = value.tp1.target_basis || 'SL_DISTANCE';
    value.tp1.protection_mode = value.tp1.protection_mode || 'FIXED';
    value.tp1.protection_steps = Array.isArray(value.tp1.protection_steps)
      ? value.tp1.protection_steps
      : [];
    if (value.tp1.enabled === false) {
      value.tp1.target_r = null;
      value.tp1.target_basis = 'SL_DISTANCE';
      value.tp1.close_percent = null;
      value.tp1.protection_r = null;
      value.tp1.protection_mode = 'FIXED';
      value.tp1.protection_steps = [];
    } else if (value.tp1.protection_mode === 'TP2_STEPS') {
      value.tp1.protection_r = null;
    } else {
      value.tp1.protection_steps = [];
    }

    if (value.stop_loss) {
      if (value.stop_loss.method === 'LAST_SWING') value.stop_loss.fixed_distance = null;
      if (value.stop_loss.method === 'FIXED_DISTANCE') value.stop_loss.buffer_pips = null;
    }

    if (value.tp2 && value.tp2.method === 'OPPOSITE_SWING') value.tp2.value = null;

    if (value.structure) {
      const rules = value.structure.break_validation || [];
      if (!rules.includes('MIN_BODY_PERCENT')) value.structure.minimum_body_percent = null;
      if (!rules.includes('MIN_DISTANCE')) value.structure.minimum_distance_pips = null;
    }
    if (value.confirmation) {
      const rules = value.confirmation.rules || [];
      if (!rules.includes('MIN_BODY_PERCENT')) value.confirmation.minimum_body_percent = null;
    }

    if (!value.fundamentals || !['BLOCK_OPPOSITE', 'REQUIRE_ALIGNMENT'].includes(value.fundamentals.mode)) {
      value.fundamentals = { mode: 'BLOCK_OPPOSITE' };
    }

    return value;
  }

  function finiteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function positive(value) {
    return finiteNumber(value) && value > 0;
  }

  function percent(value) {
    return finiteNumber(value) && value > 0 && value <= 100;
  }

  function clientValidation(definition) {
    const value = normalizeForApi(definition || blankStrategy());
    const errors = {};

    if (!Array.isArray(value.symbols) || value.symbols.length === 0) {
      errors.symbols = 'Select EURUSD, XAUUSD, or Both';
    }
    if (!value.trading_timeframe) {
      errors.trading_timeframe = 'Choose a trading timeframe';
    }

    const ranks = { '5m': 5, '15m': 15, '1h': 60 };
    if (!ranks[value.structure_timeframe] || ranks[value.structure_timeframe] < ranks[value.trading_timeframe])
      errors.structure_timeframe = 'Structure timeframe must be equal to or higher than trading timeframe';
    const age = value.confirmation?.max_setup_age_bars;
    if (age != null && (!Number.isInteger(age) || age < 1))
      errors['confirmation.max_setup_age_bars'] = 'Use a whole number of bars greater than zero';
    const filter = value.stop_loss?.distance_filter;
    if (filter?.enabled) {
      if (!['PERCENT_ENTRY', 'PIPS'].includes(filter.mode)) errors['stop_loss.distance_filter.mode'] = 'Choose Percent of Entry or Pips';
      for (const key of ['minimum', 'maximum'])
        if (!finiteNumber(filter[key]) || filter[key] < 0) errors[`stop_loss.distance_filter.${key}`] = 'Enter a number zero or greater';
      if (filter.maximum < filter.minimum) errors['stop_loss.distance_filter.maximum'] = 'Maximum must be at least the minimum';
    }
    const trend = value.trend || { timeframe: null, methods: [] };
    if (trend.methods.length && !trend.timeframe) {
      errors['trend.timeframe'] = 'Choose a higher trend timeframe';
    }
    if (trend.timeframe && value.trading_timeframe &&
        !trendTimeframeOptions(value.trading_timeframe).includes(trend.timeframe)) {
      errors['trend.timeframe'] = 'Trend timeframe must be higher than trading timeframe';
    }

    const structure = value.structure || {};
    const breakRules = Array.isArray(structure.break_validation) ? structure.break_validation : [];
    if (breakRules.includes('MIN_BODY_PERCENT') && !percent(structure.minimum_body_percent)) {
      errors['structure.minimum_body_percent'] = 'Enter a body percentage from 0 to 100';
    }
    if (breakRules.includes('MIN_DISTANCE') && !positive(structure.minimum_distance_pips)) {
      errors['structure.minimum_distance_pips'] = 'Enter a distance greater than 0';
    }

    const confirmation = value.confirmation || { rules: [] };
    const confirmationRules = Array.isArray(confirmation.rules) ? confirmation.rules : [];
    if (confirmationRules.includes('MIN_BODY_PERCENT') && !percent(confirmation.minimum_body_percent)) {
      errors['confirmation.minimum_body_percent'] = 'Enter a body percentage from 0 to 100';
    }

    const entry = value.entry || {};
    if (!entry.method) {
      errors['entry.method'] = 'Choose an entry method';
    } else if (entry.method === 'CONFIRMATION_CLOSE' && confirmationRules.length === 0) {
      errors['entry.method'] = 'Confirmation-close entry requires at least one confirmation rule';
    } else if (entry.method === 'RETEST' && !confirmationRules.includes('RETEST_LEVEL')) {
      errors['entry.method'] = 'Retest entry requires Retest broken level confirmation';
    } else if (entry.method === 'BOS_CHOCH_CLOSE' && confirmationRules.length > 0) {
      errors['entry.method'] = 'BOS/CHOCH-close entry cannot depend on future confirmation rules';
    }
    if (entry.remember_bos_on_confirmation_failure) {
      if (entry.method !== 'CONFIRMATION_CLOSE') {
        errors['entry.remember_bos_on_confirmation_failure'] = 'Remember BOS requires confirmation-close entry';
      } else if (!confirmationRules.includes('NEXT_SAME_DIRECTION')) {
        errors['entry.remember_bos_on_confirmation_failure'] = 'Remember BOS requires Next candle closes same direction';
      }
    }

    const stop = value.stop_loss || {};
    if (!stop.method) {
      errors['stop_loss.method'] = 'Choose a stop-loss method';
    } else if (stop.method === 'FIXED_DISTANCE' && !positive(stop.fixed_distance)) {
      errors['stop_loss.fixed_distance'] = 'Enter a fixed stop distance greater than 0';
    } else if (stop.method === 'LAST_SWING' && stop.buffer_pips != null &&
               (!finiteNumber(stop.buffer_pips) || stop.buffer_pips < 0)) {
      errors['stop_loss.buffer_pips'] = 'Swing buffer must be zero or greater';
    }

    const tp1 = value.tp1 || {};
    if (tp1.enabled) {
      if (!positive(tp1.target_r)) {
        errors['tp1.target_r'] = 'Enter a TP1 target greater than 0';
      } else if (tp1.target_basis === 'TP2_DISTANCE' && tp1.target_r > 1) {
        errors['tp1.target_r'] = 'TP2-based TP1 must be between 0% and 100%';
      }
      if (!percent(tp1.close_percent)) {
        errors['tp1.close_percent'] = 'Enter a close percentage from 0 to 100';
      }

      if ((tp1.protection_mode || 'FIXED') === 'FIXED') {
        if (!finiteNumber(tp1.protection_r)) {
          errors['tp1.protection_r'] = 'Choose TP1 protection';
        } else if (tp1.target_basis === 'TP2_DISTANCE' && (tp1.protection_r < 0 || tp1.protection_r > 1)) {
          errors['tp1.protection_r'] = 'TP2-based protection must be between 0% and 100%';
        }
      } else {
        if (tp1.target_basis !== 'TP2_DISTANCE') {
          errors['tp1.protection_mode'] = 'Step protection requires TP2-based TP1';
        }
        const steps = Array.isArray(tp1.protection_steps) ? tp1.protection_steps : [];
        if (!steps.length) {
          errors['tp1.protection_steps'] = 'Add at least one protection step';
        } else {
          let previousTrigger = -1;
          let previousSecure = -1;
          steps.forEach((step, index) => {
            const trigger = Number(step?.trigger_percent);
            const secure = Number(step?.secure_percent);
            const key = `tp1.protection_steps.${index}`;
            if (!Number.isFinite(trigger) || trigger <= 0 || trigger > 100) {
              errors[key] = 'Trigger must be between 0% and 100%';
            } else if (!Number.isFinite(secure) || secure < 0 || secure > 100) {
              errors[key] = 'Secure level must be between 0% and 100%';
            } else if (secure >= trigger) {
              errors[key] = 'Secure level must stay below its trigger';
            } else if (trigger <= previousTrigger) {
              errors[key] = 'Protection triggers must increase';
            } else if (secure < previousSecure) {
              errors[key] = 'Secure levels cannot move backward';
            }
            previousTrigger = trigger;
            previousSecure = secure;
          });
        }
      }
    }

    const tp2 = value.tp2 || {};
    if (!tp2.method) {
      errors['tp2.method'] = 'Choose a TP2 method';
    } else if ((tp2.method === 'FIXED_R' || tp2.method === 'FIXED_DISTANCE') && !positive(tp2.value)) {
      errors['tp2.value'] = 'Enter a TP2 value greater than 0';
    }

    const risk = value.risk || {};
    if (!risk.method) {
      errors['risk.method'] = 'Choose a risk method';
    } else if (!positive(risk.value)) {
      errors['risk.value'] = 'Enter a risk value greater than 0';
    }

    const fundamentalMode = value.fundamentals && value.fundamentals.mode;
    if (!['BLOCK_OPPOSITE', 'REQUIRE_ALIGNMENT'].includes(fundamentalMode)) {
      errors['fundamentals.mode'] = 'Choose how fundamentals should confirm LIVE entries';
    }

    return errors;
  }

  function rToPercent(value) {
    if (value == null || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number * 100 : null;
  }

  function percentToR(value) {
    if (value == null || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number / 100 : null;
  }

  function fmt(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '';
    return Number.isInteger(number) ? String(number) : String(number);
  }

  function buildSummary(definition) {
    const value = definition || blankStrategy();
    const parts = [];
    const tf = value.trading_timeframe;

    const trend = value.trend || { methods: [] };
    if (trend.methods && trend.methods.length) {
      const labels = {
        BOS_CHOCH: 'BOS/CHOCH',
        EMA_50: 'EMA 50',
        EMA_200: 'EMA 200',
        SWING_STRUCTURE: 'swing structure',
        ALL: 'all trend filters',
      };
      const methods = trend.methods.map((item) => labels[item] || item).join(' + ');
      parts.push(`${trend.timeframe || 'higher TF'} trend ${methods}`);
    }

    parts.push(`${value.structure_timeframe || tf || 'Structure TF'} BOS/CHOCH`);

    const structure = value.structure || {};
    const breakLabels = [];
    for (const rule of structure.break_validation || []) {
      if (rule === 'CLOSE_BEYOND') breakLabels.push('close beyond level');
      if (rule === 'MIN_BODY_PERCENT') {
        breakLabels.push(structure.minimum_body_percent == null ? 'minimum body %' : `body >= ${fmt(structure.minimum_body_percent)}%`);
      }
      if (rule === 'MIN_DISTANCE') {
        breakLabels.push(structure.minimum_distance_pips == null ? 'minimum break distance' : `distance >= ${fmt(structure.minimum_distance_pips)} pips`);
      }
    }
    if (breakLabels.length) parts.push(breakLabels.join(' + '));

    const confirmation = value.confirmation || {};
    const confirmLabels = [];
    for (const rule of confirmation.rules || []) {
      if (rule === 'NEXT_SAME_DIRECTION') confirmLabels.push('next candle same direction');
      if (rule === 'SECOND_CLOSE_BEYOND') confirmLabels.push('second close beyond level');
      if (rule === 'RETEST_LEVEL') confirmLabels.push('retest broken level');
      if (rule === 'MIN_BODY_PERCENT') {
        confirmLabels.push(confirmation.minimum_body_percent == null ? 'confirmation body %' : `body >= ${fmt(confirmation.minimum_body_percent)}%`);
      }
    }
    if (confirmLabels.length) parts.push(confirmLabels.join(' + '));

    if (confirmation.max_setup_age_bars != null) parts.push(`setup valid ${confirmation.max_setup_age_bars} ${tf} bars from original event`);

    const entryLabels = {
      BOS_CHOCH_CLOSE: 'BOS/CHOCH close',
      CONFIRMATION_CLOSE: 'confirmation close',
      RETEST: 'retest entry',
    };
    if (value.entry && value.entry.method) {
      let entryText = entryLabels[value.entry.method] || value.entry.method;
      if (value.entry.remember_bos_on_confirmation_failure) {
        entryText += ' / remember BOS on failed next candle → enter on valid re-break';
      }
      parts.push(entryText);
    }

    const stop = value.stop_loss || {};
    if (stop.method === 'LAST_SWING') {
      let text = `${value.structure_timeframe || tf || 'Structure TF'} swing SL`;
      if (stop.buffer_pips != null) text += ` + ${fmt(stop.buffer_pips)} pip buffer`;
      parts.push(text);
    } else if (stop.method === 'FIXED_DISTANCE') {
      parts.push(stop.fixed_distance == null ? 'fixed SL distance' : `SL ${fmt(stop.fixed_distance)} pips/points`);
    }

    if (stop.distance_filter?.enabled) {
      const f = stop.distance_filter;
      parts.push(`SL distance ${f.minimum}–${f.maximum} ${f.mode === 'PERCENT_ENTRY' ? '% of entry' : 'pips'}`);
    }
    const tp1 = value.tp1 || {};
    if (tp1.enabled) {
      const basisLabel = tp1.target_basis === 'TP2_DISTANCE' ? 'TP2 path' : 'SL';
      const target = tp1.target_r == null ? '?' : `${fmt(rToPercent(tp1.target_r))}% of ${basisLabel}`;
      const close = tp1.close_percent == null ? '?' : `${fmt(tp1.close_percent)}%`;
      let protection = '?';
      if (tp1.protection_mode === 'TP2_STEPS') {
        protection = (tp1.protection_steps || [])
          .map((step) => `${fmt(step.trigger_percent)}→${fmt(step.secure_percent)}%`)
          .join(', ');
        protection = protection ? `step protect ${protection}` : 'step protection';
      } else if (tp1.protection_r != null) {
        protection = Number(tp1.protection_r) === 0
          ? 'breakeven'
          : `secure ${fmt(rToPercent(tp1.protection_r))}% of ${basisLabel}`;
      }
      parts.push(`TP1 ${target} / close ${close} / ${protection}`);
    }

    const tp2 = value.tp2 || {};
    if (tp2.method === 'FIXED_R') parts.push(tp2.value == null ? 'TP2 fixed R' : `TP2 ${fmt(tp2.value)}R`);
    if (tp2.method === 'FIXED_DISTANCE') parts.push(tp2.value == null ? 'TP2 fixed distance' : `TP2 ${fmt(tp2.value)} pips/points`);
    if (tp2.method === 'OPPOSITE_SWING') parts.push('TP2 opposite swing');

    const risk = value.risk || {};
    if (risk.method === 'PERCENT_BALANCE') parts.push(risk.value == null ? 'risk % balance' : `risk ${fmt(risk.value)}% balance`);
    if (risk.method === 'FIXED_DOLLARS') parts.push(risk.value == null ? 'fixed $ risk' : `risk ${fmt(risk.value)}`);

    const fundamentalMode = value.fundamentals?.mode || 'BLOCK_OPPOSITE';
    parts.push(fundamentalMode === 'REQUIRE_ALIGNMENT'
      ? 'LIVE fundamentals require alignment'
      : 'LIVE fundamentals block opposite bias');

    return parts.join(' → ');
  }

  return {
    TREND_METHODS: TREND_METHODS.slice(),
    blankStrategy,
    visibleFields,
    normalizeForApi,
    clientValidation,
    buildSummary,
    trendTimeframeOptions,
    rToPercent,
    percentToR,
  };
});
