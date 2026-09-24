const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
test('execution overrides timeout without changing regular API timeout', () => {
 const api=read('strategy-simulator/strategy-simulator-api.js'), client=read('apiClient.js');
 assert.match(api,/SIMULATION_REQUEST_TIMEOUT_MS = 120000/);
 assert.match(api,/timeoutMs: SIMULATION_REQUEST_TIMEOUT_MS/);
 assert.match(api,/suppressErrorPanel: true/);
 assert.match(client,/DEFAULT_TIMEOUT_MS = 12000/);
 assert.match(client,/delete requestInit.timeoutMs/);
});
test('Studio delegates execution and Simulator consumes explicit FAST intent once',()=>{
 const studio=read('strategy-studio/strategy-studio-workspace.js'),sim=read('strategy-simulator/strategy-simulator.js');
 assert.doesNotMatch(studio,/runSimulation|aggregateSimulationResults/);
 assert.match(studio,/autostart/);
 assert.match(sim,/autoStartConsumed/);
 assert.match(sim,/runFastBacktest/);
});
const vm = require('node:vm');
test('simulation timeout reaches client; native fetch receives no custom options', async () => {
 const api=read('strategy-simulator/strategy-simulator-api.js');
 const chunk=api.slice(api.indexOf('  async function runChunk('),api.indexOf('  async function runSimulation('));
 let captured;
 const context={SIMULATION_REQUEST_TIMEOUT_MS:120000,loadStatic5m:async()=>[],request:async(path,init)=>{captured={path,init};return{};}};
 vm.createContext(context); vm.runInContext(chunk+';globalThis.runChunk=runChunk;',context);
 await context.runChunk({symbol:'XAUUSD'},{cursor:1},false);
 assert.equal(captured.path,'/strategy-simulator/run'); assert.equal(captured.init.timeoutMs,120000);
 assert.equal(captured.init.body.continuation.cursor,1); assert.equal(captured.init.body.finalize,false);
 const client=read('apiClient.js');
 const fn=client.slice(client.indexOf('  function requestWithTimeout('),client.indexOf('  function ensureErrorPanel('));
 const delays=[];const native=[];
 const c={DEFAULT_TIMEOUT_MS:12000,AbortController,canonicalBackendInput:x=>x,applyOwnerAuthorization:(_,x)=>x,window:{setTimeout:(_,ms)=>{delays.push(ms);return 1;},clearTimeout:()=>{},FlowSignalApi:{nativeFetch:async(_,init)=>{native.push(init);return {};}}}};
 vm.createContext(c);vm.runInContext(fn+';globalThis.requestWithTimeout=requestWithTimeout;',c);
 await c.requestWithTimeout('/regular');await c.requestWithTimeout(captured.path,captured.init);
 assert.deepEqual(delays,[12000,120000]);
 assert.equal('timeoutMs' in native[1],false);assert.equal('suppressErrorPanel' in native[1],false);
});
