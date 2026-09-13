(function () {
  'use strict';

  const THEME_KEY = 'nathauxfx_theme';
  const OWNER_TOKEN_KEY = 'flowsignal_session_token';
  const ROLE_KEY = 'flowsignal_role';
  const TAB_ROLE_KEY = 'flowsignal_tab_role';
  const systemTheme = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;

  function resumePersistentOwnerFromHome() {
    if (!/^\/$/.test(window.location.pathname)) return false;
    try {
      const role = String(localStorage.getItem(ROLE_KEY) || '').toLowerCase();
      const token = String(localStorage.getItem(OWNER_TOKEN_KEY) || '').trim();
      if (role !== 'admin' || !token) return false;

      sessionStorage.removeItem('flowsignal_user_session_token');
      sessionStorage.removeItem('flowsignal_binary_user_id');
      sessionStorage.removeItem('flowsignal_tab_signed_out');
      sessionStorage.removeItem('flowsignal_public_home_mode');
      sessionStorage.setItem(TAB_ROLE_KEY, 'admin');
      localStorage.setItem('flowsignal_access', JSON.stringify({
        granted: true,
        time: Date.now()
      }));
      window.location.replace('/app');
      return true;
    } catch (_error) {
      return false;
    }
  }

  if (resumePersistentOwnerFromHome()) return;

  function getSavedTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return saved === 'light' || saved === 'dark' ? saved : null;
    } catch (_error) {
      return null;
    }
  }

  function getEffectiveTheme() {
    const saved = getSavedTheme();
    if (saved) return saved;
    return systemTheme && systemTheme.matches ? 'light' : 'dark';
  }

  function updateButton(theme) {
    const button = document.getElementById('themeToggle');
    if (!button) return;
    const isDark = theme === 'dark';
    const nextTheme = isDark ? 'light' : 'dark';
    button.setAttribute('aria-checked', String(isDark));
    button.setAttribute('aria-label', `Switch to ${nextTheme} mode`);
    button.title = `Switch to ${nextTheme} mode`;
  }

  function resetHorizontalScroll() {
    const y = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    try { window.scrollTo(0, y); } catch (_error) {}
    try { document.documentElement.scrollLeft = 0; } catch (_error) {}
    try { document.body.scrollLeft = 0; } catch (_error) {}
  }

  function applyTheme(theme, persist) {
    document.documentElement.setAttribute('data-theme', theme);
    if (persist) {
      try { localStorage.setItem(THEME_KEY, theme); } catch (_error) {}
    }
    updateButton(theme);
    resetHorizontalScroll();
  }

  function initThemeToggle() {
    applyTheme(getEffectiveTheme(), false);
    resetHorizontalScroll();

    requestAnimationFrame(function () {
      resetHorizontalScroll();
      requestAnimationFrame(resetHorizontalScroll);
    });
    setTimeout(resetHorizontalScroll, 80);

    const button = document.getElementById('themeToggle');
    if (button) {
      button.addEventListener('click', function () {
        const current = document.documentElement.getAttribute('data-theme') || getEffectiveTheme();
        applyTheme(current === 'dark' ? 'light' : 'dark', true);
      });
    }

    if (systemTheme) {
      const onSystemThemeChange = function (event) {
        if (!getSavedTheme()) applyTheme(event.matches ? 'light' : 'dark', false);
      };
      if (typeof systemTheme.addEventListener === 'function') {
        systemTheme.addEventListener('change', onSystemThemeChange);
      } else if (typeof systemTheme.addListener === 'function') {
        systemTheme.addListener('change', onSystemThemeChange);
      }
    }
  }

  function loadMobileLandingLockedLayout() {
    if (window.innerWidth > 700) return;
    if (document.querySelector('script[data-mobile-landing-selected-lock]')) return;
    const script = document.createElement('script');
    script.src = 'mobile-landing-layout-locked.js?v=9';
    script.dataset.mobileLandingSelectedLock = 'true';
    script.async = false;
    document.body.appendChild(script);
  }

  function loadMobileLandingEditorDragFix() {
    if (window.innerWidth > 700) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('mobileEdit') !== '1') return;
    if (document.querySelector('script[data-mobile-landing-drag-fix]')) return;
    const script = document.createElement('script');
    script.src = 'mobile-landing-editor-drag-fix.js?v=1';
    script.dataset.mobileLandingDragFix = 'true';
    script.async = false;
    document.body.appendChild(script);
  }

  window.addEventListener('pageshow', resetHorizontalScroll);
  window.addEventListener('load', resetHorizontalScroll, { once: true });
  window.addEventListener('load', function () {
    setTimeout(loadMobileLandingLockedLayout, 0);
    setTimeout(loadMobileLandingEditorDragFix, 40);
  }, { once: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeToggle, { once: true });
  } else {
    initThemeToggle();
  }
})();