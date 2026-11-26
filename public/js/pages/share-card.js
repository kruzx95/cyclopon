/**
 * /share — Ride Card Studio.
 *
 * Strictly gated to registered CycloPon event participants (rider, sweeper,
 * marshall, medic). Once verified against the server, event title and rider
 * identity are locked from server data while the uploaded GPX/TCX file is
 * parsed locally in the browser for accurate route and elevation profiles.
 */

function renderSharePage() {
  const app = document.getElementById('app');
  if (!app) return;
  if (!window.CardModel || !window.CardRenderer || !window.CardTemplates) {
    app.innerHTML = '<div class="share-page"><p class="share-status">Modul Ride Card gagal dimuat. Muat ulang halaman.</p></div>';
    return;
  }

  document.title = 'Ride Card — CycloPon Live Tracker';

  const templates = window.CardTemplates;
  const cardModel = window.CardModel;
  const renderer = window.CardRenderer;

  const ROLE_BADGES = {
    rider: '🚴 Rider',
    sweeper: '🧹 Sweeper',
    marshall: '🏍️ Marshall',
    medic: '🚑 Medis'
  };

  app.innerHTML = `
    <div class="share-page">
      <nav class="landing-nav">
        <a href="/" data-link class="brand-title">
          <img src="/icons/cyclopon-mark.svg" alt="" width="28" height="28" class="brand-logo-mark">
          <div class="brand-name-group">
            <span class="brand-name">CYCLOPON</span>
          </div>
        </a>

        <div class="nav-actions-group">
          <a href="/" data-link class="btn-guide-nav" title="Kembali ke Beranda" aria-label="Beranda">
            <span class="nav-label-full">BERANDA</span>
            <span class="nav-label-short">BERANDA</span>
          </a>

          <a href="/ala-ala-ultra" data-link class="btn-guide-nav" title="Pendaftaran Peserta ALA-ALA ULTRA 2027" aria-label="ALA-ALA ULTRA">
            <span class="nav-label-full">ALA-ALA ULTRA</span>
            <span class="nav-label-short">ALA-ALA ULTRA</span>
          </a>

          <a href="/share" data-link class="btn-guide-nav active" title="Buat Ride Card peserta event untuk media sosial" aria-label="Buat Ride Card">
            <span class="nav-label-full">RIDE CARD</span>
            <span class="nav-label-short">RIDE CARD</span>
          </a>

          <a href="/install" data-link class="btn-guide-nav" title="Tutorial Install Aplikasi PWA di HP" aria-label="Install aplikasi">
            <span class="nav-label-full">INSTALL</span>
            <span class="nav-label-short">INSTALL</span>
          </a>

          <a href="/register" data-link class="btn-register-nav" title="Daftar Menjadi Peserta Event" aria-label="Daftar">
            <span class="nav-label-full">DAFTAR</span>
            <span class="nav-label-short">DAFTAR</span>
          </a>
        </div>

        <button type="button" class="mobile-menu-btn" aria-label="Buka menu navigasi" aria-expanded="false">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </nav>

      <main class="share-main">
        <header class="share-hero">
          <span class="share-eyebrow">RIDE CARD</span>
          <h1 class="share-title">Jejak gowes jadi <span class="share-title-accent">ride card siap posting.</span></h1>
          <p class="share-lede">
            Setelah verifikasi peserta, rute atau rekaman GPS event dimuat otomatis. Anda juga bisa menggantinya dengan GPX/TCX pribadi.
          </p>
        </header>

        <div id="shareRoot"></div>
      </main>

      <!-- ── Pro Editorial Footer ── -->
      <footer class="landing-footer">
        <div class="footer-inner">
          <div class="footer-left">
            <a href="/" data-link class="footer-brand-lockup">
              <img src="/icons/cyclopon-mark.svg" alt="" width="28" height="28" class="brand-logo-mark">
              <div class="footer-brand-info">
                <span class="footer-brand-title">CYCLOPON</span>
                <span class="footer-brand-tagline">PRECISION LIVE TELEMETRY FOR CYCLING EVENTS</span>
              </div>
            </a>
          </div>

          <div class="footer-right">
            <div class="footer-meta-row">
              <span class="footer-chip">POWERED BY TRACCAR ENGINE</span>
              <span class="footer-sep">·</span>
              <span class="footer-author">CREATED BY <a href="https://www.instagram.com/kruzamidiwinata/" target="_blank" rel="noopener noreferrer" class="footer-author-link" title="Instagram @kruzamidiwinata">@KRUZAMIDIWINATA</a></span>
            </div>
            <div class="footer-copy">© 2026 CYCLOPON TELEMETRY · ALL RIGHTS RESERVED</div>
          </div>
        </div>
      </footer>
    </div>
  `;

  const rootEl = document.getElementById('shareRoot');
  const state = {
    verified: null,
    model: null,
    serverModel: null,
    serverTrackLabel: '',
    hasCustomFile: false,
    templateId: templates.CARD_TEMPLATES[0].id,
    sizeId: 'story',
    renderSeq: 0,
    controller: null,
    lastBlob: null,
    lastBlobKey: '',
    unmounted: false,
    fileName: ''
  };

  function getCachedToken() {
    try {
      const posterToken = sessionStorage.getItem('posterRiderToken');
      if (posterToken) return posterToken;
      const raw = sessionStorage.getItem('riderConfig') || localStorage.getItem('riderConfig');
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      return parsed && parsed.rider && parsed.rider.token ? String(parsed.rider.token).trim() : '';
    } catch {
      return '';
    }
  }

  async function verifyToken(token) {
    if (!token) return null;
    try {
      const res = await fetch(`/api/auth/token/${encodeURIComponent(token)}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.success && data.rider && data.event) {
        sessionStorage.setItem('posterRiderToken', data.rider.token);
        if (data.event.access_pin) {
          sessionStorage.setItem('event_pin_' + data.event.id, data.event.access_pin);
        }
        return { rider: data.rider, event: data.event };
      }
      return null;
    } catch {
      return null;
    }
  }

  function renderVerifyingState() {
    rootEl.innerHTML = `
      <div class="share-gate-wrap">
        <div class="share-gate-card">
          <h2 class="share-gate-title">Memeriksa kepesertaan event…</h2>
          <p class="share-gate-desc">Menghubungkan data peserta terdaftar dari server CycloPon.</p>
        </div>
      </div>
    `;
  }

  function renderSamplePoster() {
    const sampleCanvas = document.getElementById('shareSampleCanvas');
    if (!sampleCanvas || typeof cardModel.buildCardModelFromPoints !== 'function') return;
    try {
      const samplePoints = [
        { lat: -7.7829, lng: 110.3671, ele: 118, time: Date.parse('2026-11-15T06:00:00Z') },
        { lat: -7.7612, lng: 110.3814, ele: 146, time: Date.parse('2026-11-15T06:22:00Z') },
        { lat: -7.7345, lng: 110.4022, ele: 215, time: Date.parse('2026-11-15T06:51:00Z') },
        { lat: -7.7118, lng: 110.3910, ele: 312, time: Date.parse('2026-11-15T07:24:00Z') },
        { lat: -7.7284, lng: 110.3595, ele: 245, time: Date.parse('2026-11-15T07:58:00Z') },
        { lat: -7.7590, lng: 110.3518, ele: 162, time: Date.parse('2026-11-15T08:26:00Z') },
        { lat: -7.7829, lng: 110.3671, ele: 118, time: Date.parse('2026-11-15T08:48:00Z') }
      ];
      const sampleModel = cardModel.buildCardModelFromPoints({
        points: samplePoints,
        source: 'sample',
        title: 'Contoh Event CycloPon',
        riderName: 'CONTOH PESERTA · BIB #001 · RIDER',
        roleLabel: 'Rider'
      });
      renderer.renderActivityCard({
        canvas: sampleCanvas,
        model: sampleModel,
        templateId: templates.CARD_TEMPLATES[0].id,
        sizeId: 'portrait',
        options: { maxTiles: 0 }
      });
    } catch (err) {
      console.warn('[Share] sample poster render skipped:', err);
    }
  }

  async function renderGateView(noticeMsg = '') {
    if (state.unmounted) return;
    if (state.controller) state.controller.abort();
    state.model = null;
    state.serverModel = null;
    state.serverTrackLabel = '';
    state.hasCustomFile = false;
    state.lastBlob = null;
    state.lastBlobKey = '';
    state.fileName = '';

    const preselectEventId = new URLSearchParams(window.location.search).get('event') || '';

    rootEl.innerHTML = `
      <div class="share-gate-wrap">
        <div class="share-gate-grid">
          <div class="share-gate-card">
            <h2 class="share-gate-title">Masuk Peserta Event</h2>
            <p class="share-gate-desc">
              Pilih event dan masukkan BIB beserta PIN peserta (Rider, Sweeper, Marshall, atau Medis).
            </p>

            <form id="shareVerifyForm" class="share-gate-form">
              <div class="share-field">
                <label for="shareVerifyEvent">Pilih Event yang Diikuti</label>
                <select id="shareVerifyEvent" required>
                  <option value="">Memuat daftar event…</option>
                </select>
              </div>

              <div class="share-gate-row">
                <div class="share-field">
                  <label for="shareVerifyBib">Nomor BIB / Plat</label>
                  <input id="shareVerifyBib" type="text" maxlength="16" placeholder="001 atau SWEEP-01" autocomplete="off" autocapitalize="characters" style="text-transform:uppercase" required>
                </div>
                <div class="share-field">
                  <label for="shareVerifyPin">PIN Peserta</label>
                  <input id="shareVerifyPin" type="password" inputmode="numeric" maxlength="6" placeholder="4-6 digit PIN" autocomplete="off" required>
                </div>
              </div>

              <div class="share-field" id="shareVerifyEventPinGroup" style="display:none">
                <label for="shareVerifyEventPin">PIN Akses Event <span>dari panitia</span></label>
                <input id="shareVerifyEventPin" type="password" inputmode="numeric" maxlength="8" placeholder="PIN akses event" autocomplete="off">
              </div>

              <p class="share-gate-hint">
                PIN default peserta adalah <strong>4 digit terakhir nomor WhatsApp</strong> pendaftaran.
              </p>

              <p id="shareVerifyError" class="share-gate-error" role="alert">${escapeHtml(noticeMsg)}</p>

              <button type="submit" id="shareVerifySubmit" class="share-btn share-btn-primary">
                <span>Verifikasi &amp; Buka Studio →</span>
              </button>
            </form>

            <div class="share-gate-links">
              <span>Belum terdaftar? <a href="/register" data-link>Daftar Event</a></span>
              <span>Punya QR / Magic Link? <a href="/rider" data-link>Login Rider</a></span>
            </div>
          </div>

          <aside class="share-gate-preview" aria-label="Contoh tampilan Ride Card">
            <div class="share-stage-bar">
              <span>PRATINJAU RIDE CARD</span>
              <span class="share-stage-dim">CONTOH</span>
            </div>
            <div class="share-gate-canvas-wrap">
              <canvas id="shareSampleCanvas" width="1080" height="1350" aria-label="Contoh hasil Ride Card CycloPon"></canvas>
            </div>
            <p class="share-gate-preview-note">
              Contoh tampilan Ride Card. Jejak GPS atau rute event Anda akan dimuat otomatis setelah verifikasi.
            </p>
          </aside>
        </div>
      </div>
    `;

    renderSamplePoster();

    const eventSelect = document.getElementById('shareVerifyEvent');
    const bibInput = document.getElementById('shareVerifyBib');
    const pinInput = document.getElementById('shareVerifyPin');
    const eventPinGroup = document.getElementById('shareVerifyEventPinGroup');
    const eventPinInput = document.getElementById('shareVerifyEventPin');
    const errorEl = document.getElementById('shareVerifyError');
    const submitBtn = document.getElementById('shareVerifySubmit');
    const form = document.getElementById('shareVerifyForm');

    let events = [];
    try {
      const res = await fetch('/api/events');
      events = res.ok ? await res.json() : [];
      if (!Array.isArray(events)) events = [];
    } catch {
      events = [];
    }
    if (state.unmounted) return;

    if (events.length) {
      const hasPreselect = preselectEventId && events.some(ev => String(ev.id) === String(preselectEventId));
      eventSelect.innerHTML = events.map((ev, idx) => {
        const statusLabel = ev.active ? 'Aktif' : 'Selesai';
        const selected = hasPreselect ? String(ev.id) === String(preselectEventId) : idx === 0;
        return `<option value="${ev.id}" ${selected ? 'selected' : ''}>${escapeHtml(ev.name)} (${escapeHtml(ev.date || 'TBA')}) · ${statusLabel}</option>`;
      }).join('');
    } else {
      eventSelect.innerHTML = '<option value="">Belum ada event tersedia</option>';
      submitBtn.disabled = true;
    }

    function syncEventPinField() {
      const ev = events.find(item => String(item.id) === String(eventSelect.value));
      const required = !!(ev && ev.access_pin_required);
      eventPinGroup.style.display = required ? '' : 'none';
      if (required) {
        const saved = sessionStorage.getItem('event_pin_' + ev.id) || '';
        if (saved && !eventPinInput.value) eventPinInput.value = saved;
      } else {
        eventPinInput.value = '';
      }
    }

    eventSelect.addEventListener('change', syncEventPinField);
    syncEventPinField();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.textContent = '';

      const eventId = Number(eventSelect.value);
      const bib = bibInput.value.trim();
      const pin = pinInput.value.trim();
      const ev = events.find(item => Number(item.id) === eventId);
      const eventPin = eventPinInput.value.trim();

      if (!eventId) {
        errorEl.textContent = 'Pilih event yang diikuti terlebih dahulu.';
        return;
      }
      if (!bib) {
        errorEl.textContent = 'Masukkan nomor BIB atau plat peserta.';
        bibInput.focus();
        return;
      }
      if (pin.length < 4) {
        errorEl.textContent = 'PIN peserta minimal 4 digit.';
        pinInput.focus();
        return;
      }
      if (ev && ev.access_pin_required && !eventPin) {
        errorEl.textContent = 'Event ini dikunci panitia. Masukkan PIN Akses Event.';
        eventPinInput.focus();
        return;
      }

      const origLabel = submitBtn.querySelector('span').textContent;
      submitBtn.disabled = true;
      submitBtn.querySelector('span').textContent = 'Memverifikasi…';

      try {
        const res = await fetch('/api/auth/rider', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: eventId,
            bib,
            pin,
            event_pin: eventPin || undefined
          })
        });
        const data = await res.json().catch(() => ({}));
        if (state.unmounted) return;

        if (res.ok && data.success && data.rider && data.event) {
          sessionStorage.setItem('posterRiderToken', data.rider.token);
          if (eventPin) sessionStorage.setItem('event_pin_' + eventId, eventPin);
          state.verified = { rider: data.rider, event: data.event };
          showToast(`Terverifikasi sebagai ${data.rider.name} (#${data.rider.bib})`, 'success');
          renderStudioView();
        } else {
          errorEl.textContent = data.error || 'Peserta tidak ditemukan. Pastikan Event, Nomor BIB, dan PIN sesuai.';
          submitBtn.disabled = false;
          submitBtn.querySelector('span').textContent = origLabel;
        }
      } catch {
        if (state.unmounted) return;
        errorEl.textContent = 'Gagal terhubung ke server untuk memverifikasi peserta.';
        submitBtn.disabled = false;
        submitBtn.querySelector('span').textContent = origLabel;
      }
    });
  }

  function renderStudioView() {
    if (state.unmounted || !state.verified) return;
    const { rider, event } = state.verified;
    const meta = cardModel.formatParticipantPosterMeta(rider, event);
    const roleBadge = ROLE_BADGES[meta.roleKey] || ROLE_BADGES.rider;
    state.serverModel = null;
    state.serverTrackLabel = '';
    state.hasCustomFile = false;

    rootEl.innerHTML = `
      <div class="share-workspace">
        <section class="share-controls">
          <div class="share-verified-box">
            <div class="share-verified-top">
              <span class="share-verified-pill">✓ PESERTA TERVERIFIKASI</span>
              <span class="share-role-pill ${escapeHtml(meta.roleKey)}">${escapeHtml(roleBadge)}</span>
            </div>
            <div class="share-locked-grid">
              <div class="share-locked-item">
                <span class="share-locked-lbl">Event (terkunci)</span>
                <span class="share-locked-val">${escapeHtml(meta.title)}${meta.eventDate ? ` · ${escapeHtml(meta.eventDate)}` : ''}</span>
              </div>
              <div class="share-locked-item">
                <span class="share-locked-lbl">Identitas Peserta (terkunci)</span>
                <span class="share-locked-val">${escapeHtml(meta.riderName)}</span>
              </div>
            </div>
            <div style="display:flex;justify-content:flex-end">
              <button type="button" id="shareSwitchBtn" class="share-switch-btn">Ganti Peserta / Event</button>
            </div>
          </div>

          <div class="share-dropzone" id="shareDropzone" role="button" tabindex="0" aria-label="Unggah atau ganti dengan file GPX atau TCX pribadi">
            <input type="file" id="shareFileInput" accept=".gpx,.tcx,application/gpx+xml,application/vnd.garmin.tcx+xml" hidden>
            <span class="share-dropzone-icon" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4"/><path d="m6 10 6-6 6 6"/><path d="M4 18v2h16v-2"/></svg>
            </span>
            <p class="share-dropzone-title">Ganti dengan file GPX/TCX pribadi atau <span>pilih file</span></p>
            <p class="share-dropzone-hint" id="shareFileHint">Otomatis memakai jejak event dari server. Unggah .GPX/.TCX jika ingin pakai rekaman Strava/Garmin/Wahoo pribadi.</p>
          </div>
          <button type="button" id="shareResetTrackBtn" class="share-reset-btn" hidden>Kembali ke Trek Event</button>

          <div class="share-block">
            <span class="share-block-label">Tema</span>
            <div class="share-chips" id="shareThemeChips" role="group" aria-label="Pilih tema poster"></div>
          </div>

          <div class="share-block">
            <span class="share-block-label">Ukuran</span>
            <div class="share-chips share-chips-sizes" id="shareSizeChips" role="group" aria-label="Pilih ukuran poster"></div>
          </div>

          <div class="share-actions">
            <button type="button" id="shareDownloadBtn" class="share-btn share-btn-primary" disabled>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13"/><path d="m6 11 6 6 6-6"/><path d="M4 21h16"/></svg>
              <span>Unduh PNG</span>
            </button>
            <button type="button" id="shareShareBtn" class="share-btn share-btn-secondary" disabled>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M12 3v13"/><path d="m7 8 5-5 5 5"/></svg>
              <span>Bagikan</span>
            </button>
          </div>

          <p class="share-status" id="shareStatus" role="status">Memuat jejak gowes dari server event…</p>
          <p class="share-tip">
            Tema tanpa peta (<strong>Brutalist Mono</strong> &amp; <strong>Audax Blueprint</strong>) tetap utuh tanpa internet. Tema berpeta mengambil ubin OpenStreetMap langsung ke perangkat Anda (maks 24 ubin).
          </p>
        </section>

        <section class="share-stage">
          <div class="share-stage-bar">
            <span>PRATINJAU</span>
            <span class="share-stage-dim" id="shareStageDim">1080 × 1920</span>
          </div>
          <div class="share-canvas-frame" id="shareCanvasFrame" aria-busy="false">
            <canvas id="shareCanvas" width="1080" height="1920" aria-label="Pratinjau Ride Card"></canvas>
            <div class="share-canvas-placeholder" id="shareCanvasPlaceholder">
              <span id="shareCanvasPlaceholderText">Memuat jejak gowes dari server event…</span>
            </div>
          </div>
          <p class="share-attribution" id="shareAttribution">Peta © OpenStreetMap contributors</p>
        </section>
      </div>
    `;

    const byId = (id) => document.getElementById(id);
    const switchBtn = byId('shareSwitchBtn');
    const dropzone = byId('shareDropzone');
    const resetTrackBtn = byId('shareResetTrackBtn');
    const fileInput = byId('shareFileInput');
    const fileHint = byId('shareFileHint');
    const themeChips = byId('shareThemeChips');
    const sizeChips = byId('shareSizeChips');
    const downloadBtn = byId('shareDownloadBtn');
    const shareBtn = byId('shareShareBtn');
    const statusEl = byId('shareStatus');
    const stageDim = byId('shareStageDim');
    const frame = byId('shareCanvasFrame');
    const placeholder = byId('shareCanvasPlaceholder');
    const placeholderText = byId('shareCanvasPlaceholderText');
    const canvas = byId('shareCanvas');
    const attributionEl = byId('shareAttribution');

    function renderChips() {
      themeChips.innerHTML = templates.CARD_TEMPLATES.map(template => `
        <button type="button" class="share-chip" data-template="${template.id}"
          aria-pressed="${template.id === state.templateId}">
          <span class="share-chip-swatch" aria-hidden="true">
            <i style="background:${template.swatch[0]}"></i>
            <i style="background:${template.swatch[1]}"></i>
            <i style="background:${template.swatch[2]}"></i>
          </span>
          <span class="share-chip-text">
            <strong>${escapeHtml(template.label)}</strong>
            <em>${escapeHtml(template.tagline)}</em>
          </span>
        </button>
      `).join('');

      sizeChips.innerHTML = templates.CARD_SIZE_ORDER.map(sizeId => {
        const size = templates.getCardSize(sizeId);
        return `
          <button type="button" class="share-chip share-chip-compact" data-size="${size.id}"
            aria-pressed="${size.id === state.sizeId}">
            <span class="share-chip-text">
              <strong>${escapeHtml(size.label)}</strong>
              <em>${size.width} × ${size.height}</em>
            </span>
          </button>
        `;
      }).join('');
    }

    function updateStageMeta() {
      const size = templates.getCardSize(state.sizeId);
      stageDim.textContent = `${size.width} × ${size.height}`;
      canvas.style.aspectRatio = size.ratio;
    }

    function setBusy(busy, customMessage) {
      frame.setAttribute('aria-busy', busy ? 'true' : 'false');
      frame.classList.toggle('is-busy', busy);
      const hasModel = !!state.model;
      downloadBtn.disabled = !hasModel || busy;
      shareBtn.disabled = !hasModel || busy;
      if (busy) {
        statusEl.textContent = customMessage || 'Menyiapkan peta dan menggambar poster…';
        return;
      }
      if (!state.model) {
        statusEl.textContent = customMessage || 'Belum ada file diunggah.';
        return;
      }
      const stats = state.model.stats;
      const parts = [`${cardModel.formatDistance(stats.distanceKm)} km`];
      if (!state.model.isOfficialRoute && state.model.hasTime) {
        const duration = cardModel.formatDuration(stats.movingSec || stats.elapsedSec);
        if (duration) parts.push(duration);
      }
      if (stats.elevGainM > 0) parts.push(`${stats.elevGainM} m gain`);
      if (state.model.isOfficialRoute) parts.push('Rute event');
      statusEl.textContent = `Siap dibagikan · ${parts.join(' · ')}`;
    }

    async function drawPreview() {
      if (!state.model) return;

      if (state.controller) state.controller.abort();
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      state.controller = controller;
      const seq = ++state.renderSeq;

      updateStageMeta();
      setBusy(true);

      try {
        const result = await renderer.renderActivityCard({
          canvas,
          model: state.model,
          templateId: state.templateId,
          sizeId: state.sizeId,
          options: {
            maxTiles: 24,
            timeoutMs: 6000,
            signal: controller ? controller.signal : null
          }
        });
        if (seq !== state.renderSeq || state.unmounted) return;

        state.lastBlob = null;
        state.lastBlobKey = '';
        placeholder.classList.add('is-hidden');

        if (result.usedFallbackMap) {
          attributionEl.textContent = 'Basemap tidak tersedia. Poster memakai route art lokal.';
        } else if (result.attribution) {
          attributionEl.textContent = `Peta ${result.attribution}`;
        } else {
          attributionEl.textContent = 'Tema tanpa basemap · route art digambar dari data trek Anda.';
        }
      } catch (err) {
        if (seq !== state.renderSeq || state.unmounted) return;
        if (err && err.name === 'AbortError') return;
        showToast(err && err.message ? err.message : 'Gagal menggambar poster.', 'error');
      } finally {
        if (seq === state.renderSeq) setBusy(false);
      }
    }

    function applyServerModel(parsed, kindLabel) {
      state.model = parsed;
      state.serverModel = parsed;
      state.serverTrackLabel = kindLabel;
      state.hasCustomFile = false;
      state.fileName = kindLabel === 'history' ? 'jejak-gps-event' : 'rute-event.gpx';
      state.lastBlob = null;
      state.lastBlobKey = '';
      dropzone.classList.remove('has-file');
      resetTrackBtn.hidden = true;
      const sourceText = kindLabel === 'history' ? 'Rekaman GPS event' : 'Rute resmi event';
      fileHint.innerHTML = `<strong>${escapeHtml(sourceText)}</strong> · ${parsed.points.length.toLocaleString('id-ID')} titik · ${cardModel.formatDistance(parsed.stats.distanceKm)} km. Unggah GPX/TCX jika ingin ganti.`;
      drawPreview();
    }

    async function loadServerTrack() {
      if (state.unmounted || !state.verified) return;
      setBusy(true, 'Memuat jejak gowes dari server event…');

      const headers = {};
      if (rider.token) headers['x-rider-token'] = rider.token;
      const savedPin = sessionStorage.getItem('event_pin_' + event.id) || (event.access_pin ? String(event.access_pin) : '');
      if (savedPin) headers['x-event-pin'] = savedPin;

      // 1. Prefer rider's recorded GPS history from this event
      if (typeof cardModel.buildCardModelFromPoints === 'function') {
        try {
          const histRes = await fetch(`/api/events/${encodeURIComponent(event.id)}/history?rider_id=${encodeURIComponent(rider.id)}&limit=10000`, { headers });
          if (state.unmounted || state.hasCustomFile) return;
          if (histRes.ok) {
            const rows = await histRes.json();
            if (Array.isArray(rows) && rows.length >= 2) {
              const parsed = cardModel.buildCardModelFromPoints({
                points: rows,
                source: 'traccar',
                title: meta.title,
                riderName: meta.riderName,
                roleLabel: meta.roleLabel
              });
              applyServerModel(parsed, 'history');
              return;
            }
          }
        } catch (err) {
          console.warn('[Share] history track fallback skipped:', err);
        }
      }

      if (state.unmounted || state.hasCustomFile) return;

      // 2. Fall back to the event's official GPX route
      try {
        const gpxRes = await fetch(`/api/events/${encodeURIComponent(event.id)}/gpx/download`, { headers });
        if (state.unmounted || state.hasCustomFile) return;
        if (gpxRes.ok) {
          const gpxText = await gpxRes.text();
          if (gpxText && gpxText.trim()) {
            const parsed = cardModel.buildCardModel({
              fileName: `${event.name || 'event-route'}.gpx`,
              text: gpxText,
              title: meta.title,
              riderName: meta.riderName,
              roleLabel: meta.roleLabel,
              isOfficialRoute: true,
              eventDate: event.date || null
            });
            applyServerModel(parsed, 'gpx');
            return;
          }
        }
      } catch (err) {
        console.warn('[Share] event GPX fallback skipped:', err);
      }

      if (state.unmounted || state.hasCustomFile) return;
      placeholderText.textContent = 'Event ini belum memiliki jejak GPS atau rute GPX. Unggah file .gpx/.tcx Anda.';
      setBusy(false, 'Belum ada trek di server. Unggah file .gpx atau .tcx Anda.');
    }

    function loadFile(file) {
      if (!file || state.unmounted) return;
      if (!/\.(gpx|tcx)$/i.test(file.name || '')) {
        showToast('Format harus .gpx atau .tcx', 'error');
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        showToast('File terlalu besar (maksimal 25 MB).', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => showToast('File tidak bisa dibaca. Coba file lain.', 'error');
      reader.onload = () => {
        if (state.unmounted) return;
        try {
          const text = String(reader.result || '');
          const parsed = cardModel.buildCardModel({
            fileName: file.name,
            text,
            title: meta.title,
            riderName: meta.riderName,
            roleLabel: meta.roleLabel
          });

          state.model = parsed;
          state.hasCustomFile = true;
          state.fileName = file.name;
          state.lastBlob = null;
          state.lastBlobKey = '';

          dropzone.classList.add('has-file');
          if (state.serverModel) resetTrackBtn.hidden = false;
          fileHint.innerHTML = `<strong>${escapeHtml(file.name)}</strong> · ${parsed.points.length.toLocaleString('id-ID')} titik · ${cardModel.formatDistance(parsed.stats.distanceKm)} km`;
          drawPreview();
        } catch (err) {
          showToast(err && err.message ? err.message : 'File tidak bisa dibaca.', 'error');
          if (!state.model) {
            dropzone.classList.remove('has-file');
            setBusy(false, 'Gagal membaca file. Coba file .gpx atau .tcx lain.');
          }
        }
      };
      reader.readAsText(file);
    }

    function fileNameForExport() {
      const slug = String(meta.title || 'ride-card')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'ride-card';
      const size = templates.getCardSize(state.sizeId);
      return `CycloPon_RideCard_${slug}_${size.width}x${size.height}.png`;
    }

    async function getPngBlob() {
      if (!state.model) throw new Error('Unggah file terlebih dahulu.');
      const key = [state.templateId, state.sizeId, state.model.title, state.model.riderName, state.fileName].join('|');
      if (state.lastBlob && state.lastBlobKey === key) return state.lastBlob;
      const blob = await renderer.canvasToPngBlob(canvas);
      state.lastBlob = blob;
      state.lastBlobKey = key;
      return blob;
    }

    function downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }

    async function handleDownload() {
      if (!state.model) return;
      const label = downloadBtn.querySelector('span');
      const previousLabel = label.textContent;
      downloadBtn.disabled = true;
      label.textContent = 'Menyiapkan…';
      try {
        const blob = await getPngBlob();
        downloadBlob(blob, fileNameForExport());
        showToast('Poster PNG siap diposting 🚴', 'success');
      } catch (err) {
        showToast(err && err.message ? err.message : 'Gagal mengunduh PNG.', 'error');
      } finally {
        label.textContent = previousLabel;
        downloadBtn.disabled = !state.model;
      }
    }

    async function handleShare() {
      if (!state.model) return;
      const caption = cardModel.formatCaption(state.model);

      let blob = null;
      try {
        blob = await getPngBlob();
      } catch (err) {
        showToast(err && err.message ? err.message : 'Gagal membuat PNG.', 'error');
        return;
      }

      const filename = fileNameForExport();
      const file = typeof File !== 'undefined' ? new File([blob], filename, { type: 'image/png' }) : null;

      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: state.model.title, text: caption });
          return;
        } catch (err) {
          if (err && err.name === 'AbortError') return;
        }
      }

      if (navigator.share) {
        try {
          await navigator.share({ title: state.model.title, text: caption, url: `${window.location.origin}/share` });
          return;
        } catch (err) {
          if (err && err.name === 'AbortError') return;
        }
      }

      downloadBlob(blob, filename);
      try {
        await navigator.clipboard.writeText(caption);
        showToast('Poster diunduh & caption disalin ke clipboard.', 'success');
      } catch {
        showToast('Poster diunduh. Salin caption secara manual.', 'success');
      }
    }

    switchBtn.addEventListener('click', () => {
      sessionStorage.removeItem('posterRiderToken');
      state.verified = null;
      renderGateView();
    });

    resetTrackBtn.addEventListener('click', () => {
      if (!state.serverModel) return;
      applyServerModel(state.serverModel, state.serverTrackLabel || 'history');
    });

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        fileInput.click();
      }
    });
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      loadFile(file);
      fileInput.value = '';
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.add('is-dragging');
      });
    });
    ['dragleave', 'dragend'].forEach(eventName => {
      dropzone.addEventListener(eventName, () => dropzone.classList.remove('is-dragging'));
    });
    dropzone.addEventListener('drop', (event) => {
      event.preventDefault();
      dropzone.classList.remove('is-dragging');
      const file = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files[0] : null;
      loadFile(file);
    });

    themeChips.addEventListener('click', (event) => {
      const button = event.target.closest('[data-template]');
      if (!button) return;
      state.templateId = button.dataset.template;
      themeChips.querySelectorAll('[data-template]').forEach(chip => {
        chip.setAttribute('aria-pressed', chip === button ? 'true' : 'false');
      });
      state.lastBlob = null;
      drawPreview();
    });

    sizeChips.addEventListener('click', (event) => {
      const button = event.target.closest('[data-size]');
      if (!button) return;
      state.sizeId = button.dataset.size;
      sizeChips.querySelectorAll('[data-size]').forEach(chip => {
        chip.setAttribute('aria-pressed', chip === button ? 'true' : 'false');
      });
      state.lastBlob = null;
      drawPreview();
    });

    downloadBtn.addEventListener('click', handleDownload);
    shareBtn.addEventListener('click', handleShare);

    renderChips();
    updateStageMeta();
    loadServerTrack();
  }

  async function init() {
    const cachedToken = getCachedToken();
    if (cachedToken) {
      renderVerifyingState();
      const verified = await verifyToken(cachedToken);
      if (state.unmounted) return;
      if (verified) {
        state.verified = verified;
        renderStudioView();
        return;
      }
      sessionStorage.removeItem('posterRiderToken');
      renderGateView('Sesi peserta tidak berlaku. Silakan verifikasi ulang dengan Event, BIB, dan PIN.');
      return;
    }
    renderGateView();
  }

  if (typeof Router !== 'undefined' && typeof Router.onUnmount === 'function') {
    Router.onUnmount(() => {
      state.unmounted = true;
      if (state.controller) state.controller.abort();
      state.lastBlob = null;
    });
  }

  init();
}
