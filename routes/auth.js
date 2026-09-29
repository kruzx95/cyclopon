const express = require('express');
const router = express.Router();
const db = require('../db/database');
const fetch = require('node-fetch');

// POST /api/auth/rider — validate BIB + PIN, return Traccar config
router.post('/rider', (req, res) => {
  const { bib, pin } = req.body;
  if (!bib || !pin) {
    return res.status(400).json({ error: 'BIB dan PIN wajib diisi' });
  }

  const rider = db.getRiderByBibPin.get(String(bib).trim(), String(pin).trim());
  if (!rider) {
    return res.status(401).json({ error: 'BIB atau PIN tidak valid' });
  }

  const event = db.getEventById.get(rider.event_id);
  if (!event) {
    return res.status(404).json({ error: 'Event tidak ditemukan' });
  }

  const traccarHost = process.env.TRACCAR_HOST || 'http://localhost:8082';

  res.json({
    success: true,
    rider:  { id: rider.id, bib: rider.bib, name: rider.name, color: rider.color },
    event:  { id: event.id, name: event.name, date: event.date },
    traccar: {
      serverUrl:        traccarHost,
      osmandPort:       5055,
      deviceIdentifier: `BIB-${rider.bib}`,
      interval:         30,
    }
  });
});

// POST /api/auth/admin/login — proxy ke Traccar session
router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi' });
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

    const data = await response.json();
    res.json({ success: true, user: data });
  } catch (err) {
    res.status(503).json({ error: 'Traccar Server tidak dapat dijangkau: ' + err.message });
  }
});

// GET /api/auth/admin/session — check session validity (used by WS proxy handshake)
router.get('/admin/session', (req, res) => {
  res.json({ ok: true });
});

module.exports = router;
