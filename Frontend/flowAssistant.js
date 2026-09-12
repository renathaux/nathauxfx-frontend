(function () {
  'use strict';

  window.FlowSignalAssistant = {
    feature: "flowAssistant",
    status: "loaded",
  };

  // Keep mobile menu/settings pages below the persistent app header so the
  // NathauxFX brand/menu/status row remains visible instead of overlapping page
  // content. This only applies to phone layouts.
  function installMobileSettingsHeaderSpacing() {
    if (document.getElementById('flowsignalMobileSettingsHeaderSpacing')) return;

    const style = document.createElement('style');
    style.id = 'flowsignalMobileSettingsHeaderSpacing';
    style.textContent = `
      @media (max-width: 700px) {
        :root {
          --flowsignal-mobile-settings-top: calc(max(7px, env(safe-area-inset-top)) + 54px);
        }

        body[data-active-settings-page="assistant"] #assistantModal .assistant-modal-box,
        body[data-active-settings-page^="settings:"] #settingsModal .settings-modal-box,
        body[data-active-settings-page="auto-trade"] #paperModal .trade-modal-box,
        body[data-active-settings-page="performance"] #statsModal .performance-modal-box {
          top: var(--flowsignal-mobile-settings-top) !important;
          bottom: 0 !important;
          height: auto !important;
          max-height: calc(100dvh - var(--flowsignal-mobile-settings-top)) !important;
        }

        body.fit-mode #feedbackModal:not(.hidden) {
          padding-top: var(--flowsignal-mobile-settings-top) !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          align-items: flex-start !important;
          justify-content: flex-start !important;
        }

        body.fit-mode #feedbackModal:not(.hidden) .feedback-modal-box {
          position: relative !important;
          top: auto !important;
          right: auto !important;
          bottom: auto !important;
          left: 0 !important;
          transform: none !important;
          margin: 8px 0 0 0 !important;
          width: min(88vw, 520px) !important;
          max-width: min(88vw, 520px) !important;
          max-height: calc(100dvh - var(--flowsignal-mobile-settings-top) - 12px) !important;
          overflow-y: auto !important;
          border-radius: 0 20px 20px 0 !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  installMobileSettingsHeaderSpacing();

  // Give Flow Assistant's Save button a visible two-step response on mobile:
  // first tap -> Confirm, second tap -> the existing save handler runs, then OK.
  function installAssistantSaveConfirmation() {
    const button = document.querySelector('.assistant-save-btn');
    if (!button || button.dataset.flowSaveConfirmInstalled === '1') return false;

    button.dataset.flowSaveConfirmInstalled = '1';
    button.dataset.flowSaveDefaultLabel = button.textContent.trim() || '✓ Save Changes';
    button.dataset.flowSaveStage = 'idle';

    button.addEventListener('click', (event) => {
      if (button.dataset.flowSaveStage !== 'confirm') {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        button.dataset.flowSaveStage = 'confirm';
        button.textContent = 'Confirm';

        window.setTimeout(() => {
          if (!button.isConnected || button.dataset.flowSaveStage !== 'confirm') return;
          button.dataset.flowSaveStage = 'idle';
          button.textContent = button.dataset.flowSaveDefaultLabel || '✓ Save Changes';
        }, 6000);
        return;
      }

      // Let the existing application listener receive the second click.
      button.dataset.flowSaveStage = 'saving';
      button.textContent = 'Saving…';

      window.setTimeout(() => {
        if (!button.isConnected) return;
        button.dataset.flowSaveStage = 'ok';
        button.textContent = '✓ OK';
        window.setTimeout(() => {
          if (!button.isConnected) return;
          button.dataset.flowSaveStage = 'idle';
          button.textContent = button.dataset.flowSaveDefaultLabel || '✓ Save Changes';
        }, 1400);
      }, 350);
    }, true);

    return true;
  }

  installAssistantSaveConfirmation();
  window.addEventListener('load', installAssistantSaveConfirmation, { once: true });

  // Voice safety boundary:
  // WIN / LOSS / closed-trade speech must come from a real broker-backed
  // FlowSignal Forex trade. Binary 5m research/hypothetical results must never
  // be interpreted as a real closed trade by the shared assistant.
  //
  // script.js is loaded after this module, so install the wrapper as soon as
  // its global voice snapshot builder becomes available.
  function hasBrokerIdentity(trade) {
    if (!trade || typeof trade !== 'object') return false;
    const source = String(trade.source || '').trim().toLowerCase();
    if (source && !['broker', 'ctrader'].includes(source)) return false;

    const id =
      trade.broker_position_id ||
      trade.position_id ||
      trade.broker_order_id ||
      trade.order_id ||
      (String(trade.trade_id || '').startsWith('ctrader-') ? trade.trade_id : null);

    return id !== null && id !== undefined && String(id).trim() !== '';
  }

  function installBrokerBackedVoiceGuard() {
    const original = window.buildVoiceSnapshot;
    if (typeof original !== 'function') return false;
    if (original.__brokerBackedCloseGuard) return true;

    function guardedBuildVoiceSnapshot(symbol, data, meta) {
      const snapshot = original.apply(this, arguments);
      if (!snapshot || typeof snapshot !== 'object') return snapshot;

      const history = Array.isArray(meta?.live_trade_history)
        ? meta.live_trade_history
        : [];

      const safeClosedTrades = history
        .filter((trade) => {
          if (!trade || String(trade.symbol || '').toUpperCase() !== String(symbol || '').toUpperCase()) {
            return false;
          }
          if (!hasBrokerIdentity(trade)) return false;
          if (typeof window.isLiveTradeActiveForDisplay === 'function' && window.isLiveTradeActiveForDisplay(trade)) {
            return false;
          }
          return true;
        })
        .map((trade) => ({
          key: typeof window.getVoiceTradeKey === 'function'
            ? window.getVoiceTradeKey(trade, symbol)
            : String(
                trade.broker_position_id ||
                trade.position_id ||
                trade.broker_order_id ||
                trade.order_id ||
                trade.trade_id
              ),
          result: typeof window.getLiveTradeResult === 'function'
            ? window.getLiveTradeResult(trade)
            : String(trade.result || trade.status || '').toUpperCase(),
          pnl: typeof window.getLiveTradePnl === 'function'
            ? window.getLiveTradePnl(trade)
            : Number(trade.pnl || trade.profit || 0),
        }));

      snapshot.closedTrades = safeClosedTrades;
      return snapshot;
    }

    guardedBuildVoiceSnapshot.__brokerBackedCloseGuard = true;
    guardedBuildVoiceSnapshot.__original = original;
    window.buildVoiceSnapshot = guardedBuildVoiceSnapshot;
    console.info('FLOWSIGNAL_VOICE_BROKER_CLOSE_GUARD_INSTALLED');
    return true;
  }

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (installBrokerBackedVoiceGuard() || attempts >= 200) {
      window.clearInterval(timer);
    }
  }, 25);

  window.addEventListener('load', installBrokerBackedVoiceGuard, { once: true });
})();
