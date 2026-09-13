(function(){
  'use strict';
  if (window.innerWidth > 700) return;

  const STORAGE_KEY = 'nathauxfx_mobile_landing_layout_v2';

  function setImportant(el, prop, value){
    if (el) el.style.setProperty(prop, value, 'important');
  }

  function clearOldPageEditors(){
    document.getElementById('mobilePageStretchFrame')?.remove();
    document.getElementById('mobilePageStretchEditorStyle')?.remove();
    document.getElementById('mobilePageCutEditorStyle')?.remove();
    document.querySelectorAll('.mobile-page-cut-overlay').forEach(el=>el.remove());
  }

  function restoreMovedTextOnly(){
    clearOldPageEditors();

    /* Keep the text the user moved out of the two cards, but make the card shells invisible. */
    const shellSelectors = [
      '.trust-section',
      '.trust-card',
      '.trust-points > .trust-point',
      '.hero-stats',
      '.hero-stats > div:not(.legal-links)'
    ];

    document.querySelectorAll(shellSelectors.join(',')).forEach(el=>{
      setImportant(el,'background','transparent');
      setImportant(el,'background-image','none');
      setImportant(el,'border-color','transparent');
      setImportant(el,'box-shadow','none');
      setImportant(el,'outline','none');
      setImportant(el,'overflow','visible');
    });

    /* The separate mobile footer is not part of the moved card text and only duplicates links. */
    const footer = document.querySelector('.mobile-footer');
    if (footer) setImportant(footer,'display','none');

    /* Do not let old CUT/STRETCH values alter the restored layout. */
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && typeof saved === 'object') {
        delete saved.pageCuts;
        delete saved.pageStretch;
        if (saved.scope === 'mobile-only-text-and-page-cut-editor' || saved.scope === 'mobile-only-text-and-page-stretch-editor' || saved.scope === 'mobile-only-hero-editor') {
          saved.scope = 'mobile-only-text-editor';
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      }
    } catch(_e) {}
  }

  function fitPageToVisibleContent(){
    const page = document.getElementById('landingPage');
    if (!page) return;

    /* First remove old forced page sizing before measuring the actual moved text. */
    ['height','min-height','max-height','overflow-y','margin-top'].forEach(prop=>page.style.removeProperty(prop));
    setImportant(page,'overflow-x','visible');

    const selectors = [
      '.landing-nav',
      '.hero-pill',
      '.mobile-title-line-1',
      '.mobile-title-line-2',
      '.hero-left > p',
      '.hero-actions',
      '.hero-badges',
      '.hero-right',
      '.trust-card > h2',
      '.trust-card > p:nth-of-type(1)',
      '.trust-card > p:nth-of-type(2)',
      '.trust-points > .trust-point > strong',
      '.trust-points > .trust-point > span',
      '.hero-stats > div:nth-of-type(1) > strong',
      '.hero-stats > div:nth-of-type(1) > span',
      '.hero-stats > div:nth-of-type(2) > strong',
      '.hero-stats > div:nth-of-type(2) > span',
      '.hero-stats > div:nth-of-type(3) > strong',
      '.hero-stats > div:nth-of-type(3) > span',
      '.hero-stats > div:nth-of-type(4) > strong',
      '.hero-stats > div:nth-of-type(4) > span',
      '.hero-stats > .risk-note',
      '.hero-stats > .legal-links'
    ];

    const pageRect = page.getBoundingClientRect();
    let bottom = 0;
    selectors.forEach(selector=>{
      document.querySelectorAll(selector).forEach(el=>{
        if (!(el instanceof HTMLElement)) return;
        const css = getComputedStyle(el);
        if (css.display === 'none' || css.visibility === 'hidden') return;
        const rect = el.getBoundingClientRect();
        if (!Number.isFinite(rect.bottom) || rect.width <= 0 || rect.height <= 0) return;
        bottom = Math.max(bottom, rect.bottom - pageRect.top);
      });
    });

    if (bottom <= 0) return;
    const finalHeight = Math.max(window.innerHeight, Math.ceil(bottom + 28));
    setImportant(page,'height',finalHeight+'px');
    setImportant(page,'min-height',finalHeight+'px');
    setImportant(page,'max-height',finalHeight+'px');
    setImportant(page,'overflow-y','clip');
    setImportant(page,'overflow-x','visible');
  }

  function apply(){
    restoreMovedTextOnly();
    fitPageToVisibleContent();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,120),{once:true});
  } else {
    setTimeout(apply,120);
  }

  window.addEventListener('load',()=>{
    setTimeout(apply,180);
    setTimeout(apply,360);
    setTimeout(apply,700);
  },{once:true});
})();
