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
   assert.equal(await page.locator('.page-heading').count(),0);
   assert.ok((await page.locator('.chart-panel').boundingBox()).y < 210, 'compact chart starts higher at 1440px');
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
   await page.locator('#chartLineBtn').click();
   const originalStart = await page.locator('#startDate').inputValue();
   const originalEnd = await page.locator('#endDate').inputValue();
   for(const field of ['start','end']) {
    await page.locator('#'+field+'CalendarBtn').click();
    assert.ok(await page.locator('#replayCalendar').isVisible());
    if(field==='start') {
     if(out) await page.screenshot({path:path.join(out,engine+'-calendar.png')});
     await page.setViewportSize({width:390,height:844});
     const popup=await page.locator('#replayCalendar').boundingBox();
     assert.ok(popup.x>=0 && popup.x+popup.width<=390 && popup.y>=0 && popup.y+popup.height<=844,'calendar fits mobile');
     if(out) await page.screenshot({path:path.join(out,engine+'-calendar-mobile.png')});
     await page.setViewportSize({width:1440,height:900});
    }
    await page.locator('#calendarYear').selectOption('2024');
    await page.locator('#calendarMonth').selectOption('1');
    await page.locator('#calendarDays button[data-day="29"]').click();
    await page.locator('#calendarTime').fill('14:35');
    await page.locator('#calendarApply').click();
    assert.equal(await page.locator('#'+field+'Year').inputValue(),'2024');
    assert.equal(await page.locator('#'+field+'Date').inputValue(),'02-29 14:35');
    await page.locator('#'+field+'CalendarBtn').click();
    assert.equal(await page.locator('#calendarDays [aria-pressed="true"]').textContent(),'29');
    await page.locator('#calendarYear').selectOption('2025');
    assert.equal(await page.locator('#calendarDays button[data-day="29"]').count(),0,'non-leap February');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#replayCalendar').isVisible(),false,'Escape closes calendar with an active drawing tool');
    assert.equal((await state(page)).drawingMode,'line','calendar keys leave chart tools unchanged');
    assert.equal(await page.locator('#'+field+'Date').inputValue(),'02-29 14:35','Escape cancels edits');
   }
   await page.locator('#chartSelectBtn').click();
   await page.locator('#startDate').fill(originalStart);await page.locator('#endDate').fill(originalEnd);
   await page.locator('#startYear').selectOption(String(new Date().getFullYear()-1));
   await page.locator('#endYear').selectOption(String(new Date().getFullYear()));
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
   assert.equal(await page.locator('.manual-replay-position-info').count(),0);
   assert.equal(await page.locator('.manual-replay-live-level.entry span').textContent(),'');
   const checkPips = async () => {
    const entry=Number(await page.locator('#draftEntry').inputValue());
    for(const [kind,input] of [['target','tpPrice'],['stop','slPrice']]) {
     const expected=(Math.abs(Number(await page.locator('#'+input).inputValue())-entry)/.0001).toFixed(1)+' pips';
     assert.ok((await page.locator('.manual-replay-position-caption.'+kind).textContent()).includes(expected),expected);
     assert.ok(await page.locator('.manual-replay-position-caption.'+kind).isVisible());
    }
   };
   await checkPips();
   const originalSL=await page.locator('#slPrice').inputValue(),originalTP=await page.locator('#tpPrice').inputValue();
   const draftEntry=Number(await page.locator('#draftEntry').inputValue());
   await page.locator('#slPrice').fill((draftEntry-.0001).toFixed(5));await page.locator('#slPrice').dispatchEvent('change');
   await page.locator('#tpPrice').fill((draftEntry+.0001).toFixed(5));await page.locator('#tpPrice').dispatchEvent('change');
   await checkPips();
   const captions=await page.locator('.manual-replay-position-caption').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom};}).sort((a,b)=>a.top-b.top));
   assert.ok(captions[0].bottom<=captions[1].top,'tight position pip labels do not overlap');
   await page.locator('#slPrice').fill(originalSL);await page.locator('#slPrice').dispatchEvent('change');
   await page.locator('#tpPrice').fill(originalTP);await page.locator('#tpPrice').dispatchEvent('change');
   await page.evaluate(()=>scrollTo(0,0));
   if(out) await page.screenshot({path:path.join(out,engine+'-position-pips.png')});
   await page.locator('#positionSizingMode').selectOption('MANUAL_LOT');await page.locator('#lotSize').fill('0.10');assert.equal(await page.locator('#draftLot').textContent(),'0.10');
   page.on('dialog',d=>d.accept());await unfocus(page);await page.keyboard.press('Enter');assert.ok(await page.locator('#positionCard').isVisible());await page.locator('.manual-replay-trade-hologram').waitFor({state:'visible'});
   await page.keyboard.press('ArrowRight');const equity=await page.locator('#metricEquity').textContent();assert.notEqual(equity,'—');await page.locator('#closeBtn').click();assert.equal(await page.locator('#tradeBody tr').count(),1);assert.equal(await page.locator('#metricTrades').textContent(),'1');
   await page.locator('#resetBtn').click();await page.locator('#shortPositionBtn').click();assert.equal(await page.locator('#draftDirection').inputValue(),'SHORT / SELL');await page.locator('#cancelPositionBtn').click();
   await page.evaluate(()=>scrollTo(0,0));
   for(const [button,type] of [['chartLineBtn','line'],['chartRectBtn','rect'],['chartMeasureBtn','measure']]) {
    await page.locator('#'+button).click();
    const plot=await page.locator('.chart-plot').boundingBox();
    await page.mouse.click(plot.x+150,plot.y+130);
    await page.locator('.manual-drawing.'+type).waitFor({state:'attached'});
    await page.waitForFunction(type => {
     const shape = document.querySelector('.manual-drawing.'+type)?.getBoundingClientRect();
     return shape && shape.width >= 120 && shape.height >= 30;
    }, type); // Read within one task: chart redraws replace SVG nodes frequently.
    if(type==='measure') {
     const saved=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('nathauxfx_manual_replay_drawings_v1:')).flatMap(k=>JSON.parse(localStorage[k])).find(d=>d.type==='measure'));
     const expected=((saved.b.price-saved.a.price)/.0001).toFixed(1)+' pips';
     assert.ok((await page.locator('.manual-measure-label').textContent()).includes(expected),expected);
     const previous=await page.locator('.manual-measure-label').textContent();
     const handle=await page.locator('.measure [data-drawing-handle="b"]').evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
     await page.mouse.move(handle.x,handle.y);await page.mouse.down();await page.mouse.move(handle.x+40,handle.y+50,{steps:5});await page.mouse.up();
     assert.notEqual(await page.locator('.manual-measure-label').textContent(),previous,'measure updates when resizing');
     if(out) await page.screenshot({path:path.join(out,engine+'-measure.png')});
    }
    await page.locator('#chartDeleteBtn').click();
   }
   for(const [button,type] of [['chartLineBtn','line'],['chartRectBtn','rect'],['chartMeasureBtn','measure']]){
    await page.locator('#'+button).click();assert.equal((await state(page)).drawingMode,type);const box=await page.locator('.chart-plot').boundingBox();
    await page.mouse.move(box.x+180,box.y+100);await page.mouse.down();await page.mouse.move(box.x+300,box.y+180,{steps:10});await page.mouse.up();assert.equal((await state(page)).drawings,1);
    await page.locator('#chartDeleteBtn').click();assert.equal((await state(page)).drawings,0);
   }
   await page.locator('#chartSelectBtn').click();assert.equal((await state(page)).drawingMode,null);
   await page.locator('#fullscreenBtn').click();await page.waitForTimeout(200);
   assert.equal(await page.evaluate(()=>document.body.classList.contains('manual-replay-fullscreen-fallback')),true,'stream-safe fullscreen active');
   assert.equal(await page.evaluate(()=>!!document.fullscreenElement||!!document.webkitFullscreenElement),false,'native fullscreen is not used');
   assert.ok(await page.locator('#chartLineBtn').isVisible());
   assert.ok(await page.locator('#chartTitle').isVisible(), 'fullscreen pair is visible');
   assert.equal(await page.locator('#chartTitle').textContent(), await page.locator('#symbol').inputValue());
   const headerBox = await page.locator('#chartTitle').boundingBox();
   const fullscreenPlot = await page.locator('.chart-plot').boundingBox();
   assert.ok(headerBox.y < 30 && headerBox.y + headerBox.height <= fullscreenPlot.y, 'pair is above the fullscreen plot');
   await page.locator('#chartMeasureBtn').click();
   await page.mouse.click(fullscreenPlot.x+240,fullscreenPlot.y+190);
   assert.ok(await page.locator('.manual-measure-label').isVisible(),'measure works in fullscreen');
   if(out) await page.screenshot({path:path.join(out,`${engine}-fullscreen.png`)});
   await page.locator('#chartDeleteBtn').click();
   await page.setViewportSize({width:844,height:430});
   await page.waitForTimeout(200);
   const shortPlot = await page.locator('.chart-plot').boundingBox();
   const shortCanvas = await page.locator('#manualReplayChart table').boundingBox();
   assert.ok(shortCanvas.height <= shortPlot.height, 'fullscreen chart and time axis fit a short viewport');
   await page.setViewportSize({width:1440,height:900});
   await page.waitForTimeout(150);
   await page.locator('#fullscreenBtn').click();await page.waitForTimeout(150);
   assert.equal(await page.evaluate(()=>document.body.classList.contains('manual-replay-fullscreen-fallback')),false);
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
