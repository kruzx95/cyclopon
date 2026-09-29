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
`);

module.exports = {
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
};
