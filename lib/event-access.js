const { safeStringCompare } = require('./admin-auth');

/**
 * Event-level access PIN.
 *
 * When an event has an access PIN, riders must supply it in addition to their
 * BIB + personal PIN before they can log in or self-register. This lets race
 * control keep an event "locked" while only inviting selected riders for a
 * trial run. Admin-issued Magic Links remain valid because the admin already
 * vouches for that rider.
 */

function isAccessPinRequired(event) {
  return !!(event && typeof event.access_pin === 'string' && event.access_pin.trim());
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

module.exports = {
  isAccessPinRequired,
  verifyAccessPin,
  sanitizeEvent,
  normalizeAccessPin
};
