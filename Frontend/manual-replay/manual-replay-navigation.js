(function (root) {
  'use strict';

  function isManualReplayPath(pathname) {
    return pathname === '/manual-replay' || pathname.startsWith('/manual-replay/');
  }

  function sync(document, pathname) {
    const active = isManualReplayPath(pathname || '');
    for (const id of ['menuManualReplayBtn', 'manualReplayNavLink']) {
      const link = document.getElementById(id);
      if (!link) continue;
      link.classList[active ? 'add' : 'remove']('is-active');
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { isManualReplayPath, sync };
  }

  if (root.document) {
    const install = () => sync(root.document, root.location.pathname);
    if (root.document.readyState === 'loading') {
      root.document.addEventListener('DOMContentLoaded', install, { once: true });
    } else {
      install();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
