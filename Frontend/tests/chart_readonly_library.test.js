const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const controller = fs.readFileSync(
  path.join(__dirname, '..', 'chart', 'live-candles', 'live-candle-controller.js'),
  'utf8',
);

test('a read-only chart library still permits the active series to receive live ticks', () => {
  const updates = [];
  const series = {
    setData() {},
    update(candle) { updates.push(candle); },
  };
  const createChart = () => ({ addCandlestickSeries: () => series });
  const library = Object.freeze({ createChart });
  const events = [];
  const window = {
    LightweightCharts: library,
    location: { hostname: 'www.nathauxfx.com', origin: 'https://www.nathauxfx.com' },
    addEventListener() {},
    dispatchEvent(event) { events.push(event.type); },
    setTimeout() { return 1; },
    clearTimeout() {},
  };
  const document = { addEventListener() {} };
  class CustomEvent { constructor(type, options) { this.type = type; this.detail = options.detail; } }

  assert.doesNotThrow(() => vm.runInNewContext(controller, { window, document, CustomEvent }));
  assert.equal(window.LightweightCharts.createChart, createChart);
  assert.equal(window.FlowSignalLiveCandles.mount({ candleSeries: series, symbol: 'EURUSD', timeframe: '5m' }), true);
  series.setData([{ time: 1789735500, open: 1.1234, high: 1.1235, low: 1.1233, close: 1.1234 }]);
  window.FlowSignalLiveCandles.onTick({ symbol: 'EURUSD', price: 1.12345, timestamp: 1789735800 });
  assert.equal(updates.length, 1);
  assert.equal(updates[0].close, 1.12345);
  assert.ok(events.includes('flowsignal:live-candle'));
});
