(() => {
  'use strict';

  const MOBILE_MAX = 700;
  const LEGACY_PANEL_SELECTOR = 'a[href*="desktop=1"][href*="from=mobile"][href*="open="]';
  const HOST_ID = 'mobileEmbeddedAppPanel';
  const FRAME_ID = 'mobileEmbeddedAppFrame';
  const STYLE_ID = 'mobileEmbeddedAppPanelStyle';

  function isMobile() {
    return window.innerWidth <= MOBILE_MAX;
  }

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${HOST_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483000;
        background: #020812;
      }
      #${HOST_ID}.hidden {
        display: none !important;
      }
      #${HOST_ID} iframe {
        width: 100%;
        height: 100%;
        border: 0;
        display: block;
        background: #020812;
      }
      #${HOST_ID} .mobile-panel-return {
        position: fixed;
        left: 14px;
        bottom: max(14px, env(safe-area-inset-bottom));
        z-index: 2147483001;
        min-width: 54px;
        height: 46px;
        padding: 0 14px;
        border: 1px solid rgba(148, 163, 184, .35);
        border-radius: 999px;
        background: rgba(7, 18, 32, .96);
        color: #f8fafc;
        box-shadow: 0 10px 28px rgba(0, 0, 0, .35);
        font: 800 13px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      body.mobile-embedded-panel-open {
        overflow: hidden !important;
        overscroll-behavior: none;
      }
    `;
    document.head.appendChild(style);
  }

  function ensureHost() {
    let host = document.getElementById(HOST_ID);
    if (host) return host;

    host = document.createElement('section');
    host.id = HOST_ID;
    host.className = 'hidden';
    host.setAttribute('aria-hidden', 'true');
    host.innerHTML = `
      <iframe id="${FRAME_ID}" title="NathauxFX panel" loading="eager"></iframe>
      <button class="mobile-panel-return" type="button" aria-label="Back to mobile dashboard">← Home</button>
    `;
    document.body.appendChild(host);
    host.querySelector('.mobile-panel-return')?.addEventListener('click', closePanel);
    return host;
  }

  function closeMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const backdrop = document.getElementById('mobileBackdrop');
    if (menu) {
      menu.classList.add('hidden');
      menu.setAttribute('aria-hidden', 'true');
    }
    if (backdrop) {
      backdrop.classList.add('hidden');
      backdrop.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('sheet-open');
  }

  function panelUrl(anchor) {
    const source = new URL(anchor.getAttribute('href') || anchor.href, window.location.href);
    const target = new URL('app.html', window.location.href);
    target.searchParams.set('desktop', '1');
    target.searchParams.set('from', 'mobile');
    target.searchParams.set('embedded', '1');
    const open = source.searchParams.get('open');
    if (open) target.searchParams.set('open', open);
    return target.toString();
  }

  function openPanel(anchor) {
    if (!isMobile()) return;
    installStyle();
    const host = ensureHost();
    const frame = host.querySelector(`#${FRAME_ID}`);
    if (!frame) return;

    closeMobileMenu();
    frame.src = panelUrl(anchor);
    host.classList.remove('hidden');
    host.setAttribute('aria-hidden', 'false');
    document.body.classList.add('mobile-embedded-panel-open');
  }

  function closePanel() {
    const host = document.getElementById(HOST_ID);
    if (!host) return;
    const frame = host.querySelector(`#${FRAME_ID}`);
    host.classList.add('hidden');
    host.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('mobile-embedded-panel-open');
    if (frame) frame.src = 'about:blank';
  }

  document.addEventListener('click', (event) => {
    const anchor = event.target.closest?.(LEGACY_PANEL_SELECTOR);
    if (!anchor || !isMobile()) return;
    event.preventDefault();
    event.stopPropagation();
    openPanel(anchor);
  }, true);

  window.addEventListener('pageshow', () => {
    if (!isMobile()) closePanel();
  });

  window.FlowSignalMobileAppPanel = {
    close: closePanel,
  };
})();
