const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(path.join(dbDir, 'cyclopon.db'));

// Enable WAL mode for better concurrent reads
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000');
db.pragma('temp_store = MEMORY');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    date       TEXT NOT NULL,
    gpx_path   TEXT,
    active     INTEGER DEFAULT 1,
    access_pin TEXT,
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
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id      INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    km_distance   REAL NOT NULL,
    open_time     TEXT,
    close_time    TEXT,
    latitude      REAL,
    longitude     REAL,
    radius_meters INTEGER,
    order_index   INTEGER DEFAULT 0,
    qr_token      TEXT,
    created_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS rider_splits (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id            INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    rider_id            INTEGER NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
    checkpoint_id       INTEGER NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
    arrival_time        TEXT NOT NULL,
    status              TEXT DEFAULT 'IN_TIME',
    source              TEXT DEFAULT 'admin',
    check_in_lat        REAL,
    check_in_lng        REAL,
    distance_meters     REAL,
    verification_status TEXT DEFAULT 'VERIFIED',
    flag_reason         TEXT,
    created_at          TEXT DEFAULT (datetime('now')),
    UNIQUE(rider_id, checkpoint_id)
  );

  CREATE TABLE IF NOT EXISTS position_history (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id     INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    rider_id     INTEGER NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
    latitude     REAL NOT NULL,
    longitude    REAL NOT NULL,
    speed        REAL DEFAULT 0,
    distance_km  REAL DEFAULT 0,
    recorded_at  TEXT NOT NULL,
    created_at   TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_history_event_time ON position_history(event_id, recorded_at);
  CREATE INDEX IF NOT EXISTS idx_history_rider ON position_history(rider_id, recorded_at);
  CREATE INDEX IF NOT EXISTS idx_history_event_rider_id ON position_history(event_id, rider_id, id);

  -- Virtual COT: permanent record of riders left behind by the moving marker
  CREATE TABLE IF NOT EXISTS virtual_dnf (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id     INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    rider_id     INTEGER NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
    cot_km       REAL NOT NULL,
    rider_km     REAL,
    last_seen_at TEXT,
    status       TEXT NOT NULL DEFAULT 'ACTIVE',
    marked_at    TEXT NOT NULL DEFAULT (datetime('now')),
    voided_at    TEXT,
    void_reason  TEXT,
    UNIQUE(rider_id)
  );
  CREATE INDEX IF NOT EXISTS idx_virtual_dnf_event_status ON virtual_dnf(event_id, status);

  -- High-frequency query indexes
  CREATE INDEX IF NOT EXISTS idx_riders_traccar_device ON riders(traccar_device_id);
  CREATE INDEX IF NOT EXISTS idx_alerts_event_resolved ON alerts(event_id, resolved);
  CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);
  CREATE INDEX IF NOT EXISTS idx_checkpoints_event_km ON checkpoints(event_id, km_distance);
  CREATE INDEX IF NOT EXISTS idx_rider_splits_event ON rider_splits(event_id);

  CREATE TABLE IF NOT EXISTS sponsors (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id   INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    logo_path  TEXT NOT NULL,
    link       TEXT,
    sort_order INTEGER DEFAULT 0,
    sponsor_logo_size INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_sponsors_event ON sponsors(event_id);

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS page_views (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    path       TEXT NOT NULL,
    event_id   INTEGER,
    ip_hash    TEXT NOT NULL,
    user_agent TEXT,
    viewed_at  TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_page_views_date ON page_views(viewed_at);
  CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);
  CREATE INDEX IF NOT EXISTS idx_page_views_event ON page_views(event_id);

  CREATE TABLE IF NOT EXISTS ala_ultra_config (
    id              INTEGER PRIMARY KEY CHECK (id = 1),
    linked_event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
    is_open         INTEGER NOT NULL DEFAULT 1,
    open_date       TEXT DEFAULT '2026-11-30',
    close_date      TEXT,
    max_quota       INTEGER,
    min_strava_km   REAL,
    fee_amount      TEXT,
    bank_name       TEXT,
    account_holder  TEXT,
    account_number  TEXT,
    admin_whatsapp  TEXT,
    wa_group_link   TEXT,
    refund_policy   TEXT,
    insurance_note  TEXT,
    updated_at      TEXT DEFAULT (datetime('now'))
  );
  INSERT OR IGNORE INTO ala_ultra_config (id) VALUES (1);

  CREATE TABLE IF NOT EXISTS ala_ultra_registrations (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    reg_code                    TEXT NOT NULL UNIQUE,
    event_id                    INTEGER REFERENCES events(id) ON DELETE SET NULL,
    rider_id                    INTEGER REFERENCES riders(id) ON DELETE SET NULL,
    full_name                   TEXT NOT NULL,
    birth_date                  TEXT NOT NULL,
    gender                      TEXT NOT NULL,
    whatsapp                    TEXT NOT NULL,
    email                       TEXT NOT NULL,
    city                        TEXT NOT NULL,
    instagram                   TEXT,
    community                   TEXT,
    emergency_name              TEXT NOT NULL,
    emergency_relation          TEXT NOT NULL,
    emergency_whatsapp          TEXT NOT NULL,
    bike_type                   TEXT NOT NULL,
    strava_profile_url          TEXT NOT NULL,
    strava_activity_url         TEXT NOT NULL,
    longest_distance_km         REAL NOT NULL,
    has_ultra_experience        TEXT NOT NULL,
    past_events                 TEXT,
    bike_roadworthy             TEXT NOT NULL,
    has_helmet_gear             TEXT NOT NULL,
    medical_conditions          TEXT,
    terms_agreed                TEXT NOT NULL,
    media_consent               TEXT NOT NULL,
    payer_account_name          TEXT NOT NULL,
    payment_amount              REAL NOT NULL,
    payment_date                TEXT NOT NULL,
    payment_proof_path          TEXT NOT NULL,
    payment_proof_original_name TEXT,
    payment_proof_mime          TEXT,
    verify_data                 TEXT NOT NULL DEFAULT 'Pending',
    verify_strava               TEXT NOT NULL DEFAULT 'Pending',
    verify_payment              TEXT NOT NULL DEFAULT 'Pending',
    registration_status         TEXT NOT NULL DEFAULT 'Menunggu',
    wa_invite_status            TEXT NOT NULL DEFAULT 'Belum Dikirim',
    wa_group_status             TEXT NOT NULL DEFAULT 'Belum Bergabung',
    admin_notes                 TEXT DEFAULT '',
    created_at                  TEXT DEFAULT (datetime('now')),
    updated_at                  TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_ala_ultra_reg_status ON ala_ultra_registrations(registration_status);
  CREATE INDEX IF NOT EXISTS idx_ala_ultra_reg_wa ON ala_ultra_registrations(whatsapp);
`);

// ── Migrations for riders table (phone, token, role) ──
try { db.exec("ALTER TABLE riders ADD COLUMN phone TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE riders ADD COLUMN token TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE riders ADD COLUMN role TEXT DEFAULT 'rider';"); } catch (e) {}
try { db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_riders_token ON riders(token);"); } catch (e) {}

// ── Migrations for events table (access PIN) ──
try { db.exec("ALTER TABLE events ADD COLUMN access_pin TEXT;"); } catch (e) {}

// ── Migrations for events table (Virtual COT) ──
try { db.exec("ALTER TABLE events ADD COLUMN cot_start_time TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE events ADD COLUMN cot_start_ms INTEGER;"); } catch (e) {}
try { db.exec("ALTER TABLE events ADD COLUMN cot_pace REAL;"); } catch (e) {}
try { db.exec("ALTER TABLE events ADD COLUMN cot_mode TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE sponsors ADD COLUMN sponsor_logo_size INTEGER;"); } catch (e) {}
try { db.exec("ALTER TABLE events ADD COLUMN sponsor_strip_bg TEXT DEFAULT 'white';"); } catch (e) {}
try { db.exec("ALTER TABLE events ADD COLUMN sponsor_strip_label TEXT DEFAULT 'Didukung oleh';"); } catch (e) {}
try { db.exec("ALTER TABLE events ADD COLUMN sponsor_strip_label_color TEXT DEFAULT '#64748B';"); } catch (e) {}

// ── Migrations for checkpoints & rider_splits (Self Check-In QR & Radius) ──
try { db.exec("ALTER TABLE checkpoints ADD COLUMN qr_token TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE checkpoints ADD COLUMN radius_meters INTEGER;"); } catch (e) {}
try { db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_checkpoints_qr_token ON checkpoints(qr_token);"); } catch (e) {}
try { db.exec("ALTER TABLE rider_splits ADD COLUMN source TEXT DEFAULT 'admin';"); } catch (e) {}
try { db.exec("ALTER TABLE rider_splits ADD COLUMN check_in_lat REAL;"); } catch (e) {}
try { db.exec("ALTER TABLE rider_splits ADD COLUMN check_in_lng REAL;"); } catch (e) {}
try { db.exec("ALTER TABLE rider_splits ADD COLUMN distance_meters REAL;"); } catch (e) {}
try { db.exec("ALTER TABLE rider_splits ADD COLUMN verification_status TEXT DEFAULT 'VERIFIED';"); } catch (e) {}
try { db.exec("ALTER TABLE rider_splits ADD COLUMN flag_reason TEXT;"); } catch (e) {}

// Populate tokens for any existing riders and checkpoints that lack tokens
try {
  const crypto = require('crypto');
  const missingTokens = db.prepare("SELECT id FROM riders WHERE token IS NULL").all();
  if (missingTokens.length > 0) {
    const setToken = db.prepare("UPDATE riders SET token = ? WHERE id = ?");
    const updateTx = db.transaction((rows) => {
      for (const r of rows) setToken.run(crypto.randomBytes(6).toString('hex'), r.id);
    });
    updateTx(missingTokens);
  }
  const missingCpTokens = db.prepare("SELECT id FROM checkpoints WHERE qr_token IS NULL").all();
  if (missingCpTokens.length > 0) {
    const setCpToken = db.prepare("UPDATE checkpoints SET qr_token = ? WHERE id = ?");
    const updateCpTx = db.transaction((rows) => {
      for (const cp of rows) setCpToken.run(crypto.randomBytes(6).toString('hex'), cp.id);
    });
    updateCpTx(missingCpTokens);
  }
} catch (e) {}

const _createCheckpointStmt = db.prepare('INSERT INTO checkpoints (event_id, name, km_distance, open_time, close_time, latitude, longitude, radius_meters, order_index, qr_token) VALUES (@event_id, @name, @km_distance, @open_time, @close_time, @latitude, @longitude, @radius_meters, @order_index, @qr_token)');

const _createRiderStmt = db.prepare(`
  INSERT INTO riders (event_id, bib, name, pin, phone, token, role, traccar_device_id, color)
  VALUES (@event_id, @bib, @name, @pin, @phone, @token, @role, @traccar_device_id, @color)
`);

module.exports = {
  db,
  // Events
  getAllEvents:    db.prepare('SELECT * FROM events ORDER BY created_at DESC'),
  getEventById:   db.prepare('SELECT * FROM events WHERE id = ?'),
  createEvent:    db.prepare('INSERT INTO events (name, date) VALUES (@name, @date)'),
  updateEvent:    db.prepare('UPDATE events SET name=@name, date=@date, active=@active, sponsor_strip_bg=@sponsor_strip_bg, sponsor_strip_label=@sponsor_strip_label, sponsor_strip_label_color=@sponsor_strip_label_color WHERE id=@id'),
  updateEventAccessPin: db.prepare('UPDATE events SET access_pin=? WHERE id=?'),
  updateEventCot: db.prepare('UPDATE events SET cot_start_time=@cot_start_time, cot_start_ms=@cot_start_ms, cot_pace=@cot_pace, cot_mode=@cot_mode WHERE id=@id'),
  updateEventGpx: db.prepare('UPDATE events SET gpx_path=? WHERE id=?'),
  deleteEvent:    db.prepare('DELETE FROM events WHERE id = ?'),

  // Riders
  getRidersByEvent:          db.prepare("SELECT * FROM riders WHERE event_id = ? ORDER BY CASE WHEN role != 'rider' THEN 0 ELSE 1 END, CAST(bib AS INTEGER) ASC, bib ASC"),
  getRiderById:              db.prepare('SELECT * FROM riders WHERE id = ?'),
  getRiderByToken:           db.prepare('SELECT * FROM riders WHERE token = ?'),
  getRiderByBibPin:          db.prepare('SELECT * FROM riders WHERE bib = ? AND pin = ?'),
  getRiderByEventBibPin:     db.prepare('SELECT * FROM riders WHERE event_id = ? AND bib = ? AND pin = ?'),
  getRiderByTraccarDeviceId: db.prepare('SELECT * FROM riders WHERE traccar_device_id = ?'),
  createRider: {
    run(data) {
      const crypto = require('crypto');
      const payload = {
        event_id:          Number(data.event_id),
        bib:               String(data.bib).trim(),
        name:              String(data.name).trim(),
        pin:               String(data.pin || '1234').trim(),
        phone:             data.phone ? String(data.phone).trim() : null,
        token:             data.token ? String(data.token).trim() : crypto.randomBytes(6).toString('hex'),
        role:              data.role ? String(data.role).trim().toLowerCase() : 'rider',
        traccar_device_id: data.traccar_device_id ? Number(data.traccar_device_id) : null,
        color:             data.color || '#00E5FF'
      };
      return _createRiderStmt.run(payload);
    }
  },
  updateRiderDevice: db.prepare('UPDATE riders SET traccar_device_id = ? WHERE id = ?'),
  deleteRider:       db.prepare('DELETE FROM riders WHERE id = ?'),

  // Alerts
  createAlert:       db.prepare('INSERT INTO alerts (event_id, rider_id, type, latitude, longitude, message) VALUES (@event_id, @rider_id, @type, @latitude, @longitude, @message)'),
  getAlertById:      db.prepare('SELECT * FROM alerts WHERE id = ?'),
  getAlertsByEvent:  db.prepare('SELECT a.*, r.bib as rider_bib, r.name as rider_name, r.color as rider_color FROM alerts a LEFT JOIN riders r ON a.rider_id = r.id WHERE a.event_id = ? ORDER BY a.created_at DESC'),
  getActiveAlertsByEvent: db.prepare('SELECT a.*, r.bib as rider_bib, r.name as rider_name, r.color as rider_color FROM alerts a LEFT JOIN riders r ON a.rider_id = r.id WHERE a.event_id = ? AND a.resolved = 0 ORDER BY a.created_at DESC'),
  getAllActiveAlerts:     db.prepare('SELECT a.*, e.name as event_name, r.bib as rider_bib, r.name as rider_name, r.phone as rider_phone, r.color as rider_color FROM alerts a LEFT JOIN events e ON a.event_id = e.id LEFT JOIN riders r ON a.rider_id = r.id WHERE a.resolved = 0 ORDER BY a.created_at DESC'),
  getRecentAlerts:        db.prepare('SELECT a.*, e.name as event_name, r.bib as rider_bib, r.name as rider_name, r.phone as rider_phone, r.color as rider_color FROM alerts a LEFT JOIN events e ON a.event_id = e.id LEFT JOIN riders r ON a.rider_id = r.id ORDER BY a.created_at DESC, a.id DESC LIMIT ?'),
  resolveAlert:           db.prepare('UPDATE alerts SET resolved = 1 WHERE id = ?'),

  // Checkpoints
  createCheckpoint: {
    run(data) {
      const crypto = require('crypto');
      return _createCheckpointStmt.run({
        event_id:      Number(data.event_id),
        name:          data.name,
        km_distance:   Number(data.km_distance),
        open_time:     data.open_time || null,
        close_time:    data.close_time || null,
        latitude:      data.latitude != null ? Number(data.latitude) : null,
        longitude:     data.longitude != null ? Number(data.longitude) : null,
        radius_meters: data.radius_meters != null && Number(data.radius_meters) > 0 ? Math.round(Number(data.radius_meters)) : null,
        order_index:   data.order_index != null ? Number(data.order_index) : 0,
        qr_token:      data.qr_token ? String(data.qr_token).trim() : crypto.randomBytes(6).toString('hex')
      });
    }
  },
  updateCheckpoint:       db.prepare('UPDATE checkpoints SET name=@name, km_distance=@km_distance, open_time=@open_time, close_time=@close_time, latitude=@latitude, longitude=@longitude, radius_meters=@radius_meters WHERE id=@id AND event_id=@event_id'),
  getCheckpointById:      db.prepare('SELECT * FROM checkpoints WHERE id = ?'),
  getCheckpointByQrToken: db.prepare('SELECT * FROM checkpoints WHERE qr_token = ?'),
  getCheckpointsByEvent:  db.prepare('SELECT * FROM checkpoints WHERE event_id = ? ORDER BY km_distance ASC'),
  updateCheckpointQrToken: db.prepare('UPDATE checkpoints SET qr_token = ? WHERE id = ? AND event_id = ?'),
  deleteCheckpoint:       db.prepare('DELETE FROM checkpoints WHERE id = ?'),

  // Rider Splits (COT)
  recordSplit:                  db.prepare("INSERT INTO rider_splits (event_id, rider_id, checkpoint_id, arrival_time, status, verification_status, flag_reason) VALUES (@event_id, @rider_id, @checkpoint_id, @arrival_time, @status, 'VERIFIED', NULL) ON CONFLICT(rider_id, checkpoint_id) DO UPDATE SET arrival_time=excluded.arrival_time, status=excluded.status, verification_status='VERIFIED', flag_reason=NULL"),
  insertCheckinSplitIfAbsent:   db.prepare('INSERT OR IGNORE INTO rider_splits (event_id, rider_id, checkpoint_id, arrival_time, status, source, check_in_lat, check_in_lng, distance_meters, verification_status, flag_reason) VALUES (@event_id, @rider_id, @checkpoint_id, @arrival_time, @status, @source, @check_in_lat, @check_in_lng, @distance_meters, @verification_status, @flag_reason)'),
  approveSplit:                 db.prepare("UPDATE rider_splits SET verification_status = 'VERIFIED', flag_reason = NULL WHERE id = ? AND event_id = ?"),
  deleteSplitById:              db.prepare('DELETE FROM rider_splits WHERE id = ? AND event_id = ?'),
  getSplitById:                 db.prepare('SELECT * FROM rider_splits WHERE id = ?'),
  getSplitByRiderAndCheckpoint: db.prepare('SELECT s.*, r.bib as rider_bib, r.name as rider_name, r.color as rider_color, c.name as checkpoint_name, c.km_distance as checkpoint_km, c.close_time as checkpoint_cot FROM rider_splits s JOIN riders r ON s.rider_id = r.id JOIN checkpoints c ON s.checkpoint_id = c.id WHERE s.rider_id = ? AND s.checkpoint_id = ?'),
  getSplitsByEvent:             db.prepare('SELECT s.*, r.bib as rider_bib, r.name as rider_name, r.color as rider_color, c.name as checkpoint_name, c.km_distance as checkpoint_km, c.close_time as checkpoint_cot FROM rider_splits s JOIN riders r ON s.rider_id = r.id JOIN checkpoints c ON s.checkpoint_id = c.id WHERE s.event_id = ? ORDER BY c.km_distance ASC, s.arrival_time ASC'),
  getSplitsByRider:             db.prepare('SELECT s.*, c.name as checkpoint_name, c.km_distance as checkpoint_km, c.close_time as checkpoint_cot FROM rider_splits s JOIN checkpoints c ON s.checkpoint_id = c.id WHERE s.rider_id = ? ORDER BY c.km_distance ASC'),

  // Position History (Replay & Time Machine)
  recordPositionHistory: db.prepare('INSERT INTO position_history (event_id, rider_id, latitude, longitude, speed, distance_km, recorded_at) VALUES (@event_id, @rider_id, @latitude, @longitude, @speed, @distance_km, @recorded_at)'),
  getHistoryByEvent: db.prepare('SELECT h.*, r.bib as rider_bib, r.name as rider_name, r.color as rider_color FROM position_history h JOIN riders r ON h.rider_id = r.id WHERE h.event_id = ? ORDER BY h.recorded_at ASC'),
  getHistoryByEventAndRider: db.prepare('SELECT h.*, r.bib as rider_bib, r.name as rider_name, r.color as rider_color FROM position_history h JOIN riders r ON h.rider_id = r.id WHERE h.event_id = ? AND h.rider_id = ? ORDER BY h.recorded_at ASC'),

  // Latest position per rider (Virtual COT evaluation)
  getLatestPositionsByEvent: db.prepare(`
    SELECT h.rider_id, h.latitude, h.longitude, h.distance_km, h.recorded_at
    FROM position_history h
    JOIN (
      SELECT rider_id, MAX(id) AS max_id
      FROM position_history
      WHERE event_id = ?
      GROUP BY rider_id
    ) latest ON latest.max_id = h.id
  `),
  getNewestPositionAtByEvent: db.prepare('SELECT MAX(recorded_at) AS newest FROM position_history WHERE event_id = ?'),

  // Virtual COT DNF ledger
  insertVirtualDnf: db.prepare(`
    INSERT OR IGNORE INTO virtual_dnf (event_id, rider_id, cot_km, rider_km, last_seen_at, status)
    VALUES (@event_id, @rider_id, @cot_km, @rider_km, @last_seen_at, 'ACTIVE')
  `),
  getVirtualDnfByEvent: db.prepare('SELECT v.*, r.bib, r.name, r.color FROM virtual_dnf v JOIN riders r ON r.id = v.rider_id WHERE v.event_id = ? ORDER BY v.id ASC'),
  getActiveVirtualDnfByEvent: db.prepare("SELECT v.*, r.bib, r.name, r.color FROM virtual_dnf v JOIN riders r ON r.id = v.rider_id WHERE v.event_id = ? AND v.status = 'ACTIVE' ORDER BY v.id ASC"),
  getVirtualDnfByRider: db.prepare('SELECT * FROM virtual_dnf WHERE rider_id = ?'),
  voidVirtualDnf: db.prepare("UPDATE virtual_dnf SET status='VOID', voided_at=datetime('now'), void_reason=@reason WHERE event_id=@event_id AND rider_id=@rider_id AND status='ACTIVE'"),
  clearVirtualDnfByEvent: db.prepare("DELETE FROM virtual_dnf WHERE event_id = ? AND status != 'VOID'"),

  // Sponsors (Live Map Logo Strip)
  getSponsorsByEvent: db.prepare('SELECT id, name, logo_path, link, sort_order, sponsor_logo_size FROM sponsors WHERE event_id = ? ORDER BY sort_order ASC, id ASC'),
  getSponsorById:     db.prepare('SELECT * FROM sponsors WHERE id = ?'),
  createSponsor:      db.prepare('INSERT INTO sponsors (event_id, name, logo_path, link, sort_order, sponsor_logo_size) VALUES (@event_id, @name, @logo_path, @link, @sort_order, @sponsor_logo_size)'),
  updateSponsorOrder: db.prepare('UPDATE sponsors SET sort_order = ? WHERE id = ?'),
  updateSponsorSize:  db.prepare('UPDATE sponsors SET sponsor_logo_size = ? WHERE id = ?'),
  deleteSponsor:      db.prepare('DELETE FROM sponsors WHERE id = ?'),

  // System Settings (Notifications, etc.)
  getSetting:     db.prepare('SELECT value FROM settings WHERE key = ?'),
  setSetting:     db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'),
  getAllSettings: db.prepare('SELECT * FROM settings'),

  // Real Visitor Traffic & Analytics
  recordPageView:       db.prepare('INSERT INTO page_views (path, event_id, ip_hash, user_agent) VALUES (@path, @event_id, @ip_hash, @user_agent)'),
  getTodayPageViews:    db.prepare("SELECT COUNT(*) as total_views, COUNT(DISTINCT ip_hash) as unique_visitors FROM page_views WHERE date(viewed_at) = date('now')"),
  getAllTimePageViews:  db.prepare('SELECT COUNT(*) as total_views, COUNT(DISTINCT ip_hash) as unique_visitors FROM page_views'),
  getViewsLast7Days:    db.prepare("SELECT date(viewed_at) as date, COUNT(*) as views, COUNT(DISTINCT ip_hash) as unique_visitors FROM page_views WHERE date(viewed_at) >= date('now', '-6 days') GROUP BY date(viewed_at) ORDER BY date ASC"),
  getTopPagesToday:     db.prepare("SELECT path, COUNT(*) as views, COUNT(DISTINCT ip_hash) as unique_visitors FROM page_views WHERE date(viewed_at) = date('now') GROUP BY path ORDER BY views DESC LIMIT 5"),
  getEventViewsToday:   db.prepare("SELECT event_id, COUNT(*) as views FROM page_views WHERE event_id IS NOT NULL AND date(viewed_at) = date('now') GROUP BY event_id"),

  // ALA-ALA ULTRA 2027 Registration Config & Submissions
  getAlaUltraConfig: db.prepare('SELECT * FROM ala_ultra_config WHERE id = 1'),
  updateAlaUltraConfig: db.prepare(`
    UPDATE ala_ultra_config
    SET linked_event_id=@linked_event_id,
        is_open=@is_open,
        open_date=@open_date,
        close_date=@close_date,
        max_quota=@max_quota,
        min_strava_km=@min_strava_km,
        fee_amount=@fee_amount,
        bank_name=@bank_name,
        account_holder=@account_holder,
        account_number=@account_number,
        admin_whatsapp=@admin_whatsapp,
        wa_group_link=@wa_group_link,
        refund_policy=@refund_policy,
        insurance_note=@insurance_note,
        updated_at=datetime('now')
    WHERE id = 1
  `),
  getAllAlaUltraRegistrations: db.prepare('SELECT * FROM ala_ultra_registrations ORDER BY id DESC'),
  getAlaUltraRegistrationById: db.prepare('SELECT * FROM ala_ultra_registrations WHERE id = ?'),
  getMaxAlaUltraRegSeq: db.prepare("SELECT COALESCE(MAX(CAST(SUBSTR(reg_code, 5) AS INTEGER)), 0) as max_seq FROM ala_ultra_registrations WHERE reg_code LIKE 'AAU-%'"),
  countActiveAlaUltraRegistrations: db.prepare("SELECT COUNT(*) as c FROM ala_ultra_registrations WHERE registration_status != 'Ditolak'"),
  countApprovedAlaUltraRegistrations: db.prepare("SELECT COUNT(*) as c FROM ala_ultra_registrations WHERE registration_status = 'Disetujui'"),
  createAlaUltraRegistration: db.prepare(`
    INSERT INTO ala_ultra_registrations (
      reg_code, event_id, full_name, birth_date, gender, whatsapp, email, city, instagram, community,
      emergency_name, emergency_relation, emergency_whatsapp,
      bike_type, strava_profile_url, strava_activity_url, longest_distance_km, has_ultra_experience, past_events,
      bike_roadworthy, has_helmet_gear, medical_conditions,
      terms_agreed, media_consent,
      payer_account_name, payment_amount, payment_date, payment_proof_path, payment_proof_original_name, payment_proof_mime
    ) VALUES (
      @reg_code, @event_id, @full_name, @birth_date, @gender, @whatsapp, @email, @city, @instagram, @community,
      @emergency_name, @emergency_relation, @emergency_whatsapp,
      @bike_type, @strava_profile_url, @strava_activity_url, @longest_distance_km, @has_ultra_experience, @past_events,
      @bike_roadworthy, @has_helmet_gear, @medical_conditions,
      @terms_agreed, @media_consent,
      @payer_account_name, @payment_amount, @payment_date, @payment_proof_path, @payment_proof_original_name, @payment_proof_mime
    )
  `),
  updateAlaUltraVerification: db.prepare(`
    UPDATE ala_ultra_registrations
    SET verify_data=@verify_data,
        verify_strava=@verify_strava,
        verify_payment=@verify_payment,
        registration_status=@registration_status,
        wa_invite_status=@wa_invite_status,
        wa_group_status=@wa_group_status,
        admin_notes=@admin_notes,
        updated_at=datetime('now')
    WHERE id=@id
  `),
  linkAlaUltraRider: db.prepare("UPDATE ala_ultra_registrations SET event_id=@event_id, rider_id=@rider_id, updated_at=datetime('now') WHERE id=@id"),
  deleteAlaUltraRegistration: db.prepare('DELETE FROM ala_ultra_registrations WHERE id = ?'),
};

