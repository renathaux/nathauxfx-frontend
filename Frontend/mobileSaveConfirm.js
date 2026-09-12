(() => {
  'use strict';

  const SAVE_SELECTOR = '#mobileRiskSave, #mobileStrategySave';
  const SUCCESS_RE = /(^|\b)(saved|strategy saved|success|updated)(\b|\.)/i;
  const ERROR_RE = /(could not|failed|error|unauthorized|sign in|session)/i;

  function statusElement() {
    return document.getElementById('mobileSettingsStatus');
  }

  function restoreButton(button) {
    if (!button || !button.isConnected) return;
    button.dataset.saveConfirmArmed = '0';
    button.disabled = false;
    button.textContent = button.dataset.saveDefaultLabel || 'Save Changes';
  }

  function showResult(button, ok) {
    if (!button || !button.isConnected) return;
    button.disabled = false;
    button.dataset.saveConfirmArmed = '0';
    button.textContent = ok ? '✓ OK' : 'Try Again';
    window.setTimeout(() => restoreButton(button), ok ? 1400 : 2200);
  }

  function watchSaveResult(button) {
    const status = statusElement();
    if (!status) {
      window.setTimeout(() => showResult(button, true), 450);
      return;
    }

    let settled = false;
    const settle = ok => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      showResult(button, ok);
    };

    const inspect = () => {
      const text = String(status.textContent || '').trim();
      if (ERROR_RE.test(text)) settle(false);
      else if (SUCCESS_RE.test(text) && !/^saving/i.test(text)) settle(true);
    };

    const observer = new MutationObserver(inspect);
    observer.observe(status, { childList: true, subtree: true, characterData: true });
    inspect();

    window.setTimeout(() => {
      if (!settled) {
        observer.disconnect();
        if (button?.isConnected) {
          button.disabled = false;
          button.dataset.saveConfirmArmed = '0';
          button.textContent = button.dataset.saveDefaultLabel || 'Save Changes';
        }
      }
    }, 10000);
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.(SAVE_SELECTOR);
    if (!button) return;

    if (!button.dataset.saveDefaultLabel) {
      button.dataset.saveDefaultLabel = button.textContent.trim() || 'Save Changes';
    }

    if (button.dataset.saveConfirmArmed !== '1') {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      button.dataset.saveConfirmArmed = '1';
      button.textContent = 'Confirm';
      const status = statusElement();
      if (status) {
        status.textContent = 'Tap Confirm to save these changes.';
        status.classList.remove('error');
      }
      window.setTimeout(() => {
        if (button?.isConnected && button.dataset.saveConfirmArmed === '1') {
          restoreButton(button);
        }
      }, 6000);
      return;
    }

    button.dataset.saveConfirmArmed = '0';
    button.textContent = 'Saving…';
    watchSaveResult(button);
    // Do not stop this second click. The existing Risk/Strategy save handler
    // receives it and performs the real backend save.
  }, true);
})();
