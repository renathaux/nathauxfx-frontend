from pathlib import Path

mobile = Path('Frontend/mobile.html')
text = mobile.read_text()
replacements = {
    'href="index.html?desktop=1&open=menuAssistantBtn"': 'href="/app?desktop=1&from=mobile&open=menuAssistantBtn"',
    'href="/app?desktop=1&open=menuPaperBtn"': 'href="/app?desktop=1&from=mobile&open=menuPaperBtn"',
    'href="index.html?desktop=1&open=menuFeedbackBtn"': 'href="/app?desktop=1&from=mobile&open=menuFeedbackBtn"',
    'href="index.html?desktop=1&open=menuHistoryBtn"': 'href="mobile.html?panel=history"',
    'href="index.html?desktop=1&open=menuStatsBtn"': 'href="/app?desktop=1&from=mobile&open=menuStatsBtn"',
    'href="index.html?desktop=1&open=menuGeneralSettingsBtn"': 'href="/app?desktop=1&from=mobile&open=menuGeneralSettingsBtn"',
    'href="index.html?desktop=1&open=menuRiskSettingsBtn"': 'href="/app?desktop=1&from=mobile&open=menuRiskSettingsBtn"',
    'href="index.html?desktop=1&open=menuBrokerAccountsBtn"': 'href="/app?desktop=1&from=mobile&open=menuBrokerAccountsBtn"',
    'href="index.html?desktop=1&open=menuNotificationsSettingsBtn"': 'href="/app?desktop=1&from=mobile&open=menuNotificationsSettingsBtn"',
    'href="index.html?desktop=1&open=menuStrategySettingsBtn"': 'href="/app?desktop=1&from=mobile&open=menuStrategySettingsBtn"',
}
for old, new in replacements.items():
    if old not in text:
        raise SystemExit(f'missing mobile route: {old}')
    text = text.replace(old, new, 1)
mobile.write_text(text)

app = Path('Frontend/app.html')
text = app.read_text()
old = '''      const params = new URLSearchParams(window.location.search);\n      if (window.innerWidth <= 700 && params.get("desktop") !== "1") {\n        window.location.replace("mobile.html?from=dashboard");\n      }'''
new = '''      const params = new URLSearchParams(window.location.search);\n      const mobilePanelRoute =\n        window.innerWidth <= 700 &&\n        params.get("desktop") === "1" &&\n        params.get("from") === "mobile" &&\n        Boolean(params.get("open"));\n\n      if (mobilePanelRoute) {\n        document.documentElement.classList.add("flowsignal-mobile-panel-route");\n        const style = document.createElement("style");\n        style.id = "flowsignalMobilePanelRouteStyle";\n        style.textContent = `\n          html.flowsignal-mobile-panel-route body {\n            margin: 0 !important;\n            min-height: 100dvh;\n            overflow: hidden !important;\n            background: #06101b !important;\n          }\n          html.flowsignal-mobile-panel-route #landingPage,\n          html.flowsignal-mobile-panel-route #mainApp {\n            display: none !important;\n          }\n        `;\n        document.head.appendChild(style);\n      } else if (window.innerWidth <= 700 && params.get("desktop") !== "1") {\n        window.location.replace("mobile.html?from=dashboard");\n      }'''
if old not in text:
    raise SystemExit('expected app mobile redirect block not found')
app.write_text(text.replace(old, new, 1))

startup = Path('Frontend/startup.js')
text = startup.read_text()
old_head = '''  function openRequestedDesktopPanel() {\n    let requested = "";\n    try { requested = new URLSearchParams(window.location.search).get("open") || ""; } catch (_error) { return; }\n    if (!requested) return;'''
new_head = '''  function openRequestedDesktopPanel() {\n    let requested = "";\n    let mobilePanelRoute = false;\n    try {\n      const params = new URLSearchParams(window.location.search);\n      requested = params.get("open") || "";\n      mobilePanelRoute =\n        window.matchMedia("(max-width: 700px)").matches &&\n        params.get("desktop") === "1" &&\n        params.get("from") === "mobile";\n    } catch (_error) { return; }\n    if (!requested) return;'''
if old_head not in text:
    raise SystemExit('expected requested panel head not found')
text = text.replace(old_head, new_head, 1)

old_open = '''      if (target && typeof target.click === "function") {\n        target.click();\n        record("requested_desktop_panel_opened", { requested });\n        try {\n          const url = new URL(window.location.href);\n          url.searchParams.delete("open");\n          history.replaceState(null, "", url.toString());\n        } catch (_error) {}\n        return;\n      }\n      if (attempts < 30) window.setTimeout(tryOpen, 100);'''
new_open = '''      if (target && typeof target.click === "function") {\n        const mobilePanelModalMap = {\n          menuAssistantBtn: "assistantModal",\n          menuPaperBtn: "paperModal",\n          menuFeedbackBtn: "feedbackModal",\n          menuStatsBtn: "statsModal",\n          menuGeneralSettingsBtn: "settingsModal",\n          menuRiskSettingsBtn: "settingsModal",\n          menuBrokerAccountsBtn: "brokerAccountsModal",\n          menuNotificationsSettingsBtn: "settingsModal",\n          menuStrategySettingsBtn: "settingsModal",\n        };\n        const modal = mobilePanelRoute\n          ? document.getElementById(mobilePanelModalMap[requested] || "")\n          : null;\n        let modalWasOpen = Boolean(modal && !modal.classList.contains("hidden"));\n        let modalObserver = null;\n\n        if (mobilePanelRoute && modal) {\n          modalObserver = new MutationObserver(() => {\n            const visible = !modal.classList.contains("hidden") && modal.style.display !== "none";\n            if (visible) modalWasOpen = true;\n            if (modalWasOpen && !visible) {\n              modalObserver?.disconnect();\n              window.location.replace("/mobile.html?from=panel");\n            }\n          });\n          modalObserver.observe(modal, { attributes: true, attributeFilter: ["class", "style"] });\n        }\n\n        target.click();\n        if (mobilePanelRoute && modal && !modal.classList.contains("hidden")) modalWasOpen = true;\n        record("requested_desktop_panel_opened", { requested, mobilePanelRoute });\n        try {\n          const url = new URL(window.location.href);\n          if (!mobilePanelRoute) url.searchParams.delete("open");\n          history.replaceState(null, "", url.toString());\n        } catch (_error) {}\n        return;\n      }\n      if (attempts < 30) {\n        window.setTimeout(tryOpen, 100);\n      } else if (mobilePanelRoute) {\n        window.location.replace("/mobile.html?from=panel-error");\n      }'''
if old_open not in text:
    raise SystemExit('expected requested panel open block not found')
startup.write_text(text.replace(old_open, new_open, 1))

nav = Path('Frontend/mobileNav.js')
text = nav.read_text()
old = '''  loadStoredCache();\n\n  // Do not duplicate the main dashboard's 5-second /panel-data polling here.'''
new = '''  loadStoredCache();\n\n  try {\n    const requestedPanel = new URLSearchParams(window.location.search).get("panel") || "";\n    if (requestedPanel && actions[requestedPanel]) {\n      window.setTimeout(() => {\n        actions[requestedPanel]();\n        try {\n          const url = new URL(window.location.href);\n          url.searchParams.delete("panel");\n          history.replaceState(null, "", url.toString());\n        } catch (_error) {}\n      }, 50);\n    }\n  } catch (_error) {}\n\n  // Do not duplicate the main dashboard's 5-second /panel-data polling here.'''
if old not in text:
    raise SystemExit('expected mobile nav cache block not found')
nav.write_text(text.replace(old, new, 1))

test = Path('Frontend/tests/mobile_menu_panel_routing.test.js')
test.write_text(r'''const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const mobile = fs.readFileSync(path.join(root, 'mobile.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const startup = fs.readFileSync(path.join(root, 'startup.js'), 'utf8');
const mobileNav = fs.readFileSync(path.join(root, 'mobileNav.js'), 'utf8');

test('mobile menu app panels use authenticated /app route instead of public landing index', () => {
  const targets = [
    'menuAssistantBtn', 'menuPaperBtn', 'menuFeedbackBtn', 'menuStatsBtn',
    'menuGeneralSettingsBtn', 'menuRiskSettingsBtn', 'menuBrokerAccountsBtn',
    'menuNotificationsSettingsBtn', 'menuStrategySettingsBtn'
  ];
  for (const target of targets) {
    assert.match(mobile, new RegExp(`href="\\/app\\?desktop=1&from=mobile&open=${target}"`));
  }
  assert.doesNotMatch(mobile, /index\.html\?desktop=1&open=/);
});

test('mobile history stays on native mobile dashboard', () => {
  assert.match(mobile, /href="mobile\.html\?panel=history"/);
  assert.match(mobileNav, /requestedPanel/);
  assert.match(mobileNav, /actions\[requestedPanel\]\(\)/);
});

test('mobile app panel route hides the stacked desktop dashboard underneath the modal', () => {
  assert.match(app, /flowsignal-mobile-panel-route/);
  assert.match(app, /#landingPage,[\s\S]*#mainApp[\s\S]*display:\s*none\s*!important/);
});

test('closing a mobile-routed desktop modal returns to mobile dashboard', () => {
  assert.match(startup, /mobilePanelModalMap/);
  assert.match(startup, /MutationObserver/);
  assert.match(startup, /\/mobile\.html\?from=panel/);
  assert.match(startup, /menuPaperBtn:\s*"paperModal"/);
  assert.match(startup, /menuBrokerAccountsBtn:\s*"brokerAccountsModal"/);
});
''')
