// Isolated account fixtures only: no production strategy or broker mutations.
const { chromium, webkit } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Model = require('../../strategy-studio/strategy-studio-model.js');
const Settings = require('../../strategy-studio/strategy-studio-settings.js');
const base = process.env.STUDIO_BASE_URL || 'http://127.0.0.1:8765';
const out = process.env.STUDIO_SCREENSHOTS || '../../outputs/strategy-studio';
function definition() {
  return {
    ...Model.blankStrategy(),
    symbols: ['XAUUSD'],
    trading_timeframe: '5m',
    structure: {
      trigger: 'BOS_CHOCH',
      break_validation: ['CLOSE_BEYOND', 'MIN_BODY_PERCENT', 'MIN_DISTANCE'],
      minimum_body_percent: 50,
      minimum_distance_pips: 10,
    },
    confirmation: {
      rules: ['NEXT_SAME_DIRECTION', 'MIN_BODY_PERCENT'],
      minimum_body_percent: 60,
    },
    entry: {
      method: 'CONFIRMATION_CLOSE',
      remember_bos_on_confirmation_failure: false,
    },
    stop_loss: { method: 'LAST_SWING', buffer_pips: 0, fixed_distance: null },
    tp2: { method: 'FIXED_R', value: 2 },
    risk: { method: 'PERCENT_BALANCE', value: 1 },
  };
}
(async () => {
  for (const [engine, type] of process.env.CHROME_ONLY
    ? [['chrome', chromium]]
    : [
        ['chrome', chromium],
        ['webkit', webkit],
      ]) {
    const browser = await type.launch(
      engine === 'chrome'
        ? { channel: 'chrome', headless: true }
        : { headless: true },
    );
    try {
      const page = await browser.newPage({
        viewport: { width: 1536, height: 1024 },
      });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      let strategies = [
        {
          strategy_id: 'test-1',
          name: 'Gold 831',
          state: 'INACTIVE',
          definition: definition(),
        },
        {
          strategy_id: 'test-2',
          name: 'EUR Momentum',
          state: 'ACTIVE',
          definition: { ...definition(), symbols: ['EURUSD'] },
        },
      ];
      const writes = [];
      await page.addInitScript(
        ({ settings }) => {
          if (!localStorage.getItem('nathauxfx_studio_config_v1:test-1'))
            localStorage.setItem(
              'nathauxfx_studio_config_v1:test-1',
              JSON.stringify({ settings, savedAt: '2026-09-24T12:00:00Z' }),
            );
        },
        {
          settings: {
            ...Settings.defaults(),
            commission: 7, slFilter:true, slMin:0.4, structureTimeframe:'1h', freshness:5,
            description:
              'ICT-based strategy using structure, liquidity and confirmation.',
            tags: 'Smart Money, Structure, Liquidity',
          },
        },
      );
      await page.route(
        /\/strategy-studio\/(strategies|validate|live-status|live-handoff)(\/|\?|$)/,
        async (route) => {
          const req = route.request(),
            url = new URL(req.url()),
            path = url.pathname.replace(/^.*\/strategy-studio/, '');
          let payload = {};
          let body = req.postDataJSON();
          if (path === '/live-status')
            payload = {
              enabled: false,
              parity_status: 'REQUIRES_VERIFICATION',
            };
          else if (path === '/validate')
            payload = { valid: true, normalized_definition: body.definition };
          else if (path === '/strategies' && req.method() === 'GET')
            payload = { strategies };
          else if (path === '/strategies' && req.method() === 'POST') {
            writes.push(body);
            const s = {
              strategy_id: 'test-' + (strategies.length + 1),
              name: body.name,
              definition: body.definition,
              state: 'INACTIVE',
            };
            strategies.push(s);
            payload = { strategy: s };
          } else {
            const id = path.split('/')[2],
              item = strategies.find((s) => s.strategy_id === id);
            if (req.method() === 'PUT') {
              writes.push(body);
              Object.assign(item, body);
              payload = { strategy: item };
            } else if (req.method() === 'DELETE') {
              strategies = strategies.filter((s) => s.strategy_id !== id);
              payload = { ok: true };
            } else payload = { strategy: item };
          }
          await route.fulfill({ json: payload });
        },
      );
      await page.goto(base + '/strategy-studio.html');
      await page.waitForFunction(
        () => document.querySelector('#strategyName').value === 'Gold 831',
      );
      assert.deepEqual(errors, []);
      assert.equal(await page.locator('.builder-section').count(), 8);
      await page.locator('#themeToggle').click();
      await page.evaluate(
        () => (document.documentElement.dataset.theme = 'light'),
      );
      fs.mkdirSync(out, { recursive: true });
      await page.screenshot({
        path: `${out}/${engine}-light.png`,
        fullPage: true,
      });
      await page.evaluate(
        () => (document.documentElement.dataset.theme = 'dark'),
      );
      await page.waitForTimeout(200);
      await page.screenshot({
        path: `${out}/${engine}-dark.png`,
        fullPage: true,
      });
      assert.doesNotMatch(
        await page.locator('#lastSaved').textContent(),
        /Unsaved/,
      );
      console.log('PASS ' + engine + ' initial render');
      if (process.env.SMOKE_ONLY) continue;
      await page.locator('#themeToggle').click();
      const savedTheme = await page.evaluate(
        () => document.documentElement.dataset.theme,
      );
      await page.reload();
      await page.waitForFunction(
        () => document.querySelector('#strategyName').value === 'Gold 831',
      );
      assert.equal(
        await page.evaluate(() => document.documentElement.dataset.theme),
        savedTheme,
      );

      assert.equal(await page.locator('#slDistanceEnabled').isChecked(),false);
      assert.equal(await page.locator('#setupFreshnessEnabled').isChecked(),false);
      assert.equal(await page.locator('#structureTimeframe').inputValue(),'5m');
      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('nathauxfx_studio_config_v1:test-1')).settings);
      assert.equal(stored.slFilter,undefined);
      assert.equal(stored.commission,undefined);
      assert.equal(await page.locator('.draft-marker').count(),0);
      await page.locator('#section1>summary').click();
      assert.equal(await page.locator('#strategyName').isVisible(), false);
      await page.locator('#section1>summary').click();
      await page.locator('#setting_description').fill('A revised description');
      await page.locator('#slDistanceEnabled').check();
      await page.locator('#slDistanceMax').fill('0.3');
      await page.locator('#slDistanceMin').fill('0.4');
      assert.equal(await page.locator('#saveStrategyBtn').isDisabled(), true);
      assert.match(
        await page.locator('[data-error-for="stop_loss.distance_filter.maximum"]').textContent(),
        /minimum/,
      );
      await page.locator('#slDistanceMax').fill('0.6');
      await page.locator('#structureTimeframe').selectOption('15m');
      await page.locator('#setupFreshnessEnabled').check();
      await page.locator('#setupMaxAge').fill('12');
      await page.locator('#setting_tags').fill('7');
      await page.locator('#saveStrategyBtn').click();
      await page.waitForFunction(() =>
        document
          .querySelector('#studioNotice')
          .textContent.startsWith('Saved Gold'),
      );
      assert.equal(writes.length, 1);
      assert.equal(writes[0].definition.commission, undefined);
      assert.equal(writes[0].definition.slFilter, undefined);
      assert.deepEqual(writes[0].definition.stop_loss.distance_filter, {enabled:true,mode:'PERCENT_ENTRY',minimum:0.4,maximum:0.6});
      assert.equal(writes[0].definition.structure_timeframe,'15m');
      assert.equal(writes[0].definition.confirmation.max_setup_age_bars,12);
      await page.reload();
      await page.waitForFunction(
        () => document.querySelector('#strategyName').value === 'Gold 831',
      );
      assert.equal(await page.locator('#setting_tags').inputValue(), '7');
      await page.locator('#strategySelect').selectOption('test-2');
      assert.equal(await page.locator('#setting_tags').inputValue(), '');
      assert.equal(await page.locator('#strategyName').isDisabled(), true);
      assert.equal(
        await page.locator('#setting_tags').isDisabled(),
        true,
      );
      assert.equal(await page.locator('#saveStrategyBtn').isDisabled(), true);
      await page.locator('#strategySelect').selectOption('test-1');
      await page.locator('#setting_tags').fill('9');
      await page.locator('#resetDraftBtn').click();
      await page.locator('#confirmAccept').click();
      assert.equal(await page.locator('#setting_tags').inputValue(), '7');
      // A failed local save must keep editable draft values available for retry.
      await page.locator('#setting_notes').fill('Important unsaved notes');
      await page.evaluate(() => {
        window.__setItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (key.startsWith('nathauxfx_studio_config_v1:'))
            throw new DOMException('Quota exceeded');
          return window.__setItem.call(this, key, value);
        };
      });
      await page.locator('#saveStrategyBtn').click();
      await page.waitForFunction(() =>
        document
          .querySelector('#studioNotice')
          .textContent.includes('could not be saved'),
      );
      assert.equal(
        await page.locator('#setting_notes').inputValue(),
        'Important unsaved notes',
      );
      await page.evaluate(() => {
        Storage.prototype.setItem = window.__setItem;
      });
      await page.locator('#setting_testPreset').selectOption('1 year');
      await page.locator('#saveStrategyBtn').click();
      await page.waitForFunction(() =>
        document
          .querySelector('#studioNotice')
          .textContent.startsWith('Saved Gold'),
      );
      await page.reload();
      await page.waitForFunction(
        () => document.querySelector('#strategyName').value === 'Gold 831',
      );
      assert.equal(await page.locator('#quickPreset').inputValue(), '365');
      assert.equal(
        await page.locator('#setting_notes').inputValue(),
        'Important unsaved notes',
      );
      await page.locator('#quickPreset').selectOption('30');
      assert.equal(
        await page.locator('#setting_testPreset').inputValue(),
        '30 days',
      );
      await page.locator('#quickStart').fill('2024-01-01');
      await page.locator('#quickEnd').fill('2024-01-15');
      await page.locator('#saveStrategyBtn').click();
      await page.waitForFunction(() =>
        document
          .querySelector('#studioNotice')
          .textContent.startsWith('Saved Gold'),
      );
      await page.reload();
      await page.waitForFunction(
        () => document.querySelector('#strategyName').value === 'Gold 831',
      );
      assert.equal(await page.locator('#quickPreset').inputValue(), 'custom');
      assert.equal(
        await page.locator('#quickStart').inputValue(),
        '2024-01-01',
      );
      assert.equal(await page.locator('#quickEnd').inputValue(), '2024-01-15');
      await page.locator('#strategySelect').selectOption('test-2');
      await page.locator('#strategySelect').selectOption('test-1');
      assert.equal(
        await page.locator('#quickStart').inputValue(),
        '2024-01-01',
      );
      await page.locator('#saveVersionBtn').click();
      await page.waitForFunction(() =>
        document.querySelector('#strategyName').value.includes('v1.0.1'),
      );
      assert.equal(await page.locator('#setting_tags').inputValue(), '7');
      assert.equal(strategies[0].name, 'Gold 831');
      await page.locator('#strategySelect').selectOption('test-1');
      await page.locator('#studioSearch').fill('EUR Momentum');
      await page.locator('#searchResults button').waitFor({ state: 'visible' });
      assert.equal(
        await page.locator('#searchResults [data-search-strategy]').count(),
        1,
      );
      assert.equal(await page.locator('#libraryDialog').isVisible(), false);
      await page.keyboard.press('Escape');
      await page.locator('#studioSearch').fill('');
      // Actual backtest API boundary is intercepted with a deterministic result; no trading requests.
      await page.evaluate(() => {
        window.__runs = [];
        window.StrategySimulatorApi.runSimulation = async (payload) => {
          window.__runs.push(payload);
          return {
            symbol: payload.symbol,
            starting_balance: 10000,
            metrics: {
              starting_balance: 10000,
              ending_balance: 9900,
              net_pl: -100,
              win_rate: 40,
              total_resolved_trades: 5,
              profit_factor: 0.8,
              max_drawdown_dollars: 200,
              average_r: -0.1,
            },
            equity_curve: [
              { trade: 0, balance: 10000 },
              { trade: 1, balance: 10100 },
              { trade: 2, balance: 9900 },
            ],
            assumptions: {
              spread: false,
              commission: false,
              slippage: false,
              ambiguous_intrabar_excluded: true,
            },
          };
        };
      });
      await page.locator('#fastTestBtn').click();
      await page.waitForFunction(
        () => document.querySelector('#metricNetPl').textContent === '-$100.00',
      );
      assert.match(
        await page.locator('#metricNetPl').getAttribute('class'),
        /negative/,
      );
      assert.equal(await page.locator('#equityChart svg').count(), 1);
      assert.equal(
        (await page.evaluate(() => window.__runs))[0].commission,
        undefined,
      );
      assert.equal(
        (await page.evaluate(() => window.__runs))[0].strategy_definition
          .commission,
        undefined,
      );
      assert.equal((await page.evaluate(() => window.__runs))[0].strategy_definition.stop_loss.distance_filter.minimum,0.4);
      assert.match(await page.locator('#assumptionsSummary').textContent(),/Not modeled/);
      await page.locator('#strategyName').fill('Edited after test');
      assert.equal(await page.locator('#metricNetPl').textContent(), '—');
      assert.equal(await page.locator('#fastTestBtn').isDisabled(), true);
      await page.locator('#strategySelect').selectOption('test-2');
      await page.locator('#strategySelect').selectOption('test-1');
      await page.locator('#quickStart').fill('2026-09-25');
      await page.locator('#quickEnd').fill('2026-09-24');
      await page.locator('#fastTestBtn').click();
      assert.match(
        await page.locator('#quickTestState').textContent(),
        /end date after/,
      );
      await page.locator('#quickPreset').selectOption('30');
      await page.evaluate(() => {
        window.StrategySimulatorApi.runSimulation = async () => {
          throw new Error('Backend unavailable');
        };
      });
      await page.locator('#fastTestBtn').click();
      await page.waitForFunction(
        () =>
          document.querySelector('#quickTestState').textContent ===
          'Backend unavailable',
      );
      assert.equal(await page.locator('#fastTestBtn').isDisabled(), false);
      // Late results cannot be attributed to a different selected strategy.
      await page.evaluate(() => {
        window.StrategySimulatorApi.runSimulation = () =>
          new Promise((resolve) => {
            window.__finishRun = resolve;
          });
      });
      await page.locator('#fastTestBtn').click();
      await page.locator('#strategySelect').selectOption('test-2');
      await page.evaluate(() =>
        window.__finishRun({ metrics: { net_pl: 999 }, equity_curve: [] }),
      );
      assert.equal(await page.locator('#metricNetPl').textContent(), '—');
      await page.locator('#strategySelect').selectOption('test-1');
      for (const width of [1920, 1440, 1280, 1024, 768, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => scrollTo(0, 0));
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          'no page overflow at ' + width,
        );
        if (width === 390)
          await page.screenshot({
            path: `${out}/${engine}-mobile.png`,
            fullPage: true,
          });
      }
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.locator('#quickStart').fill('2026-09-01');
      await page.locator('#quickEnd').fill('2026-09-20');
      await page.locator('#simulatorBtn').click();
      await page.waitForURL(/strategy-simulator.html/);
      const handoff = new URL(page.url());
      assert.equal(handoff.searchParams.get('start'), '2026-09-01');
      assert.equal(handoff.searchParams.get('symbol'), 'XAUUSD');
      await page.waitForFunction(() => {
        const value = document.querySelector('#startDate')?.value;
        return (
          value && new Date(value).toISOString() === '2026-09-01T00:00:00.000Z'
        );
      });
      assert.equal(
        await page
          .locator('#endDate')
          .evaluate((node) => new Date(node.value).toISOString()),
        '2026-09-20T00:00:00.000Z',
      );
      await page.evaluate(() => localStorage.setItem('nathauxfx_studio_config_v1:test-1', JSON.stringify({settings:{notes:'Keep these notes',commission:7}})));
      await page.addInitScript(() => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key,value) {
          if (key.startsWith('nathauxfx_studio_config_v1:')) throw new DOMException('Quota exceeded');
          return original.call(this,key,value);
        };
      });
      await page.goto(base + '/strategy-studio.html');
      await page.waitForFunction(() => document.querySelector('#strategyName').value === 'Gold 831');
      assert.equal(await page.locator('#setting_notes').inputValue(),'Keep these notes');
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('nathauxfx_studio_config_v1:test-1')).settings.notes),'Keep these notes');
      assert.equal(await page.evaluate(() => window.StrategyStudioWorkspace.read().commission),undefined);
      assert.deepEqual(errors, []);
      console.log(
        'PASS ' +
          engine +
          ': collapsible cards, canonical validation, save/reload/isolation, active locks, reset, version, search, real-result rendering, no unsupported payload fields, stale results, dates, responsive',
      );
    } finally {
      await browser.close();
    }
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
