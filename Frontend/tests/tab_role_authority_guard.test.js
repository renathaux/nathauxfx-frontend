const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../tab-role-session.js'),'utf8');
let writes=0,scheduled=0,observerCallback;
const checks={dataset:{executionAuthority:'STRATEGY_STUDIO'}};
const nodes=new Map();
for(const id of ['main-signal','main-smc-structure','main-smc-trigger','main-rr','strategy-debug-decision']){
 let text=id==='main-signal'?'WAIT':id==='main-smc-structure'?'Gold 931 v18':'Saved condition';
 nodes.set(id,{get textContent(){return text;},set textContent(value){writes++;text=value;}});
}
const context={supportedDesktop:true,chromeDesktop:false,safariDesktop:false,window:{},document:{getElementById:id=>nodes.get(id),querySelector:q=>q==='.entry-strategy-debug'?checks:q==='.main-trade-card'?{}:null},MutationObserver:class {constructor(cb){observerCallback=cb;}observe(){}},queueMicrotask:fn=>{scheduled++;fn();}};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('  function legacyStrategyPresentationOwnsPanel('),source.indexOf('  function ensureUserAnalysisVisibility(')),context);
// The source-preservation guard must apply even to direct calls, not just a wrapper.
context.keepAnalysisCardsVisible=()=>{};context.ensureDesktopAnalysisLayout=()=>{};
for(const authority of ['STRATEGY_STUDIO','NONE','UNAVAILABLE',undefined]){
 checks.dataset.executionAuthority=authority;
 context.resetExpiredSmcPlan();context.clearExpiredEntryChecks();context.syncCurrentStrategyPresentation();
 assert.equal(writes,0,`${authority} WAIT must retain authoritative labels and values`);
 assert.equal(nodes.get('main-smc-structure').textContent,'Gold 931 v18');
}
context.installSmcFreshnessGuard();
for(const authority of ["STRATEGY_STUDIO","NONE","UNAVAILABLE",undefined]){checks.dataset.executionAuthority=authority;observerCallback();}
assert.equal(scheduled,0,'deferring must not request another render');
console.log('Tab-role guard preserves Studio WAIT, NONE, and unavailable authority');
