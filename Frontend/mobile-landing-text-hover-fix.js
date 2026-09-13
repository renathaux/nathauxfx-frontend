(function(){
  if (window.innerWidth > 700) return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('mobileEdit') !== '1') return;

  const hoverOnlyLabels = new Set([
    'TRUST TITLE','TRUST TEXT 1','TRUST TEXT 2',
    'POINT 1 TITLE','POINT 1 TEXT','POINT 2 TITLE','POINT 2 TEXT',
    'POINT 3 TITLE','POINT 3 TEXT','POINT 4 TITLE','POINT 4 TEXT',
    'BROKER TITLE','BROKER TEXT','CTRADER TITLE','CTRADER TEXT',
    'EMAIL TITLE','EMAIL TEXT','RISK TITLE','RISK TEXT','RISK NOTE','LEGAL LINKS'
  ]);

  const style = document.createElement('style');
  style.id = 'mobileLandingTextHoverFixStyle';
  style.textContent = `
    html.mobile-layout-editing .mobile-layout-edit-target.mobile-text-hover-only {
      outline-color: transparent !important;
    }
    html.mobile-layout-editing .mobile-layout-edit-target.mobile-text-hover-only > .mobile-layout-edit-label,
    html.mobile-layout-editing .mobile-layout-edit-target.mobile-text-hover-only > .mobile-layout-edit-handle {
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
    html.mobile-layout-editing .mobile-layout-edit-target.mobile-text-hover-only.mobile-text-proxy-hover,
    html.mobile-layout-editing .mobile-layout-edit-target.mobile-text-hover-only.mobile-layout-edit-active {
      outline-color: #49a4ff !important;
    }
    html.mobile-layout-editing .mobile-layout-edit-target.mobile-text-hover-only.mobile-text-proxy-hover > .mobile-layout-edit-label,
    html.mobile-layout-editing .mobile-layout-edit-target.mobile-text-hover-only.mobile-text-proxy-hover > .mobile-layout-edit-handle,
    html.mobile-layout-editing .mobile-layout-edit-target.mobile-text-hover-only.mobile-layout-edit-active > .mobile-layout-edit-label,
    html.mobile-layout-editing .mobile-layout-edit-target.mobile-text-hover-only.mobile-layout-edit-active > .mobile-layout-edit-handle {
      opacity: 1 !important;
      visibility: visible !important;
      pointer-events: auto !important;
    }
  `;
  document.head.appendChild(style);

  function markTargets(){
    document.querySelectorAll('.mobile-layout-edit-target').forEach(target => {
      const label = target.querySelector(':scope > .mobile-layout-edit-label')?.textContent?.trim() || '';
      if (hoverOnlyLabels.has(label)) target.classList.add('mobile-text-hover-only');
    });
  }

  let pointerX = -9999;
  let pointerY = -9999;

  function syncHover(){
    markTargets();
    document.querySelectorAll('.mobile-layout-edit-target.mobile-text-hover-only').forEach(target => {
      const rect = target.getBoundingClientRect();
      const pad = 14;
      const inside = pointerX >= rect.left - pad && pointerX <= rect.right + pad &&
        pointerY >= rect.top - pad && pointerY <= rect.bottom + pad;
      target.classList.toggle('mobile-text-proxy-hover', inside);
    });
  }

  document.addEventListener('pointermove', event => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    syncHover();
  }, true);

  document.addEventListener('pointerdown', event => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    syncHover();
  }, true);

  document.addEventListener('pointerleave', () => {
    pointerX = -9999;
    pointerY = -9999;
    syncHover();
  }, true);

  const observer = new MutationObserver(() => requestAnimationFrame(markTargets));

  function start(){
    markTargets();
    observer.observe(document.body, {childList:true, subtree:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
