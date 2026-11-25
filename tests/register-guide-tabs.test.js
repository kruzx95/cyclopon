const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function readRel(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('Panduan menu is consolidated into Daftar Event (/register) tabs', async (t) => {
  await t.test('top navbars and mobile drawer no longer render standalone /guide link', () => {
    const files = [
      'public/index.html',
      'public/js/pages/landing.js',
      'public/js/pages/share-card.js',
      'public/js/pages/install.js',
      'public/js/pages/register.js'
    ];
    for (const rel of files) {
      const content = readRel(rel);
      assert.equal(/href="\/guide"/.test(content), false, `${rel} should not link to standalone /guide in nav`);
    }
  });

  await t.test('app router redirects /guide and /panduan to /register?tab=panduan and loads guide.js on /register', () => {
    const appJs = readRel('public/js/app.js');
    assert.match(appJs, /Router\.register\('\/guide',\s*\(\)\s*=>\s*Router\.navigate\('\/register\?tab=panduan'\)\)/);
    assert.match(appJs, /Router\.register\('\/panduan',\s*\(\)\s*=>\s*Router\.navigate\('\/register\?tab=panduan'\)\)/);
    assert.match(appJs, /Router\.register\('\/register'[\s\S]*?\/js\/pages\/guide\.js/);
  });

  await t.test('rider-setup points guide button to /register?tab=panduan', () => {
    const setupJs = readRel('public/js/pages/rider-setup.js');
    assert.match(setupJs, /href="\/register\?tab=panduan&section=traccarGuideSection"/);
  });

  await t.test('register page exposes accessible tabs for Pendaftaran & Roster and Panduan Pengguna', () => {
    const registerJs = readRel('public/js/pages/register.js');
    assert.match(registerJs, /role="tablist"/);
    assert.match(registerJs, /id="tabBtnRegForm"[^>]*role="tab"[^>]*aria-controls="regTabPanelForm"/);
    assert.match(registerJs, /id="tabBtnRegGuide"[^>]*role="tab"[^>]*aria-controls="regTabPanelGuide"/);
    assert.match(registerJs, /id="regTabPanelForm"[^>]*role="tabpanel"/);
    assert.match(registerJs, /id="regTabPanelGuide"[^>]*role="tabpanel"/);
    assert.match(registerJs, /window\.renderGuidePanel\(/);
  });

  await t.test('guide.js avoids ID collision with register.js and exports renderGuidePanel', () => {
    const guideJs = readRel('public/js/pages/guide.js');
    assert.equal(/id="btnCopyServerUrl"/.test(guideJs), false, 'guide.js must not reuse btnCopyServerUrl ID');
    assert.match(guideJs, /id="btnGuideCopyServerUrl"/);
    assert.match(guideJs, /window\.renderGuidePanel\s*=\s*renderGuidePanel/);
  });

  await t.test('global typography uses Barlow, Plus Jakarta Sans, and IBM Plex Mono without Inter', () => {
    const indexHtml = readRel('public/index.html');
    const globalCss = readRel('public/css/global.css');
    const cardTemplates = readRel('public/js/lib/card-templates.js');
    assert.match(indexHtml, /fonts\.googleapis\.com\/css2\?family=Barlow/);
    assert.match(indexHtml, /Plus\+Jakarta\+Sans/);
    assert.match(indexHtml, /IBM\+Plex\+Mono/);
    assert.match(globalCss, /--font-display:\s*'Barlow'/);
    assert.match(globalCss, /--font-sans:\s*'Plus Jakarta Sans'/);
    assert.match(globalCss, /--font-mono:\s*'IBM Plex Mono'/);
    assert.equal(/@import\s+url\(/i.test(globalCss), false, 'global.css should not use render-blocking @import');
    assert.equal(/\bInter\b/.test(globalCss), false);
    assert.match(cardTemplates, /"Barlow"/);
    assert.match(cardTemplates, /"IBM Plex Mono"/);
  });

  await t.test('admin mobile drawer aligns right with trigger and uses consistent font variables', () => {
    const adminCss = readRel('public/css/admin.css');
    const adminDashJs = readRel('public/js/pages/admin-dashboard.js');
    assert.match(adminCss, /\.admin-drawer\s*\{[\s\S]*?right:\s*0;/);
    assert.match(adminCss, /\.admin-mobile-brand\s*\{[\s\S]*?font-family:\s*var\(--font-display\)/);
    assert.match(adminCss, /\.admin-drawer-brand\s*\{[\s\S]*?font-family:\s*var\(--font-display\)/);
    assert.equal(/ui-monospace/.test(adminDashJs), false, 'admin-dashboard.js should use var(--font-mono) instead of ui-monospace');
    assert.match(adminDashJs, /aria-expanded="false"\s+aria-controls="adminDrawer"/);
  });
});
