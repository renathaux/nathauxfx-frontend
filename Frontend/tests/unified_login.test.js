const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'account.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const storage = () => { const values = new Map(); return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)}; };
function harness(replies, mode='login', resume) {
  const elements = new Map(), calls = [], redirects = [];
  const el = id => { if (!elements.has(id)) elements.set(id,{value:'',textContent:'',disabled:false,handlers:{},classList:{add(){},remove(){},toggle(){}},addEventListener(type,fn){this.handlers[type]=fn;},removeAttribute(k){delete this[k];},focus(){}}); return elements.get(id); };
  const localStorage=storage(),sessionStorage=storage();
  const context={URLSearchParams,Date,Math,JSON,String,Number,Error,crypto:{randomUUID:()=> 'test-tab'},localStorage,sessionStorage,history:{replaceState(){}},setTimeout:()=>0,setInterval:()=>0,clearInterval(){},document:{getElementById:el,cookie:''},location:{hostname:'test.example',origin:'https://test.example',search:`?mode=${mode}`,replace:url=>redirects.push(url)},window:{name:''},fetch:async(url,options)=>{if(url.endsWith('/auth/session'))return resume ? await resume : {ok:true,json:async()=>({authenticated:false})};calls.push({url,body:JSON.parse(options.body)});const reply=replies.shift();if(reply instanceof Error)throw reply;return {ok:reply.status>=200&&reply.status<300,status:reply.status,json:async()=>reply.data};}};
  vm.runInNewContext(script,context);
  return {el,calls,redirects,localStorage,sessionStorage,submit:()=>el('form').handlers.submit({preventDefault(){}})};
}
test('validated owner uses admin session and clears stale customer state',async()=>{
  const h=harness([{status:200,data:{ok:true,role:'admin',token:'owner-test-token'}}]);
  await Promise.resolve(); await Promise.resolve();
  h.localStorage.setItem('flowsignal_user_session_persist','old');h.sessionStorage.setItem('flowsignal_user_session_token','old');h.sessionStorage.setItem('flowsignal_user_portal_intent','1');
  h.el('email').value='owner@example.test';h.el('password').value='short';await h.submit();
  assert.deepEqual(h.redirects,['/app']);assert.equal(h.sessionStorage.getItem('flowsignal_tab_role'),'admin');assert.equal(h.localStorage.getItem('flowsignal_session_token'),'owner-test-token');assert.equal(h.localStorage.getItem('flowsignal_user_session_persist'),null);assert.equal(h.sessionStorage.getItem('flowsignal_user_portal_intent'),null);assert.equal(h.calls.length,1);
});
test('customer credentials use customer login and portal',async()=>{
  const h=harness([{status:200,data:{ok:false}},{status:200,data:{session_token:'user-test-token',csrf_token:'csrf'}}]);await h.submit();assert.deepEqual(h.redirects,['/app?user=1']);assert.equal(h.sessionStorage.getItem('flowsignal_tab_role'),'user');assert.ok(h.calls[1].url.endsWith('/auth/login'));assert.equal(h.localStorage.getItem('flowsignal_session_token'),null);
});
test('invalid credentials never create an admin session',async()=>{
  const h=harness([{status:200,data:{ok:false}},{status:401,data:{detail:'INVALID_EMAIL_OR_PASSWORD'}}]);await h.submit();assert.deepEqual(h.redirects,[]);assert.equal(h.sessionStorage.getItem('flowsignal_tab_role'),null);assert.match(h.el('error').textContent,/Invalid email or password/);
});
test('non-admin legacy response does not elevate a user',async()=>{
  const h=harness([{status:200,data:{ok:true,role:'user',token:'legacy-user'}},{status:401,data:{detail:'INVALID_EMAIL_OR_PASSWORD'}}]);await h.submit();assert.deepEqual(h.redirects,[]);assert.equal(h.localStorage.getItem('flowsignal_session_token'),null);
});
test('admin success without a token fails closed',async()=>{
  const h=harness([{status:200,data:{ok:true,role:'admin'}}]);await h.submit();assert.deepEqual(h.redirects,[]);assert.equal(h.calls.length,1);assert.equal(h.sessionStorage.getItem('flowsignal_tab_role'),null);
});
test('backend failure never creates or falls back to another session',async()=>{
  const h=harness([{status:503,data:{}}]);await h.submit();assert.deepEqual(h.redirects,[]);assert.equal(h.calls.length,1);assert.equal(h.el('submit').disabled,false);
});
test('signup skips owner endpoint and preserves verification',async()=>{
  const h=harness([{status:200,data:{verification_required:true,email:'u***@example.test'}}],'signup');h.el('password').value=h.el('confirm').value='test-password';await h.submit();assert.equal(h.calls.length,1);assert.ok(h.calls[0].url.endsWith('/auth/signup'));assert.deepEqual(h.redirects,[]);assert.equal(h.el('password').minLength,10);assert.match(h.el('otpCopy').textContent,/6-digit code/);
});
test('unverified customer still gets email verification',async()=>{
  const h=harness([{status:200,data:{ok:false}},{status:403,data:{detail:{code:'EMAIL_VERIFICATION_REQUIRED',email:'u***@example.test'}}}]);await h.submit();assert.deepEqual(h.redirects,[]);assert.match(h.el('otpCopy').textContent,/6-digit code/);
});
test('late customer restore cannot overwrite an owner login',async()=>{
  let resolve;const resume=new Promise(r=>resolve=r);const h=harness([{status:200,data:{ok:true,role:'admin',token:'owner-test-token'}}],'login',resume);await h.submit();resolve({ok:true,json:async()=>({authenticated:true,user:{id:'user-id'}})});await new Promise(r=>setImmediate(r));assert.deepEqual(h.redirects,['/app']);assert.equal(h.sessionStorage.getItem('flowsignal_tab_role'),'admin');
});
