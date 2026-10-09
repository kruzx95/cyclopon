const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

test('Automated Diagnostic Trial & VPS Test Report Generator', async (t) => {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'generate-test-report.js');
  const reportsDir = path.join(__dirname, '..', 'reports');
  const latestReportPath = path.join(reportsDir, 'LATEST_REPORT.md');
  const packageJsonPath = path.join(__dirname, '..', 'package.json');

  await t.test('generate-test-report.js script exists', () => {
    assert.ok(fs.existsSync(scriptPath), 'scripts/generate-test-report.js should exist');
  });

  await t.test('package.json contains test:report script definition', () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    assert.ok(pkg.scripts['test:report'], 'package.json should define test:report script');
    assert.equal(pkg.scripts['test:report'], 'node scripts/generate-test-report.js');
  });

  await t.test('executes generate-test-report.js and verifies exit code 0', () => {
    const output = execSync('node scripts/generate-test-report.js', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8'
    });
    assert.ok(output.includes('HASIL DIAGNOSTIK KESIAPAN VPS'), 'Terminal output should contain final verdict');
    assert.ok(output.includes('Laporan Tersimpan'), 'Terminal output should specify report save path');
  });

  await t.test('verifies reports directory and LATEST_REPORT.md structure', () => {
    assert.ok(fs.existsSync(reportsDir), 'reports/ directory should exist');
    assert.ok(fs.existsSync(latestReportPath), 'reports/LATEST_REPORT.md should exist');

    const content = fs.readFileSync(latestReportPath, 'utf8');
    assert.ok(content.includes('# 📊 Laporan Diagnostik Kesiapan Produksi VPS'), 'Should contain title');
    assert.ok(content.includes('## 1. Ringkasan Eksekutif (Executive Summary)'), 'Should contain executive summary');
    assert.ok(content.includes('## 2. Profil Lingkungan & Sistem (System Profile)'), 'Should contain system profile');
    assert.ok(content.includes('## 3. Matriks Hasil Uji Diagnostik (Diagnostic Results Table)'), 'Should contain results table');
    assert.ok(content.includes('## 5. Rekomendasi Spesifikasi VPS & Arsitektur Produksi'), 'Should contain VPS recommendations');
    assert.ok(content.includes('Batch Ingestion Speed'), 'Should contain ingestion benchmark');
    assert.ok(content.includes('WebSocket Fan-Out'), 'Should contain WebSocket benchmark');
    assert.ok(content.includes('Race Engine & COT'), 'Should contain Race engine benchmark');
  });
});
