/**
 * Direct Self Check-In Page (/cp/:token)
 * Opened when a rider scans a Checkpoint QR Poster using their phone's native camera.
 */

async function renderCpCheckinPage(params) {
  loadCss('/css/rider.css?v=95');

  const app = document.getElementById('app');
  const qrToken = params && params.token ? String(params.token).trim() : '';

  app.innerHTML = `
    <div class="cp-landing-wrapper">
      <div class="cp-landing-card">
        <div class="cp-landing-brand">
          <img src="/icons/cyclopon-mark.svg" alt="" width="24" height="24" class="brand-logo-mark">
          <span>CYCLOPON</span>
        </div>
        <div id="cpLandingBody" class="cp-landing-body">
          <div class="cp-landing-state" role="status">
            <h1 class="cp-landing-title">Memuat Data Checkpoint...</h1>
            <p class="cp-landing-sub">Memeriksa informasi pos kontrol dan sesi peserta.</p>
          </div>
        </div>
      </div>
    </div>
  `;

  const bodyEl = document.getElementById('cpLandingBody');

  if (!qrToken) {
    bodyEl.innerHTML = `
      <div class="cp-landing-state error">
        <h1 class="cp-landing-title">Kode QR Tidak Valid</h1>
        <p class="cp-landing-sub">Tautan checkpoint tidak lengkap. Scan ulang poster QR di pos kontrol.</p>
        <a href="/rider" data-link class="cp-btn-primary">Masuk ke Portal Rider</a>
      </div>
    `;
    return;
  }

  let lookup;
  try {
    const res = await fetch(`/api/checkpoints/lookup/${encodeURIComponent(qrToken)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.checkpoint || !data.event) {
      throw new Error(data.error || 'Checkpoint tidak ditemukan.');
    }
    lookup = data;
  } catch (err) {
    bodyEl.innerHTML = `
      <div class="cp-landing-state error">
        <h1 class="cp-landing-title">Checkpoint Tidak Ditemukan</h1>
        <p class="cp-landing-sub">${escapeHtml(err.message || 'Gagal memuat informasi checkpoint.')}</p>
        <div class="cp-landing-actions">
          <button type="button" id="btnRetryLookup" class="cp-btn-primary">Coba Lagi</button>
          <a href="/rider" data-link class="cp-btn-secondary">Ke Portal Rider</a>
        </div>
      </div>
    `;
    document.getElementById('btnRetryLookup')?.addEventListener('click', () => renderCpCheckinPage(params));
    return;
  }

  const { checkpoint, event } = lookup;

  function renderCheckpointHeaderHtml() {
    const radiusNote = checkpoint.requires_gps && checkpoint.radius_meters
      ? `<span>Radius GPS: <strong>${checkpoint.radius_meters >= 1000 ? (checkpoint.radius_meters / 1000).toFixed(1) + ' km' : checkpoint.radius_meters + ' m'}</strong></span>`
      : '';
    return `
      <div class="cp-summary-box">
        <div class="cp-summary-event">${escapeHtml(event.name)}</div>
        <h1 class="cp-summary-name">${escapeHtml(checkpoint.name)}</h1>
        <div class="cp-summary-meta">
          <span>Target: <strong>${checkpoint.km_distance} KM</strong></span>
          <span>Buka: <strong>${escapeHtml(checkpoint.open_time || '-')}</strong></span>
          <span>COT: <strong>${escapeHtml(checkpoint.close_time ? checkpoint.close_time + ' WIB' : '-')}</strong></span>
          ${radiusNote}
        </div>
      </div>
    `;
  }

  function formatArrivalWib(iso) {
    if (typeof window.formatWibClock === 'function') return window.formatWibClock(iso);
    return iso || '-';
  }

  function renderReceipt(data) {
    const isPendingVerify = data.split?.verification_status === 'PENDING_VERIFY';
    const isOver = data.split?.status === 'OVER_COT';
    const timeStr = formatArrivalWib(data.split?.arrival_time);
    const statusText = isPendingVerify
      ? 'MENUNGGU VERIFIKASI PANITIA'
      : (isOver ? 'MELEBIHI BATAS COT' : 'LOLOS BATAS COT');
    const heading = data.already_checked_in
      ? 'Pos Sudah Tercatat'
      : (isPendingVerify ? 'Check-In Diajukan' : 'Check-In Tercatat');

    bodyEl.innerHTML = `
      ${renderCheckpointHeaderHtml()}
      <div class="cp-receipt ${isPendingVerify || isOver ? 'is-over' : 'is-ok'}" role="status">
        <div class="cp-receipt-badge">${statusText}</div>
        <h2 class="cp-receipt-title">${heading}</h2>
        <div class="cp-receipt-grid">
          <div>
            <span class="cp-receipt-lbl">PESERTA</span>
            <strong class="cp-receipt-val">#${escapeHtml(data.rider?.bib || '')} ${escapeHtml(data.rider?.name || '')}</strong>
          </div>
          <div>
            <span class="cp-receipt-lbl">WAKTU TIBA</span>
            <strong class="cp-receipt-val">${escapeHtml(timeStr)}</strong>
          </div>
        </div>
        ${isPendingVerify ? '<p class="cp-receipt-note">Waktu tiba Anda sudah dicatat. Panitia akan meninjau posisi GPS Anda di monitor admin.</p>' : ''}
        ${data.already_checked_in ? '<p class="cp-receipt-note">Waktu check-in awal Anda tetap dipertahankan.</p>' : ''}
      </div>
      <div class="cp-landing-actions">
        <a href="/rider/cockpit" data-link class="cp-btn-primary">Buka Cockpit HUD</a>
        <a href="/rider/setup" data-link class="cp-btn-secondary">Kembali ke Rider Hub</a>
        <a href="/watch/${event.id}" data-link class="cp-btn-secondary">Lihat Live Map</a>
      </div>
    `;
  }

  async function saveRiderSessionFromToken(token) {
    if (!token) return;
    try {
      const res = await fetch(`/api/auth/token/${encodeURIComponent(token)}`);
      const authData = await res.json().catch(() => ({}));
      if (res.ok && authData.success) {
        sessionStorage.setItem('riderConfig', JSON.stringify(authData));
        localStorage.setItem('riderConfig', JSON.stringify(authData));
        if (authData.event && authData.event.access_pin) {
          sessionStorage.setItem('event_pin_' + authData.event.id, authData.event.access_pin);
        }
      }
    } catch {}
  }

  async function getBrowserGpsCoords(timeoutMs = 4500) {
    if (!('geolocation' in navigator)) return { lat: null, lng: null };
    return new Promise((resolve) => {
      let settled = false;
      const t = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve({ lat: null, lng: null });
        }
      }, timeoutMs);
      navigator.geolocation.getCurrentPosition(
        (p) => {
          if (settled) return;
          settled = true;
          clearTimeout(t);
          resolve({ lat: p.coords.latitude, lng: p.coords.longitude });
        },
        () => {
          if (settled) return;
          settled = true;
          clearTimeout(t);
          resolve({ lat: null, lng: null });
        },
        { enableHighAccuracy: true, timeout: Math.max(1500, timeoutMs - 200), maximumAge: 20000 }
      );
    });
  }

  async function submitWithSession(config, allowFlagged = false) {
    bodyEl.innerHTML = `
      ${renderCheckpointHeaderHtml()}
      <div class="cp-landing-state" role="status">
        <h2 class="cp-landing-title">${allowFlagged ? 'Mengajukan Check-In Verifikasi...' : 'Mengunci Lokasi &amp; Mencatat Check-In...'}</h2>
        <p class="cp-landing-sub">Menghubungkan peserta #${escapeHtml(config.rider.bib)} ${escapeHtml(config.rider.name)}</p>
      </div>
    `;

    try {
      const { lat, lng } = await getBrowserGpsCoords(allowFlagged ? 2000 : 4500);

      const eventPin = sessionStorage.getItem('event_pin_' + event.id) || '';
      const res = await fetch('/api/checkpoints/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.rider.token ? { 'x-rider-token': config.rider.token } : {}),
          ...(eventPin ? { 'x-event-pin': eventPin } : {})
        },
        body: JSON.stringify({
          qr_token: qrToken,
          rider_token: config.rider.token || undefined,
          lat,
          lng,
          allow_flagged: allowFlagged
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.error || 'Gagal mencatat check-in.');
        err.canSubmitFlagged = Boolean(data.can_submit_flagged);
        throw err;
      }
      renderReceipt(data);
    } catch (err) {
      bodyEl.innerHTML = `
        ${renderCheckpointHeaderHtml()}
        <div class="cp-landing-state error">
          <h2 class="cp-landing-title">Check-In Gagal</h2>
          <p class="cp-landing-sub">${escapeHtml(err.message || 'Terjadi gangguan jaringan.')}</p>
          <div class="cp-landing-actions">
            <button type="button" id="btnRetrySessionCheckin" class="cp-btn-primary">Coba Kunci GPS Lagi</button>
            ${err.canSubmitFlagged ? `
              <button type="button" id="btnSubmitFlaggedCp" class="cp-btn-primary" style="background:#966025">Ajukan Check-In (Verifikasi Panitia)</button>
            ` : ''}
            <button type="button" id="btnSwitchAccountCp" class="cp-btn-secondary">Login dengan BIB &amp; PIN</button>
          </div>
        </div>
      `;
      document.getElementById('btnRetrySessionCheckin')?.addEventListener('click', () => submitWithSession(config, false));
      document.getElementById('btnSubmitFlaggedCp')?.addEventListener('click', () => submitWithSession(config, true));
      document.getElementById('btnSwitchAccountCp')?.addEventListener('click', () => renderInlineLoginForm());
    }
  }

  function renderInlineLoginForm(mismatchNotice = '') {
    bodyEl.innerHTML = `
      ${renderCheckpointHeaderHtml()}
      ${mismatchNotice ? `<div class="cp-alert-box">${escapeHtml(mismatchNotice)}</div>` : ''}
      <form id="cpInlineCheckinForm" class="cp-inline-form">
        <p class="cp-form-intro">Masukkan nomor BIB dan PIN peserta untuk mencatat check-in di pos ini.</p>

        <div class="cp-field">
          <label for="cpCheckinBib">Nomor BIB</label>
          <input id="cpCheckinBib" class="input" type="text" placeholder="Contoh: 101" required autocomplete="off">
        </div>

        <div class="cp-field">
          <label for="cpCheckinPin">PIN Peserta</label>
          <input id="cpCheckinPin" class="input" type="password" inputmode="numeric" placeholder="4-6 digit PIN" required autocomplete="off">
        </div>

        ${event.requires_access_pin ? `
          <div class="cp-field">
            <label for="cpCheckinEventPin">PIN Akses Event</label>
            <input id="cpCheckinEventPin" class="input" type="text" placeholder="PIN dari panitia" required autocomplete="off">
          </div>
        ` : ''}

        <p id="cpInlineError" class="cp-inline-error" role="alert"></p>

        <div class="cp-landing-actions">
          <button type="submit" id="btnSubmitInlineCheckin" class="cp-btn-primary">
            Konfirmasi Check-In
          </button>
          <button type="button" id="btnSubmitInlineFlagged" class="cp-btn-primary" style="display:none;background:#966025">
            Ajukan Check-In (Verifikasi Panitia)
          </button>
        </div>
      </form>
    `;

    const form = document.getElementById('cpInlineCheckinForm');
    const inlineFlagBtn = document.getElementById('btnSubmitInlineFlagged');

    async function executeInlineCheckin(allowFlagged = false) {
      const errEl = document.getElementById('cpInlineError');
      const submitBtn = document.getElementById('btnSubmitInlineCheckin');
      errEl.textContent = '';
      submitBtn.disabled = true;
      if (inlineFlagBtn) inlineFlagBtn.disabled = true;
      submitBtn.textContent = allowFlagged ? 'Mengajukan Verifikasi...' : 'Mengunci GPS & Memproses...';

      const bib = document.getElementById('cpCheckinBib').value.trim();
      const pin = document.getElementById('cpCheckinPin').value.trim();
      const eventPinEl = document.getElementById('cpCheckinEventPin');
      const eventPin = eventPinEl ? eventPinEl.value.trim() : '';

      try {
        const { lat, lng } = await getBrowserGpsCoords(allowFlagged ? 2000 : 4500);
        const res = await fetch('/api/checkpoints/checkin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(eventPin ? { 'x-event-pin': eventPin } : {})
          },
          body: JSON.stringify({
            qr_token: qrToken,
            bib,
            pin,
            event_pin: eventPin || undefined,
            lat,
            lng,
            allow_flagged: allowFlagged
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const err = new Error(data.error || 'BIB atau PIN tidak valid.');
          err.canSubmitFlagged = Boolean(data.can_submit_flagged);
          throw err;
        }

        if (eventPin) {
          sessionStorage.setItem('event_pin_' + event.id, eventPin);
        }
        if (data.rider && data.rider.token) {
          await saveRiderSessionFromToken(data.rider.token);
        }
        renderReceipt(data);
      } catch (err) {
        errEl.textContent = err.message || 'Gagal melakukan check-in.';
        if (err.canSubmitFlagged && inlineFlagBtn) {
          inlineFlagBtn.style.display = 'inline-flex';
        }
        submitBtn.disabled = false;
        if (inlineFlagBtn) inlineFlagBtn.disabled = false;
        submitBtn.textContent = 'Konfirmasi Check-In';
      }
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      executeInlineCheckin(false);
    });
    inlineFlagBtn?.addEventListener('click', () => executeInlineCheckin(true));
  }

  if (!event.active) {
    bodyEl.innerHTML = `
      ${renderCheckpointHeaderHtml()}
      <div class="cp-landing-state error">
        <h2 class="cp-landing-title">Event Sudah Tidak Aktif</h2>
        <p class="cp-landing-sub">Pencatatan check-in mandiri ditutup karena event ini telah selesai atau diarsipkan.</p>
        <a href="/events/${event.id}/results" data-link class="cp-btn-secondary">Lihat Hasil Event</a>
      </div>
    `;
    return;
  }

  let savedConfig = null;
  try {
    const raw = sessionStorage.getItem('riderConfig') || localStorage.getItem('riderConfig');
    if (raw) savedConfig = JSON.parse(raw);
  } catch {
    savedConfig = null;
  }

  if (savedConfig && savedConfig.rider && savedConfig.event) {
    if (Number(savedConfig.event.id) === Number(event.id)) {
      await submitWithSession(savedConfig);
    } else {
      renderInlineLoginForm(
        `Perangkat ini sedang login pada event "${savedConfig.event.name}". Masukkan BIB dan PIN Anda untuk event "${event.name}".`
      );
    }
  } else {
    renderInlineLoginForm();
  }
}
