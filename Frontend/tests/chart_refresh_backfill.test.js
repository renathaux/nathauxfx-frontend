const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
const start = source.indexOf('function renderChartFromPanel(');
const end = source.indexOf('\nfunction applyIdleMotionToLastCandle(', start);
assert.ok(start >= 0 && end > start, 'dashboard chart renderer exists');

test('panel refresh replaces a one-candle chart with the full historical window', () => {
  const latest = { time: 900, open: 1.1461, high: 1.1462, low: 1.1460, close: 1.14615 };
  const history = [
    { time: 300, open: 1.1458, high: 1.1460, low: 1.1457, close: 1.1459 },
    { time: 600, open: 1.1459, high: 1.1461, low: 1.1458, close: 1.1461 },
    latest,
  ];
  const displayed = [latest];
  const context = {
    currentChartSymbol: 'EURUSD',
    currentChartTimeframe: '5m',
    lastChartData: { EURUSD: { '5m': [latest] } },
    chart: {},
    candleSeries: {
      setData(candles) { displayed.splice(0, displayed.length, ...candles); },
      update(candle) {
        const index = displayed.findIndex((bar) => bar.time === candle.time);
        if (index >= 0) displayed[index] = candle;
        else displayed.push(candle);
      },
    },
    MARKET_IS_CLOSED: false,
    frozenChart: {},
    refreshNewsImpact() {},
    getChartCandles(data, symbol, timeframe) { return data.candles[symbol][timeframe]; },
    getLiveAugmentedCandles(candles) { return candles; },
    preserveFormingCandleShape(candles) { return candles; },
    updateChartOverlay() {},
    drawTradeVisualLevels() {},
  };
  vm.runInNewContext(source.slice(start, end), context);

  context.renderChartFromPanel({ candles: { EURUSD: { '5m': history } } });

  assert.equal(displayed.length, 3, 'the visible chart must contain the backfilled candles');
  assert.equal(displayed[0].time, 300);
  assert.equal(displayed[2].close, 1.14615);
});
