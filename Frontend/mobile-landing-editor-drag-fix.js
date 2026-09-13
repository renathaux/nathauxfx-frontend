(function(){
  if (window.innerWidth > 700) return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('mobileEdit') !== '1') return;

  const style = document.createElement('style');
  style.id = 'mobileLandingEditorDragFixStyle';
  style.textContent = `
    html.mobile-layout-editing,
    html.mobile-layout-editing body,
    html.mobile-layout-editing #landingPage,
    html.mobile-layout-editing .landing-nav,
    html.mobile-layout-editing .hero-section,
    html.mobile-layout-editing .hero-left,
    html.mobile-layout-editing .hero-right,
    html.mobile-layout-editing .trust-section,
    html.mobile-layout-editing .trust-card,
    html.mobile-layout-editing .hero-stats,
    html.mobile-layout-editing .mobile-footer {
      overflow: visible !important;
    }

    html.mobile-layout-editing .mobile-editor-lifted {
      overflow: visible !important;
      position: relative !important;
      z-index: 2147482000 !important;
      contain: none !important;
      clip-path: none !important;
      mask: none !important;
      -webkit-mask: none !important;
    }

    html.mobile-layout-editing .mobile-layout-edit-target.mobile-layout-edit-active,
    html.mobile-layout-editing .mobile-layout-edit-target.mobile-layout-edit-selected {
      position: relative !important;
      z-index: 2147483000 !important;
      overflow: visible !important;
      isolation: isolate !important;
      outline-color: #49a4ff !important;
    }

    html.mobile-layout-editing .mobile-layout-edit-target.mobile-layout-edit-active > .mobile-layout-edit-label,
    html.mobile-layout-editing .mobile-layout-edit-target.mobile-layout-edit-active > .mobile-layout-edit-handle,
    html.mobile-layout-editing .mobile-layout-edit-target.mobile-layout-edit-selected > .mobile-layout-edit-label,
    html.mobile-layout-editing .mobile-layout-edit-target.mobile-layout-edit-selected > .mobile-layout-edit-handle {
      opacity: 1 !important;
      visibility: visible !important;
      pointer-events: auto !important;
    }
  `;
  document.head.appendChild(style);

  let lifted = [];

  function clearLifted(){
    lifted.forEach(node => node.classList.remove('mobile-editor-lifted'));
    lifted = [];
  }

  function liftTarget(target){
    clearLifted();
    if (!(target instanceof HTMLElement)) return;
    let node = target.parentElement;
    while (node && node !== document.body && node !== document.documentElement) {
      node.classList.add('mobile-editor-lifted');
      lifted.push(node);
      node = node.parentElement;
    }
  }

  function keepSelectionVisible(){
    const target = document.querySelector('.mobile-layout-edit-target.mobile-layout-edit-active') ||
      document.querySelector('.mobile-layout-edit-target.mobile-layout-edit-selected');
    if (target) liftTarget(target);
    else clearLifted();
  }

  document.addEventListener('pointerdown', function(){
    requestAnimationFrame(keepSelectionVisible);
  }, true);

  window.addEventListener('pointermove', function(){
    requestAnimationFrame(keepSelectionVisible);
  }, true);

  window.addEventListener('pointerup', function(){
    requestAnimationFrame(keepSelectionVisible);
    setTimeout(keepSelectionVisible, 0);
  }, true);

  window.addEventListener('pointercancel', function(){
    requestAnimationFrame(keepSelectionVisible);
  }, true);

  const observer = new MutationObserver(function(mutations){
    if (mutations.some(m => m.type === 'attributes' && m.attributeName === 'class')) {
      requestAnimationFrame(keepSelectionVisible);
    }
  });

  function start(){
    observer.observe(document.body, {subtree:true, attributes:true, attributeFilter:['class']});
    keepSelectionVisible();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
