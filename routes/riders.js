const express = require('express');
const router  = express.Router();
const db      = require('../db/database');

// Color palette — assigned round-robin per event
const RIDER_COLORS = [
  '#00E5FF', '#FF6B35', '#3FB950', '#F78166', '#D2A8FF',
  '#FFA657', '#79C0FF', '#56D364', '#FF7B72', '#E3B341',
  '#58A6FF', '#BC8CFF', '#FFB86C', '#50FA7B', '#FF79C6'
];

// POST /api/admin/riders — add rider to event
router.post('/', (req, res) => {
  const { event_id, bib, name, pin, traccar_device_id } = req.body;

  if (!event_id || !bib || !name || !pin) {
    return res.status(400).json({ error: 'event_id, bib, name, dan pin wajib diisi' });
  }
  if (String(pin).length < 4 || String(pin).length > 6) {
    return res.status(400).json({ error: 'PIN harus 4-6 digit angka' });
  }

  // Assign color based on rider order in this event
  const existing = db.getRidersByEvent.all(event_id);
  const color    = RIDER_COLORS[existing.length % RIDER_COLORS.length];

  try {
    const result = db.createRider.run({
      event_id:          Number(event_id),
      bib:               String(bib).trim(),
      name:              name.trim(),
      pin:               String(pin).trim(),
      traccar_device_id: traccar_device_id ? Number(traccar_device_id) : null,
      color
    });
    res.status(201).json({
      id: result.lastInsertRowid,
      bib, name, color,
      traccar_device_id: traccar_device_id || null
    });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: `BIB ${bib} sudah terdaftar di event ini` });
    }
    throw err;
  }
});

// DELETE /api/admin/riders/:id — remove rider
router.delete('/:id', (req, res) => {
  db.deleteRider.run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
