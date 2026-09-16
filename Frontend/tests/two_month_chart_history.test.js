const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
const html = fs.readFileSync(path.join(root, "app.html"), "utf8");

assert.match(script, /"5m": 13000/);
assert.match(script, /"15m": 4400/);
assert.match(script, /"1h": 1100/);
assert.match(script, /\/chart\/candles-history/);
assert.match(script, /url\.searchParams\.set\("days", "62"\)/);
assert.match(script, /headers: newsModeAuthHeaders\(\)/);
assert.match(script, /\[\.\.\.history, \.\.\.liveCandles\]/);
assert.ok(Number(html.match(/script\.js\?v=(\d+)/)?.[1]) >= 123, "two-month chart loader busts the old cache");

console.log("two-month chart history tests passed");
