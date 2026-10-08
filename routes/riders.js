const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const crypto  = require('crypto');
const { requireAdminAuth } = require('../lib/admin-auth');

// Protect all rider management routes with admin auth
router.use(requireAdminAuth);

// Color palette — assigned round-robin per event for regular riders
const RIDER_COLORS = [
  '#00E5FF', '#FF6B35', '#3FB950', '#F78166', '#D2A8FF',
  '#FFA657', '#79C0FF', '#56D364', '#FF7B72', '#E3B341',
  '#58A6FF', '#BC8CFF', '#FFB86C', '#50FA7B', '#FF79C6'
];

function determineColorForRole(role, existingCount) {
  const cleanRole = String(role || '').toLowerCase();
  if (cleanRole === 'sweeper') return '#F97316'; // Vibrant Sweeper Orange
  if (cleanRole === 'marshall') return '#3B82F6'; // Marshall Blue
  if (cleanRole === 'medic') return '#EF4444'; // Emergency Medic Red
  return RIDER_COLORS[existingCount % RIDER_COLORS.length];
}

function resolvePin(pin, phone) {
  if (pin && String(pin).trim().length >= 4) {
    return String(pin).trim();
  }
  if (phone) {
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length >= 4) return digits.slice(-4);
  }
  return '1234';
}

// GET /api/admin/riders/events/:id — get full rider details for admin dashboard
router.get('/events/:id', (req, res) => {
  const eventId = Number(req.params.id);
  const riders = db.getRidersByEvent.all(eventId);
  res.json(riders);
});

// GET /api/admin/riders/events/:id/template — download CSV import template
router.get('/events/:id/template', (_req, res) => {
  const csvContent = [
    'bib,nama,no_hp,peran,pin',
    '001,Budi Santoso,081234567890,rider,',
    '002,Siti Rahma,081987654321,rider,',
    'SWEEP-01,Doni Sweeper,085678901234,sweeper,1234',
    'RC-1,Agus Marshall,087890123456,marshall,1234'
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="template_riders_cyclopon.csv"');
  res.send(csvContent);
});

// POST /api/admin/riders — add rider manually (supports rider, sweeper, marshall, medic)
router.post('/', (req, res) => {
  const { event_id, bib, name, pin, phone, role, traccar_device_id } = req.body;

  if (!event_id || !bib || !name) {
    return res.status(400).json({ error: 'event_id, bib, dan name wajib diisi' });
  }

  const cleanBib = String(bib).trim().toUpperCase();
  const cleanRole = role && ['rider', 'sweeper', 'marshall', 'medic'].includes(String(role).toLowerCase())
    ? String(role).toLowerCase()
    : 'rider';

  const finalPin = resolvePin(pin, phone);
  if (finalPin.length < 4 || finalPin.length > 6) {
    return res.status(400).json({ error: 'PIN harus 4-6 digit angka' });
  }

  const existing = db.getRidersByEvent.all(Number(event_id));
  const color = determineColorForRole(cleanRole, existing.length);
  const token = crypto.randomBytes(6).toString('hex');

  try {
    const result = db.createRider.run({
      event_id:          Number(event_id),
      bib:               cleanBib,
      name:              name.trim(),
      pin:               finalPin,
      phone:             phone ? String(phone).trim() : null,
      role:              cleanRole,
      token,
      traccar_device_id: traccar_device_id ? Number(traccar_device_id) : null,
      color
    });

    const newRider = db.getRiderById.get(result.lastInsertRowid);
    res.status(201).json(newRider);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: `Nomor BIB ${cleanBib} sudah terdaftar di event ini` });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/riders/events/:id/import — bulk import riders via JSON or CSV
router.post('/events/:id/import', (req, res) => {
  const eventId = Number(req.params.id);
  const event = db.getEventById.get(eventId);
  if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' });

  let rawList = [];
  if (Array.isArray(req.body.riders)) {
    rawList = req.body.riders;
  } else if (typeof req.body.csv === 'string') {
    // Parse CSV lines
    const lines = req.body.csv.trim().split(/\r?\n/);
    if (lines.length > 1) {
      const header = lines[0].toLowerCase().split(',').map(h => h.trim());
      const bibIdx   = header.findIndex(h => h.includes('bib') || h.includes('nomor'));
      const nameIdx  = header.findIndex(h => h.includes('nam') || h.includes('rider'));
      const phoneIdx = header.findIndex(h => h.includes('hp') || h.includes('phone') || h.includes('wa'));
      const roleIdx  = header.findIndex(h => h.includes('peran') || h.includes('role') || h.includes('tipe'));
      const pinIdx   = header.findIndex(h => h.includes('pin'));

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (row.length && row[bibIdx >= 0 ? bibIdx : 0]) {
          rawList.push({
            bib:   bibIdx >= 0 ? row[bibIdx] : row[0],
            name:  nameIdx >= 0 ? row[nameIdx] : (row[1] || `Rider ${row[0]}`),
            phone: phoneIdx >= 0 ? row[phoneIdx] : null,
            role:  roleIdx >= 0 ? row[roleIdx] : 'rider',
            pin:   pinIdx >= 0 ? row[pinIdx] : null
          });
        }
      }
    }
  }

  if (!rawList.length) {
    return res.status(400).json({ error: 'Data peserta kosong atau format tidak sesuai' });
  }

  const existing = db.getRidersByEvent.all(eventId);
  const existingBibs = new Set(existing.map(r => String(r.bib).toUpperCase()));
  let nextIdx = existing.length;

  const inserted = [];
  const skipped = [];

  const importTx = db.db.transaction((items) => {
    for (const item of items) {
      const cleanBib = String(item.bib || '').trim().toUpperCase();
      if (!cleanBib || existingBibs.has(cleanBib)) {
        skipped.push({ bib: cleanBib, reason: 'BIB sudah terdaftar atau kosong' });
        continue;
      }

      const cleanRole = item.role && ['rider', 'sweeper', 'marshall', 'medic'].includes(String(item.role).toLowerCase())
        ? String(item.role).toLowerCase()
        : 'rider';
      const cleanName = String(item.name || `Rider ${cleanBib}`).trim();
      const cleanPhone = item.phone ? String(item.phone).trim() : null;
      const finalPin = resolvePin(item.pin, cleanPhone);
      const color = determineColorForRole(cleanRole, nextIdx++);
      const token = crypto.randomBytes(6).toString('hex');

      try {
        const res = db.createRider.run({
          event_id: eventId,
          bib: cleanBib,
          name: cleanName,
          pin: finalPin,
          phone: cleanPhone,
          role: cleanRole,
          token,
          traccar_device_id: item.traccar_device_id ? Number(item.traccar_device_id) : null,
          color
        });
        existingBibs.add(cleanBib);
        inserted.push({ id: res.lastInsertRowid, bib: cleanBib, name: cleanName, role: cleanRole, pin: finalPin, token });
      } catch (err) {
        skipped.push({ bib: cleanBib, reason: err.message });
      }
    }
  });

  importTx(rawList);

  res.status(201).json({
    success: true,
    total: rawList.length,
    imported: inserted.length,
    skipped: skipped.length,
    details: { inserted, skipped }
  });
});

// DELETE /api/admin/riders/:id — remove rider
router.delete('/:id', (req, res) => {
  db.deleteRider.run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
