(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.NathauxMobileV3B = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  function asObject(value) {
    return value && typeof value === "object" ? value : null;
  }

  function firstText(...values) {
    for (const value of values) {
      if (value == null) continue;
      const text = String(value).trim();
      if (text) return text;
    }
    return "";
  }

  function normalizeSignal(value) {
    const signal = String(value || "WAIT").toUpperCase();
    if (signal.includes("BUY")) return "BUY";
    if (signal.includes("SELL")) return "SELL";
    return "WAIT";
  }

  function isInactiveState(value) {
    return /(?:EXPIRED|INVALIDATED|CONSUMED|INACTIVE|CANCELLED|CANCELED)/i.test(String(value || ""));
  }

  function strategyDebugSnapshot(plan) {
    return {
      ...(asObject(plan?.signal_diagnostics) || {}),
      ...(asObject(plan?.entry_strategy_debug) || {}),
      ...(asObject(plan?.strategy_debug) || {}),
    };
  }

  function currentEventId(candidate, liveDetails) {
    return firstText(
      candidate?.source_indicator_event_id,
      candidate?.indicator_event_id,
      candidate?.source_event_id,
      candidate?.event_id,
      candidate?.stable_event_id,
      candidate?.m5_bos_id,
      candidate?.five_m_bos_id,
      liveDetails?.source_indicator_event_id,
      liveDetails?.indicator_event_id,
      liveDetails?.event_id,
      liveDetails?.stable_event_id,
      liveDetails?.m5_bos_id,
      liveDetails?.five_m_bos_id
    );
  }

  function mobileV3bFacts(plan = {}) {
    const liveDetails = asObject(plan.live_v3b_details) || {};
    const strategyDebug = strategyDebugSnapshot(plan);
    const explicitV3BReason = firstText(
      plan.live_v3b_reason,
      liveDetails.live_v3b_reason,
      liveDetails.reason,
      liveDetails.block_reason
    );
    const model = firstText(
      plan.live_strategy_model,
      plan.strategy_model,
      liveDetails.strategy_execution_profile,
      liveDetails.paper_entry_model
    ).toUpperCase();

    let candidate = asObject(liveDetails.source_candidate) || asObject(liveDetails.candidate);
    if (!candidate && explicitV3BReason && model.includes("V3B")) {
      candidate = asObject(plan.source_candidate) || asObject(plan.candidate);
    }

    const candidateReason = firstText(
      candidate?.paper_entry_reason,
      candidate?.live_v3b_reason,
      candidate?.block_reason
    );
    const v3bReason = explicitV3BReason || (/^(?:WAIT_)?V3B(?:_|$)/i.test(candidateReason) ? candidateReason : "");
    const genericReason = firstText(
      strategyDebug.blocked_reason,
      strategyDebug.block_reason,
      strategyDebug.reason,
      strategyDebug.reason_if_wait,
      strategyDebug.rejection_reason,
      plan.blocked_reason,
      plan.block_reason,
      plan.reason,
      plan.execution_block_reason,
      "--"
    );
    const reason = v3bReason || genericReason || "--";

    const eventId = currentEventId(candidate, liveDetails);
    const lifecycleState = firstText(
      candidate?.lifecycle_state,
      candidate?.event_state,
      candidate?.state,
      liveDetails.lifecycle_state,
      liveDetails.event_state,
      liveDetails.state,
      strategyDebug.lifecycle_state,
      strategyDebug.event_state,
      strategyDebug.state
    );
    const currentEvent = Boolean(
      candidate
      && eventId
      && !isInactiveState(lifecycleState)
      && !isInactiveState(v3bReason)
      && !isInactiveState(genericReason)
    );

    if (!currentEvent) {
      return {
        reason,
        currentEvent: false,
        hasBos: false,
        bodyPass: false,
        secondSame: false,
        beyond: false,
        swingSl: false,
        signal: "WAIT",
      };
    }

    const details = asObject(candidate.paper_entry_details)
      || asObject(liveDetails.paper_entry_details)
      || {};
    const explicitBos = details.five_m_bos_detected
      ?? candidate.five_m_bos_detected
      ?? details.bos_detected
      ?? candidate.bos_detected;
    const hasBos = typeof explicitBos === "boolean"
      ? explicitBos
      : candidate.five_m_bos_level != null
        || candidate.five_m_break_time != null
        || candidate.bos_level != null;

    const bodyRatio = Number(details.bos_body_ratio ?? candidate.bos_body_ratio);
    const bodyMin = Number(details.minimum_bos_body_ratio ?? candidate.minimum_bos_body_ratio ?? 0.5);
    const bodyPass = Number.isFinite(bodyRatio) ? bodyRatio >= bodyMin : false;
    const secondSame = typeof details.second_5m_same_direction === "boolean"
      ? details.second_5m_same_direction
      : typeof candidate.second_5m_same_direction === "boolean"
        ? candidate.second_5m_same_direction
        : false;
    const beyond = typeof details.second_5m_stays_beyond_bos_level === "boolean"
      ? details.second_5m_stays_beyond_bos_level
      : typeof candidate.second_5m_stays_beyond_bos_level === "boolean"
        ? candidate.second_5m_stays_beyond_bos_level
        : false;
    const explicitSwingSl = details.swing_sl_valid
      ?? candidate.swing_sl_valid
      ?? details.swing_sl_found
      ?? candidate.swing_sl_found;
    const swingSl = typeof explicitSwingSl === "boolean"
      ? explicitSwingSl
      : candidate.stop_loss != null || candidate.sl != null || candidate.paper_entry_ready === true;

    return {
      reason,
      currentEvent: true,
      hasBos: Boolean(hasBos),
      bodyPass,
      secondSame,
      beyond,
      swingSl: Boolean(swingSl),
      signal: normalizeSignal(candidate.signal || candidate.final_signal || candidate.final_entry_decision),
    };
  }

  return { mobileV3bFacts };
});
