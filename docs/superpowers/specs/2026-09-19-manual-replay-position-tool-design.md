# Manual Replay Position Tool Design

## Intent

Add one TradingView-style long/short position overlay to the existing Manual Replay page. The overlay is a local browser simulation aid: entry is fixed to the current visible closed candle, SL and TP are editable, and opening the draft feeds the existing virtual trade engine.

## Boundaries

- Frontend only: `manual-replay.html`, `manual-replay.js`, `manual-replay.css`, focused tests, and cache-busting versions.
- Replay data remains `/replay-data/manifest.json` and symbol/month JSON loaded once into browser memory.
- No backend, Neon, cTrader, LIVE Auto, order-submission, or strategy-execution code.
- Future candles remain inaccessible until existing Previous/Next/Play logic advances the replay index.
- Existing virtual trade resolution, including ambiguous same-candle TP/SL handling, remains authoritative.

## State and Calculations

`state.positionDraft` is the only draft source of truth and contains `side`, `entry`, `sl`, and `tp`. Entry is set from `currentCandle().close` and is never draggable. Defaults derive from the visible candle high/low span, never zero. `calculatePositionMetrics` validates the directional constraints and returns risk distance, reward distance, R:R, risk dollars from the existing risk method/value and balance, and projected reward dollars.

Form edits and chart drags both update `state.positionDraft`, then one render path updates SVG geometry and ticket readouts. Opening a trade copies the current close and validated draft levels into the existing `state.openTrade`, clears the draft, and preserves existing local P/L behavior. Closed trades remain as faint chart overlays until Reset Session.

## Chart Interaction

The candle Y-axis uses visible candle OHLC only. Position levels are projected into that fixed scale and clamped at chart boundaries for rendering, so extreme SL/TP values never flatten candles. Transparent green/red SVG rectangles extend from the current candle x-coordinate toward the chart's right edge. Draft SL/TP handles use pointer capture, validate/clamp around the fixed entry, and render through `requestAnimationFrame`; active and historical overlays are not draggable.

Crosshair and zoom continue normally except while a handle is being dragged. Pointer scrolling is prevented only during active dragging. The overlay never reads or renders future candles.

## UI

The chart toolbar gains Long Position, Short Position, and Cancel/Delete Draft controls. The order ticket gains read-only Direction, Entry, R:R, Risk, and Projected Reward. A long draft enables only Open BUY; a short draft enables only Open SELL. Active trades must be closed with the existing Close at Current Price control.

## Verification

Unit tests cover draft defaults and constraints, empty SL handling, risk math, fixed candle autoscale, form/drag synchronization, direction-safe opening, cancellation, future-candle privacy, zoom, static-only network behavior, and absence of broker/backend calls. Browser verification covers EURUSD and XAUUSD static loading, draft creation, drag interaction, opening, candle advancement, virtual resolution, responsive presentation, and console/network cleanliness.
