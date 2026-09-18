const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const controller = fs.readFileSync(
  path.join(root, "chart", "live-candles", "live-candle-controller.js"),
  "utf8",
);
const dashboard = fs.readFileSync(path.join(root, "script.js"), "utf8");
const startup = fs.readFileSync(path.join(root, "startup.js"), "utf8");
const html = fs.readFileSync(path.join(root, "app.html"), "utf8");

assert.equal(
  controller.includes("flowsignal-backend-3.onrender.com"),
  false,
  "live chart must never poll the retired Render backend",
);
assert.match(
  controller,
  /origin \? `\$\{origin\}\/api\/proxy` : "https:\/\/api\.nathauxfx\.com"/,
  "production live ticks use the same NathauxFX backend/proxy as the app",
);
assert.match(controller, /\/chart\/live-ticks/);
assert.match(controller, /tickTimestamp: epoch/);
assert.match(controller, /price: numericPrice/);

assert.match(
  dashboard,
  /window\.addEventListener\("flowsignal:live-candle"/,
  "dashboard synchronizes controller ticks into its own candle state",
);
assert.match(dashboard, /function syncLiveCandleDisplayState/);
assert.match(dashboard, /lastChartData\[symbol\]\[timeframe\] = \[\.\.\.candles\]/);
assert.match(dashboard, /window\.FlowSignalLiveCandles\?\.setContext\?\./);
assert.match(
  dashboard,
  /!hasFreshLiveCandleControllerTick\(currentChartSymbol, currentChartTimeframe\)/,
  "the 5-second fallback cannot overwrite a fresh 500ms live candle",
);
assert.match(
  dashboard,
  /const liveController = window\.FlowSignalLiveCandles\?\.getState\?\.\(\)/,
  "display price prefers the freshest live-candle controller tick",
);

assert.match(startup, /live-candle-controller\.js\?v=9/);
assert.match(html, /startup\.js\?v=23/);



assert.match(
  dashboard,
  /window\.FlowSignalLiveCandles\?\.mount\?\.\(\{[\s\S]*candleSeries,[\s\S]*symbol: currentChartSymbol,[\s\S]*timeframe: currentChartTimeframe/,
  "every chart creation explicitly mounts the live-candle controller",
);
assert.match(html, /script\.js\?v=136/);


assert.match(
  dashboard,
  /candleSeries\.update\(candle\)/,
  "the main dashboard applies live candles to its active series",
);
assert.match(
  dashboard,
  /candleSeries\.setData\(visibleCandles\)/,
  "the main dashboard can rebuild the visible series if a live update throws",
);
assert.ok(
  controller.indexOf('window.dispatchEvent(new CustomEvent("flowsignal:live-candle"') <
    controller.indexOf("state.series.update(candle)"),
  "controller publishes the live candle before touching its own potentially stale series",
);

console.log("live chart freeze regression checks passed");
