const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.REPLAY_BASE_URL||'http://127.0.0.1:8765';
const out=process.env.REPLAY_SCREENSHOTS;
(async()=>{for(const [engine,type] of [['chrome',chromium],['webkit',webkit]]){
 console.log('Checking '+engine+' path tool');
 const browser=await type.launch(engine==='chrome'?{channel:'chrome',headless:true}:{headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const ready=()=>page.waitForFunction(()=>document.querySelector('#chartLoading').classList.contains('hidden'));
  const paths=()=>page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('nathauxfx_manual_replay_drawings_v1:')).flatMap(k=>JSON.parse(localStorage[k])).filter(d=>d.type==='path'));
  const state=()=>page.evaluate(()=>window.ManualReplayLiveChart.getState());
  await page.goto(base+'/manual-replay.html');await ready();
  await page.locator('#chartPathBtn').click();
  let plot=await page.locator('.chart-plot').boundingBox();
  for(const [x,y] of [[150,240],[260,100],[350,280],[450,120]]) await page.mouse.click(plot.x+x,plot.y+y);
  await page.mouse.move(plot.x+500,plot.y+150);
  assert.equal((await paths()).length,0,'unfinished preview is not saved');
  await page.keyboard.press('p');assert.match(await page.locator('#playBtn').textContent(),/Pause/);
  await page.keyboard.press('Space');assert.match(await page.locator('#playBtn').textContent(),/Play/);
  const candles=(await state()).candles;
  await page.keyboard.press('Enter');assert.equal((await state()).candles,candles,'Enter finishes without replay trade action');
  let saved=await paths();assert.equal(saved.length,1);assert.equal(saved[0].points.length,4);
  assert.equal((await state()).drawingMode,null);
  await page.reload();await ready();await page.locator('.manual-drawing.path').waitFor({state:'attached'});
  assert.deepEqual(await paths(),saved,'vertices persist across reload');
  // Select a segment, then edit a vertex and move the whole path.
  const middle=await page.evaluate(()=>{const points=document.querySelector('.manual-path-hit').points;return {x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2};});
  plot=await page.locator('.chart-plot').boundingBox();await page.mouse.click(plot.x+middle.x,plot.y+middle.y);
  const handle=await page.evaluate(()=>{const r=document.querySelector('.path [data-drawing-handle="1"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
  await page.mouse.move(handle.x,handle.y);await page.mouse.down();await page.mouse.move(handle.x+35,handle.y+25,{steps:6});await page.mouse.up();
  let edited=await paths();assert.notDeepEqual(edited[0].points[1],saved[0].points[1]);assert.deepEqual(edited[0].points[0],saved[0].points[0]);
  const body=await page.evaluate(()=>{const p=document.querySelector('.manual-path-hit').points;const r=document.querySelector('.chart-plot').getBoundingClientRect();return{x:r.x+(p[0].x+p[1].x)/2,y:r.y+(p[0].y+p[1].y)/2};});
  await page.mouse.move(body.x,body.y);await page.mouse.down();await page.mouse.move(body.x+30,body.y+20,{steps:6});await page.mouse.up();
  saved=await paths();assert.notDeepEqual(saved[0].points[0],edited[0].points[0]);
  for(let i=1;i<4;i++) assert.ok(Math.abs((saved[0].points[i].logical-edited[0].points[i].logical)-(saved[0].points[0].logical-edited[0].points[0].logical))<1e-8);
  await page.locator('#chartDeleteBtn').click();assert.equal((await paths()).length,0);
  await page.evaluate(()=>document.activeElement.blur());await page.keyboard.press('Control+z');assert.deepEqual(await paths(),saved,'undo restores path');
  await page.locator('#chartPathBtn').click();await page.mouse.click(plot.x+200,plot.y+80);await page.mouse.click(plot.x+300,plot.y+200);await page.keyboard.press('Escape');assert.deepEqual(await paths(),saved,'Escape discards unfinished path');
  await page.locator('#fullscreenBtn').click();await page.waitForTimeout(200);
  await page.locator('#chartPathBtn').click();plot=await page.locator('.chart-plot').boundingBox();
  await page.mouse.click(plot.x+550,plot.y+200);await page.mouse.click(plot.x+680,plot.y+350);await page.mouse.dblclick(plot.x+800,plot.y+140);
  let finished=await paths();assert.equal(finished.length,2);assert.equal(finished[1].points.length,3,'double-click adds only one final vertex');
  if(out){fs.mkdirSync(out,{recursive:true});await page.screenshot({path:out+'/'+engine+'-path-fullscreen.png'});}
  await page.locator('#fullscreenBtn').click();await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));
  await page.locator('#chartPathBtn').click();await page.locator('.chart-plot').scrollIntoViewIfNeeded();plot=await page.locator('.chart-plot').boundingBox();
  await page.mouse.click(plot.x+50,plot.y+120);await page.mouse.click(plot.x+140,plot.y+200);await page.locator('#chartPathFinishBtn').click();
  assert.equal((await paths()).length,3);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390,'toolbar fits mobile');
  assert.deepEqual(errors,[]);console.log('PASS '+engine+': path vertices, preview, Enter/double-click/Done, resizing/moving, persistence, undo/delete, cancel, fullscreen/mobile');
 }finally{await browser.close();}
}})().catch(e=>{console.error(e);process.exitCode=1;});
