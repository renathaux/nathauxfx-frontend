(function(){
  'use strict';
  if (window.innerWidth > 700) return;

  const STORAGE_KEY = 'nathauxfx_mobile_landing_layout_v2';
  const LOWER_KEYS = [
    'trustTitle','trustText1','trustText2',
    'trustPoint1Title','trustPoint1Text','trustPoint2Title','trustPoint2Text',
    'trustPoint3Title','trustPoint3Text','trustPoint4Title','trustPoint4Text',
    'stat1Title','stat1Text','stat2Title','stat2Text','stat3Title','stat3Text',
    'stat4Title','stat4Text','riskNote','legalLinks','footer'
  ];

  function removeOldChrome(){
    document.getElementById('mobilePageStretchFrame')?.remove();
    document.getElementById('mobilePageStretchEditorStyle')?.remove();
    document.getElementById('mobilePageCutEditorStyle')?.remove();
    document.getElementById('mobilePreservedLowerTextStyle')?.remove();
    document.querySelectorAll('.mobile-page-cut-overlay').forEach(el=>el.remove());
  }

  function clearEditorState(root){
    if (!root) return;
    const props = [
      'box-sizing','width','height','max-width','max-height','min-width','min-height','flex',
      'justify-self','align-self','translate','transform','transform-origin','will-change','overflow',
      'position','font-size','line-height','letter-spacing','display','white-space','z-index',
      'align-items','justify-content','text-align','flex-direction','flex-wrap','gap','margin',
      'padding','background','background-image','border','border-color','box-shadow','outline','opacity','visibility'
    ];
    root.querySelectorAll('*').forEach(el=>{
      if (!(el instanceof HTMLElement)) return;
      el.classList.remove('mobile-layout-edit-target','mobile-layout-edit-active','mobile-layout-edit-selected','mobile-editor-lifted');
      if (el.classList.contains('mobile-layout-edit-label') || el.classList.contains('mobile-layout-edit-handle')) {
        el.remove();
        return;
      }
      props.forEach(prop=>el.style.removeProperty(prop));
      el.style.removeProperty('cursor');
      el.style.removeProperty('touch-action');
    });
    props.forEach(prop=>root.style.removeProperty(prop));
    root.classList.remove('mobile-layout-edit-target','mobile-layout-edit-active','mobile-layout-edit-selected','mobile-editor-lifted');
    root.querySelectorAll(':scope > .mobile-layout-edit-label, :scope > .mobile-layout-edit-handle').forEach(el=>el.remove());
  }

  function sanitizeSavedLayout(){
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || typeof saved !== 'object') return;
      if (saved.items && typeof saved.items === 'object') {
        LOWER_KEYS.forEach(key=>delete saved.items[key]);
      }
      delete saved.pageCuts;
      delete saved.pageStretch;
      saved.scope = 'mobile-only-hero-editor';
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch(_e) {}
  }

  function installStyles(){
    document.getElementById('mobileProfessionalBottomStyle')?.remove();
    const style = document.createElement('style');
    style.id = 'mobileProfessionalBottomStyle';
    style.textContent = `
      @media (max-width:700px){
        #landingPage{position:relative!important;overflow-x:hidden!important;overflow-y:visible!important}
        #mobileProfessionalBottom{
          position:absolute!important;
          left:0!important;
          transform:none!important;
          width:381px!important;
          max-width:calc(100% - 16px)!important;
          box-sizing:border-box!important;
          display:flex!important;
          flex-direction:column!important;
          gap:14px!important;
          z-index:5!important;
          overflow:visible!important;
          padding:0!important;
          margin:0!important;
        }

        #mobileProfessionalBottom .trust-section{
          width:100%!important;
          max-width:none!important;
          margin:0!important;
          padding:0!important;
          color:#22324a!important;
          overflow:visible!important;
        }
        #mobileProfessionalBottom .trust-card{
          width:100%!important;
          box-sizing:border-box!important;
          margin:0!important;
          padding:18px!important;
          border:1px solid #d8e3f2!important;
          border-radius:18px!important;
          background:linear-gradient(180deg,#ffffff 0%,#fbfdff 100%)!important;
          box-shadow:0 10px 28px rgba(42,84,140,.10)!important;
          color:#14213a!important;
          overflow:hidden!important;
          text-align:left!important;
        }
        #mobileProfessionalBottom .trust-card>h2{
          margin:0 0 10px!important;
          padding:0!important;
          width:auto!important;
          height:auto!important;
          font-size:20px!important;
          line-height:1.18!important;
          letter-spacing:-.02em!important;
          color:#0f1b33!important;
          font-weight:800!important;
          transform:none!important;
          position:static!important;
          white-space:normal!important;
          text-align:left!important;
        }
        #mobileProfessionalBottom .trust-card>p:nth-of-type(1){
          margin:0!important;
          padding:0!important;
          width:auto!important;
          height:auto!important;
          font-size:14px!important;
          line-height:1.48!important;
          color:#52657f!important;
          transform:none!important;
          position:static!important;
          white-space:normal!important;
          text-align:left!important;
        }
        #mobileProfessionalBottom .trust-card>p:nth-of-type(2){display:none!important}
        #mobileProfessionalBottom .trust-points{
          display:grid!important;
          grid-template-columns:repeat(2,minmax(0,1fr))!important;
          gap:10px!important;
          margin:16px 0 0!important;
          padding:0!important;
          width:100%!important;
          height:auto!important;
          transform:none!important;
          position:static!important;
        }
        #mobileProfessionalBottom .trust-point{
          min-width:0!important;
          min-height:126px!important;
          box-sizing:border-box!important;
          margin:0!important;
          padding:14px 11px 12px 50px!important;
          border:1px solid #d7e4f5!important;
          border-radius:14px!important;
          background:#f9fbff!important;
          box-shadow:none!important;
          position:relative!important;
          transform:none!important;
          overflow:hidden!important;
        }
        #mobileProfessionalBottom .trust-point::before{
          content:attr(data-pro-icon)!important;
          position:absolute!important;
          left:10px!important;
          top:14px!important;
          width:31px!important;
          height:31px!important;
          display:flex!important;
          align-items:center!important;
          justify-content:center!important;
          border-radius:50%!important;
          background:#e0edff!important;
          color:#1769ff!important;
          font:800 15px/1 Arial,sans-serif!important;
        }
        #mobileProfessionalBottom .trust-point>strong{
          display:block!important;
          width:auto!important;
          height:auto!important;
          margin:0 0 6px!important;
          padding:0!important;
          font-size:13px!important;
          line-height:1.18!important;
          color:#0b5bd3!important;
          font-weight:800!important;
          transform:none!important;
          position:static!important;
          white-space:normal!important;
        }
        #mobileProfessionalBottom .trust-point>span{
          display:block!important;
          width:auto!important;
          height:auto!important;
          margin:0!important;
          padding:0!important;
          font-size:11px!important;
          line-height:1.3!important;
          color:#5a6b83!important;
          transform:none!important;
          position:static!important;
          white-space:normal!important;
        }

        #mobileProfessionalBottom .hero-stats{
          width:100%!important;
          max-width:none!important;
          box-sizing:border-box!important;
          display:grid!important;
          grid-template-columns:repeat(4,minmax(0,1fr))!important;
          gap:0!important;
          margin:0!important;
          padding:16px 12px 12px!important;
          border:1px solid #d8e3f2!important;
          border-radius:18px!important;
          background:#fff!important;
          box-shadow:0 10px 28px rgba(42,84,140,.10)!important;
          color:#17233b!important;
          transform:none!important;
          position:relative!important;
          overflow:hidden!important;
          min-height:0!important;
          height:auto!important;
        }
        #mobileProfessionalBottom .hero-stats>div:not(.legal-links){
          min-width:0!important;
          width:auto!important;
          height:auto!important;
          margin:0!important;
          padding:2px 7px 10px!important;
          border:0!important;
          border-right:1px solid #e2e9f3!important;
          background:transparent!important;
          box-shadow:none!important;
          text-align:center!important;
          transform:none!important;
          position:relative!important;
          overflow:visible!important;
        }
        #mobileProfessionalBottom .hero-stats>div:nth-of-type(4){border-right:0!important}
        #mobileProfessionalBottom .hero-stats>div:not(.legal-links)::before{
          content:attr(data-pro-icon)!important;
          display:block!important;
          margin:0 auto 5px!important;
          color:#1769ff!important;
          font:800 18px/1 Arial,sans-serif!important;
        }
        #mobileProfessionalBottom .hero-stats>div>strong{
          display:block!important;
          width:auto!important;
          height:auto!important;
          margin:0 0 5px!important;
          padding:0!important;
          font-size:12px!important;
          line-height:1.15!important;
          color:#13213a!important;
          font-weight:800!important;
          transform:none!important;
          position:static!important;
          white-space:normal!important;
        }
        #mobileProfessionalBottom .hero-stats>div>span{
          display:block!important;
          width:auto!important;
          height:auto!important;
          margin:0!important;
          padding:0!important;
          font-size:9.5px!important;
          line-height:1.25!important;
          color:#667892!important;
          transform:none!important;
          position:static!important;
          white-space:normal!important;
        }
        #mobileProfessionalBottom .hero-stats>.risk-note{
          grid-column:1/-1!important;
          width:auto!important;
          height:auto!important;
          box-sizing:border-box!important;
          margin:4px 0 0!important;
          padding:10px 12px!important;
          border:0!important;
          border-radius:10px!important;
          background:#f4f7fb!important;
          color:#52657f!important;
          font-size:10.5px!important;
          line-height:1.35!important;
          text-align:left!important;
          transform:none!important;
          position:static!important;
          white-space:normal!important;
        }
        #mobileProfessionalBottom>.legal-links{
          display:flex!important;
          flex-wrap:wrap!important;
          align-items:center!important;
          justify-content:center!important;
          gap:6px 10px!important;
          width:100%!important;
          height:auto!important;
          box-sizing:border-box!important;
          margin:0!important;
          padding:0 6px 10px!important;
          font-size:10.5px!important;
          line-height:1.25!important;
          transform:none!important;
          position:static!important;
          white-space:normal!important;
        }
        #mobileProfessionalBottom>.legal-links a{color:#1769ff!important;text-decoration:none!important;white-space:nowrap!important}
        #mobileProfessionalBottom+.mobile-footer,
        #landingPage>.mobile-footer{display:none!important}

        @media(max-width:360px){
          #mobileProfessionalBottom .trust-card{padding:14px!important}
          #mobileProfessionalBottom .trust-point{padding-left:44px!important;min-height:122px!important}
          #mobileProfessionalBottom .trust-point::before{left:8px!important;width:28px!important;height:28px!important}
          #mobileProfessionalBottom .hero-stats{padding-left:7px!important;padding-right:7px!important}
          #mobileProfessionalBottom .hero-stats>div:not(.legal-links){padding-left:4px!important;padding-right:4px!important}
          #mobileProfessionalBottom .hero-stats>div>strong{font-size:11px!important}
          #mobileProfessionalBottom .hero-stats>div>span{font-size:8.5px!important}
        }
      }
    `;
    document.head.appendChild(style);
  }

  function buildProfessionalBottom(){
    removeOldChrome();
    installStyles();
    sanitizeSavedLayout();

    const page = document.getElementById('landingPage');
    const trust = document.querySelector('.trust-section');
    const stats = document.querySelector('.hero-stats');
    if (!page || !trust || !stats) return;

    clearEditorState(trust);
    clearEditorState(stats);

    let wrapper = document.getElementById('mobileProfessionalBottom');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = 'mobileProfessionalBottom';
      page.appendChild(wrapper);
    }

    if (trust.parentElement !== wrapper) wrapper.appendChild(trust);
    if (stats.parentElement !== wrapper) wrapper.appendChild(stats);

    const legal = stats.querySelector('.legal-links');
    if (legal && legal.parentElement !== wrapper) wrapper.appendChild(legal);

    const pointIcons = ['▣','▥','⚙','◉'];
    trust.querySelectorAll('.trust-point').forEach((el,i)=>el.setAttribute('data-pro-icon',pointIcons[i] || '•'));
    const statIcons = ['●','▥','✉','⬡'];
    Array.from(stats.children).filter(el=>el.tagName === 'DIV').slice(0,4).forEach((el,i)=>el.setAttribute('data-pro-icon',statIcons[i] || '•'));

    const footer = document.querySelector('.mobile-footer');
    if (footer) footer.style.setProperty('display','none','important');

    const isEdit = new URLSearchParams(location.search).get('mobileEdit') === '1';
    if (isEdit && !wrapper.dataset.blockEditor) {
      wrapper.dataset.blockEditor = '1';
      wrapper.addEventListener('pointerdown',event=>{
        if (event.target.closest('a')) return;
        event.stopImmediatePropagation();
      },true);
    }

    layoutBottom();
  }

  function layoutBottom(){
    const page = document.getElementById('landingPage');
    const wrapper = document.getElementById('mobileProfessionalBottom');
    const actions = document.querySelector('.hero-actions');
    const reference = document.querySelector('.hero-left > p') || actions;
    if (!page || !wrapper || !actions || !reference) return;

    const pageRect = page.getBoundingClientRect();
    const actionsRect = actions.getBoundingClientRect();
    const referenceRect = reference.getBoundingClientRect();

    const desiredLeft = Math.round(referenceRect.left - pageRect.left);
    const safeLeft = Math.max(8, Math.min(desiredLeft, Math.max(8, Math.round(pageRect.width - 248))));
    const availableWidth = Math.max(240, Math.round(pageRect.width - safeLeft - 8));
    const desiredWidth = Math.round(referenceRect.width);
    const safeWidth = Math.max(240, Math.min(desiredWidth, availableWidth));

    wrapper.style.setProperty('left',safeLeft+'px','important');
    wrapper.style.setProperty('width',safeWidth+'px','important');
    wrapper.style.setProperty('max-width',safeWidth+'px','important');
    wrapper.style.setProperty('transform','none','important');

    const top = Math.max(0, Math.round(actionsRect.bottom - pageRect.top + 18));
    wrapper.style.setProperty('top',top+'px','important');

    const height = Math.ceil(top + wrapper.scrollHeight + 24);
    page.style.setProperty('height',height+'px','important');
    page.style.setProperty('min-height',height+'px','important');
    page.style.setProperty('max-height','none','important');
    page.style.setProperty('overflow-y','visible','important');
    page.style.setProperty('overflow-x','hidden','important');
  }

  function run(){
    buildProfessionalBottom();
    requestAnimationFrame(layoutBottom);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',run,{once:true});
  else run();

  window.addEventListener('load',()=>{
    run();
    [80,180,320,650,1000].forEach(ms=>setTimeout(()=>{ buildProfessionalBottom(); layoutBottom(); },ms));
  },{once:true});
  window.addEventListener('resize',()=>setTimeout(layoutBottom,60));
})();