const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../strategy-studio/strategy-studio.js'),'utf8');
function harness(request, initial=[]) {
 const list={innerHTML:'',querySelectorAll:()=>[],querySelector:()=>null};
 const state={strategies:initial,currentId:null,busy:false,libraryStatus:'idle'};
 const context={state,Api:{listStrategies:request},$:()=>list,renderDraftState(){},openSaved(){},newStrategy(){},notice(){},escapeHtml:String};
 vm.createContext(context);
 vm.runInContext(source.slice(source.indexOf('  function renderSavedStrategies()'),source.indexOf('  function escapeHtml('))+source.slice(source.indexOf('  async function loadStrategies('),source.indexOf('  function showConfirmation(')),context);
 return {context,list,state};
}
test('failed first load renders an error, never an empty library',async()=>{
 const h=harness(async()=>{throw new Error('AUTHENTICATION_REQUIRED');});
 await h.context.loadStrategies();
 assert.match(h.list.innerHTML,/Unable to load saved strategies/);
 assert.doesNotMatch(h.list.innerHTML,/No saved strategies/);
});
test('failed reload preserves the last successfully loaded strategies',async()=>{
 const h=harness(async()=>{throw new Error('Network failed');},[{strategy_id:'saved',name:'Gold 931',definition:{symbols:['XAUUSD']},state:'INACTIVE'}]);
 await h.context.loadStrategies();
 assert.equal(h.state.strategies.length,1);
 assert.match(h.list.innerHTML,/Gold 931/);
 assert.match(h.list.innerHTML,/Unable to load saved strategies/);
});
test('malformed successful payload never replaces a good list with empty',async()=>{
 const h=harness(async()=>({ok:true}),[{strategy_id:'saved',name:'Gold 931',definition:{symbols:[]}}]);
 await h.context.loadStrategies();
 assert.equal(h.state.strategies.length,1);
 assert.match(h.list.innerHTML,/Unable to load saved strategies/);
});
test('only a successful explicit empty array renders empty',async()=>{
 const h=harness(async()=>({ok:true,strategies:[]}));
 await h.context.loadStrategies();
 assert.match(h.list.innerHTML,/No saved strategies/);
});

test('malformed strategy entries cannot corrupt the last good library',async()=>{
 for (const broken of [null,{strategy_id:'bad',name:'Bad',definition:{symbols:'XAUUSD'}},{name:'Missing id'}]) {
  const h=harness(async()=>({ok:true,strategies:[broken]}),[{strategy_id:'saved',name:'Gold 931',definition:{symbols:[]}}]);
  await h.context.loadStrategies();
  assert.equal(h.state.strategies[0].strategy_id,'saved');
  assert.match(h.list.innerHTML,/Unable to load saved strategies/);
 }
});
