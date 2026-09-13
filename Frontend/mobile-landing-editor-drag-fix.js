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

    html.mobile-layout-editing .mobile-layout-edit-target,
    html.mobile-layout-editing .mobile-layout-edit-target.mobile-layout-edit-active,
    html.mobile-layout-editing .mobile-layout-edit-target.mobile-layout-edit-selected {
      position: relative !important;
      z-index: 2147483000 !important;
      overflow: visible !important;
      isolation: isolate !important;
      outline-color: #49a4ff !important;
    }

    html.mobile-layout-editing .mobile-layout-edit-target > .mobile-layout-edit-label,
    html.mobile-layout-editing .mobile-layout-edit-target > .mobile-layout-edit-handle {
      opacity: 1 !important;
      visibility: visible !important;
      pointer-events: auto !important;
    }

    .mobile-editor-hit-proxy {
      position: fixed !important;
      z-index: 2147483600 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      background: transparent !important;
      pointer-events: auto !important;
      touch-action: none !important;
      user-select: none !important;
      -webkit-user-select: none !important;
      cursor: move !important;
    }
  `;
  document.head.appendChild(style);

  let lifted = [];
  const proxies = new Map();

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

  function dispatchPointerDown(target, sourceEvent){
    if (!(target instanceof Element)) return;
    let evt;
    try {
      evt = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: sourceEvent.pointerId || 1,
        pointerType: sourceEvent.pointerType || 'touch',
        isPrimary: true,
        clientX: sourceEvent.clientX,
        clientY: sourceEvent.clientY,
        screenX: sourceEvent.screenX || 0,
        screenY: sourceEvent.screenY || 0,
        button: 0,
        buttons: 1
      });
    } catch (_e) {
      return;
    }
    target.dispatchEvent(evt);
  }

  function pickHandle(target, event){
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const edge = Math.min(26, Math.max(18, Math.min(rect.width, rect.height) * 0.18));
    const left = x <= edge;
    const right = x >= rect.width - edge;
    const top = y <= edge;
    const bottom = y >= rect.height - edge;
    let dir = '';
    if (top && left) dir = 'nw';
    else if (top && right) dir = 'ne';
    else if (bottom && right) dir = 'se';
    else if (bottom && left) dir = 'sw';
    else if (top) dir = 'n';
    else if (right) dir = 'e';
    else if (bottom) dir = 's';
    else if (left) dir = 'w';
    if (!dir) return null;
    return target.querySelector(':scope > .mobile-layout-edit-handle[data-dir="' + dir + '"]');
  }

  function createProxy(target){
    const proxy = document.createElement('div');
    proxy.className = 'mobile-editor-hit-proxy';
    proxy.dataset.forKey = target.querySelector(':scope > .mobile-layout-edit-label')?.textContent || '';
    proxy.addEventListener('pointerdown', function(event){
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const handle = pickHandle(target, event);
      dispatchPointerDown(handle || target, event);
      requestAnimationFrame(function(){ liftTarget(target); });
    }, true);
    document.body.appendChild(proxy);
    proxies.set(target, proxy);
    return proxy;
  }

  function syncProxies(){
    const currentTargets = new Set(document.querySelectorAll('.mobile-layout-edit-target'));

    for (const [target, proxy] of proxies.entries()) {
      if (!currentTargets.has(target) || !target.isConnected) {
        proxy.remove();
        proxies.delete(target);
      }
    }

    currentTargets.forEach(target => {
      const proxy = proxies.get(target) || createProxy(target);
      const rect = target.getBoundingClientRect();
      proxy.style.left = rect.left + 'px';
      proxy.style.top = rect.top + 'px';
      proxy.style.width = rect.width + 'px';
      proxy.style.height = rect.height + 'px';
      proxy.style.display = rect.width > 0 && rect.height > 0 ? 'block' : 'none';
    });

    requestAnimationFrame(syncProxies);
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
    requestAnimationFrame(syncProxies);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();