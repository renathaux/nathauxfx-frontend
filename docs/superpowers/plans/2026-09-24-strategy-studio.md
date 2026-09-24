# Strategy Studio redesign implementation plan

Goal: implement the user's September 24 Strategy Studio brief and light/dark reference designs in the existing vanilla JS frontend.

Architecture: retain the existing strategy model, authenticated CRUD, validation, activation and explicit LIVE handoff safeguards. Rebuild the page shell and nine numbered sections. A reusable settings schema and workspace module handle the additional editable fields, local per-strategy metadata, themes, library/search and real quick-test results. Unsupported engine fields are explicitly labeled Draft and omitted from execution payloads.

Files: strategy-studio.html and strategy-studio.css own layout; strategy-studio-settings.js owns typed field schema, defaults and validation; strategy-studio-workspace.js owns components/theme/local metadata/results; existing strategy-studio.js integrates lifecycle and retains existing domain rules. Existing simulator API/model supply real backtests. Browser tests use isolated fixtures, never real account mutations.

- [x] Preserve all existing controller input IDs and server payloads while arranging them into nine accessible details cards. Keep advanced TP1 protection and fundamental LIVE controls.
- [x] Add typed new settings with bounded validation and per-strategy local persistence; expose a documented API integration boundary. Test invalid ranges, storage failures, strategy isolation, reset/clone/version behavior.
- [x] Build light/dark tokens, sidebar, top actions, search/library, summary tiles, SVG equity chart, Quick Test and assumptions. No fabricated performance. Responsive layouts at 390/768/1280/1440/1920.
- [x] Connect real quick tests via existing simulator API, preserving strategy/range identity through asynchronous work; reject invalid dates, show errors, distinguish requested draft assumptions from actual engine assumptions. Bar Replay opens existing simulator for saved strategy.
- [x] Verify existing Studio model/API/LIVE tests, replace obsolete layout assertions with current specification, browser-test CRUD/locks/settings/themes/collapse/search/test results/errors/navigation in Chrome and WebKit. Review final changes before deployment.
- [ ] Push authorized changes, verify production deployment and read-only UI smoke check.

Review focus: server normalization must not discard local metadata; active/position-locked strategies remain locked; result responses must not attach to a newly selected strategy; unsupported costs must never look applied; mobile panels and dialogs must remain keyboard usable.

Validation: 61 focused Studio/simulator tests pass. Chrome and WebKit fixtures cover metadata isolation, storage failure, custom dates, reset/versioning, locks, search, themes, stale results, execution payload separation, error recovery, UTC Bar Replay handoff and six viewport widths. Independent review has no remaining blockers.
