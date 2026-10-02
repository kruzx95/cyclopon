const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(path.join(dbDir, 'cyclopon.db'));

// Enable WAL mode for better concurrent reads
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    date       TEXT NOT NULL,
    gpx_path   TEXT,
    active     INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS riders (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id          INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    bib               TEXT NOT NULL,
    name              TEXT NOT NULL,
    pin               TEXT NOT NULL,
    traccar_device_id INTEGER,
    color             TEXT DEFAULT '#00E5FF',
    UNIQUE(event_id, bib)
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id   INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    rider_id   INTEGER REFERENCES riders(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,
    latitude   REAL,
    longitude  REAL,
    message    TEXT,
    resolved   INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS checkpoints (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id     INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    km_distance  REAL NOT NULL,
    open_time    TEXT,
    close_time   TEXT,
    latitude     REAL,
    longitude    REAL,
    order_index  INTEGER DEFAULT 0,
    created_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS rider_splits (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id       INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    rider_id       INTEGER NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
    checkpoint_id  INTEGER NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
    arrival_time   TEXT NOT NULL,
    status         TEXT DEFAULT 'IN_TIME',
    created_at     TEXT DEFAULT (datetime('now')),
    UNIQUE(rider_id, checkpoint_id)
  );
`);

module.exports = {
  db,
  // Events
  getAllEvents:    db.prepare('SELECT * FROM events ORDER BY created_at DESC'),
  getEventById:   db.prepare('SELECT * FROM events WHERE id = ?'),
  createEvent:    db.prepare('INSERT INTO events (name, date) VALUES (@name, @date)'),
  updateEvent:    db.prepare('UPDATE events SET name=@name, date=@date, active=@active WHERE id=@id'),
  updateEventGpx: db.prepare('UPDATE events SET gpx_path=? WHERE id=?'),

  // Riders
  getRidersByEvent:  db.prepare('SELECT * FROM riders WHERE event_id = ? ORDER BY CAST(bib AS INTEGER) ASC'),
  getRiderByBibPin:  db.prepare('SELECT * FROM riders WHERE bib = ? AND pin = ?'),
  createRider:       db.prepare('INSERT INTO riders (event_id, bib, name, pin, traccar_device_id, color) VALUES (@event_id, @bib, @name, @pin, @traccar_device_id, @color)'),
  updateRiderDevice: db.prepare('UPDATE riders SET traccar_device_id = ? WHERE id = ?'),
  deleteRider:       db.prepare('DELETE FROM riders WHERE id = ?'),

  // Alerts
  createAlert:       db.prepare('INSERT INTO alerts (event_id, rider_id, type, latitude, longitude, message) VALUES (@event_id, @rider_id, @type, @latitude, @longitude, @message)'),
  getAlertById:      db.prepare('SELECT * FROM alerts WHERE id = ?'),
  getAlertsByEvent:  db.prepare('SELECT a.*, r.bib as rider_bib, r.name as rider_name, r.color as rider_color FROM alerts a LEFT JOIN riders r ON a.rider_id = r.id WHERE a.event_id = ? ORDER BY a.created_at DESC'),
  getActiveAlertsByEvent: db.prepare('SELECT a.*, r.bib as rider_bib, r.name as rider_name, r.color as rider_color FROM alerts a LEFT JOIN riders r ON a.rider_id = r.id WHERE a.event_id = ? AND a.resolved = 0 ORDER BY a.created_at DESC'),
  resolveAlert:      db.prepare('UPDATE alerts SET resolved = 1 WHERE id = ?'),

  // Checkpoints
  createCheckpoint:      db.prepare('INSERT INTO checkpoints (event_id, name, km_distance, open_time, close_time, latitude, longitude, order_index) VALUES (@event_id, @name, @km_distance, @open_time, @close_time, @latitude, @longitude, @order_index)'),
  getCheckpointById:     db.prepare('SELECT * FROM checkpoints WHERE id = ?'),
  getCheckpointsByEvent: db.prepare('SELECT * FROM checkpoints WHERE event_id = ? ORDER BY km_distance ASC'),
  deleteCheckpoint:      db.prepare('DELETE FROM checkpoints WHERE id = ?'),

  // Rider Splits (COT)
  recordSplit:      db.prepare('INSERT INTO rider_splits (event_id, rider_id, checkpoint_id, arrival_time, status) VALUES (@event_id, @rider_id, @checkpoint_id, @arrival_time, @status) ON CONFLICT(rider_id, checkpoint_id) DO UPDATE SET arrival_time=excluded.arrival_time, status=excluded.status'),
  getSplitById:     db.prepare('SELECT * FROM rider_splits WHERE id = ?'),
  getSplitsByEvent: db.prepare('SELECT s.*, r.bib as rider_bib, r.name as rider_name, r.color as rider_color, c.name as checkpoint_name, c.km_distance as checkpoint_km, c.close_time as checkpoint_cot FROM rider_splits s JOIN riders r ON s.rider_id = r.id JOIN checkpoints c ON s.checkpoint_id = c.id WHERE s.event_id = ? ORDER BY c.km_distance ASC, s.arrival_time ASC'),
  getSplitsByRider: db.prepare('SELECT s.*, c.name as checkpoint_name, c.km_distance as checkpoint_km, c.close_time as checkpoint_cot FROM rider_splits s JOIN checkpoints c ON s.checkpoint_id = c.id WHERE s.rider_id = ? ORDER BY c.km_distance ASC'),
};
