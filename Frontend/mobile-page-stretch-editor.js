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

  function installPersistentStyles(){
    let style = document.getElementById('mobilePreservedLowerTextStyle');
    if (style) return;
    style = document.createElement('style');
    style.id = 'mobilePreservedLowerTextStyle';
    style.textContent = `
      @media (max-width:700px){
        #landingPage,
        #landingPage .trust-section,
        #landingPage .trust-card,
        #landingPage .trust-points,
        #landingPage .trust-point,
        #landingPage .hero-stats{
          visibility:visible!important;
          opacity:1!important;
          overflow:visible!important;
        }

        #landingPage .trust-card,
        #landingPage .trust-point,
        #landingPage .hero-stats,
        #landingPage .hero-stats>div:not(.legal-links){
          background:transparent!important;
          background-image:none!important;
          border-color:transparent!important;
          box-shadow:none!important;
          outline:none!important;
        }

        #landingPage .trust-card>h2,
        #landingPage .trust-card>p,
        #landingPage .trust-point>strong,
        #landingPage .trust-point>span,
        #landingPage .hero-stats>div>strong,
        #landingPage .hero-stats>div>span,
        #landingPage .hero-stats>.risk-note,
        #landingPage .hero-stats>.legal-links{
          visibility:visible!important;
          opacity:1!important;
        }

        #landingPage .trust-card>h2,
        #landingPage .trust-card>p,
        #landingPage .trust-point>strong,
        #landingPage .trust-point>span,
        #landingPage .hero-stats>div>strong,
        #landingPage .hero-stats>div>span,
        #landingPage .hero-stats>.risk-note{
          display:block!important;
        }

        #landingPage .hero-stats>.legal-links{
          display:flex!important;
        }

        #landingPage .mobile-footer{
          display:none!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function restoreText(){
    clearOldPageEditors();
    installPersistentStyles();

    const page = document.getElementById('landingPage');
    if (page) {
      /* Never clip the moved text. That clipping was what made it flash and disappear. */
      ['height','min-height','max-height','overflow-y','margin-top'].forEach(prop=>page.style.removeProperty(prop));
      setImportant(page,'overflow-x','visible');
      setImportant(page,'overflow-y','visible');
    }

    const shellSelectors = [
      '.trust-section',
      '.trust-card',
      '.trust-points',
      '.trust-points > .trust-point',
      '.hero-stats'
    ];
    document.querySelectorAll(shellSelectors.join(',')).forEach(el=>{
      setImportant(el,'visibility','visible');
      setImportant(el,'opacity','1');
      setImportant(el,'overflow','visible');
    });

    const textSelectors = [
      '.trust-card > h2',
      '.trust-card > p',
      '.trust-points > .trust-point > strong',
      '.trust-points > .trust-point > span',
      '.hero-stats > div > strong',
      '.hero-stats > div > span',
      '.hero-stats > .risk-note',
      '.hero-stats > .legal-links'
    ];
    document.querySelectorAll(textSelectors.join(',')).forEach(el=>{
      setImportant(el,'visibility','visible');
      setImportant(el,'opacity','1');
      setImportant(el,'pointer-events','auto');
    });

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

  function start(){
    restoreText();
    requestAnimationFrame(restoreText);
    setTimeout(restoreText,120);
    setTimeout(restoreText,300);
    setTimeout(restoreText,700);
    setTimeout(restoreText,1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',start,{once:true});
  } else {
    start();
  }

  window.addEventListener('load',()=>{
    restoreText();
    setTimeout(restoreText,250);
    setTimeout(restoreText,800);
  },{once:true});
})();
