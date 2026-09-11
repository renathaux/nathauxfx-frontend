const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const apiClient = fs.readFileSync(path.join(root, 'apiClient.js'), 'utf8');

assert.match(app, /id="menuAccessRequestsBtn"[^>]*hidden/, 'access navigation starts hidden');
assert.match(app, /id="accessRequestsModal"/, 'admin access dialog is present');
assert.match(script, /setAdminOnlyVisible\(menuAccessRequestsBtn, admin\)/, 'access navigation is admin-only');
assert.match(script, /\/admin\/access\/requests/, 'access requests are loaded from the backend');
assert.match(script, /\["APPROVED", "DENIED"\]/, 'approve and deny actions are available');
assert.match(script, /loadAccessRequests\(actionResultMessage\)/, 'approval email delivery result survives list refresh');
assert.match(script, /item\.dataset\.decision === "APPROVED" && !request\.email_verified/, 'failed requests preserve unverified approval lock');
assert.match(apiClient, /url\.pathname\.startsWith\("\/admin\/access\/"\)/, 'owner authorization covers access administration');

console.log('admin account access frontend tests passed');
