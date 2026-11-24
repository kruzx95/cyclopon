/**
 * Shared utility: show a brief toast notification
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
function showToast(message, type = 'success') {
  // Remove existing toasts
  document.querySelectorAll('.toast').forEach(t => t.remove());

  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  document.body.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    el.style.transition = 'opacity 0.3s, transform 0.3s';
    setTimeout(() => el.remove(), 350);
  }, 3200);
}

/**
 * Escape HTML characters to prevent XSS
 * @param {string} str
 */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * SOS type metadata: friendly Indonesian labels and fallback descriptions.
 */
const SOS_TYPE_META = {
  MEDICAL: {
    icon: '🚑',
    label: 'Medis / Cedera',
    defaultMessage: 'Rider mengalami cedera atau masalah medis dan membutuhkan bantuan segera.'
  },
  CRASH: {
    icon: '💥',
    label: 'Tabrakan / Jatuh',
    defaultMessage: 'Rider mengalami tabrakan atau jatuh dan membutuhkan bantuan segera.'
  },
  MECHANICAL: {
    icon: '🚲',
    label: 'Kerusakan Sepeda',
    defaultMessage: 'Rider mengalami kerusakan sepeda dan membutuhkan bantuan mekanik.'
  },
  EVACUATION: {
    icon: '⚠️',
    label: 'Evakuasi / DNF',
    defaultMessage: 'Rider meminta evakuasi dan tidak dapat melanjutkan perjalanan.'
  }
};

/**
 * Resolve metadata for an SOS alert type.
 * @param {string} type
 * @returns {{icon: string, label: string, defaultMessage: string}}
 */
function sosTypeMeta(type) {
  const key = String(type == null ? '' : type).trim().toUpperCase();
  return SOS_TYPE_META[key] || {
    icon: '🚨',
    label: key || 'Darurat',
    defaultMessage: 'Rider mengirim sinyal darurat dan membutuhkan bantuan.'
  };
}

/**
 * Friendly label with icon, e.g. "💥 Tabrakan / Jatuh".
 * @param {string} type
 */
function sosTypeLabel(type) {
  const meta = sosTypeMeta(type);
  return `${meta.icon} ${meta.label}`;
}

/**
 * Human-readable SOS description. Falls back to a type-specific
 * explanation when the rider left the note empty or used a generic message.
 * @param {{type?: string, message?: string}} alert
 */
function sosDisplayMessage(alert) {
  const meta = sosTypeMeta(alert && alert.type);
  const raw = alert && alert.message != null ? String(alert.message).trim() : '';

  const isGeneric = !raw ||
    /^sinyal sos dari cockpit rider/i.test(raw) ||
    /^bantuan darurat(\s*\(|\s+dari)/i.test(raw) ||
    raw === '-';

  return isGeneric ? meta.defaultMessage : raw;
}

/**
 * Format a SQLite/UTC timestamp as local Indonesian time (WIB).
 * @param {string} value
 * @param {boolean} [withDate=false]
 */
function formatSosTime(value, withDate = false) {
  if (!value) return '-';
  const raw = String(value).trim();
  if (!raw) return '-';
  const iso = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const withZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`;
  const date = new Date(withZone);
  if (Number.isNaN(date.getTime())) return '-';
  try {
    return date.toLocaleString('id-ID', withDate
      ? { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
      : { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
  } catch {
    return date.toLocaleString('id-ID');
  }
}

/**
 * Wire quick-reason chips to an SOS note input. Chips toggle comma-separated reasons.
 * @param {HTMLElement|null} root
 * @param {HTMLInputElement|null} input
 */
function initSosReasonChips(root, input) {
  if (!root || !input) return;
  root.addEventListener('click', (event) => {
    const chip = event.target.closest('.sos-reason-chip');
    if (!chip) return;
    event.preventDefault();

    const reason = (chip.dataset.reason || chip.textContent || '').trim();
    if (!reason) return;

    const parts = input.value.split(',').map(p => p.trim()).filter(Boolean);
    const index = parts.findIndex(p => p.toLowerCase() === reason.toLowerCase());

    if (index >= 0) {
      parts.splice(index, 1);
      chip.classList.remove('active');
    } else {
      parts.push(reason);
      chip.classList.add('active');
    }

    input.value = parts.join(', ');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

/**
 * Load a CSS file once (idempotent)
 * @param {string} href
 */
function loadCss(href) {
  const path = String(href).split('?')[0];
  const alreadyLoaded = [...document.querySelectorAll('link[rel="stylesheet"][href]')]
    .some(tag => tag.getAttribute('href').split('?')[0] === path);
  if (!alreadyLoaded) {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  }
}

/**
 * Load a JS script once, returns Promise.
 * Scripts already present under a different cache-busting query (e.g.
 * `/js/lib/utils.js` vs `/js/lib/utils.js?v=70`) count as loaded — injecting a
 * second copy re-declares its top-level `const`s and throws.
 * @param {string} src
 */
function loadScript(src) {
  const path = String(src).split('?')[0];
  const alreadyLoaded = [...document.querySelectorAll('script[src]')]
    .some(tag => tag.getAttribute('src').split('?')[0] === path);
  if (alreadyLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(s);
  });
}

/**
 * Load multiple scripts sequentially
 * @param {string[]} srcs
 */
function loadScripts(srcs) {
  return srcs.reduce((p, src) => p.then(() => loadScript(src)), Promise.resolve());
}

/**
 * Global Admin Fetch Interceptor:
 * Ensures requests to admin endpoints always include Bearer Authorization token
 * and credentials ('include') so authentication never fails across server reboots,
 * HTTP/HTTPS transitions, or cookie restrictions.
 */
(function() {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  const _origFetch = window.fetch;
  window.fetch = async function(resource, init = {}) {
    const url = typeof resource === 'string' ? resource : (resource?.url || '');
    const isAdminEndpoint = url.startsWith('/api/admin') ||
                            url.includes('/api/events/admin') ||
                            url.includes('/api/auth/admin/session');

    const adminToken = sessionStorage.getItem('adminToken') || localStorage.getItem('adminToken');

    if (adminToken && isAdminEndpoint) {
      init = Object.assign({}, init);
      init.credentials = 'include';

      if (!init.headers) {
        init.headers = { 'Authorization': `Bearer ${adminToken}`, 'x-admin-token': adminToken };
      } else if (init.headers instanceof Headers) {
        if (!init.headers.has('Authorization')) {
          init.headers.set('Authorization', `Bearer ${adminToken}`);
        }
        if (!init.headers.has('x-admin-token')) {
          init.headers.set('x-admin-token', adminToken);
        }
      } else if (Array.isArray(init.headers)) {
        if (!init.headers.some(([k]) => k.toLowerCase() === 'authorization')) {
          init.headers.push(['Authorization', `Bearer ${adminToken}`]);
        }
        if (!init.headers.some(([k]) => k.toLowerCase() === 'x-admin-token')) {
          init.headers.push(['x-admin-token', adminToken]);
        }
      } else {
        if (!init.headers['Authorization'] && !init.headers['authorization']) {
          init.headers['Authorization'] = `Bearer ${adminToken}`;
        }
        if (!init.headers['x-admin-token'] && !init.headers['X-Admin-Token']) {
          init.headers['x-admin-token'] = adminToken;
        }
      }
    }

    const res = await _origFetch(resource, init);

    // If server responds 401 on an admin endpoint, gracefully notify user & redirect to login
    if (res.status === 401 && isAdminEndpoint && !url.includes('/api/auth/admin/login')) {
      if (window._isLoggingOut) return res;
      console.warn('[Admin Auth] Session token invalid or expired on server.');
      sessionStorage.removeItem('adminUser');
      localStorage.removeItem('adminUser');
      sessionStorage.removeItem('adminToken');
      localStorage.removeItem('adminToken');
      if (typeof window.Router !== 'undefined' && window.Router.navigate) {
        if (!window._isLoggingOut && window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin') {
          if (typeof showToast === 'function') {
            showToast('Sesi akses Panitia berakhir. Silakan login kembali.', 'warning');
          }
          window.Router.navigate('/admin');
        }
      }
    }

    return res;
  };
})();

/**
 * Normalizes raw battery readings from various GPS trackers / devices into integer percentage (0-100)
 * Handles:
 * - 0 - 100 percentage
 * - 0.0 - 1.0 fraction (e.g. 0.85 -> 85%)
 * - 2.8V - 4.5V single-cell Li-ion voltage (e.g. 3.85V -> 53%)
 * - 2500mV - 5000mV millivolts (e.g. 3850mV -> 53%)
 * - 10.5V - 15.0V vehicle 12V system (e.g. 12.4V -> 60%)
 * @param {number|string|null} raw
 * @returns {number|null}
 */
function normalizeBattery(raw) {
  if (raw == null || raw === '') return null;
  const num = Number(String(raw).replace(/%/g, '').trim());
  if (isNaN(num) || num < 0) return null;

  // Millivolts (e.g. 2500 - 5000 mV)
  if (num >= 2500 && num <= 5000) {
    const volts = num / 1000;
    return Math.max(0, Math.min(100, Math.round(((volts - 3.45) / 0.75) * 100)));
  }

  // Single cell Li-ion Voltage (e.g. 2.8V - 4.5V)
  if (num > 1.0 && num <= 5.0) {
    return Math.max(0, Math.min(100, Math.round(((num - 3.45) / 0.75) * 100)));
  }

  // 12V Lead-acid / vehicle battery system (10.5V - 15.0V)
  if (num > 5.0 && num <= 15.0) {
    return Math.max(0, Math.min(100, Math.round(((num - 11.8) / 1.0) * 100)));
  }

  // Fractional 0.0 - 1.0 (e.g. 0.85 -> 85%)
  if (num > 0 && num <= 1.0) {
    return Math.max(0, Math.min(100, Math.round(num * 100)));
  }

  // Standard percentage (0 - 100)
  if (num >= 0 && num <= 100) {
    return Math.round(num);
  }

  return null;
}

/**
 * Normalizes raw GPS speed to km/h, removing jitter, applying deadband and capping realistic limits.
 * Handles knot-to-km/h conversion and sanity bounds for cycling.
 * @param {number|string|null} rawSpeed
 * @param {boolean} [isKmh=false]
 * @returns {number} Speed in km/h rounded to 1 decimal place
 */
function normalizeSpeedKmh(rawSpeed, isKmh = false) {
  if (rawSpeed == null || rawSpeed === '') return 0;
  const num = Number(rawSpeed);
  if (isNaN(num) || num <= 0) return 0;

  // Convert knots if not already km/h
  // If raw > 70 and isKmh is false, heuristic assumes it's already km/h
  const kmh = isKmh ? num : (num > 70 ? num : num * 1.852);

  // Low-speed deadband: cycling speeds under 1.8 km/h are usually GPS noise/drift while stopped
  if (kmh < 1.8) return 0;

  // Clamp realistic cycling speed ceiling (90 km/h)
  return Math.min(90, Math.round(kmh * 10) / 10);
}

/**
 * Prompts user for Event Access PIN if event is restricted (has access_pin_required: true).
 * If already verified in sessionStorage, calls onSuccess(pin) immediately.
 * Otherwise shows a modal notifying that the event is restricted,
 * with PIN input, verifying with /api/events/:id/verify-pin.
 *
 * @param {object} event - { id, name, access_pin_required }
 * @param {function(string)} onSuccess - callback when PIN is verified
 * @param {object} [options] - { onCancel, targetName }
 */
function promptEventAccess(event, onSuccess, options = {}) {
  if (!event || !event.access_pin_required) {
    if (typeof onSuccess === 'function') onSuccess('');
    return;
  }

  const eventId = Number(event.id);
  const savedPin = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('event_pin_' + eventId) : null;
  if (savedPin && !options.forcePrompt) {
    if (typeof onSuccess === 'function') onSuccess(savedPin);
    return;
  }

  if (typeof document === 'undefined') return;

  // Remove existing modal if any
  document.getElementById('eventPinAccessModal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'eventPinAccessModal';
  modal.className = 'event-pin-modal-overlay';
  modal.innerHTML = `
    <div class="event-pin-modal-card">
      <div class="event-pin-modal-header">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:24px">🔒</span>
          <div>
            <div style="font-family:ui-monospace,monospace;font-size:10px;font-weight:800;color:#B91C1C;letter-spacing:0.06em">// EVENT DIBATASI</div>
            <h3 style="font-size:17px;font-weight:900;color:#0D1117;margin:2px 0 0;letter-spacing:-0.02em">Akses Event Terkunci</h3>
          </div>
        </div>
        <button id="btnClosePinModal" style="background:transparent;border:none;font-size:20px;cursor:pointer;color:#6B7280;padding:4px 8px;border-radius:6px;line-height:1" title="Tutup">✕</button>
      </div>

      <div class="event-pin-modal-body">
        <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:12px 14px;margin-bottom:16px;text-align:left">
          <div style="font-size:13px;color:#991B1B;font-weight:800;margin-bottom:4px">
            Event "${typeof escapeHtml === 'function' ? escapeHtml(event.name || 'Event') : (event.name || 'Event')}" dibatasi
          </div>
          <div style="font-size:12px;color:#7F1D1D;line-height:1.45">
            Event ini telah diatur dengan PIN Akses oleh panitia di <strong>Kelola Event</strong>. Silakan masukkan PIN Akses resmi untuk melanjutkan.
          </div>
        </div>

        <form id="formEventPinAccess" onsubmit="return false;">
          <div style="margin-bottom:14px;text-align:left">
            <label for="inputEventAccessPin" style="display:block;font-size:11px;font-weight:800;color:#374151;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px">PIN AKSES EVENT (4 - 8 DIGIT)</label>
            <input id="inputEventAccessPin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="Masukkan PIN dari panitia"
                   style="width:100%;box-sizing:border-box;padding:12px 14px;border:1.5px solid #0D1117;border-radius:10px;font-size:16px;font-weight:800;letter-spacing:4px;text-align:center;background:#FFF;color:#0D1117;outline:none" autofocus>
          </div>

          <div id="eventPinErrorMsg" style="color:#DC2626;font-size:12px;font-weight:700;margin-bottom:14px;min-height:16px;text-align:center"></div>

          <div style="display:flex;gap:10px">
            <button type="submit" id="btnSubmitEventPin" style="flex:1;background:#0D1117;color:#FFF;border:none;border-radius:10px;padding:12px;font-size:13px;font-weight:800;cursor:pointer;letter-spacing:0.02em;transition:background 0.2s">
              Buka Akses Event →
            </button>
            <button type="button" id="btnCancelEventPin" style="background:#FFF;border:1.5px solid #E5E7EB;border-radius:10px;padding:12px 18px;font-size:13px;font-weight:700;color:#4B5563;cursor:pointer">
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const input = document.getElementById('inputEventAccessPin');
  const errorEl = document.getElementById('eventPinErrorMsg');
  const btnSubmit = document.getElementById('btnSubmitEventPin');
  const form = document.getElementById('formEventPinAccess');

  setTimeout(() => input?.focus(), 60);

  function closeModal() {
    modal.remove();
    if (typeof options.onCancel === 'function') options.onCancel();
  }

  document.getElementById('btnClosePinModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelEventPin')?.addEventListener('click', closeModal);

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin = (input?.value || '').trim();
    if (!pin) {
      errorEl.textContent = 'Masukkan PIN Akses terlebih dahulu.';
      input?.focus();
      return;
    }

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Memverifikasi...';
    errorEl.textContent = '';

    try {
      const res = await fetch(`/api/events/${eventId}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem('event_pin_' + eventId, pin);
        if (typeof showToast === 'function') showToast('Akses event berhasil dibuka!', 'success');
        modal.remove();
        if (typeof onSuccess === 'function') onSuccess(pin);
      } else {
        errorEl.textContent = data.error || 'PIN Akses Event salah. Periksa kembali PIN dari panitia.';
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Buka Akses Event →';
        input?.focus();
        input?.select();
      }
    } catch {
      errorEl.textContent = 'Gagal menghubungi server backend.';
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Buka Akses Event →';
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    showToast,
    escapeHtml,
    SOS_TYPE_META,
    sosTypeMeta,
    sosTypeLabel,
    sosDisplayMessage,
    formatSosTime,
    initSosReasonChips,
    loadCss,
    loadScript,
    loadScripts,
    normalizeBattery,
    normalizeSpeedKmh,
    promptEventAccess
  };
}


