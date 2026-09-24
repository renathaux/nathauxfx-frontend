// Fixture-only UI integration; no production account or broker mutations.
const { chromium, webkit } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Model = require('../../strategy-studio/strategy-studio-model.js');
const base = process.env.SIM_BASE_URL || 'http://127.0.0.1:8765';
const out = process.env.SIM_SCREENSHOTS || '../../outputs/strategy-simulator';
const definition = {
  ...Model.blankStrategy(),
  symbols: ['XAUUSD', 'EURUSD'],
  trading_timeframe: '5m',
  structure_timeframe: '15m',
  risk: { method: 'PERCENT_BALANCE', value: 1 },
  stop_loss: {
    method: 'LAST_SWING',
    buffer_pips: 0,
    distance_filter: {
      enabled: true,
      mode: 'PERCENT_ENTRY',
      minimum: 0.4,
      maximum: 0.6,
    },
  },
  entry: { method: 'BOS_CHOCH_CLOSE' },
  tp2: { method: 'FIXED_R', value: 2 },
};
(async () => {
  fs.mkdirSync(out, { recursive: true });
  for (const [name, type] of [
    ['chrome', chromium],
    ['webkit', webkit],
  ]) {
    const browser = await type.launch(
      name === 'chrome'
        ? { channel: 'chrome', headless: true }
        : { headless: true },
    );
    try {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        timezoneId: 'America/Toronto',
      });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const strategies = [
        { strategy_id: 'a', name: 'EUR Test', definition },
        { strategy_id: 'gold', name: 'Gold 832', definition },
      ];
      await page.route(
        /\/strategy-studio\/(strategies|validate|live-status)/,
        async (route) => {
          const url = new URL(route.request().url());
          if (url.pathname.endsWith('/validate')) { await route.fulfill({json:{valid:true,normalized_definition:route.request().postDataJSON().definition}}); return; }
          if (route.request().method() === 'PUT') {
            Object.assign(strategies.find(s=>url.pathname.endsWith('/'+s.strategy_id)),route.request().postDataJSON());
          }
          let payload = url.pathname.endsWith('/strategies')
            ? { strategies }
            : url.pathname.endsWith('/live-status')
              ? { enabled: false }
              : {
                  strategy: strategies.find((s) =>
                    url.pathname.endsWith('/' + s.strategy_id),
                  ),
                };
          await route.fulfill({ json: payload });
        },
      );
      await page.addInitScript(() => {
        localStorage.setItem(
          'nathauxfx_studio_theme',
          localStorage.getItem('nathauxfx_studio_theme') || 'light',
        );
        let api;
        Object.defineProperty(window, 'StrategySimulatorApi', {
          configurable: true,
          get: () => api,
          set: (value) => {
            api = value;
            api.historyCoverage = async () => ({
              earliest: '2021-08-31T00:00:00Z',
              latest: '2026-09-23T23:55:00Z',
              months: 62,
              backfill: { complete: true, requested_years: 5 },
            });
            api.runSimulation = async (payload, options) => {
              window.runs ??= [];
              window.runs.push(payload);
              options.onProgress({ current: 14, total: 59 });
              await new Promise((resolve, reject) => {
                window.finishRun = resolve;
                window.failRunWith = reject;
                window.failRun = () =>
                  reject(new Error('Fixture network failure'));
              });
              const trades = [
                {
                  side: 'BUY',
                  entry_time: '2024-12-31T23:00:00Z',
                  exit_time: '2025-01-01T00:00:00Z',
                  entry: 4300,
                  sl: 4280,
                  tp1: 4320,
                  tp2: 4340,
                  outcome: 'TP2',
                  r: 2,
                  pnl_dollars: 200,
                  resolved: true,
                },
                {
                  side: 'SELL',
                  entry_time: '2025-02-01T00:00:00Z',
                  exit_time: '2025-02-01T01:00:00Z',
                  entry: 4300,
                  sl: 4320,
                  tp1: null,
                  tp2: 4260,
                  outcome: 'SL',
                  r: -1,
                  pnl_dollars: -100,
                  resolved: true,
                },
                {
                  side: 'BUY',
                  entry_time: '2026-01-01T00:00:00Z',
                  exit_time: '2026-01-01T01:00:00Z',
                  entry: 4300,
                  sl: 4280,
                  tp1: 4320,
                  tp2: 4340,
                  outcome: 'PROTECTED_SL',
                  r: 0.5,
                  pnl_dollars: 50,
                  resolved: true,
                },
                {
                  side: 'SELL',
                  entry_time: '2026-02-01T00:00:00Z',
                  exit_time: '2026-02-01T01:00:00Z',
                  entry: 4300,
                  sl: 4320,
                  tp2: 4260,
                  outcome: 'AMBIGUOUS_INTRABAR',
                  r: null,
                  pnl_dollars: null,
                  resolved: false,
                },
              ];
              const calculated =
                window.StrategySimulatorModel.simulationMetrics(10000, trades);
              return {
                symbol: payload.symbol,
                trades,
                ...calculated,
                assumptions: {
                  spread: false,
                  commission: false,
                  slippage: false,
                  ambiguous_intrabar_excluded: true,
                },
                diagnostics: {
                  candles_analyzed: 340000,
                  setups_detected: 450,
                  signals_emitted: 180,
                  trades_opened: 4,
                  stage_pass_counts: {
                    trend: 430,
                    structure: 420,
                    break_validation: 380,
                    confirmation: 220,
                    entry: 210,
                    stop_loss: 180,
                    tp2: 180,
                    risk: 180,
                  },
                  rejection_reasons: {
                    SL_DISTANCE_BELOW_MINIMUM: 90,
                    SL_DISTANCE_ABOVE_MAXIMUM: 30,
                    SETUP_EXPIRED: 15,
                  },
                },
                ...(payload.mode === 'REPLAY'
                  ? {
                      replay: [0, 1, 2].map((i) => ({
                        timestamp: '2026-01-01T00:00:00Z',
                        signal: 'WAIT',
                        candle: {
                          open: 4300 + i,
                          high: 4310 + i,
                          low: 4290 + i,
                          close: 4305 + i,
                        },
                        steps: {},
                      })),
                    }
                  : {}),
              };
            };
          },
        });
      });
      await page.goto(
        base +
          '/strategy-simulator.html?strategy=gold&symbol=EURUSD&start=2025-01-01&end=2025-01-20',
      );
      await page.waitForFunction(
        () =>
          document.querySelector('#strategySelect').value === 'gold' &&
          !document.querySelector('#fastRunBtn').disabled,
      );
      assert.equal(await page.locator('#symbolSelect').inputValue(), 'EURUSD');
      assert.equal(
        await page
          .locator('#startDate')
          .evaluate((n) => new Date(n.value + 'Z').toISOString()),
        '2025-01-01T00:00:00.000Z',
      );
      assert.equal(await page.locator('#emptyState').isVisible(), true);
      assert.equal(await page.locator('#completedResults').isVisible(), false);
      assert.equal(
        await page.locator('.advanced-options').getAttribute('open'),
        null,
      );
      assert.match(
        await page.locator('#backToStudio').getAttribute('href'),
        /strategy=gold/,
      );
      assert.equal(
        await page.evaluate(() => document.documentElement.dataset.theme),
        'light',
      );
      await page.locator('#fiveYearRangeBtn').click();
      await page.locator('#fastRunBtn').click();
      await page.waitForFunction(() => typeof window.finishRun === 'function');
      assert.match(
        await page.locator('#progressLabel').textContent(),
        /14 of 59 · 24%/,
      );
      assert.equal(await page.locator('#fastRunBtn').textContent(), 'Running…');
      const request = await page.evaluate(() => window.runs[0]);
      assert.equal(request.mode, 'FAST');
      assert.ok(
        (Date.parse(request.end) - Date.parse(request.start)) / 86400000 > 1800,
      );
      assert.equal(request.risk_override, null);
      await page.evaluate(() => window.finishRun());
      await page.waitForFunction(
        () => document.querySelector('#metricNetPl').textContent === '$150.00',
      );
      assert.match(
        await page.locator('#metricNetPl').getAttribute('class'),
        /positive/,
      );
      assert.equal(await page.locator('#yearlyBody tr').count(), 2);
      assert.match(
        await page.locator('#yearlyBody tr').first().textContent(),
        /2025.*100/,
      );
      assert.match(await page.locator('#directionBody').textContent(), /SELL/);
      assert.equal(
        await page.locator('[title="SETUP_EXPIRED"]').textContent(),
        'Setup expired',
      );
      assert.match(
        await page.locator('#assumptionList').textContent(),
        /Not modeled/,
      );
      await page.locator('#tradeFilter').selectOption('Losses');
      assert.equal(await page.locator('#tradeTableBody tr').count(), 1);
      assert.equal(
        await page.locator('#tradeTableBody .trade-negative').count(),
        1,
      );
      await page.locator('#tradeFilter').selectOption('All');
      await page.locator('#equityView').selectOption('Drawdown');
      assert.equal(
        await page.locator('#equityChart .drawdown-line').count(),
        1,
      );
      await page.locator('#equityView').selectOption('Balance');
      for (const theme of ['light', 'dark']) {
        if (
          (await page.evaluate(
            () => document.documentElement.dataset.theme,
          )) !== theme
        )
          await page.locator('#themeToggle').click();
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({
          path: `${out}/${name}-1440-${theme}.png`,
          fullPage: true,
        });
      }
      for (const width of [1920, 1440, 1280, 1024, 768, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          true,
          `${name} overflow ${width}`,
        );
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.locator('#fastRunBtn').click();
      await page.waitForFunction(() => window.runs.length === 2);
      assert.equal(await page.locator('#completedResults').isVisible(), true);
      await page.evaluate(() => window.failRun());
      await page.waitForFunction(() =>
        document
          .querySelector('#simNotice')
          .textContent.includes('Fixture network failure'),
      );
      assert.equal(await page.locator('#metricNetPl').textContent(), '$150.00');
      await page.locator('#rangePreset').selectOption('30');
      await page.locator('.advanced-options summary').click();
      await page.locator('#riskOverrideEnabled').check();
      await page.locator('#riskValue').fill('2');
      await page.locator('#replayRunBtn').click();
      await page.waitForFunction(() => window.runs.length === 3);
      await page.evaluate(() => window.finishRun());
      await page.locator('#replayPanel').waitFor({ state: 'visible' });
      await page.locator('#replayNextBtn').click();
      assert.equal(
        await page.locator('#replayProgress').textContent(),
        '2 / 3',
      );
      assert.equal(
        (await page.evaluate(() => window.runs[2])).risk_override.value,
        2,
      );
      await page.evaluate(() => {
        const original = window.StrategySimulatorApi.getStrategy;
        window.StrategySimulatorApi.getStrategy = async () => { throw new Error('Selection failed'); };
        window.restoreStrategyApi = () => { window.StrategySimulatorApi.getStrategy = original; };
      });
      await page.locator('#strategySelect').selectOption('a');
      await page.waitForFunction(() => document.querySelector('#simNotice').textContent === 'Selection failed');
      assert.equal(await page.locator('#strategySelect').inputValue(), 'gold');
      assert.equal(await page.locator('#strategyTitle').textContent(), 'Gold 832');
      await page.evaluate(() => window.restoreStrategyApi());
      await page.locator('#strategySelect').selectOption('a');
      await page.waitForFunction(
        () =>
          document.querySelector('#strategyTitle').textContent === 'EUR Test',
      );
      assert.match(
        await page.locator('#resultContext').textContent(),
        /Gold 832/,
      );
      assert.equal(await page.locator('#studioNavLink').getAttribute('href'), '/strategy-studio.html?strategy=a');
      await page.locator('#backToStudio').click();
      await page.waitForFunction(
        () => document.querySelector('#strategyName')?.value === 'EUR Test',
      );
      assert.equal(
        await page.evaluate(() => document.documentElement.dataset.theme),
        'dark',
      );
      // Studio saves executable edits before navigating; exact date-only values stay UTC.
      await page.locator('#riskValue').fill('1.5');
      await page.locator('#quickStart').fill('2021-09-25');
      await page.locator('#quickEnd').fill('2026-09-24');
      await page.locator('#quickSymbol').selectOption('XAUUSD');
      await page.locator('#runBacktestBtn').click();
      await page.waitForURL(/strategy-simulator.html/);
      await page.waitForFunction(() => window.runs?.length === 1);
      const auto = await page.evaluate(() => window.runs[0]);
      assert.equal(auto.strategy_id,'a'); assert.equal(auto.symbol,'XAUUSD');
      assert.equal(auto.start,'2021-09-25T00:00:00.000Z'); assert.equal(auto.end,'2026-09-24T00:00:00.000Z');
      assert.equal(strategies[0].definition.risk.value,1.5);
      assert.equal(await page.locator('#startDate').inputValue(),'2021-09-25T00:00');
      assert.equal(new URL(page.url()).searchParams.get('autostart'),'1');
      assert.equal(await page.locator('#fastRunBtn').isDisabled(),true);
      await page.evaluate(()=>window.finishRun());
      await page.waitForFunction(()=>!document.querySelector('#fastRunBtn').disabled);
      await page.locator('#themeToggle').click();
      assert.equal(await page.evaluate(()=>window.runs.length),1);
      await page.locator('#fastRunBtn').click();
      await page.waitForFunction(()=>window.runs.length===2);
      await page.evaluate(()=>{ const e=new Error('Request timed out after 120000ms'); e.name='TimeoutError'; window.failRunWith(e); });
      await page.waitForFunction(()=>document.querySelector('#simNotice').textContent.includes('No completed result was changed'));
      assert.equal(await page.locator('#metricNetPl').textContent(),'$150.00');
      for (const suffix of ['', '?strategy=a&mode=FAST', '?strategy=a&mode=REPLAY&autostart=1']) {
        await page.goto(base+'/strategy-simulator.html'+suffix);
        await page.waitForFunction(()=>!document.querySelector('#fastRunBtn').disabled);
        assert.equal(await page.evaluate(()=>window.runs?.length||0),0);
      }
      await page.goto(base+'/strategy-studio.html?strategy=a');
      await page.waitForFunction(()=>!document.querySelector('#runBacktestBtn').disabled);
      await page.locator('#riskValue').fill('2');
      await page.route('**/strategy-studio/strategies/a',route=>route.fulfill({status:500,json:{detail:'Save rejected'}}));
      await page.locator('#runBacktestBtn').click();
      await page.waitForFunction(()=>document.querySelector('#quickTestState').textContent.includes('not saved'));
      assert.match(page.url(),/strategy-studio.html/);
      await page.unroute('**/strategy-studio/strategies/a');
      await page.locator('#setting_notes').fill('Keep these unsaved notes');
      await page.evaluate(() => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key,value) {
          if(key==='nathauxfx_studio_config_v1:a') throw new DOMException('Storage full');
          return original.call(this,key,value);
        };
      });
      await page.locator('#runBacktestBtn').click();
      await page.waitForFunction(()=>document.querySelector('#quickTestState').textContent.includes('not saved'));
      await page.locator('#runBacktestBtn').click();
      await page.waitForFunction(()=>document.querySelector('#quickTestState').textContent.includes('storage is unavailable'));
      assert.match(page.url(),/strategy-studio.html/);
      assert.equal(await page.locator('#setting_notes').inputValue(),'Keep these unsaved notes');
      assert.deepEqual(errors, []);
      console.log(
        `PASS ${name}: save-before-navigation, exact UTC handoff, once-only FAST autostart, idle normal/Replay visits, 120s timeout message, retained failed results, theme, metrics, filters, replay, six widths`,
      );
    } finally {
      await browser.close();
    }
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
