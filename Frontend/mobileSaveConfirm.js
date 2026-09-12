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

  // Broker Accounts used to be the full desktop broker manager, including the
  // complete account list, active-account switching, refresh/connect controls,
  // and account actions. The lightweight mobile summary removed those actions.
  // Route only this Settings item back to the existing full broker manager.
  function restoreBrokerAccountsLink() {
    const links = document.querySelectorAll('.desktop-settings-submenu a');
    const brokerLink = Array.from(links).find(link =>
      String(link.textContent || '').trim() === 'Broker Accounts'
    );
    if (!brokerLink) return;

    brokerLink.setAttribute('href', '#broker-accounts');
    brokerLink.removeAttribute('onclick');
    if (brokerLink.dataset.fullBrokerManager === '1') return;
    brokerLink.dataset.fullBrokerManager = '1';

    brokerLink.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      window.location.href = '/app?desktop=1&from=mobile&open=menuBrokerAccountsBtn';
    });
  }

  restoreBrokerAccountsLink();
  window.addEventListener('pageshow', restoreBrokerAccountsLink);
})();

// Mobile menu can be entered from the lightweight dashboard before user-auth
// has rebuilt its per-tab role marker. In that state the shared document-level
// logout listener used to ignore the click. Catch it at window capture level
// and call the real auth logout API directly, independent of that role marker.
(() => {
  'use strict';
  let loggingOut = false;

  function emergencyLocalLogout() {
    try {
      localStorage.removeItem('flowsignal_access');
      localStorage.removeItem('flowsignal_role');
      localStorage.removeItem('flowsignal_user_session_persist');
      localStorage.removeItem('flowsignal_session_token');
      const tabPrefix = 'flowsignal_tab_';
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(tabPrefix) || key.startsWith('flowsignal_tab_user_session:') || key.startsWith('flowsignal_tab_admin_session:')) {
          localStorage.removeItem(key);
        }
      });
    } catch (_error) {}

    try {
      sessionStorage.removeItem('flowsignal_user_session_token');
      sessionStorage.removeItem('flowsignal_csrf_token');
      sessionStorage.removeItem('flowsignal_tab_role');
      sessionStorage.removeItem('flowsignal_public_home_mode');
      sessionStorage.setItem('flowsignal_tab_signed_out', '1');
    } catch (_error) {}

    try {
      document.cookie = 'flowsignal_login_hint=; Max-Age=0; Path=/; Secure; SameSite=Lax';
    } catch (_error) {}
    try { window.name = ''; } catch (_error) {}
    window.location.replace('/');
  }

  window.addEventListener('click', event => {
    const button = event.target?.closest?.('#logoutBtn');
    if (!button || loggingOut) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    loggingOut = true;
    button.disabled = true;
    const label = button.querySelector('strong');
    if (label) label.textContent = 'Logging out…';

    Promise.resolve()
      .then(() => {
        if (window.FlowSignalAuth?.logout) return window.FlowSignalAuth.logout();
        throw new Error('Auth logout unavailable');
      })
      .catch(() => emergencyLocalLogout());
  }, true);
})();
