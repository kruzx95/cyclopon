const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const db = require('../db/database');
const app = require('../server');
const { generateAdminSession } = require('../lib/admin-auth');

const ROOT = path.join(__dirname, '..');

function buildValidFormData(overrides = {}, includeProof = true) {
  const fd = new FormData();
  const base = {
    full_name: 'Raka Pratama',
    birth_date: '1994-05-12',
    gender: 'Laki-laki',
    whatsapp: '081234567890',
    email: 'raka@example.com',
    city: 'Tasikmalaya',
    instagram: '@rakacycling',
    community: 'SUDDENLY.CC',
    emergency_name: 'Dewi Pratama',
    emergency_relation: 'Istri',
    emergency_whatsapp: '081987654321',
    bike_type: 'Road Bike',
    strava_profile_url: 'https://www.strava.com/athletes/123456',
    strava_activity_url: 'https://www.strava.com/activities/987654321',
    longest_distance_km: '142.5',
    has_ultra_experience: 'Pernah',
    past_events: 'Ciamis Loop 120K',
    bike_roadworthy: 'Ya',
    has_helmet_gear: 'Ya',
    medical_conditions: 'Tidak ada',
    terms_agreed: 'Saya menyatakan setuju.',
    media_consent: 'Bersedia',
    payer_account_name: 'Raka Pratama',
    payment_amount: '250000',
    payment_date: '2026-11-30',
    ...overrides
  };

  for (const [k, v] of Object.entries(base)) {
    if (v !== undefined && v !== null) {
      fd.append(k, String(v));
    }
  }

  if (includeProof) {
    const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
    fd.append('payment_proof', new Blob([pngBytes], { type: 'image/png' }), 'bukti-transfer.png');
  }

  return fd;
}

test('ALA-ALA ULTRA 2027 Registration & Race Control Flow', async (t) => {
  let server;
  let baseUrl;
  let adminToken;
  let origConfig;
  let testEventId;
  let initialActiveCount = 0;
  const createdRegIds = [];

  await t.test('setup server, snapshot config, and create test event', async () => {
    origConfig = db.getAlaUltraConfig.get();
    initialActiveCount = Number(db.countActiveAlaUltraRegistrations.get()?.c || 0);
    const ev = db.createEvent.run({ name: 'ALA-ALA ULTRA Test Event', date: '2027-01-17' });
    testEventId = Number(ev.lastInsertRowid);
    adminToken = generateAdminSession().token;

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  await t.test('admin routes reject unauthenticated access when auth enforced', async () => {
    const res = await fetch(`${baseUrl}/api/admin/ala-ultra/registrations`, {
      headers: { 'x-enforce-auth': '1' }
    });
    assert.equal(res.status, 401);
  });

  await t.test('Race Control can configure payment, quota, and WA group link without leaking WA group link publicly', async () => {
    const putRes = await fetch(`${baseUrl}/api/admin/ala-ultra/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'x-enforce-auth': '1'
      },
      body: JSON.stringify({
        linked_event_id: testEventId,
        is_open: true,
        open_date: '2026-11-30',
        close_date: '2027-01-15',
        max_quota: initialActiveCount + 2,
        min_strava_km: 100,
        fee_amount: '250000',
        bank_name: 'BCA',
        account_holder: 'SUDDENLY CC',
        account_number: '1234567890',
        admin_whatsapp: '08111111111',
        wa_group_link: 'https://chat.whatsapp.com/SecretInviteToken123',
        refund_policy: 'Kesempatan perbaiki link Strava 2x24 jam.'
      })
    });
    assert.equal(putRes.status, 200);
    const putData = await putRes.json();
    assert.equal(putData.success, true);
    assert.equal(putData.config.bank_name, 'BCA');

    const pubRes = await fetch(`${baseUrl}/api/ala-ultra/info`);
    assert.equal(pubRes.status, 200);
    const pubData = await pubRes.json();
    assert.equal(pubData.bank_name, 'BCA');
    assert.equal(pubData.fee_amount, '250000');
    assert.equal(pubData.min_strava_km, 100);
    assert.equal(pubData.can_register, true);
    assert.equal(pubData.wa_group_link, undefined, 'WA group invite link must stay hidden from GET /info before registration');
  });

  await t.test('rejects submission when safety check or terms agreement is negative, or Strava URL is malformed', async () => {
    const badSafety = await fetch(`${baseUrl}/api/ala-ultra/register`, {
      method: 'POST',
      body: buildValidFormData({ bike_roadworthy: 'Tidak' })
    });
    assert.equal(badSafety.status, 400);

    const badTerms = await fetch(`${baseUrl}/api/ala-ultra/register`, {
      method: 'POST',
      body: buildValidFormData({ terms_agreed: 'Saya tidak setuju.' })
    });
    assert.equal(badTerms.status, 400);

    const badUrl = await fetch(`${baseUrl}/api/ala-ultra/register`, {
      method: 'POST',
      body: buildValidFormData({ strava_activity_url: 'Check out my activity on Strava: https://strava.app.link/abc' })
    });
    assert.equal(badUrl.status, 400);
    const urlData = await badUrl.json();
    assert.match(urlData.error, /tanpa teks tambahan/i);

    const nonStravaDomain = await fetch(`${baseUrl}/api/ala-ultra/register`, {
      method: 'POST',
      body: buildValidFormData({ strava_profile_url: 'https://google.com/search?q=strava' })
    });
    assert.equal(nonStravaDomain.status, 400);
    assert.match((await nonStravaDomain.json()).error, /domain resmi Strava/i);

    const spoofedAtUrl = await fetch(`${baseUrl}/api/ala-ultra/register`, {
      method: 'POST',
      body: buildValidFormData({ strava_activity_url: 'https://www.strava.com@evil.example/activities/123' })
    });
    assert.equal(spoofedAtUrl.status, 400);

    const spoofedSubdomain = await fetch(`${baseUrl}/api/ala-ultra/register`, {
      method: 'POST',
      body: buildValidFormData({ strava_profile_url: 'https://strava.com.evil.example/athletes/123' })
    });
    assert.equal(spoofedSubdomain.status, 400);

    const plainHttpUrl = await fetch(`${baseUrl}/api/ala-ultra/register`, {
      method: 'POST',
      body: buildValidFormData({ strava_activity_url: 'http://www.strava.com/activities/987654321' })
    });
    assert.equal(plainHttpUrl.status, 400);

    const wrongPathKind = await fetch(`${baseUrl}/api/ala-ultra/register`, {
      method: 'POST',
      body: buildValidFormData({ strava_activity_url: 'https://www.strava.com/athletes/123456' })
    });
    assert.equal(wrongPathKind.status, 400);

    const missingProof = await fetch(`${baseUrl}/api/ala-ultra/register`, {
      method: 'POST',
      body: buildValidFormData({}, false)
    });
    assert.equal(missingProof.status, 400);
  });

  await t.test('accepts valid registration with upload, serves proof to admin, supports verification, syncs rider, and exports CSV', async () => {
    const regRes = await fetch(`${baseUrl}/api/ala-ultra/register`, {
      method: 'POST',
      body: buildValidFormData({
        full_name: '=CMD() Budi',
        media_consent: 'Tidak bersedia',
        strava_profile_url: 'https://www.strava.com/athletes/budirider',
        strava_activity_url: 'https://strava.app.link/Ride2026Abc'
      })
    });
    assert.equal(regRes.status, 201);
    const regData = await regRes.json();
    assert.equal(regData.success, true);
    assert.equal(regData.wa_group_link, 'https://chat.whatsapp.com/SecretInviteToken123');
    assert.match(regData.registration.reg_code, /^AAU-\d{3,}$/);
    const regId = regData.registration.id;
    createdRegIds.push(regId);

    // Proof endpoint requires admin auth
    const unauthProof = await fetch(`${baseUrl}/api/admin/ala-ultra/registrations/${regId}/proof`, {
      headers: { 'x-enforce-auth': '1' }
    });
    assert.equal(unauthProof.status, 401);

    const authProof = await fetch(`${baseUrl}/api/admin/ala-ultra/registrations/${regId}/proof`, {
      headers: { 'Authorization': `Bearer ${adminToken}`, 'x-enforce-auth': '1' }
    });
    assert.equal(authProof.status, 200);
    assert.match(authProof.headers.get('content-type') || '', /image\/png/);

    // Cannot sync rider before approval
    const syncEarly = await fetch(`${baseUrl}/api/admin/ala-ultra/registrations/${regId}/sync-rider`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}`, 'x-enforce-auth': '1' }
    });
    assert.equal(syncEarly.status, 400);

    // Admin updates verification & approves
    const patchRes = await fetch(`${baseUrl}/api/admin/ala-ultra/registrations/${regId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'x-enforce-auth': '1'
      },
      body: JSON.stringify({
        verify_data: 'Valid',
        verify_strava: 'Valid',
        verify_payment: 'Valid',
        registration_status: 'Disetujui',
        wa_invite_status: 'Terkirim',
        wa_group_status: 'Sudah Bergabung',
        admin_notes: 'Lolos verifikasi awal'
      })
    });
    assert.equal(patchRes.status, 200);
    const patched = await patchRes.json();
    assert.equal(patched.registration.registration_status, 'Disetujui');
    assert.equal(patched.registration.wa_group_status, 'Sudah Bergabung');

    // Sync approved participant into linked CycloPon event riders
    const syncOk = await fetch(`${baseUrl}/api/admin/ala-ultra/registrations/${regId}/sync-rider`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}`, 'x-enforce-auth': '1' }
    });
    assert.equal(syncOk.status, 201);
    const syncData = await syncOk.json();
    assert.equal(syncData.rider.bib, '001');
    assert.equal(syncData.rider.pin, '7890');

    // Export CSV escapes formula injection and includes Section E headers & report template
    const csvRes = await fetch(`${baseUrl}/api/admin/ala-ultra/export.csv`, {
      headers: { 'Authorization': `Bearer ${adminToken}`, 'x-enforce-auth': '1' }
    });
    assert.equal(csvRes.status, 200);
    assert.match(csvRes.headers.get('content-disposition') || '', /ala-ala-ultra-2027-registrations-\d{4}-\d{2}-\d{2}\.csv/);
    const csvText = await csvRes.text();
    assert.match(csvText, /LAPORAN PENDAFTARAN PESERTA - ALA-ALA ULTRA 2027/);
    assert.match(csvText, /Ringkasan Status/);
    assert.match(csvText, /Ringkasan Pembayaran/);
    assert.match(csvText, /1\. REGISTRASI & STATUS/);
    assert.match(csvText, /Nomor Registrasi/);
    assert.match(csvText, /Verifikasi Strava/);
    assert.match(csvText, /Undangan Grup WA/);
    assert.match(csvText, /'=CMD\(\) Budi/);
    assert.match(csvText, /TOTAL PENDAFTAR/);
  });

  await t.test('enforces max quota and admin closed toggle', async () => {
    // Fill remaining slot(s) up to max_quota = initialActiveCount + 2
    const targetQuota = initialActiveCount + 2;
    const infoBefore = await (await fetch(`${baseUrl}/api/ala-ultra/info`)).json();
    for (let count = infoBefore.registered_count; count < targetQuota; count++) {
      const regMore = await fetch(`${baseUrl}/api/ala-ultra/register`, {
        method: 'POST',
        body: buildValidFormData({ full_name: `Siti Aminah ${count}`, whatsapp: `0812000000${String(count).padStart(2, '0')}` })
      });
      assert.equal(regMore.status, 201);
      createdRegIds.push((await regMore.json()).registration.id);
    }

    const quotaBlocked = await fetch(`${baseUrl}/api/ala-ultra/register`, {
      method: 'POST',
      body: buildValidFormData({ full_name: 'Terlambat', whatsapp: '081200000003' })
    });
    assert.equal(quotaBlocked.status, 409);

    // Close toggle (partial update) returns closed status without wiping existing payment fields
    await fetch(`${baseUrl}/api/admin/ala-ultra/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'x-enforce-auth': '1'
      },
      body: JSON.stringify({ is_open: false })
    });
    const closedInfo = await (await fetch(`${baseUrl}/api/ala-ultra/info`)).json();
    assert.equal(closedInfo.effective_status, 'closed');
    assert.equal(closedInfo.can_register, false);
    assert.equal(closedInfo.bank_name, 'BCA');
    assert.equal(closedInfo.fee_amount, '250000');
    assert.equal(closedInfo.account_number, '1234567890');
  });

  await t.test('header navigation, route, exact copy, and antislop compliance checks pass', () => {
    const navFiles = [
      'public/index.html',
      'public/js/pages/landing.js',
      'public/js/pages/share-card.js',
      'public/js/pages/install.js',
      'public/js/pages/register.js',
      'public/js/pages/guide.js'
    ];
    for (const rel of navFiles) {
      const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert.match(content, /href="\/ala-ala-ultra"[^>]*>[\s\S]*?ALA-ALA ULTRA/, `${rel} should expose ALA-ALA ULTRA header link`);
    }

    const regPage = fs.readFileSync(path.join(ROOT, 'public/js/pages/ala-ultra-register.js'), 'utf8');
    assert.equal(/—/.test(regPage), false, 'ala-ultra-register.js must not contain em dashes (R-02)');
    assert.match(regPage, /ALA-ALA ULTRA 2027 - FORMULIR PENDAFTARAN PESERTA/);
    assert.match(regPage, /SECTION 4 - KESELAMATAN DAN PERLENGKAPAN/);
    assert.match(regPage, /3\. Apakah ada kondisi kesehatan/);
    assert.match(regPage, /TERIMA KASIH TELAH MENDAFTAR ALA-ALA ULTRA 2027!/);

    const adminSidebarSrc = fs.readFileSync(path.join(ROOT, 'public/js/pages/admin-dashboard.js'), 'utf8');
    assert.match(adminSidebarSrc, /href="\/admin\/ala-ultra"[\s\S]*?ALA-ALA ULTRA/);
  });

  await t.test('teardown: clean test registrations, test event, and restore config', async () => {
    for (const id of createdRegIds) {
      await fetch(`${baseUrl}/api/admin/ala-ultra/registrations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
    }
    if (testEventId) db.deleteEvent.run(testEventId);
    if (origConfig) {
      db.updateAlaUltraConfig.run({
        linked_event_id: origConfig.linked_event_id ?? null,
        is_open: origConfig.is_open ?? 1,
        open_date: origConfig.open_date ?? '2026-11-30',
        close_date: origConfig.close_date ?? null,
        max_quota: origConfig.max_quota ?? null,
        min_strava_km: origConfig.min_strava_km ?? null,
        fee_amount: origConfig.fee_amount ?? null,
        bank_name: origConfig.bank_name ?? null,
        account_holder: origConfig.account_holder ?? null,
        account_number: origConfig.account_number ?? null,
        admin_whatsapp: origConfig.admin_whatsapp ?? null,
        wa_group_link: origConfig.wa_group_link ?? null,
        refund_policy: origConfig.refund_policy ?? null,
        insurance_note: origConfig.insurance_note ?? null
      });
    }
    await new Promise(resolve => server.close(resolve));
  });
});
