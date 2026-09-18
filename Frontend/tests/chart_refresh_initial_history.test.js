const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const controller = fs.readFileSync(
  path.join(__dirname, '..', 'chart', 'live-candles', 'live-candle-controller.js'),
  'utf8',
);

test('a refresh never paints a lone live candle before historical candles load', () => {
  const displayed = [];
  const events = [];
  const series = {
    setData(candles) { displayed.splice(0, displayed.length, ...candles); },
    update(candle) {
      const index = displayed.findIndex((bar) => bar.time === candle.time);
      if (index >= 0) displayed[index] = candle;
      else displayed.push(candle);
    },
  };
  const window = {
    LightweightCharts: Object.freeze({ createChart() {} }),
    location: { hostname: 'www.nathauxfx.com', origin: 'https://www.nathauxfx.com' },
    addEventListener() {},
    dispatchEvent(event) { events.push(event.type); },
    setTimeout() { return 1; },
    clearTimeout() {},
    setInterval() { return 1; },
    clearInterval() {},
  };
  const document = { addEventListener() {} };
  class CustomEvent {
    constructor(type, options) { this.type = type; this.detail = options.detail; }
  }

  vm.runInNewContext(controller, { window, document, CustomEvent });
  window.FlowSignalLiveCandles.mount({ candleSeries: series, symbol: 'EURUSD', timeframe: '5m' });

  window.FlowSignalLiveCandles.onTick({ symbol: 'EURUSD', price: 1.14614, timestamp: 1789746901 });
  assert.equal(displayed.length, 0, 'the live tick must not create a one-bar chart');
  assert.equal(events.includes('flowsignal:live-candle'), false, 'the dashboard must not draw it either');

  series.setData([
    { time: 1789746300, open: 1.1463, high: 1.1464, low: 1.1462, close: 1.14635 },
    { time: 1789746600, open: 1.14635, high: 1.1464, low: 1.1461, close: 1.1462 },
  ]);
  assert.equal(displayed.length, 2, 'history is installed as the first visible chart');

  window.FlowSignalLiveCandles.onTick({ symbol: 'EURUSD', price: 1.14615, timestamp: 1789746902 });
  assert.equal(displayed.length, 3, 'live candle advances normally once history is visible');
  assert.equal(displayed[2].close, 1.14615);
  assert.equal(events.includes('flowsignal:live-candle'), true);
});
