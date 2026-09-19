# Manual Replay Position Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local-only long/short position drawing tool that drives the existing Manual Replay virtual-trade workflow.

**Architecture:** Extract pure draft/metric/scale behavior into a browser-and-Node compatible module, keep a single `state.positionDraft` in the existing replay controller, and render the overlay inside the existing SVG without changing candle autoscale. The existing `openTrade`, advancement, resolution, static replay API, and trade log remain authoritative.

**Tech Stack:** Vanilla JavaScript, SVG, Pointer Events, CSS, Node built-in test runner, Vercel static hosting.

**Spec:** `docs/superpowers/specs/2026-09-19-manual-replay-position-tool-design.md`

## Global Constraints

- Frontend/local only; no backend, Neon, cTrader, broker, LIVE Auto, PAPER, or Strategy Studio LIVE changes.
- Static replay JSON remains the only history source and future candles remain hidden.
- Entry remains fixed to the current closed candle close.
- Visible-candle OHLC alone determines chart autoscale.
- Existing TP/SL/manual/ambiguous resolution behavior remains unchanged.

## Review Focus

- Blank or malformed SL/TP must not become zero or enter chart scale calculations.
- Far-offscreen levels must remain editable without stretching candle scale.
- Direction switches and draft cancellation must not create or mutate a virtual trade.
- Pointer drag must release cleanly and restore crosshair/zoom behavior.
- Playback must use only already-loaded candles and never trigger network calls.

---

### Task 1: Pure Position Model

**Files:**
- Create: `Frontend/manual-replay/manual-replay-position.js`
- Create: `Frontend/manual-replay/manual-replay-position.test.cjs`

**Interfaces:**
- Produces: `window.ManualReplayPosition` / CommonJS API with `createPositionDraft`, `validatePositionLevel`, `calculatePositionMetrics`, `visibleCandleScale`, `clampPriceToScale`.

- [ ] Write literal failing tests for long/short defaults, blank values, RR/risk/reward math, directional clamping, and candle-only autoscale.
- [ ] Run the focused model test and verify RED because the module does not exist.
- [ ] Implement the minimal pure module with no DOM or network dependency.
- [ ] Run the focused model tests and verify GREEN.
- [ ] Commit the model and tests.

### Task 2: Draft State and Ticket Integration

**Files:**
- Modify: `Frontend/manual-replay.html`
- Modify: `Frontend/manual-replay/manual-replay.js`
- Modify: `Frontend/manual-replay/manual-replay.test.cjs`

**Interfaces:**
- Consumes: Task 1 position model.
- Produces: one `state.positionDraft`, toolbar creation/cancel actions, synchronized ticket inputs/readouts, and direction-safe virtual opening.

- [ ] Add failing DOM-controller tests for draft creation, form synchronization, cancellation, fixed entry, direction-safe opening, and no trade creation on cancel.
- [ ] Run the focused tests and verify the missing UI/state behavior is RED.
- [ ] Implement centralized draft state and ticket rendering, preserving existing open-trade behavior.
- [ ] Run focused tests and verify GREEN.
- [ ] Commit the ticket/state integration.

### Task 3: SVG Overlay and Pointer Drag

**Files:**
- Modify: `Frontend/manual-replay/manual-replay.js`
- Modify: `Frontend/manual-replay/manual-replay.css`
- Modify: `Frontend/manual-replay/manual-replay.test.cjs`

**Interfaces:**
- Consumes: Task 1 model and Task 2 centralized draft state.
- Produces: position zones/lines/labels, SL/TP pointer handles, drag synchronization, active overlay, and faint closed overlays.

- [ ] Add failing tests for overlay geometry, candle-only scale, drag-to-form synchronization, invalid-level clamping, active lock, historical outcome, future privacy, and zoom after draft creation.
- [ ] Run the focused tests and verify RED.
- [ ] Implement the SVG renderer and pointer lifecycle using requestAnimationFrame.
- [ ] Run focused tests and verify GREEN.
- [ ] Commit the chart interaction.

### Task 4: Safety, Responsive Styling, and End-to-End Verification

**Files:**
- Modify: `Frontend/manual-replay.html`
- Modify: `Frontend/manual-replay/manual-replay.css`
- Modify: `Frontend/manual-replay/manual-replay.test.cjs`
- Test: `Frontend/tests/manual_replay_navigation.test.js`

**Interfaces:**
- Consumes: Tasks 1-3 complete user flow.
- Produces: cache-busted assets, responsive/touch controls, safety assertions, and deployment-ready frontend.

- [ ] Add failing safety/network and complete-flow regressions covering static-only data, no manual-history endpoint, no broker endpoints, and no requests during local interactions.
- [ ] Run focused tests and verify RED where new acceptance behavior is not yet exposed.
- [ ] Finish responsive styling, accessibility labels, touch targets, and cache versions.
- [ ] Run focused tests, syntax checks, and the full frontend suite; compare any broad failures with clean main.
- [ ] Run browser verification with both symbols, drag/open/advance/resolve flow, network/console inspection, and mobile viewport.
- [ ] Commit final integration and verification changes.
