const net = require('net');
const db = require('../db/database');
const { safeStringCompare, verifyAdminSession } = require('./admin-auth');

/**
 * Event-level access PIN.
 *
 * When an event has an access PIN, riders must supply it in addition to their
 * BIB + personal PIN before they can log in or self-register. This lets race
 * control keep an event "locked" while only inviting selected riders for a
 * trial run. Admin-issued Magic Links remain valid because the admin already
 * vouches for that rider.
 *
 * The same PIN also protects every public event dataset (riders, positions,
 * results, GPX routes and the live WebSocket stream).
 */

function isAccessPinRequired(event) {
  return !!(event && event.access_pin != null && String(event.access_pin).trim() !== '');
}

function verifyAccessPin(event, submitted) {
  if (!isAccessPinRequired(event)) return true;
  if (submitted == null) return false;
  return safeStringCompare(String(submitted).trim(), String(event.access_pin).trim());
}

/**
 * Remove the secret PIN from payloads that are served to riders / the public.
 * `access_pin_required` is safe to expose so the rider UI can ask for it.
 */
function sanitizeEvent(event) {
  if (!event || typeof event !== 'object') return event;
  const { access_pin, ...rest } = event;
  return { ...rest, access_pin_required: isAccessPinRequired(event) };
}

/**
 * Validate an admin-supplied PIN. Returns a trimmed string, or null to unlock.
 * Throws a 400 error for malformed input.
 */
function normalizeAccessPin(value) {
  if (value === null || value === undefined) return null;
  const clean = String(value).trim();
  if (!clean) return null;
  if (!/^\d{4,8}$/.test(clean)) {
    const err = new Error('PIN Akses Event harus berupa 4-8 digit angka');
    err.status = 400;
    throw err;
  }
  return clean;
}

// ── Failed attempt throttling ───────────────────────────────────────────────
// Brute-force protection for event access PINs. Keyed by client IP + event so
// one attacker cannot lock out every event, and legitimate spectators behind
// the same NAT are not affected by guesses against another event.
const FAILED_ATTEMPT_LIMIT = 10;
const FAILED_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const failedAttempts = new Map();

const failedAttemptCleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of failedAttempts.entries()) {
    if (now > entry.resetAt) failedAttempts.delete(key);
  }
}, 60 * 1000);
if (failedAttemptCleanupTimer.unref) failedAttemptCleanupTimer.unref();

function getClientIp(req) {
  if (!req) return 'unknown';
  const headers = req.headers || {};
  const cfIp = headers['cf-connecting-ip'];
  const cfRay = headers['cf-ray'];
  if (cfIp && cfRay) {
    const candidate = String(cfIp).trim();
    if (net.isIP(candidate) !== 0) {
      return candidate;
    }
  }
  return req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
}

function attemptKey(ip, eventId) {
  return `${ip}|${eventId}`;
}

function getAttemptEntry(ip, eventId) {
  const key = attemptKey(ip, eventId);
  const entry = failedAttempts.get(key);
  if (!entry) return null;
  if (Date.now() > entry.resetAt) {
    failedAttempts.delete(key);
    return null;
  }
  return entry;
}

function isThrottled(ip, eventId) {
  const entry = getAttemptEntry(ip, eventId);
  return !!(entry && entry.count >= FAILED_ATTEMPT_LIMIT);
}

function getThrottleRetryAfterSeconds(ip, eventId) {
  const entry = getAttemptEntry(ip, eventId);
  if (!entry) return 0;
  return Math.max(1, Math.ceil((entry.resetAt - Date.now()) / 1000));
}

function recordFailedAttempt(ip, eventId) {
  const key = attemptKey(ip, eventId);
  const now = Date.now();
  let entry = failedAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + FAILED_ATTEMPT_WINDOW_MS };
  }
  entry.count += 1;
  failedAttempts.set(key, entry);
  return entry;
}

function clearFailedAttempts(ip, eventId) {
  failedAttempts.delete(attemptKey(ip, eventId));
}

// ── Request helpers ─────────────────────────────────────────────────────────

function extractRequestPin(req) {
  const query = req.query || {};
  return query.pin || query.event_pin || (req.headers && req.headers['x-event-pin']) || null;
}

function hasAdminAccess(req) {
  const headerAuth = req.headers && req.headers['authorization'];
  const adminToken = (req.cookies && req.cookies.cyclopon_admin)
    || (headerAuth && String(headerAuth).replace(/^Bearer\s+/i, ''))
    || (req.headers && req.headers['x-admin-token']);
  return !!(adminToken && verifyAdminSession(adminToken));
}

function hasRiderAccess(req, eventId) {
  const token = (req.query && req.query.token)
    || (req.headers && req.headers['x-rider-token']);
  if (!token) return false;
  const cleanToken = String(token).trim();
  if (!cleanToken) return false;
  try {
    const rider = db.getRiderByToken ? db.getRiderByToken.get(cleanToken) : null;
    return !!(rider && Number(rider.event_id) === Number(eventId));
  } catch {
    return false;
  }
}

function resolveEventId(req, options) {
  if (typeof options.resolveEventId === 'function') {
    return options.resolveEventId(req);
  }
  const raw = (req.params && (req.params.id || req.params.eventId))
    || (req.query && req.query.event_id);
  if (raw === null || raw === undefined || raw === '') return null;
  return raw;
}

/**
 * Express middleware factory that enforces an event access PIN.
 *
 * Options:
 *  - resolveEventId(req): custom resolver for non-`/api/events/:id` routes.
 *  - passThroughWhenUnresolved: call next() instead of returning 400 when no
 *    event id can be resolved (used by static file guards).
 *
 * Behaviour:
 *  - Events without a PIN stay fully public.
 *  - Admin sessions bypass the event PIN.
 *  - A correct PIN clears the failed-attempt counter.
 *  - Wrong PINs are throttled (HTTP 429) after 10 failures per IP+event/15 min.
 */
function requireEventAccess(options = {}) {
  return function eventAccessMiddleware(req, res, next) {
    const eventId = resolveEventId(req, options);
    if (eventId === null || eventId === undefined || eventId === '') {
      if (options.passThroughWhenUnresolved) return next();
      return res.status(400).json({ error: 'Event ID wajib disertakan' });
    }

    const event = db.getEventById.get(eventId);
    if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' });

    req.event = event;
    if (!isAccessPinRequired(event)) return next();
    if (hasAdminAccess(req)) return next();
    if (hasRiderAccess(req, event.id)) return next();

    const submitted = extractRequestPin(req);
    const clientIp = getClientIp(req);
    if (isThrottled(clientIp, event.id)) {
      res.set('Retry-After', String(getThrottleRetryAfterSeconds(clientIp, event.id)));
      return res.status(429).json({
        error: 'Terlalu banyak percobaan PIN akses. Coba lagi beberapa menit lagi.',
        access_pin_required: true,
        event_id: event.id
      });
    }

    if (submitted != null && String(submitted).trim() !== '') {
      if (verifyAccessPin(event, submitted)) {
        clearFailedAttempts(clientIp, event.id);
        return next();
      }

      recordFailedAttempt(clientIp, event.id);
      if (isThrottled(clientIp, event.id)) {
        res.set('Retry-After', String(getThrottleRetryAfterSeconds(clientIp, event.id)));
        return res.status(429).json({
          error: 'Terlalu banyak percobaan PIN akses. Coba lagi beberapa menit lagi.',
          access_pin_required: true,
          event_id: event.id
        });
      }

      return res.status(403).json({
        error: 'PIN akses event salah. Periksa kembali PIN dari panitia.',
        access_pin_required: true,
        event_id: event.id
      });
    }

    return res.status(403).json({
      error: 'Event ini memerlukan PIN akses.',
      access_pin_required: true,
      event_id: event.id
    });
  };
}

module.exports = {
  isAccessPinRequired,
  verifyAccessPin,
  sanitizeEvent,
  normalizeAccessPin,
  requireEventAccess,
  extractRequestPin,
  hasAdminAccess,
  hasRiderAccess,
  getClientIp,
  isThrottled,
  recordFailedAttempt,
  clearFailedAttempts,
  getThrottleRetryAfterSeconds,
  FAILED_ATTEMPT_LIMIT,
  FAILED_ATTEMPT_WINDOW_MS
};
