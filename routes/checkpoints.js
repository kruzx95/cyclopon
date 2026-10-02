const express = require('express');
const router  = express.Router();
const db      = require('../db/database');

// ── Checkpoints Management ──

// POST /api/events/:id/checkpoints — create checkpoint
router.post('/events/:id/checkpoints', (req, res) => {
  const event_id = Number(req.params.id);
  const { name, km_distance, open_time, close_time, latitude, longitude, order_index } = req.body;

  if (!name || km_distance == null) {
    return res.status(400).json({ error: 'name dan km_distance wajib diisi' });
  }

  const result = db.createCheckpoint.run({
    event_id,
    name:        name.trim(),
    km_distance: Number(km_distance),
    open_time:   open_time || null,
    close_time:  close_time || null,
    latitude:    latitude != null ? Number(latitude) : null,
    longitude:   longitude != null ? Number(longitude) : null,
    order_index: order_index != null ? Number(order_index) : 0
  });

  const cp = db.getCheckpointById.get(result.lastInsertRowid);
  res.status(201).json({ success: true, checkpoint: cp });
});

// GET /api/events/:id/checkpoints — list all checkpoints for event
router.get('/events/:id/checkpoints', (req, res) => {
  const event_id = Number(req.params.id);
  const cps = db.getCheckpointsByEvent.all(event_id);
  res.json(cps);
});

// DELETE /api/checkpoints/:id — remove checkpoint
router.delete('/checkpoints/:id', (req, res) => {
  const id = Number(req.params.id);
  db.deleteCheckpoint.run(id);
  res.json({ success: true });
});

// ── Rider Split Times (Audax COT) ──

// POST /api/events/:id/splits — record rider checkpoint arrival split
router.post('/events/:id/splits', (req, res) => {
  const event_id = Number(req.params.id);
  const { rider_id, checkpoint_id, arrival_time, status } = req.body;

  if (!rider_id || !checkpoint_id) {
    return res.status(400).json({ error: 'rider_id dan checkpoint_id wajib diisi' });
  }

  const timeStr = arrival_time || new Date().toISOString();
  const splitStatus = status || 'IN_TIME';

  const result = db.recordSplit.run({
    event_id,
    rider_id:      Number(rider_id),
    checkpoint_id: Number(checkpoint_id),
    arrival_time:  timeStr,
    status:        splitStatus
  });

  const split = db.getSplitById.get(result.lastInsertRowid);
  res.status(201).json({ success: true, split });
});

// GET /api/events/:id/splits — list all splits for an event
router.get('/events/:id/splits', (req, res) => {
  const event_id = Number(req.params.id);
  const splits = db.getSplitsByEvent.all(event_id);
  res.json(splits);
});

// GET /api/riders/:id/splits — list splits for a specific rider
router.get('/riders/:id/splits', (req, res) => {
  const rider_id = Number(req.params.id);
  const splits = db.getSplitsByRider.all(rider_id);
  res.json(splits);
});

module.exports = router;
