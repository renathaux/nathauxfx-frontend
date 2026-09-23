// Run with Playwright installed: node Frontend/tests/browser/manual-replay.browser.cjs
// Serve Frontend first; REPLAY_BASE_URL and REPLAY_SCREENSHOTS are optional.
const {chromium, webkit} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.REPLAY_BASE_URL || 'http://127.0.0.1:8765';
const out = process.env.REPLAY_SCREENSHOTS;
const sizes = [[1440,900],[1280,800],[1366,768],[1512,982],[1920,1080],[768,1024],[721,900],[390,844]];
const ready = page => page.waitForFunction(() => document.querySelector('#chartLoading').classList.contains('hidden') && window.ManualReplayLiveChart.getState().candles > 0);
const state = page => page.evaluate(() => window.ManualReplayLiveChart.getState());
const unfocus = page => page.evaluate(() => document.activeElement?.blur());
async function geometry(page, width) {
  const result = await page.evaluate(() => {
    const r = s => {const el=document.querySelector(s), b=el.getBoundingClientRect(); return {x:b.x,y:b.y,w:b.width,h:b.height,bottom:b.bottom,right:b.right,transform:getComputedStyle(el).transform};};
    const controls = ['symbol','timeframe','startYear','startDate','endYear','endDate','loadBtn'];
    return {width:innerWidth,scroll:document.documentElement.scrollWidth,setup:r('.setup-panel'),chart:r('.chart-panel'),ticket:r('.trade-panel'),lower:r('.lower-grid'),metrics:r('.metrics-panel'),log:r('.log-panel'),plot:r('.chart-plot'),canvas:r('#manualReplayChart canvas'),
      controls:controls.map(id=>{const el=document.getElementById(id),b=el.getBoundingClientRect();const hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return {id,reachable:el===hit||el.contains(hit)};})};
  });
  assert.equal(result.scroll,width,`horizontal overflow at ${width}`);
  assert.ok(result.chart.y >= result.setup.bottom, 'chart must not overlap setup');
  for (const part of ['setup','chart','ticket','metrics','log']) assert.equal(result[part].transform,'none',part);
  if(width>1100) { assert.ok(Math.abs(result.chart.y-result.ticket.y)<1,'ticket top alignment');assert.ok(result.ticket.x>=result.chart.right,'ticket column'); }
  else assert.ok(result.ticket.y>=result.lower.bottom,'ticket stacks after chart section');
  assert.ok(result.lower.y-result.chart.bottom>=13 && result.lower.y-result.chart.bottom<=15,'metrics directly below chart');
  assert.ok(result.log.h<310,'compact empty log');
  assert.ok(result.plot.h>=320,'useful chart height');
  assert.ok(result.canvas.w>result.plot.w*.6 && result.canvas.w<=result.plot.w,'chart resizes to frame');
  assert.ok(result.controls.every(c=>c.reachable),JSON.stringify(result.controls));
  return result;
}
(async()=>{
 for (const engine of ['chrome','webkit']) {
  const browser = await (engine==='chrome'?chromium:webkit).launch(engine==='chrome'?{channel:'chrome',headless:true}:{headless:true});
  try {
   const page = await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{
    const items={};for(const key of ['chartPanel[0]','tradePanel[0]','mainGrid#replayWorkspace','metricGrid[0]','logPanel[0]','setupFieldControl#symbol']) items[key]={x:-900,y:-600,width:2400,height:1700,deleted:true,text:'CORRUPTED'};
    for(const v of [3,4]) localStorage.setItem(`nathauxfx_manual_replay_layout_editor_v${v}`,JSON.stringify({version:v,items}));
   });
   await page.goto(base+'/manual-replay.html');await ready(page);
   assert.equal(await page.locator('body').getAttribute('data-replay-theme'),'light');
   assert.equal(await page.locator('#metricEquity').textContent(),'$10,000.00');
   for(const [width,height] of sizes){
    await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo(0,0));
    await page.waitForTimeout(150); // ResizeObserver + chart canvas paint.
    await geometry(page,width);
    if(out){fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,`${engine}-${width}x${height}.png`),fullPage:true});}
    console.log(`PASS ${engine} ${width}x${height}: geometry, stale storage, control hit targets`);
   }
   await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>scrollTo(0,0));
   const before=await page.locator('.main-grid').boundingBox();
   await page.locator('#uiSettingsBtn').click();await page.locator('#uiTheme').selectOption('dark');
   assert.deepEqual(await page.locator('.main-grid').boundingBox(),before,'theme must not change geometry');
   await page.locator('#uiTheme').selectOption('light');await page.locator('#uiSettingsClose').click();
   await page.locator('#symbol').selectOption('XAUUSD');await ready(page);assert.equal((await state(page)).symbol,'XAUUSD');assert.equal(await page.locator('#chartTitle').textContent(),'XAUUSD');
   await page.locator('#timeframe').selectOption('15m');await ready(page);assert.equal(await page.locator('#chartTimeframe').inputValue(),'15m');
   await page.locator('#chartTimeframe').selectOption('1h');await ready(page);assert.equal(await page.locator('#timeframe').inputValue(),'1h');
   await page.locator('#symbol').selectOption('EURUSD');await ready(page);await page.locator('#timeframe').selectOption('5m');await ready(page);
   const count=(await state(page)).candles;await unfocus(page);await page.keyboard.press('ArrowRight');assert.equal((await state(page)).candles,count+1);await page.keyboard.press('ArrowLeft');assert.equal((await state(page)).candles,count);
   for(const [key,speed] of [['1','1'],['2','2'],['5','5'],['6','10']]){await page.keyboard.press(key);assert.equal(await page.locator('#speed').inputValue(),speed);}
   await page.keyboard.press('p');await page.waitForTimeout(240);await page.keyboard.press('Space');assert.ok((await state(page)).candles>count);assert.match(await page.locator('#playBtn').textContent(),/Play/);
   await page.keyboard.press('Space');await page.keyboard.press('Space');assert.match(await page.locator('#playBtn').textContent(),/Pause/);await page.keyboard.press('Space');
   await page.locator('#longPositionBtn').click();assert.equal(await page.locator('#draftDirection').inputValue(),'LONG / BUY');
   await page.locator('#positionSizingMode').selectOption('MANUAL_LOT');await page.locator('#lotSize').fill('0.10');assert.equal(await page.locator('#draftLot').textContent(),'0.10');
   page.on('dialog',d=>d.accept());await unfocus(page);await page.keyboard.press('Enter');assert.ok(await page.locator('#positionCard').isVisible());await page.locator('.manual-replay-trade-hologram').waitFor({state:'visible'});
   await page.keyboard.press('ArrowRight');const equity=await page.locator('#metricEquity').textContent();assert.notEqual(equity,'—');await page.locator('#closeBtn').click();assert.equal(await page.locator('#tradeBody tr').count(),1);assert.equal(await page.locator('#metricTrades').textContent(),'1');
   await page.locator('#resetBtn').click();await page.locator('#shortPositionBtn').click();assert.equal(await page.locator('#draftDirection').inputValue(),'SHORT / SELL');await page.locator('#cancelPositionBtn').click();
   for(const [button,type] of [['chartLineBtn','line'],['chartRectBtn','rect']]){
    await page.locator('#'+button).click();assert.equal((await state(page)).drawingMode,type);const box=await page.locator('.chart-plot').boundingBox();
    await page.mouse.move(box.x+180,box.y+100);await page.mouse.down();await page.mouse.move(box.x+300,box.y+180,{steps:10});await page.mouse.up();assert.equal((await state(page)).drawings,1);
    await page.locator('#chartDeleteBtn').click();assert.equal((await state(page)).drawings,0);
   }
   await page.locator('#chartSelectBtn').click();assert.equal((await state(page)).drawingMode,null);
   await page.locator('#fullscreenBtn').click();await page.waitForTimeout(200);
   assert.ok(await page.evaluate(()=>!!document.fullscreenElement||!!document.webkitFullscreenElement||document.body.classList.contains('manual-replay-fullscreen-fallback')),'fullscreen active');
   assert.ok(await page.locator('#chartLineBtn').isVisible());await page.locator('#fullscreenBtn').click();await page.waitForTimeout(150);
   assert.equal(await page.evaluate(()=>!!document.fullscreenElement||!!document.webkitFullscreenElement||document.body.classList.contains('manual-replay-fullscreen-fallback')),false);
   await page.locator('.chart-plot').scrollIntoViewIfNeeded();
   const plot = await page.locator('.chart-plot').boundingBox();
   const revealed = (await state(page)).candles;
   await page.mouse.move(plot.x+200,plot.y+100);await page.mouse.down();await page.mouse.move(plot.x+260,plot.y+160,{steps:8});await page.mouse.up();
   assert.notEqual((await state(page)).verticalOffsetRatio,0,'chart can pan vertically');
   await page.mouse.move(plot.x+plot.width-25,plot.y+100);await page.mouse.down();await page.mouse.move(plot.x+plot.width-25,plot.y+160,{steps:8});await page.mouse.up();
   assert.notEqual((await state(page)).verticalScale,1,'price axis can scale vertically');
   await page.locator('#zoomInBtn').click();await page.locator('#zoomOutBtn').click();
   assert.equal((await state(page)).verticalScale,1,'zoom auto-fits visible candles');
   assert.equal((await state(page)).candles,revealed,'chart navigation never reveals future candles');
   assert.deepEqual(errors,[],'runtime errors');console.log(`PASS ${engine}: reloads, keyboard, risk, virtual trades, drawings, fullscreen, theme`);
  } finally {await browser.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
