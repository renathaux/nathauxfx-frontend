(function(){
  'use strict';

  const LOCAL_BACKEND='http://127.0.0.1:8001';
  const DIRECT_BACKEND='https://api.nathauxfx.com';
  const IS_LOCAL=location.hostname==='localhost'||location.hostname==='127.0.0.1';
  const BACKEND=IS_LOCAL?LOCAL_BACKEND:`${location.origin}/api/proxy`;
  const AUTH_BACKEND=IS_LOCAL?LOCAL_BACKEND:DIRECT_BACKEND;
  const CSRF_KEY='flowsignal_csrf_token';
  const USER_SESSION_KEY='flowsignal_user_session_token';
  const PERSISTED_USER_SESSION_KEY='flowsignal_user_session_persist';
  const LEGACY_SESSION_TOKEN_KEY='flowsignal_session_token';
  const PUBLIC_HOME_KEY='flowsignal_public_home_mode';
  const TAB_SIGNED_OUT_KEY='flowsignal_tab_signed_out';
  const TAB_ROLE_KEY='flowsignal_tab_role';
  const TAB_WINDOW_PREFIX='flowsignal-tab:';
  function currentTabId(){
    const current=String(window.name||'');
    return current.startsWith(TAB_WINDOW_PREFIX)?current.slice(TAB_WINDOW_PREFIX.length):'';
  }
  function savedDeviceSession(){try{return JSON.parse(localStorage.getItem(PERSISTED_USER_SESSION_KEY)||'null');}catch(_error){return null;}}
  function saveDeviceSession(token,csrf=''){if(!token)return;localStorage.setItem(PERSISTED_USER_SESSION_KEY,JSON.stringify({token:String(token),csrf:String(csrf||''),saved_at:Date.now()}));}
  function clearDeviceSession(){localStorage.removeItem(PERSISTED_USER_SESSION_KEY);}
  function recoverTabAuth(){
    const id=currentTabId();
    if(!sessionStorage.getItem(USER_SESSION_KEY)){
      try{
        const saved=JSON.parse(localStorage.getItem(`flowsignal_tab_user_session:${id}`)||'null');
        if(saved?.token){
          sessionStorage.setItem(USER_SESSION_KEY,String(saved.token));
          if(saved.csrf)sessionStorage.setItem(CSRF_KEY,String(saved.csrf));
          sessionStorage.setItem(TAB_ROLE_KEY,'user');
          sessionStorage.removeItem(PUBLIC_HOME_KEY);
          sessionStorage.removeItem(TAB_SIGNED_OUT_KEY);
          return;
        }
      }catch(_error){}
    }
    if(!sessionStorage.getItem(USER_SESSION_KEY)&&sessionStorage.getItem(TAB_ROLE_KEY)!=='admin'&&id){
      try{
        const saved=JSON.parse(localStorage.getItem(`flowsignal_tab_admin_session:${id}`)||'null');
        if(saved?.token){
          sessionStorage.setItem(TAB_ROLE_KEY,'admin');
          localStorage.setItem(LEGACY_SESSION_TOKEN_KEY,String(saved.token));
          sessionStorage.removeItem(PUBLIC_HOME_KEY);
          sessionStorage.removeItem(TAB_SIGNED_OUT_KEY);
        }
      }catch(_error){}
    }
    if(!sessionStorage.getItem(USER_SESSION_KEY)&&sessionStorage.getItem(TAB_ROLE_KEY)!=='admin'){
      const saved=savedDeviceSession();
      if(saved?.token){
        sessionStorage.setItem(USER_SESSION_KEY,String(saved.token));
        if(saved.csrf)sessionStorage.setItem(CSRF_KEY,String(saved.csrf));
        sessionStorage.setItem(TAB_ROLE_KEY,'user');
        sessionStorage.removeItem(PUBLIC_HOME_KEY);
        sessionStorage.removeItem(TAB_SIGNED_OUT_KEY);
      }
    }
  }
  recoverTabAuth();
  const params=new URLSearchParams(location.search);
  if(params.get('home')==='1')sessionStorage.setItem(PUBLIC_HOME_KEY,'1');
  if(params.get('user')==='1'){
    sessionStorage.removeItem(PUBLIC_HOME_KEY);
    sessionStorage.removeItem(TAB_SIGNED_OUT_KEY);
  }
  if(params.has('home')||params.has('user')){
    params.delete('home');
    params.delete('user');
    const clean=`${location.pathname}${params.toString()?`?${params.toString()}`:''}${location.hash||''}`;
    history.replaceState(null,'',clean||'/');
  }
  let sessionUser=null;
  let csrfToken=sessionStorage.getItem(CSRF_KEY)||'';
  const nativeFetch=window.fetch.bind(window);

  function userSessionToken(){return String(sessionStorage.getItem(USER_SESSION_KEY)||'').trim();}
  function publicHome(){return sessionStorage.getItem(PUBLIC_HOME_KEY)==='1';}
  function tabSignedOut(){return sessionStorage.getItem(TAB_SIGNED_OUT_KEY)==='1';}
  function adminToken(){return String(localStorage.getItem(LEGACY_SESSION_TOKEN_KEY)||'').trim();}
  function tabRole(){return String(sessionStorage.getItem(TAB_ROLE_KEY)||'').toLowerCase();}

  // /app is an authenticated surface. A real tab token always wins over a stale
  // public-home marker left by older navigation code.
  if(location.pathname.startsWith('/app')&&userSessionToken()){
    sessionStorage.removeItem(PUBLIC_HOME_KEY);
    sessionStorage.removeItem(TAB_SIGNED_OUT_KEY);
  }

  function installPublicHomeStyle(){
    if(document.getElementById('flowsignalPublicHomeStyle'))return;
    const style=document.createElement('style');
    style.id='flowsignalPublicHomeStyle';
    style.textContent='body.flowsignal-public-home #mainApp,body.flowsignal-public-home #smartExplain,body.flowsignal-public-home #assistantModal,body.flowsignal-public-home #tradeModal,body.flowsignal-public-home #adminModal,body.flowsignal-public-home #feedbackModal,body.flowsignal-public-home #statsModal,body.flowsignal-public-home #settingsModal,body.flowsignal-public-home #newsModeConfirmModal,body.flowsignal-public-home #brokerAccountsModal,body.flowsignal-public-home #paperModal{display:none!important;visibility:hidden!important;pointer-events:none!important}';
    document.head.appendChild(style);
  }
  function setPublicHome(enabled){
    if(enabled){sessionStorage.setItem(PUBLIC_HOME_KEY,'1');document.body.classList.add('flowsignal-public-home');}
    else{sessionStorage.removeItem(PUBLIC_HOME_KEY);document.body.classList.remove('flowsignal-public-home');}
  }

  function legacyOwner(){
    if(userSessionToken())return false;
    return tabRole()==='admin'&&Boolean(adminToken());
  }
  function isBackend(input){
    try{
      const raw=typeof input==='string'?input:input?.url;
      if(!raw)return false;
      const parsed=new URL(raw,location.href);
      if(parsed.origin===new URL(DIRECT_BACKEND).origin)return true;
      if(IS_LOCAL)return parsed.origin===new URL(LOCAL_BACKEND).origin;
      return parsed.origin===location.origin&&parsed.pathname.startsWith('/api/proxy/');
    }catch(_error){return false;}
  }
  function logicalBackendPath(raw){
    try{
      const parsed=new URL(raw,location.href);
      let path=parsed.pathname;
      if(path.startsWith('/api/proxy'))path=path.slice('/api/proxy'.length)||'/';
      return path;
    }catch(_error){return '';}
  }
  function isCustomerRequest(raw){
    const path=logicalBackendPath(raw);
    return path.startsWith('/user/')||path==='/auth/session'||path==='/auth/me'||path==='/auth/logout';
  }
  function customerUrl(raw){
    const parsed=new URL(raw,location.href);
    if(!sessionUser?.id)return parsed.toString();
    let logicalPath=parsed.pathname;
    if(!IS_LOCAL&&parsed.origin===location.origin&&logicalPath.startsWith('/api/proxy'))logicalPath=logicalPath.slice('/api/proxy'.length)||'/';
    if(parsed.origin===new URL(DIRECT_BACKEND).origin||(!IS_LOCAL&&parsed.origin===location.origin)){
      if(!IS_LOCAL)return `${location.origin}/api/proxy${logicalPath}${parsed.search}`;
      parsed.pathname=logicalPath;
    }
    return parsed.toString();
  }
  function cleanBody(body){
    if(!sessionUser?.id||!body||typeof body!=='string')return body;
    try{const payload=JSON.parse(body);if(payload&&typeof payload==='object')delete payload.user_id;return JSON.stringify(payload);}catch(_error){return body;}
  }

  window.fetch=async function(input,init={}){
    if(!isBackend(input))return nativeFetch(input,init);
    const raw=typeof input==='string'?input:input.url;
    const token=userSessionToken();
    const customerRequest=isCustomerRequest(raw);
    if((tabSignedOut()||!token)&&customerRequest&&logicalBackendPath(raw)!=='/auth/session'&&!legacyOwner()){
      return new Response(JSON.stringify({detail:'TAB_SIGNED_OUT'}),{status:401,headers:{'Content-Type':'application/json'}});
    }
    const url=customerUrl(raw);
    const options={...init};
    options.headers=new Headers(init.headers||{});
    const method=String(options.method||'GET').toUpperCase();
    if(token&&customerRequest)options.headers.set('Authorization',`FlowSignalUser ${token}`);
    if(token&&sessionUser?.id&&!['GET','HEAD','OPTIONS'].includes(method)&&csrfToken)options.headers.set('X-FlowSignal-CSRF',csrfToken);
    if(!token&&legacyOwner()&&!options.headers.has('Authorization')){
      const ownerToken=adminToken();
      if(ownerToken)options.headers.set('Authorization',`Bearer ${ownerToken}`);
    }
    if(options.body)options.body=cleanBody(options.body);
    const response=await nativeFetch(url,options);
    if(response.status===401&&token&&customerRequest&&logicalBackendPath(raw)!=='/auth/session'){
      sessionStorage.removeItem(USER_SESSION_KEY);sessionStorage.removeItem(CSRF_KEY);sessionStorage.removeItem(TAB_ROLE_KEY);
      clearDeviceSession();
      localStorage.removeItem('flowsignal_access');
      localStorage.removeItem('flowsignal_role');
      window.setTimeout(()=>location.replace('/account.html?expired=1'),0);
    }
    return response;
  };

  function showLanding(){
    installPublicHomeStyle();
    setPublicHome(true);
    const landing=document.getElementById('landingPage');
    const app=document.getElementById('mainApp');
    if(landing){landing.classList.remove('hidden');landing.style.removeProperty('display');}
    if(app){app.classList.add('hidden');app.classList.add('locked');app.style.removeProperty('display');}
    document.getElementById('smartExplain')?.classList.add('hidden');
  }
  function showApp(){
    setPublicHome(false);
    const landing=document.getElementById('landingPage');
    const app=document.getElementById('mainApp');
    if(landing){landing.classList.add('hidden');landing.style.display='none';}
    if(app){app.classList.remove('hidden');app.classList.remove('locked');app.style.display='flex';}
  }
  function openAccount(mode){setPublicHome(false);location.href=`/account.html?mode=${mode==='signup'?'signup':'login'}`;}
  function openOwnerAccess(event){event?.preventDefault?.();location.href='/owner.html';}
  function enterFullUserDashboard(user){
    if(!user||String(user.role||'user').toLowerCase()!=='user')return;
    showApp();
    document.dispatchEvent(new CustomEvent('flowsignal:user-dashboard-ready',{detail:{user}}));
  }
  function applyUser(user){
    sessionUser=user||null;
    if(!user)return;
    sessionStorage.removeItem(TAB_SIGNED_OUT_KEY);
    sessionStorage.removeItem(PUBLIC_HOME_KEY);
    sessionStorage.setItem(TAB_ROLE_KEY,user.role||'user');
    document.body.dataset.userRole=user.role||'user';
    document.dispatchEvent(new CustomEvent('flowsignal:authenticated',{detail:{user}}));
    enterFullUserDashboard(user);
  }
  let sessionRetryTimer=null;
  function scheduleSessionRetry(){
    if(sessionRetryTimer)return;
    sessionRetryTimer=window.setTimeout(()=>{
      sessionRetryTimer=null;
      if(userSessionToken()&&!tabSignedOut())session();
    },3000);
  }
  function preserveSessionDuringBackendOutage(){
    // A temporary network/backend failure must never behave like logout.
    // Keep the persistent token and dashboard shell; protected API calls still
    // require server validation and will recover when the backend is reachable.
    sessionUser=null;
    csrfToken=sessionStorage.getItem(CSRF_KEY)||csrfToken||'';
    if(location.pathname.startsWith('/app'))showApp();
    scheduleSessionRetry();
    return null;
  }
  async function session(){
    if(legacyOwner()){
      sessionUser=null;
      csrfToken='';
      sessionStorage.removeItem(CSRF_KEY);
      sessionStorage.removeItem(PUBLIC_HOME_KEY);
      sessionStorage.removeItem(TAB_SIGNED_OUT_KEY);
      showApp();
      return null;
    }
    const token=userSessionToken();
    if(publicHome()||tabSignedOut()||!token){
      sessionUser=null;
      csrfToken='';
      sessionStorage.removeItem(CSRF_KEY);
      if(location.pathname.startsWith('/app')) location.replace('/');
      else showLanding();
      return null;
    }
    let response;
    try{
      response=await nativeFetch(`${AUTH_BACKEND}/auth/session`,{cache:'no-store',headers:{'Authorization':`FlowSignalUser ${token}`}});
    }catch(_error){
      return preserveSessionDuringBackendOutage();
    }
    if(!response.ok){
      if(response.status>=500||response.status===408||response.status===429)return preserveSessionDuringBackendOutage();
      sessionStorage.removeItem(USER_SESSION_KEY);
      sessionStorage.removeItem(TAB_ROLE_KEY);
      clearDeviceSession();
      localStorage.removeItem('flowsignal_access');
      localStorage.removeItem('flowsignal_role');
      sessionUser=null;csrfToken='';sessionStorage.removeItem(CSRF_KEY);
      if(location.pathname.startsWith('/app')) location.replace('/account.html?expired=1');
      else showLanding();
      return null;
    }
    const data=await response.json().catch(()=>null);
    if(!data)return preserveSessionDuringBackendOutage();
    if(data.authenticated&&data.user){
      csrfToken=String(data.csrf_token||'');
      sessionStorage.setItem(CSRF_KEY,csrfToken);
      saveDeviceSession(token,csrfToken);
      localStorage.setItem('flowsignal_role','user');
      localStorage.setItem('flowsignal_access',JSON.stringify({granted:true,time:Date.now()}));
      applyUser(data.user);
      return data.user;
    }
    // Only a successful authoritative response saying the session is no longer
    // authenticated is allowed to remove the persistent login.
    sessionStorage.removeItem(USER_SESSION_KEY);
    sessionStorage.removeItem(TAB_ROLE_KEY);
    clearDeviceSession();
    localStorage.removeItem('flowsignal_access');
    localStorage.removeItem('flowsignal_role');
    sessionUser=null;csrfToken='';sessionStorage.removeItem(CSRF_KEY);
    if(location.pathname.startsWith('/app')) location.replace('/account.html?expired=1');
    else showLanding();
    return null;
  }
  async function logoutUser(){
    const token=userSessionToken();
    const csrf=csrfToken;
    if(token&&csrf){
      try{await nativeFetch(`${AUTH_BACKEND}/auth/logout`,{method:'POST',headers:{'Authorization':`FlowSignalUser ${token}`,'X-FlowSignal-CSRF':csrf}});}catch(_error){}
    }
    const tabId=currentTabId();
    if(tabId)localStorage.removeItem(`flowsignal_tab_user_session:${tabId}`);
    clearDeviceSession();
    localStorage.removeItem('flowsignal_access');
    localStorage.removeItem('flowsignal_role');
    window.name='';
    sessionStorage.setItem(TAB_SIGNED_OUT_KEY,'1');
    sessionStorage.removeItem(USER_SESSION_KEY);
    sessionStorage.removeItem(CSRF_KEY);
    sessionStorage.removeItem(TAB_ROLE_KEY);
    sessionStorage.removeItem(PUBLIC_HOME_KEY);
    sessionUser=null;csrfToken='';
    location.replace('/');
  }
  function logoutAdmin(){
    const tabId=currentTabId();
    if(tabId)localStorage.removeItem(`flowsignal_tab_admin_session:${tabId}`);
    window.name='';
    sessionStorage.removeItem(USER_SESSION_KEY);
    sessionStorage.removeItem(CSRF_KEY);
    sessionStorage.removeItem(TAB_ROLE_KEY);
    sessionStorage.removeItem(PUBLIC_HOME_KEY);
    sessionStorage.removeItem(TAB_SIGNED_OUT_KEY);
    localStorage.removeItem('flowsignal_access');
    localStorage.removeItem('flowsignal_role');
    localStorage.removeItem(LEGACY_SESSION_TOKEN_KEY);
    try{window.speechSynthesis?.cancel?.();}catch(_error){}
    location.replace('/');
  }

  function wireLanding(){
    const login=document.getElementById('openAdminLoginBtn');
    if(login){login.removeAttribute('onclick');login.textContent='Login';login.addEventListener('click',event=>{event.preventDefault();openAccount('login');});}
    const started=document.getElementById('openAccessBtn');
    if(started){started.removeAttribute('onclick');started.removeAttribute('data-open-access');started.textContent='Get Started';started.addEventListener('click',event=>{event.preventDefault();openAccount('signup');});}
    const hero=document.getElementById('openAccessBtnHero');
    if(hero){hero.removeAttribute('onclick');hero.removeAttribute('data-open-access');hero.textContent='Create Account →';hero.addEventListener('click',event=>{event.preventDefault();openAccount('signup');});}
    const nav=document.querySelector('.landing-nav-actions');
    if(nav&&!document.getElementById('landingOwnerBtn')){
      const owner=document.createElement('button');owner.id='landingOwnerBtn';owner.className='landing-login-btn';owner.type='button';owner.textContent='Owner';owner.title='Owner / Admin access';owner.addEventListener('click',openOwnerAccess);nav.appendChild(owner);
    }
  }

  document.addEventListener('click',event=>{
    const target=event.target?.closest?.('#logoutBtn');
    if(!target)return;
    const role=String(sessionUser?.role||tabRole()||'').toLowerCase();
    if(role!=='user'&&role!=='admin')return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    if(role==='admin'){logoutAdmin();return;}
    logoutUser();
  },true);

  window.FlowSignalAuth={
    get user(){return sessionUser;},get csrf(){return csrfToken;},get sessionToken(){return userSessionToken();},
    currentUserId(){return sessionUser?.id||'';},session,
    logout(){return tabRole()==='admin'?logoutAdmin():logoutUser();},
    open(mode='login'){openAccount(mode);},openOwner:openOwnerAccess,backend:BACKEND
  };

  if(legacyOwner()){
    sessionStorage.removeItem(PUBLIC_HOME_KEY);
    sessionStorage.removeItem(TAB_SIGNED_OUT_KEY);
    showApp();
    return;
  }

  installPublicHomeStyle();
  wireLanding();
  session();
})();