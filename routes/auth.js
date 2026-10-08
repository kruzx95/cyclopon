const express = require('express');
const router = express.Router();
const db = require('../db/database');
const fetch = require('node-fetch');
const { generateAdminSession, verifyAdminSession } = require('../lib/admin-auth');

// Brute-force protection for 4-digit rider PIN logins
const riderLoginAttempts = new Map();
const riderCleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of riderLoginAttempts.entries()) {
    if (now - record.firstAttempt > 15 * 60 * 1000) riderLoginAttempts.delete(key);
  }
}, 5 * 60 * 1000);
if (riderCleanupTimer.unref) riderCleanupTimer.unref();

function getPublicTraccarConfig(req, rider) {
  const hostHeader = (req.headers['x-forwarded-host'] || req.headers.host || 'localhost').split(':')[0];
  const publicHost = process.env.TRACCAR_PUBLIC_HOST || process.env.DOMAIN || hostHeader;

  return {
    serverUrl:        `http://${publicHost}`,
    osmandPort:       Number(process.env.TRACCAR_OSMAND_PORT || 5055),
    deviceIdentifier: rider.traccar_device_id ? String(rider.traccar_device_id) : `BIB-${rider.bib}`,
    interval:         30,
  };
}

// POST /api/auth/rider — validate BIB + PIN (+ optional event_id), return Traccar config
router.post('/rider', (req, res) => {
  const { bib, pin, event_id } = req.body;
  if (!bib || !pin) {
    return res.status(400).json({ error: 'BIB dan PIN wajib diisi' });
  }

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
  const cleanBib = String(bib).trim();
  const cleanPin = String(pin).trim();
  const attemptKey = `${clientIp}_${cleanBib}`;

  // Check brute force failure count (max 8 failures in 15 minutes)
  const now = Date.now();
  const attemptRecord = riderLoginAttempts.get(attemptKey);
  if (attemptRecord && (now - attemptRecord.firstAttempt <= 15 * 60 * 1000) && attemptRecord.failures >= 8) {
    return res.status(429).json({
      error: 'Terlalu banyak percobaan login yang gagal. Akun dibekukan sementara selama 15 menit.'
    });
  }

  let rider = null;
  if (event_id) {
    rider = db.getRiderByEventBibPin.get(Number(event_id), cleanBib, cleanPin);
  } else {
    rider = db.getRiderByBibPin.get(cleanBib, cleanPin);
  }

  if (!rider) {
    // Record failed attempt
    if (!attemptRecord || (now - attemptRecord.firstAttempt > 15 * 60 * 1000)) {
      riderLoginAttempts.set(attemptKey, { failures: 1, firstAttempt: now });
    } else {
      attemptRecord.failures++;
    }
    return res.status(401).json({ error: 'BIB atau PIN tidak valid untuk event yang dipilih' });
  }

  // Clear any failed attempts on success
  riderLoginAttempts.delete(attemptKey);

  const event = db.getEventById.get(rider.event_id);
  if (!event) {
    return res.status(404).json({ error: 'Event tidak ditemukan' });
  }

  res.json({
    success: true,
    rider:  { id: rider.id, bib: rider.bib, name: rider.name, role: rider.role || 'rider', phone: rider.phone, color: rider.color, traccar_device_id: rider.traccar_device_id },
    event:  { id: event.id, name: event.name, date: event.date },
    traccar: getPublicTraccarConfig(req, rider)
  });
});

// GET /api/auth/token/:token — Magic Link instant login without typing BIB or PIN
router.get('/token/:token', (req, res) => {
  const { token } = req.params;
  if (!token) {
    return res.status(400).json({ error: 'Token akses wajib disertakan' });
  }

  const cleanToken = String(token).trim();
  const rider = db.getRiderByToken.get(cleanToken);
  if (!rider) {
    return res.status(404).json({ error: 'Tautan Magic Link tidak valid atau sudah kedaluwarsa' });
  }

  const event = db.getEventById.get(rider.event_id);
  if (!event) {
    return res.status(404).json({ error: 'Event untuk rider ini tidak ditemukan' });
  }

  const traccarHost = process.env.TRACCAR_HOST || 'http://localhost:8082';

  res.json({
    success: true,
    rider: {
      id: rider.id,
      bib: rider.bib,
      name: rider.name,
      role: rider.role || 'rider',
      phone: rider.phone,
      color: rider.color,
      traccar_device_id: rider.traccar_device_id
    },
    event: { id: event.id, name: event.name, date: event.date },
    traccar: getPublicTraccarConfig(req, rider)
  });
});

// Lightweight In-Memory Rate Limiter for Public Registration (30 req / minute per IP)
const registrationRateMap = new Map();
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of registrationRateMap.entries()) {
    if (now - record.resetTime > 60000) registrationRateMap.delete(ip);
  }
}, 60000);
if (cleanupInterval.unref) cleanupInterval.unref();

function registerRateLimiter(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();
  let record = registrationRateMap.get(ip);
  if (!record || now - record.resetTime > 60000) {
    record = { count: 1, resetTime: now };
    registrationRateMap.set(ip, record);
  } else {
    record.count++;
  }

  if (record.count > 30) {
    return res.status(429).json({ error: 'Terlalu banyak permintaan pendaftaran. Silakan coba lagi beberapa saat.' });
  }
  next();
}

// POST /api/auth/rider/register — On-the-spot self-registration (for walk-in riders, sweepers, marshalls)
router.post('/rider/register', registerRateLimiter, (req, res) => {
  const { event_id, bib, name, phone, pin, role } = req.body;
  if (!event_id || !bib || !name) {
    return res.status(400).json({ error: 'Event, nomor BIB, dan nama wajib diisi' });
  }

  const cleanBib = String(bib).trim().toUpperCase();
  const cleanRole = role && ['rider', 'sweeper', 'marshall', 'medic'].includes(String(role).toLowerCase())
    ? String(role).toLowerCase()
    : 'rider';

  let finalPin = pin ? String(pin).trim() : '';
  if (!finalPin || finalPin.length < 4) {
    if (phone) {
      const digits = String(phone).replace(/\D/g, '');
      finalPin = digits.slice(-4) || '1234';
    } else {
      finalPin = '1234';
    }
  }

  try {
    const existing = db.getRidersByEvent.all(Number(event_id));
    let color = '#00E5FF';
    if (cleanRole === 'sweeper') color = '#F97316';
    else if (cleanRole === 'marshall') color = '#3B82F6';
    else if (cleanRole === 'medic') color = '#EF4444';
    else {
      const RIDER_COLORS = ['#00E5FF', '#FF6B35', '#3FB950', '#F78166', '#D2A8FF', '#FFA657', '#79C0FF', '#56D364', '#FF7B72', '#E3B341'];
      color = RIDER_COLORS[existing.length % RIDER_COLORS.length];
    }

    const result = db.createRider.run({
      event_id: Number(event_id),
      bib: cleanBib,
      name: name.trim(),
      phone: phone ? String(phone).trim() : null,
      pin: finalPin,
      role: cleanRole,
      color
    });

    const newRider = db.getRiderById.get(result.lastInsertRowid);
    const event = db.getEventById.get(Number(event_id));

    res.status(201).json({
      success: true,
      rider: {
        id: newRider.id,
        bib: newRider.bib,
        name: newRider.name,
        role: newRider.role || 'rider',
        phone: newRider.phone,
        color: newRider.color,
        traccar_device_id: newRider.traccar_device_id
      },
      event: { id: event.id, name: event.name, date: event.date },
      traccar: getPublicTraccarConfig(req, newRider)
    });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: `Nomor BIB ${cleanBib} sudah terdaftar di event ini` });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/admin/login — authenticate admin (local fallback + Traccar proxy)
router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi' });
  }

  const envUser = process.env.TRACCAR_USER || 'admin';
  const envPass = process.env.TRACCAR_PASS || 'admin';

  // Support direct login using credentials from .env or default admin account
  if ((email === envUser || email === 'admin' || email === 'admin@example.com' || email === 'admin@cyclopon.local') && password === envPass) {
    const session = generateAdminSession();
    res.cookie('cyclopon_admin', session.token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    });
    return res.json({
      success: true,
      token: session.token,
      user: { id: 1, name: 'Admin CycloPon', email: envUser, administrator: true }
    });
  }

  try {
    const traccarHost = process.env.TRACCAR_HOST || 'http://localhost:8082';
    const response = await fetch(`${traccarHost}/api/session`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
    });

    if (!response.ok) {
      return res.status(401).json({ error: 'Login gagal. Periksa email/password Traccar Anda.' });
    }

    // Forward the Set-Cookie header so browser stores the Traccar session
    const cookies = response.headers.raw()['set-cookie'];
    if (cookies) res.setHeader('Set-Cookie', cookies);

    const session = generateAdminSession();
    res.cookie('cyclopon_admin', session.token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    });

    const data = await response.json();
    res.json({ success: true, token: session.token, user: data });
  } catch (err) {
    res.status(503).json({ error: 'Traccar Server tidak dapat dijangkau. Gunakan login dev: admin / admin' });
  }
});

// GET /api/auth/admin/session — check session validity
router.get('/admin/session', (req, res) => {
  const cookieToken = req.cookies?.cyclopon_admin;
  const isValid = cookieToken ? verifyAdminSession(cookieToken) : false;
  res.json({ ok: isValid });
});

// POST /api/auth/admin/logout — clear admin session
router.post('/admin/logout', (_req, res) => {
  res.clearCookie('cyclopon_admin', { path: '/' });
  res.json({ success: true });
});

module.exports = router;
