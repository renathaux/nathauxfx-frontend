(function(){
  'use strict';
  if (window.innerWidth > 700) return;

  const APPROVED_HERO_TOP_CUT = 192;
  let heroBase = null;

  function setImportant(el, prop, value){
    if (el) el.style.setProperty(prop, value, 'important');
  }

  function numberPx(value){
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }

  function applyApprovedHeroCut(){
    const hero = document.querySelector('.hero-section');
    if (!hero) return;
    if (!heroBase) {
      const css = getComputedStyle(hero);
      heroBase = {
        marginTop: numberPx(css.marginTop),
        paddingTop: numberPx(css.paddingTop)
      };
    }
    setImportant(hero, 'margin-top', (heroBase.marginTop - APPROVED_HERO_TOP_CUT) + 'px');
    setImportant(hero, 'padding-top', (heroBase.paddingTop + APPROVED_HERO_TOP_CUT) + 'px');
  }

  function removeEmptyCardChrome(){
    const selectors = [
      '.trust-card',
      '.trust-points > .trust-point',
      '.hero-stats',
      '.hero-stats > div:not(.legal-links)'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(el=>{
      setImportant(el, 'background', 'transparent');
      setImportant(el, 'background-image', 'none');
      setImportant(el, 'border', '0');
      setImportant(el, 'box-shadow', 'none');
      setImportant(el, 'outline', '0');
    });
  }

  function removeOldCutEditorChrome(){
    document.querySelectorAll('.mobile-page-cut-overlay').forEach(el=>el.remove());
    const style = document.getElementById('mobilePageCutEditorStyle');
    if (style) style.remove();
  }

  function trimPageAfterRealContent(){
    const page = document.getElementById('landingPage');
    if (!page) return;

    page.style.removeProperty('height');
    page.style.removeProperty('min-height');
    page.style.removeProperty('max-height');
    page.style.removeProperty('overflow-y');

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
        const rect = el.getBoundingClientRect();
        if (!Number.isFinite(rect.bottom) || rect.width <= 0 || rect.height <= 0) return;
        bottom = Math.max(bottom, rect.bottom - pageRect.top);
      });
    });

    const finalHeight = Math.max(window.innerHeight, Math.ceil(bottom + 28));
    setImportant(page, 'height', finalHeight + 'px');
    setImportant(page, 'min-height', finalHeight + 'px');
    setImportant(page, 'max-height', finalHeight + 'px');
    setImportant(page, 'overflow-y', 'clip');
    setImportant(page, 'overflow-x', 'visible');
  }

  function applyFinalCleanup(){
    removeOldCutEditorChrome();
    applyApprovedHeroCut();
    removeEmptyCardChrome();
    trimPageAfterRealContent();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ()=>setTimeout(applyFinalCleanup, 120), {once:true});
  } else {
    setTimeout(applyFinalCleanup, 120);
  }

  window.addEventListener('load', ()=>{
    setTimeout(applyFinalCleanup, 180);
    setTimeout(applyFinalCleanup, 420);
  }, {once:true});
})();
