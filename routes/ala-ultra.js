const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../db/database');
const { requireAdminAuth } = require('../lib/admin-auth');
const { getClientIp } = require('../lib/event-access');
const { determineColorForRole } = require('../lib/constants');
const { validateStravaUrl } = require('../public/js/lib/utils');
const { buildAlaUltraReport, renderAlaUltraXlsx } = require('../lib/ala-ultra-export');
const { XLSX_MIME: XLSX_CONTENT_TYPE } = require('../lib/xlsx');

const publicRouter = express.Router();
const adminRouter = express.Router();

adminRouter.use(requireAdminAuth);

const proofDir = path.join(__dirname, '..', 'data', 'ala-ultra-proofs');
if (!fs.existsSync(proofDir)) fs.mkdirSync(proofDir, { recursive: true });

const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.pdf']);
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']);

const proofStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, proofDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ALLOWED_EXTS.has(ext) ? ext : '.bin';
    const rand = crypto.randomBytes(6).toString('hex');
    cb(null, `proof-${Date.now()}-${rand}${safeExt}`);
  }
});

const uploadProof = multer({
  storage: proofStorage,
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mime = String(file.mimetype || '').toLowerCase();
    if (ALLOWED_EXTS.has(ext) && (!mime || ALLOWED_MIMES.has(mime) || mime === 'application/octet-stream')) {
      cb(null, true);
    } else {
      const err = new Error('Format file bukti transfer harus JPG, PNG, atau PDF.');
      err.status = 400;
      cb(err);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Rate limiter for public ALA-ALA ULTRA submissions (15 req / minute per IP)
const submitRateMap = new Map();
const rateCleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of submitRateMap.entries()) {
    if (now - rec.resetTime > 60000) submitRateMap.delete(ip);
  }
}, 60000);
if (rateCleanupTimer.unref) rateCleanupTimer.unref();

function submitRateLimiter(req, res, next) {
  const ip = getClientIp(req);
  const now = Date.now();
  let rec = submitRateMap.get(ip);
  if (!rec || now - rec.resetTime > 60000) {
    rec = { count: 1, resetTime: now };
    submitRateMap.set(ip, rec);
  } else {
    rec.count++;
  }
  if (rec.count > 15) {
    return res.status(429).json({ error: 'Terlalu banyak percobaan pengiriman formulir. Silakan tunggu sebentar.' });
  }
  next();
}

function cleanupUploadedFile(file) {
  if (!file || !file.path) return;
  try {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
  } catch {}
}

function getJakartaDateYmd() {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function computeRegistrationAvailability(cfg, activeCount) {
  const isOpenFlag = Number(cfg?.is_open ?? 1) === 1;
  const maxQuota = cfg?.max_quota != null && Number(cfg.max_quota) > 0 ? Number(cfg.max_quota) : null;
  const closeDate = cfg?.close_date ? String(cfg.close_date).trim() : null;
  const todayWib = getJakartaDateYmd();

  const isExpired = !!(closeDate && /^\d{4}-\d{2}-\d{2}$/.test(closeDate) && todayWib > closeDate);
  const isQuotaFull = !!(maxQuota && activeCount >= maxQuota);

  let status = 'open';
  if (!isOpenFlag) status = 'closed';
  else if (isExpired) status = 'expired';
  else if (isQuotaFull) status = 'quota_full';

  return {
    effective_status: status,
    can_register: status === 'open',
    is_quota_full: isQuotaFull,
    is_expired: isExpired,
    max_quota: maxQuota
  };
}

function buildPublicConfigPayload() {
  const cfg = db.getAlaUltraConfig.get() || { id: 1, is_open: 1, open_date: '2026-11-30' };
  const activeCount = Number(db.countActiveAlaUltraRegistrations.get()?.c || 0);
  const approvedCount = Number(db.countApprovedAlaUltraRegistrations.get()?.c || 0);
  const avail = computeRegistrationAvailability(cfg, activeCount);

  return {
    linked_event_id: cfg.linked_event_id || null,
    is_open: Number(cfg.is_open) === 1,
    open_date: cfg.open_date || '2026-11-30',
    close_date: cfg.close_date || null,
    max_quota: avail.max_quota,
    min_strava_km: cfg.min_strava_km != null && cfg.min_strava_km !== '' ? Number(cfg.min_strava_km) : null,
    fee_amount: cfg.fee_amount || null,
    bank_name: cfg.bank_name || null,
    account_holder: cfg.account_holder || null,
    account_number: cfg.account_number || null,
    admin_whatsapp: cfg.admin_whatsapp || null,
    refund_policy: cfg.refund_policy || null,
    insurance_note: cfg.insurance_note || null,
    registered_count: activeCount,
    approved_count: approvedCount,
    ...avail
  };
}

function cleanStr(val, maxLen = 500) {
  if (val == null) return '';
  return String(val).trim().slice(0, maxLen);
}

function normalizePhoneDigits(val) {
  return String(val || '').replace(/\D/g, '');
}

function isValidHttpUrl(str) {
  if (!str) return false;
  try {
    const parsed = new URL(String(str).trim());
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

function isValidEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(str || '').trim());
}

// Public Routes

// GET /api/ala-ultra/info
publicRouter.get('/info', (_req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.json(buildPublicConfigPayload());
});

// POST /api/ala-ultra/register
publicRouter.post('/register', submitRateLimiter, (req, res) => {
  uploadProof.single('payment_proof')(req, res, (uploadErr) => {
    if (uploadErr) {
      return res.status(uploadErr.status || 400).json({ error: uploadErr.message });
    }

    const body = req.body || {};
    const fail = (status, message) => {
      cleanupUploadedFile(req.file);
      return res.status(status).json({ error: message });
    };

    try {
      const cfg = db.getAlaUltraConfig.get() || { id: 1, is_open: 1 };
      const activeCount = Number(db.countActiveAlaUltraRegistrations.get()?.c || 0);
      const avail = computeRegistrationAvailability(cfg, activeCount);

      if (avail.effective_status === 'closed') {
        return fail(403, 'Pendaftaran ALA-ALA ULTRA 2027 sedang ditutup oleh panitia.');
      }
      if (avail.effective_status === 'expired') {
        return fail(403, 'Batas waktu pendaftaran ALA-ALA ULTRA 2027 telah berakhir.');
      }
      if (avail.effective_status === 'quota_full') {
        return fail(409, 'Kuota peserta ALA-ALA ULTRA 2027 sudah penuh.');
      }

      // Section 1: Data Diri Peserta
      const fullName = cleanStr(body.full_name, 120);
      const birthDate = cleanStr(body.birth_date, 20);
      const gender = cleanStr(body.gender, 20);
      const whatsapp = cleanStr(body.whatsapp, 30);
      const email = cleanStr(body.email, 120);
      const city = cleanStr(body.city, 100);
      const instagram = cleanStr(body.instagram, 80) || null;
      const community = cleanStr(body.community, 100) || null;

      if (!fullName) return fail(400, 'Nama lengkap sesuai KTP wajib diisi.');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return fail(400, 'Tanggal lahir tidak valid.');
      if (!['Laki-laki', 'Perempuan'].includes(gender)) return fail(400, 'Jenis kelamin wajib dipilih.');
      const waDigits = normalizePhoneDigits(whatsapp);
      if (waDigits.length < 9 || waDigits.length > 16) return fail(400, 'Nomor WhatsApp aktif tidak valid.');
      if (!isValidEmail(email)) return fail(400, 'Alamat email tidak valid.');
      if (!city) return fail(400, 'Kota/kabupaten domisili wajib diisi.');

      // Section 2: Kontak Darurat
      const emergencyName = cleanStr(body.emergency_name, 120);
      const emergencyRelation = cleanStr(body.emergency_relation, 60);
      const emergencyWhatsapp = cleanStr(body.emergency_whatsapp, 30);

      if (!emergencyName) return fail(400, 'Nama kontak darurat wajib diisi.');
      if (!emergencyRelation) return fail(400, 'Hubungan dengan peserta wajib diisi.');
      const emgDigits = normalizePhoneDigits(emergencyWhatsapp);
      if (emgDigits.length < 9 || emgDigits.length > 16) return fail(400, 'Nomor WhatsApp kontak darurat tidak valid.');

      // Section 3: Profil dan Pengalaman Bersepeda
      const bikeType = cleanStr(body.bike_type, 40);
      const stravaProfileUrl = cleanStr(body.strava_profile_url, 300);
      const stravaActivityUrl = cleanStr(body.strava_activity_url, 300);
      const longestDistanceRaw = cleanStr(body.longest_distance_km, 20);
      const hasUltraExperience = cleanStr(body.has_ultra_experience, 20);
      const pastEvents = cleanStr(body.past_events, 1000) || null;

      if (!['Road Bike', 'Gravel Bike', 'Mountain Bike', 'Lainnya'].includes(bikeType)) {
        return fail(400, 'Jenis sepeda wajib dipilih.');
      }
      const profileCheck = validateStravaUrl(stravaProfileUrl, 'profile');
      if (!profileCheck.valid) {
        return fail(400, profileCheck.error);
      }
      const activityCheck = validateStravaUrl(stravaActivityUrl, 'activity');
      if (!activityCheck.valid) {
        return fail(400, activityCheck.error);
      }
      const cleanStravaProfileUrl = profileCheck.url;
      const cleanStravaActivityUrl = activityCheck.url;
      const longestDistanceKm = Number(longestDistanceRaw);
      if (!Number.isFinite(longestDistanceKm) || longestDistanceKm <= 0) {
        return fail(400, 'Jarak terjauh harus diisi dengan angka lebih dari 0.');
      }
      if (!['Pernah', 'Belum pernah'].includes(hasUltraExperience)) {
        return fail(400, 'Pengalaman mengikuti event bersepeda jarak jauh wajib dipilih.');
      }

      // Section 4: Keselamatan dan Perlengkapan
      const bikeRoadworthy = cleanStr(body.bike_roadworthy, 10);
      const hasHelmetGear = cleanStr(body.has_helmet_gear, 10);
      const medicalConditions = cleanStr(body.medical_conditions, 1000) || null;

      if (bikeRoadworthy !== 'Ya') {
        return fail(400, 'Sepeda harus dalam kondisi layak jalan untuk mengikuti ALA-ALA ULTRA 2027.');
      }
      if (hasHelmetGear !== 'Ya') {
        return fail(400, 'Peserta wajib memiliki helm dan perlengkapan keselamatan bersepeda.');
      }

      // Section 5: Persetujuan Peserta
      const termsAgreed = cleanStr(body.terms_agreed, 40);
      const mediaConsent = cleanStr(body.media_consent, 30);

      if (termsAgreed !== 'Saya menyatakan setuju.') {
        return fail(400, 'Persetujuan seluruh ketentuan merupakan syarat wajib pendaftaran.');
      }
      if (!['Bersedia', 'Tidak bersedia'].includes(mediaConsent)) {
        return fail(400, 'Pilihan persetujuan dokumentasi wajib dipilih.');
      }

      // Section 6: Data Pembayaran
      const payerAccountName = cleanStr(body.payer_account_name, 120);
      const paymentAmountRaw = cleanStr(body.payment_amount, 30);
      const paymentDate = cleanStr(body.payment_date, 20);

      if (!payerAccountName) return fail(400, 'Nama pemilik rekening pengirim wajib diisi.');
      const paymentAmount = Number(paymentAmountRaw);
      if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
        return fail(400, 'Nominal pembayaran harus berupa angka valid lebih dari 0.');
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
        return fail(400, 'Tanggal pembayaran tidak valid.');
      }
      if (!req.file) {
        return fail(400, 'Bukti transfer pembayaran wajib diunggah (JPG, PNG, atau PDF, maks 10 MB).');
      }

      const insertTx = db.db.transaction(() => {
        const latestCfg = db.getAlaUltraConfig.get() || { is_open: 1 };
        const latestActive = Number(db.countActiveAlaUltraRegistrations.get()?.c || 0);
        const latestAvail = computeRegistrationAvailability(latestCfg, latestActive);
        if (!latestAvail.can_register) {
          const err = new Error('Kuota pendaftaran baru saja penuh atau ditutup oleh panitia.');
          err.status = 409;
          throw err;
        }

        const seqRow = db.getMaxAlaUltraRegSeq.get();
        const nextNum = Number(seqRow?.max_seq || 0) + 1;
        const regCode = `AAU-${String(nextNum).padStart(3, '0')}`;

        const info = db.createAlaUltraRegistration.run({
          reg_code: regCode,
          event_id: latestCfg.linked_event_id || null,
          full_name: fullName,
          birth_date: birthDate,
          gender,
          whatsapp,
          email,
          city,
          instagram,
          community,
          emergency_name: emergencyName,
          emergency_relation: emergencyRelation,
          emergency_whatsapp: emergencyWhatsapp,
          bike_type: bikeType,
          strava_profile_url: cleanStravaProfileUrl,
          strava_activity_url: cleanStravaActivityUrl,
          longest_distance_km: longestDistanceKm,
          has_ultra_experience: hasUltraExperience,
          past_events: pastEvents,
          bike_roadworthy: bikeRoadworthy,
          has_helmet_gear: hasHelmetGear,
          medical_conditions: medicalConditions,
          terms_agreed: termsAgreed,
          media_consent: mediaConsent,
          payer_account_name: payerAccountName,
          payment_amount: paymentAmount,
          payment_date: paymentDate,
          payment_proof_path: req.file.filename,
          payment_proof_original_name: cleanStr(req.file.originalname, 200),
          payment_proof_mime: cleanStr(req.file.mimetype, 100)
        });

        return db.getAlaUltraRegistrationById.get(info.lastInsertRowid);
      });

      const created = insertTx();
      const latestCfg = db.getAlaUltraConfig.get() || {};
      const rawGroupLink = cleanStr(latestCfg.wa_group_link, 500);
      const waGroupLink = isValidHttpUrl(rawGroupLink) ? rawGroupLink : null;

      return res.status(201).json({
        success: true,
        wa_group_link: waGroupLink,
        registration: {
          id: created.id,
          reg_code: created.reg_code,
          full_name: created.full_name,
          whatsapp: created.whatsapp,
          email: created.email,
          registration_status: created.registration_status,
          created_at: created.created_at
        }
      });
    } catch (err) {
      cleanupUploadedFile(req.file);
      return res.status(err.status || 500).json({ error: err.message || 'Gagal menyimpan pendaftaran.' });
    }
  });
});

// Admin Routes (Race Control)

// GET /api/admin/ala-ultra/config
adminRouter.get('/config', (_req, res) => {
  const cfg = db.getAlaUltraConfig.get() || { id: 1, is_open: 1, open_date: '2026-11-30' };
  const events = db.getAllEvents.all().map(ev => ({
    id: ev.id,
    name: ev.name,
    date: ev.date,
    active: ev.active
  }));
  res.json({
    config: {
      ...cfg,
      is_open: Number(cfg.is_open) === 1
    },
    events
  });
});

function hasBodyField(body, key) {
  return Object.prototype.hasOwnProperty.call(body || {}, key);
}

// PUT / PATCH /api/admin/ala-ultra/config
function handleUpdateConfig(req, res) {
  const body = req.body || {};
  const existing = db.getAlaUltraConfig.get() || {};

  let linkedEventId = existing.linked_event_id ?? null;
  if (hasBodyField(body, 'linked_event_id')) {
    linkedEventId = body.linked_event_id ? Number(body.linked_event_id) : null;
    if (linkedEventId) {
      const ev = db.getEventById.get(linkedEventId);
      if (!ev) return res.status(404).json({ error: 'Event CycloPon yang dipilih tidak ditemukan.' });
    }
  }

  const isOpen = hasBodyField(body, 'is_open')
    ? (body.is_open === false || body.is_open === 0 || body.is_open === '0' ? 0 : 1)
    : (Number(existing.is_open ?? 1) === 1 ? 1 : 0);

  const openDate = hasBodyField(body, 'open_date')
    ? (cleanStr(body.open_date, 20) || '2026-11-30')
    : (existing.open_date || '2026-11-30');

  let closeDate = existing.close_date ?? null;
  if (hasBodyField(body, 'close_date')) {
    closeDate = cleanStr(body.close_date, 20) || null;
    if (closeDate && !/^\d{4}-\d{2}-\d{2}$/.test(closeDate)) {
      return res.status(400).json({ error: 'Format tanggal penutupan harus YYYY-MM-DD.' });
    }
  }

  let maxQuota = existing.max_quota ?? null;
  if (hasBodyField(body, 'max_quota')) {
    if (body.max_quota !== '' && body.max_quota != null) {
      const q = Number(body.max_quota);
      if (!Number.isInteger(q) || q < 1) {
        return res.status(400).json({ error: 'Kuota maksimal harus berupa angka bulat minimal 1.' });
      }
      maxQuota = q;
    } else {
      maxQuota = null;
    }
  }

  let minStravaKm = existing.min_strava_km ?? null;
  if (hasBodyField(body, 'min_strava_km')) {
    if (body.min_strava_km !== '' && body.min_strava_km != null) {
      const km = Number(body.min_strava_km);
      if (!Number.isFinite(km) || km < 0) {
        return res.status(400).json({ error: 'Syarat minimal jarak Strava harus angka >= 0.' });
      }
      minStravaKm = km;
    } else {
      minStravaKm = null;
    }
  }

  let waGroupLink = existing.wa_group_link ?? null;
  if (hasBodyField(body, 'wa_group_link')) {
    waGroupLink = cleanStr(body.wa_group_link, 300) || null;
    if (waGroupLink && !isValidHttpUrl(waGroupLink)) {
      return res.status(400).json({ error: 'Tautan undangan grup WhatsApp harus berupa URL yang valid (https://...).' });
    }
  }

  const pickText = (key, maxLen) => (
    hasBodyField(body, key)
      ? (cleanStr(body[key], maxLen) || null)
      : (existing[key] ?? null)
  );

  db.updateAlaUltraConfig.run({
    linked_event_id: linkedEventId,
    is_open: isOpen,
    open_date: openDate,
    close_date: closeDate,
    max_quota: maxQuota,
    min_strava_km: minStravaKm,
    fee_amount: pickText('fee_amount', 100),
    bank_name: pickText('bank_name', 100),
    account_holder: pickText('account_holder', 120),
    account_number: pickText('account_number', 80),
    admin_whatsapp: pickText('admin_whatsapp', 30),
    wa_group_link: waGroupLink,
    refund_policy: pickText('refund_policy', 600),
    insurance_note: pickText('insurance_note', 600)
  });

  const updated = db.getAlaUltraConfig.get();
  res.json({
    success: true,
    config: {
      ...updated,
      is_open: Number(updated.is_open) === 1
    }
  });
}

adminRouter.put('/config', handleUpdateConfig);
adminRouter.patch('/config', handleUpdateConfig);

// GET /api/admin/ala-ultra/registrations
adminRouter.get('/registrations', (_req, res) => {
  const rows = db.getAllAlaUltraRegistrations.all();
  const summary = {
    total: rows.length,
    menunggu: rows.filter(r => r.registration_status === 'Menunggu').length,
    disetujui: rows.filter(r => r.registration_status === 'Disetujui').length,
    ditolak: rows.filter(r => r.registration_status === 'Ditolak').length,
    wa_terkirim: rows.filter(r => r.wa_invite_status === 'Terkirim').length,
    sudah_grup: rows.filter(r => r.wa_group_status === 'Sudah Bergabung').length
  };
  res.json({ summary, registrations: rows });
});

// PATCH /api/admin/ala-ultra/registrations/:id
adminRouter.patch('/registrations/:id', (req, res) => {
  const existing = db.getAlaUltraRegistrationById.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Data pendaftaran tidak ditemukan.' });

  const b = req.body || {};
  const verifyData = b.verify_data ?? existing.verify_data;
  const verifyStrava = b.verify_strava ?? existing.verify_strava;
  const verifyPayment = b.verify_payment ?? existing.verify_payment;
  const regStatus = b.registration_status ?? existing.registration_status;
  const waInvite = b.wa_invite_status ?? existing.wa_invite_status;
  const waGroup = b.wa_group_status ?? existing.wa_group_status;
  const adminNotes = b.admin_notes !== undefined ? cleanStr(b.admin_notes, 1000) : (existing.admin_notes || '');

  if (!['Pending', 'Valid'].includes(verifyData)) {
    return res.status(400).json({ error: 'Nilai Verifikasi Data tidak valid.' });
  }
  if (!['Pending', 'Valid', 'Tidak Valid'].includes(verifyStrava)) {
    return res.status(400).json({ error: 'Nilai Verifikasi Strava tidak valid.' });
  }
  if (!['Pending', 'Valid', 'Tidak Valid'].includes(verifyPayment)) {
    return res.status(400).json({ error: 'Nilai Verifikasi Pembayaran tidak valid.' });
  }
  if (!['Menunggu', 'Disetujui', 'Ditolak'].includes(regStatus)) {
    return res.status(400).json({ error: 'Nilai Status Pendaftaran tidak valid.' });
  }
  if (!['Belum Dikirim', 'Terkirim'].includes(waInvite)) {
    return res.status(400).json({ error: 'Nilai Undangan Grup WA tidak valid.' });
  }
  if (!['Belum Bergabung', 'Sudah Bergabung'].includes(waGroup)) {
    return res.status(400).json({ error: 'Nilai Status Grup WA tidak valid.' });
  }

  db.updateAlaUltraVerification.run({
    id: existing.id,
    verify_data: verifyData,
    verify_strava: verifyStrava,
    verify_payment: verifyPayment,
    registration_status: regStatus,
    wa_invite_status: waInvite,
    wa_group_status: waGroup,
    admin_notes: adminNotes
  });

  res.json({
    success: true,
    registration: db.getAlaUltraRegistrationById.get(existing.id)
  });
});

// POST /api/admin/ala-ultra/registrations/:id/sync-rider
adminRouter.post('/registrations/:id/sync-rider', (req, res) => {
  const reg = db.getAlaUltraRegistrationById.get(req.params.id);
  if (!reg) return res.status(404).json({ error: 'Data pendaftaran tidak ditemukan.' });
  if (reg.registration_status !== 'Disetujui') {
    return res.status(400).json({ error: 'Peserta hanya bisa disinkronkan ke roster event setelah statusnya DISETUJUI.' });
  }

  const cfg = db.getAlaUltraConfig.get();
  const targetEventId = Number(req.body?.event_id || cfg?.linked_event_id || reg.event_id);
  if (!targetEventId) {
    return res.status(400).json({ error: 'Pilih Event CycloPon tujuan terlebih dahulu di Pengaturan Form.' });
  }
  const event = db.getEventById.get(targetEventId);
  if (!event) return res.status(404).json({ error: 'Event CycloPon tujuan tidak ditemukan.' });

  if (reg.rider_id) {
    const existingRider = db.getRiderById.get(reg.rider_id);
    if (existingRider) {
      return res.json({ success: true, already_synced: true, rider: existingRider });
    }
  }

  const existingRiders = db.getRidersByEvent.all(targetEventId);
  const existingBibs = new Set(existingRiders.map(r => String(r.bib).toUpperCase()));
  let nextNum = existingRiders.length + 1;
  while (existingBibs.has(String(nextNum).padStart(3, '0'))) nextNum++;
  const cleanBib = String(nextNum).padStart(3, '0');

  const digits = normalizePhoneDigits(reg.whatsapp);
  const pin = digits.length >= 4 ? digits.slice(-4) : '1234';
  const color = determineColorForRole('rider', existingRiders.length);

  const info = db.createRider.run({
    event_id: targetEventId,
    bib: cleanBib,
    name: reg.full_name,
    pin,
    phone: reg.whatsapp,
    role: 'rider',
    color
  });

  const riderId = Number(info.lastInsertRowid);
  db.linkAlaUltraRider.run({ id: reg.id, event_id: targetEventId, rider_id: riderId });

  res.status(201).json({
    success: true,
    already_synced: false,
    rider: db.getRiderById.get(riderId),
    registration: db.getAlaUltraRegistrationById.get(reg.id)
  });
});

// GET /api/admin/ala-ultra/registrations/:id/proof
adminRouter.get('/registrations/:id/proof', (req, res) => {
  const reg = db.getAlaUltraRegistrationById.get(req.params.id);
  if (!reg || !reg.payment_proof_path) {
    return res.status(404).json({ error: 'Bukti transfer tidak ditemukan.' });
  }

  const filename = path.basename(reg.payment_proof_path);
  const targetPath = path.join(proofDir, filename);
  if (!targetPath.startsWith(proofDir) || !fs.existsSync(targetPath)) {
    return res.status(404).json({ error: 'Berkas bukti transfer tidak ditemukan di server.' });
  }

  if (reg.payment_proof_mime) {
    res.setHeader('Content-Type', reg.payment_proof_mime);
  }
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.sendFile(targetPath);
});

// DELETE /api/admin/ala-ultra/registrations/:id
adminRouter.delete('/registrations/:id', (req, res) => {
  const reg = db.getAlaUltraRegistrationById.get(req.params.id);
  if (!reg) return res.status(404).json({ error: 'Data pendaftaran tidak ditemukan.' });

  if (reg.payment_proof_path) {
    const filename = path.basename(reg.payment_proof_path);
    const targetPath = path.join(proofDir, filename);
    try {
      if (targetPath.startsWith(proofDir) && fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }
    } catch {}
  }

  db.deleteAlaUltraRegistration.run(reg.id);
  res.json({ success: true });
});
// GET /api/admin/ala-ultra/export.xlsx
// Formal Excel workbook: sheet "Ringkasan" (metadata + statistik) dan
// sheet "Data Peserta" (tabel lengkap, header berkelompok, freeze pane, autofilter).
adminRouter.get('/export.xlsx', (_req, res) => {
  const rows = db.getAllAlaUltraRegistrations.all().slice().reverse();
  const cfg = db.getAlaUltraConfig.get() || {};
  const linkedEvent = cfg.linked_event_id ? db.getEventById.get(cfg.linked_event_id) : null;

  const report = buildAlaUltraReport({ rows, cfg, linkedEvent, exportedAt: new Date() });
  const buffer = renderAlaUltraXlsx(report);
  const filename = `ala-ala-ultra-2027-registrations-${getJakartaDateYmd()}.xlsx`;

  res.setHeader('Content-Type', XLSX_CONTENT_TYPE);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('Cache-Control', 'no-store');
  res.end(buffer);
});

module.exports = {
  publicRouter,
  adminRouter
};
