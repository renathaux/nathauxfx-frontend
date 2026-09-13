(function(){
  if (window.innerWidth > 700) return;

  const locked = [
    { selector: '.landing-logo', x: 0, y: 0, width: 163, height: 42 },
    { selector: '.landing-nav-actions', x: 179, y: -91, width: 299, height: 44 },
    { selector: '.hero-pill', x: -5, y: -159, width: 372, height: 38 }
  ];

  function setImportant(el, prop, value){ el.style.setProperty(prop, value, 'important'); }
  function applyBox(el, state){
    setImportant(el,'box-sizing','border-box');
    setImportant(el,'width',state.width+'px');
    setImportant(el,'height',state.height+'px');
    setImportant(el,'max-width','none');
    setImportant(el,'min-width','0');
    setImportant(el,'min-height','0');
    setImportant(el,'translate','0 0');
    setImportant(el,'transform','translate3d('+state.x+'px,'+state.y+'px,0)');
    setImportant(el,'position','relative');
    setImportant(el,'overflow','visible');
  }

  function apply(){
    locked.forEach(item=>{ const el=document.querySelector(item.selector); if(el) applyBox(el,item); });
  }

  apply();
  window.addEventListener('load', apply, { once:true });
})();