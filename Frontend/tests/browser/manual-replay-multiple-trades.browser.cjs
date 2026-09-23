// Deterministic browser integration: each position stays independent; totals agree.
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.REPLAY_BASE_URL||'http://127.0.0.1:8765';
const out=process.env.REPLAY_SCREENSHOTS;
const api=`window.ManualReplayApi={async loadHistory({symbol,timeframe}) {
 const parts=document.querySelector('#startDate').value.match(/\\d+/g).map(Number);
 const start=new Date(Number(document.querySelector('#startYear').value),parts[0]-1,parts[1],parts[2],parts[3]).getTime();
 const prices=[1.1000,1.1010,1.1020,1.0990,1.1040,1.1050,1.1060];
 const candles=Array.from({length:247},(_,n)=>{const i=n-240;const close=i<0?1.1:prices[i];const open=i<=0?1.1:prices[i-1];return {timestamp:new Date(start+i*300000).toISOString(),open,close,high:Math.max(open,close)+.0001,low:Math.min(open,close)-.0001};});
 return {symbol,timeframe,candles};
}};`;
const dollars=s=>Number(s.replace(/[^\d.-]/g,''));
(async()=>{for(const [engine,type] of [['chrome',chromium],['webkit',webkit]]){
 const browser=await type.launch(engine==='chrome'?{channel:'chrome',headless:true}:{headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.route('**/manual-replay/manual-replay-api.js*',route=>route.fulfill({contentType:'text/javascript',body:api}));
  await page.goto(base+'/manual-replay.html');await page.waitForFunction(()=>document.querySelector('#chartLoading').classList.contains('hidden'));
  const open=async(side,lot,sl,tp)=>{
   await page.locator(side==='BUY'?'#longPositionBtn':'#shortPositionBtn').click();
   await page.locator('#positionSizingMode').selectOption('MANUAL_LOT');await page.locator('#lotSize').fill(lot);
   await page.locator('#slPrice').fill(sl);await page.locator('#tpPrice').fill(tp);
   await page.locator(side==='BUY'?'#buyBtn':'#sellBtn').click();
  };
  const check=async(count,pnl,balance)=>{
   assert.equal(await page.locator('#openTradesList .open-trade-row').count(),count);
   assert.ok(Math.abs(dollars(await page.locator('#metricOpenPnl').textContent())-pnl)<.01);
   assert.ok(Math.abs(dollars(await page.locator('#metricBalance').textContent())-balance)<.01);
   assert.ok(Math.abs(dollars(await page.locator('#metricEquity').textContent())-(balance+pnl))<.01);
   if(count){await page.waitForFunction(expected=>{const n=document.querySelector('.manual-replay-trade-hologram strong');return n&&Math.abs(Number(n.textContent.replace(/[^\d.-]/g,''))-expected)<.01;},pnl);
    if(count>1) assert.equal(await page.locator('.manual-replay-trade-hologram .pips').textContent(),`${count} open trades`);
   } else await page.waitForFunction(()=>document.querySelector('.manual-replay-trade-hologram').classList.contains('hidden'));
  };
  await open('BUY','0.10','1.09000','1.12000');await open('SELL','0.20','1.12000','1.09000');await check(2,0,10000);
  await page.locator('#nextBtn').click();await check(2,-10,10000);
  await page.locator('#longPositionBtn').click();await check(2,-10,10000);await page.locator('#cancelPositionBtn').click();await check(2,-10,10000);
  await open('BUY','0.10','1.09000','1.12000');await page.locator('#nextBtn').click();await check(3,-10,10000);
  await page.locator('[data-select-trade="manual_1"]').click();assert.equal(await page.locator('#lotSize').inputValue(),'0.10');await page.locator('#tpPrice').fill('1.10300');await page.locator('#tpPrice').dispatchEvent('change');
  await page.locator('[data-select-trade="manual_2"]').click();assert.equal(await page.locator('#tpPrice').inputValue(),'1.09000');
  await page.locator('[data-close-trade="manual_2"]').click();await check(2,30,9960);
  await page.evaluate(()=>scrollTo(0,0));
  if(out){fs.mkdirSync(out,{recursive:true});await page.screenshot({path:out+'/'+engine+'-open-trades.png',fullPage:true});}
  await page.locator('#fullscreenBtn').click();await page.waitForFunction(()=>{const plot=document.querySelector('.chart-plot').getBoundingClientRect();const table=document.querySelector('#manualReplayChart table').getBoundingClientRect();return Math.abs(plot.width-table.width)<3;});await check(2,30,9960);
  if(out){fs.mkdirSync(out,{recursive:true});await page.screenshot({path:out+'/'+engine+'-multiple-trades-fullscreen.png'});}
  await page.locator('#fullscreenBtn').click();await page.locator('#nextBtn').click();await check(2,-30,9960);
  await page.locator('#nextBtn').click();await check(1,30,9990);assert.equal(await page.locator('#tradeBody tr').count(),2);
  await page.locator('#nextBtn').click();await page.locator('#closeBtn').click();await check(0,0,10030);assert.equal(await page.locator('#metricTrades').textContent(),'3');
  await page.locator('#resetBtn').click();await check(0,0,10000);
  await open('BUY','0.10','1.09950','1.10100');await open('SELL','0.10','1.10050','1.09900');
  await page.locator('#nextBtn').click();await check(0,0,10005);assert.equal(dollars(await page.locator('#metricDd').textContent()),0,'same-candle exits do not create phantom drawdown');assert.equal(await page.locator('#tradeBody tr').count(),2);
  await page.locator('#resetBtn').click();await open('BUY','0.10','1.09995','1.10005');await open('SELL','0.10','1.12000','1.09000');
  await page.locator('#nextBtn').click();await check(1,-10,10000);assert.match(await page.locator('#tradeBody').textContent(),/AMBIGUOUS/);
  await page.locator('#loadBtn').click();await page.waitForFunction(()=>document.querySelector('#chartLoading').classList.contains('hidden'));await check(0,0,10000);
  await page.locator('#longPositionBtn').click();await page.locator('#positionSizingMode').selectOption('AUTO_RISK');await page.locator('#riskValue').fill('1');await page.locator('#buyBtn').click();
  await page.locator('#longPositionBtn').click();await page.locator('#riskValue').fill('2');await page.locator('#buyBtn').click();
  await page.locator('[data-select-trade="manual_1"]').click();assert.equal(await page.locator('#positionSizingMode').inputValue(),'AUTO_RISK');assert.equal(await page.locator('#riskValue').inputValue(),'1');
  await open('BUY','0.30','1.09000','1.12000');await page.locator('[data-select-trade="manual_2"]').click();assert.equal(await page.locator('#positionSizingMode').inputValue(),'AUTO_RISK');assert.equal(await page.locator('#riskValue').inputValue(),'2');
  await page.locator('#resetBtn').click();await check(0,0,10000);
  assert.deepEqual(errors,[]);console.log('PASS '+engine+': multiple entries, mixed sizes/sides, draft coexistence, individual edits/close/SL/TP, aggregate hologram/equity, ambiguity, reset/reload');
 }finally{await browser.close();}
}})().catch(e=>{console.error(e);process.exitCode=1;});
