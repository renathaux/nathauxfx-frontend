(function(){
  'use strict';
  if (window.innerWidth > 700) return;

  const STORAGE_KEY = 'nathauxfx_mobile_landing_layout_v2';

  function removeLowerMobileContent(){
    /* Remove every old page-cut/stretch editor artifact. */
    document.getElementById('mobilePageStretchFrame')?.remove();
    document.getElementById('mobilePageStretchEditorStyle')?.remove();
    document.getElementById('mobilePageCutEditorStyle')?.remove();
    document.querySelectorAll('.mobile-page-cut-overlay').forEach(el=>el.remove());

    /* User approved: remove the two lower cards and everything under them on mobile. */
    document.querySelector('.trust-section')?.remove();
    document.querySelector('.hero-stats')?.remove();
    document.querySelector('.mobile-footer')?.remove();

    /* Undo any old stretch/cut inline page sizing so the page ends naturally after the hero. */
    const page = document.getElementById('landingPage');
    if (page) {
      ['height','min-height','max-height','overflow-y','margin-top'].forEach(prop=>page.style.removeProperty(prop));
      page.style.setProperty('overflow-x','visible','important');
    }

    /* Old saved page cut/stretch values must not come back on the next edit session. */
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && typeof saved === 'object') {
        delete saved.pageCuts;
        delete saved.pageStretch;
        if (saved.scope === 'mobile-only-text-and-page-cut-editor' || saved.scope === 'mobile-only-text-and-page-stretch-editor') {
          saved.scope = 'mobile-only-hero-editor';
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      }
    } catch(_e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeLowerMobileContent, {once:true});
  } else {
    removeLowerMobileContent();
  }

  window.addEventListener('load', ()=>{
    removeLowerMobileContent();
    setTimeout(removeLowerMobileContent, 120);
  }, {once:true});
})();
