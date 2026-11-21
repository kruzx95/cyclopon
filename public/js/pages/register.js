/**
 * CycloPon Fast-Track Public Rider Registration & Traccar Auto-Setup Page (/register)
 * Zero-friction onboarding: Name + WhatsApp -> Auto BIB -> Traccar 1-Click / QR Auto-Config.
 */

async function renderRegisterPage(params) {
  const app = document.getElementById('app');
  document.title = 'Daftar Event — CycloPon Live Tracker';

  app.innerHTML = `
    <div class="register-page">
      <!-- ── Pro Editorial Top Navigation Bar ── -->
      <nav class="landing-nav">
        <a href="/" data-link class="brand-title">
          <div class="brand-name-group">
            <span class="brand-name">CYCLOPON</span>
            <span class="brand-spec-label">// PENDAFTARAN PESERTA</span>
          </div>
        </a>

        <div class="nav-actions-group">
          <a href="/guide" data-link class="btn-guide-nav" title="Panduan Lengkap Pengguna &amp; Pesepeda" aria-label="Panduan pengguna">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
            <span class="nav-label-full">PANDUAN</span>
          </a>

          <a href="/login" data-link class="btn-login-nav" title="Login Cockpit Rider" aria-label="Login rider">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
              <polyline points="10 17 15 12 10 7"></polyline>
              <line x1="15" y1="12" x2="3" y2="12"></line>
            </svg>
            <span class="nav-label-full">LOGIN RIDER</span>
            <span class="nav-label-short">LOGIN</span>
          </a>
        </div>
      </nav>

      <div class="register-container">
        <!-- Hero Section -->
        <div class="register-hero">
          <div class="register-hero-tag">⚡ PENDAFTARAN PESERTA INSTAN</div>
          <h1 class="register-hero-title">Gabung &amp; Pantau <span>Live di Peta</span></h1>
          <p class="register-hero-lead register-hero-desc">
            Cukup masukkan nama &amp; nomor WhatsApp. Nomor BIB diterbitkan otomatis, dan aplikasi Traccar Client ponsel Anda langsung siap disetting dalam 1 klik.
          </p>
        </div>

        <!-- Success Result Card (Hidden by default) -->
        <div id="regSuccessCard" class="reg-success-card" style="display:none">
          <div class="reg-success-banner">
            <div class="success-header-badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              PENDAFTARAN RESMI BERHASIL
            </div>
            <h2 class="reg-success-title">Selamat Bergabung di Lintasan!</h2>
            <p class="reg-success-subtitle">Simpan BIB Anda dan hubungkan GPS Traccar Client di ponsel agar posisi langsung muncul di Live Map publik.</p>
          </div>
          
          <!-- Official Race Bib Ticket Pass -->
          <div class="ticket-pass">
            <div class="ticket-pass-header">
              <div class="ticket-event-tag">
                <span class="ticket-event-icon">🏁</span>
                <span class="ticket-event-label" id="resEventLabel">Nama Event</span>
              </div>
              <span class="ticket-role-badge rider" id="resRoleBadge">PESERTA</span>
            </div>

            <div class="ticket-pass-body">
              <div class="ticket-rider-info">
                <span class="ticket-bib-label">NOMOR DADA RESMI (BIB)</span>
                <div class="ticket-bib-big" id="resBibBig">#---</div>
                <div class="ticket-name-big" id="resNameBig">Nama Rider</div>
              </div>

              <div class="ticket-pin-card">
                <div class="ticket-pin-head">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <span>PIN AKSES COCKPIT</span>
                </div>
                <div class="ticket-pin-val" id="resPinBig">----</div>
                <div class="ticket-pin-hint">4 digit terakhir nomor WA</div>
              </div>
            </div>

            <div class="ticket-pass-footer">
              <span class="ticket-watermark">CYCLOPON OFFICIAL TELEMETRY ACCREDITED</span>
              <span class="ticket-status-pill">✓ STATUS TERVERIFIKASI</span>
            </div>
          </div>

          <!-- Traccar Auto-Setup Hub -->
          <div class="traccar-setup-box">
            <div class="traccar-setup-header">
              <div class="traccar-setup-icon">📱</div>
              <div>
                <div class="traccar-setup-title">Hubungkan GPS Traccar Client Ponsel</div>
                <div class="traccar-setup-desc">
                  Pilih salah satu metode cepat di bawah untuk mengisi konfigurasi Traccar tanpa mengetik manual:
                </div>
              </div>
            </div>

            <!-- Interval Selector -->
            <div class="interval-section">
              <div class="interval-header">
                <span class="interval-label">INTERVAL PENGIRIMAN GPS</span>
                <span class="interval-rec-tag">Disarankan: 45s</span>
              </div>
              <div class="interval-grid">
                <button type="button" class="interval-pill-btn active" data-interval="45">
                  <span class="interval-btn-sec">⚡ 45 Detik</span>
                  <span class="interval-btn-desc">Standar Endurance (Hemat Baterai)</span>
                </button>
                <button type="button" class="interval-pill-btn" data-interval="30">
                  <span class="interval-btn-sec">🚴 30 Detik</span>
                  <span class="interval-btn-desc">Sedang</span>
                </button>
                <button type="button" class="interval-pill-btn" data-interval="15">
                  <span class="interval-btn-sec">🔋 15 Detik</span>
                  <span class="interval-btn-desc">Balap Sprint</span>
                </button>
              </div>
            </div>

            <!-- Method 1: 1-Click Launch Traccar -->
            <div class="setup-method-block">
              <div class="setup-method-label">
                <span class="method-step-num">1</span> METODE TERCEPAT (1-KLIK)
              </div>
              <a id="btnTraccarDeepLink" href="#" class="btn-launch-traccar" target="_blank" rel="noopener noreferrer">
                <span class="btn-launch-icon">⚡</span>
                <div class="btn-launch-text">
                  <div class="btn-launch-main">Buka &amp; Setting Otomatis di Traccar Client</div>
                  <div class="btn-launch-sub">Langsung membuka aplikasi &amp; mengonfigurasi Server URL + Device ID</div>
                </div>
              </a>
            </div>

            <!-- Method 2: Scan QR Barcode -->
            <div class="setup-method-block">
              <div class="setup-method-label">
                <span class="method-step-num">2</span> ATAU SCAN QR DARI APLIKASI TRACCAR
              </div>
              <div class="qr-scan-card">
                <div class="qr-code-graphic" id="traccarQrGraphic">
                  <!-- SVG QR will be rendered here -->
                </div>
                <div class="qr-instructions">
                  <div class="qr-step-item">
                    <span class="qr-step-badge">1</span>
                    <span>Buka aplikasi <strong>Traccar Client</strong> di ponsel Anda.</span>
                  </div>
                  <div class="qr-step-item">
                    <span class="qr-step-badge">2</span>
                    <span>Buka menu <strong>Settings</strong> → ketuk ikon <strong>QR / Barcode</strong> di kanan atas.</span>
                  </div>
                  <div class="qr-step-item">
                    <span class="qr-step-badge">3</span>
                    <span>Arahkan kamera ke QR Code di samping. Pengaturan otomatis terisi!</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Method 3: Manual Copy Fallback -->
            <div class="setup-method-block" style="margin-bottom:0">
              <div class="setup-method-label">
                <span class="method-step-num">3</span> ATAU SALIN PARAMETER MANUAL
              </div>
              <div class="manual-param-list">
                <div class="param-copy-chip">
                  <div class="param-info-col">
                    <div class="param-label">SERVER URL</div>
                    <div class="param-value" id="valServerUrl">https://...</div>
                  </div>
                  <button type="button" class="btn-copy-chip" id="btnCopyServerUrl" title="Salin URL">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Salin
                  </button>
                </div>
                <div class="param-copy-chip">
                  <div class="param-info-col">
                    <div class="param-label">DEVICE IDENTIFIER (BIB)</div>
                    <div class="param-value" id="valDeviceIdentifier">---</div>
                  </div>
                  <button type="button" class="btn-copy-chip" id="btnCopyDeviceId" title="Salin BIB">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Salin
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="reg-success-actions">
            <a id="btnGoLiveMap" href="#" data-link class="btn-action-map">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
                <line x1="8" y1="2" x2="8" y2="18"></line>
                <line x1="16" y1="6" x2="16" y2="22"></line>
              </svg>
              Buka Peta Live Event
            </a>
            <button type="button" id="btnRegisterAnother" class="btn-action-another">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Daftarkan Rider Lain
            </button>
          </div>
        </div>

        <!-- Registration Form Card -->
        <div id="regFormCard" class="register-card">
          <div class="form-section-title">
            <span>📝</span> Formulir Pendaftaran Rider
          </div>

          <form id="riderRegForm" autocomplete="off">
            <!-- Event Selection -->
            <div class="form-group-reg">
              <label class="form-label-reg" for="regEventSelect">
                Pilih Event <span class="req">*</span>
              </label>
              <div class="reg-field-wrap">
                <span class="reg-field-icon">🏁</span>
                <select id="regEventSelect" class="form-select-reg" required>
                  <option value="">Memuat daftar event...</option>
                </select>
                <span class="reg-select-chevron">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </span>
              </div>
            </div>

            <!-- Rider Name -->
            <div class="form-group-reg">
              <label class="form-label-reg" for="regName">
                Nama Lengkap Peserta <span class="req">*</span>
                <span class="hint">(Sesuai KTP / Nama Panggilan Komunitas)</span>
              </label>
              <div class="reg-field-wrap">
                <span class="reg-field-icon">👤</span>
                <input type="text" id="regName" class="form-input-reg" placeholder="Contoh: Budi Santoso" required maxlength="60">
              </div>
            </div>

            <!-- WhatsApp Phone -->
            <div class="form-group-reg">
              <label class="form-label-reg" for="regPhone">
                Nomor WhatsApp / HP <span class="req">*</span>
                <span class="hint">(Untuk konfirmasi panitia &amp; 4-digit PIN)</span>
              </label>
              <div class="reg-field-wrap">
                <span class="reg-field-icon">📱</span>
                <input type="tel" id="regPhone" class="form-input-reg" placeholder="Contoh: 081234567890" required pattern="[0-9+ -]{9,16}">
              </div>
            </div>

            <!-- Optional Role Selection -->
            <div class="form-group-reg" style="margin-bottom:20px">
              <label class="form-label-reg" for="regRole">
                Kategori Keikutsertaan
              </label>
              <div class="reg-field-wrap">
                <span class="reg-field-icon">🚴</span>
                <select id="regRole" class="form-select-reg">
                  <option value="rider" selected>Peserta Balap / Touring (Rider)</option>
                  <option value="sweeper">🧹 Official Sweeper (Penyapu Belakang)</option>
                  <option value="marshall">🛡️ Race Marshall (Petugas Lintasan)</option>
                  <option value="medic">🚑 Tim Medis / Evakuasi</option>
                </select>
                <span class="reg-select-chevron">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </span>
              </div>
            </div>

            <!-- Privacy Guarantee Banner -->
            <div class="privacy-notice">
              <span style="font-size:16px">🔒</span>
              <span><strong>Jaminan Privasi:</strong> Nomor WhatsApp Anda dirahasiakan dan <strong>tidak akan ditampilkan di daftar publik</strong>. Hanya digunakan panitia untuk keperluan briefing atau darurat event.</span>
            </div>

            <!-- Error Banner -->
            <div id="regErrMsg" style="display:none;background:#FEE2E2;border:1.5px solid #F87171;color:#991B1B;padding:10px 14px;border-radius:8px;font-size:13px;font-weight:700;margin-bottom:18px"></div>

            <!-- Submit Button -->
            <button type="submit" id="btnSubmitReg" class="btn-submit-reg">
              <span>⚡</span> DAFTAR EVENT SEKARANG →
            </button>
          </form>
        </div>

        <!-- Public Roster Section -->
        <div class="roster-section">
          <div class="roster-header-row">
            <h2 class="roster-title">
              <span>📋</span> Daftar Peserta Terdaftar
              <span class="roster-count-badge" id="rosterCountBadge">0 Rider</span>
            </h2>
            <div class="roster-search-box">
              <span class="roster-search-icon">🔍</span>
              <input type="text" id="rosterSearchInput" class="roster-search-input" placeholder="Cari nama atau nomor BIB...">
            </div>
          </div>

          <div class="roster-table-wrap">
            <table class="roster-table">
              <thead>
                <tr>
                  <th style="width:75px">No. BIB</th>
                  <th>Nama Peserta</th>
                  <th style="width:110px">Kategori</th>
                  <th style="width:95px;text-align:center">Status</th>
                </tr>
              </thead>
              <tbody id="rosterTableBody">
                <tr>
                  <td colspan="4" style="text-align:center;padding:24px;color:#64748B">
                    Memuat daftar peserta...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ── Pro Editorial Footer (Identical with Beranda) ── -->
      <footer class="landing-footer">
        <div class="footer-inner">
          <div class="footer-left">
            <a href="/" data-link class="footer-brand-lockup">
              <div class="footer-brand-info">
                <span class="footer-brand-title">CYCLOPON</span>
                <span class="footer-brand-tagline">ULTRA-ENDURANCE CYCLING LIVE TELEMETRY</span>
              </div>
            </a>
          </div>

          <div class="footer-right">
            <div class="footer-meta-row">
              <span class="footer-spec-badge">OPEN PROTOCOL 5055</span>
              <span class="footer-dot">·</span>
              <span class="footer-author">ENGINEERED BY RUSHAMIDIWINATA</span>
            </div>
            <div class="footer-copy">
              <span>© 2026 CYCLOPON · REAL-TIME GPS TRACKING ENGINE</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  `;

  // ── Safe HTML Escape Helper ──
  const escapeHtml = window.escapeHtml || function(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // ── State Variables ──
  let allEvents = [];
  let currentEventId = null;
  let currentRiders = [];
  let registeredRiderData = null;
  let currentInterval = 45;

  // ── Elements ──
  const eventSelect = document.getElementById('regEventSelect');
  const regForm = document.getElementById('riderRegForm');
  const btnSubmit = document.getElementById('btnSubmitReg');
  const errMsg = document.getElementById('regErrMsg');
  const successCard = document.getElementById('regSuccessCard');
  const formCard = document.getElementById('regFormCard');
  const rosterBody = document.getElementById('rosterTableBody');
  const rosterCountBadge = document.getElementById('rosterCountBadge');
  const rosterSearchInput = document.getElementById('rosterSearchInput');

  // ── QR Code SVG Helper ──
  function generateQrSvg(text) {
    if (typeof qrcode !== 'function') {
      return '<div style="padding:10px;font-size:11px;color:#6B7280">QR generator belum siap</div>';
    }
    try {
      const qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      // qrcode-generator expects positional arguments: (cellSize, margin)
      return qr.createSvgTag(4, 4);
    } catch (err) {
      console.error('[QR] Failed to generate SVG:', err);
      return '<div style="padding:10px;font-size:11px;color:#DC2626">Gagal membuat QR</div>';
    }
  }

  // ── Update Traccar Auto-Config (QR & Deep Link) ──
  function updateTraccarConfig(intervalSec) {
    if (intervalSec) currentInterval = intervalSec;

    const rider = registeredRiderData?.rider || { bib: '001' };
    const traccar = registeredRiderData?.traccar || {};
    const osmandUrl = traccar?.osmandUrl || `${window.location.origin}/api/osmand`;
    
    // Normalize numeric bib to 3 digits (e.g. 001)
    let rawBib = rider.bib != null ? String(rider.bib).trim() : '001';
    const bib = (/^\d+$/.test(rawBib) && rawBib.length < 3) ? rawBib.padStart(3, '0') : rawBib;

    // Configuration matching Traccar Client settings screenshot:
    // - url: Server URL (https://cyclopon.my.id/api/osmand)
    // - id: Device identifier 3-digit (001)
    // - interval: 45
    // - accuracy: highest
    // - distance: 0 (Disabled)
    // - angle: 0 (Disabled)
    // - heartbeat: 0 (Disabled)
    // - buffer: true (Offline buffering: ON)
    // - wakelock: false (Wake lock: OFF)
    // - stopDetection: false (Stop detection: OFF)
    const configQuery = `url=${encodeURIComponent(osmandUrl)}&id=${encodeURIComponent(bib)}&interval=${currentInterval}&accuracy=highest&distance=0&angle=0&heartbeat=0&buffer=true&wakelock=false&stopDetection=false`;
    const qrText = `url=${osmandUrl}&id=${bib}&interval=${currentInterval}&accuracy=highest&distance=0&angle=0&heartbeat=0&buffer=true&wakelock=false&stopDetection=false`;
    const intentUrl = `intent://config?${configQuery}#Intent;scheme=org.traccar.client;package=org.traccar.client;end`;
    const iosUrl = `org.traccar.client://config?${configQuery}`;

    // Detect iOS vs Android
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const deepLinkUrl = isIos ? iosUrl : intentUrl;

    // Update Deep Link Button
    const btnDeepLink = document.getElementById('btnTraccarDeepLink');
    if (btnDeepLink) {
      btnDeepLink.href = deepLinkUrl;
      btnDeepLink.onclick = function(e) {
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (!isMobile) {
          e.preventDefault();
          if (typeof showToast === 'function') {
            showToast('Tautan 1-Klik membuka aplikasi Traccar Client di ponsel. Di komputer, silakan scan QR code di samping menggunakan aplikasi Traccar Client.', 'info');
          }
          const qrSec = document.getElementById('traccarQrGraphic');
          if (qrSec) qrSec.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      };
    }

    // Update QR Code SVG
    const qrContainer = document.getElementById('traccarQrGraphic');
    if (qrContainer) {
      qrContainer.innerHTML = generateQrSvg(qrText);
    }

    // Update Manual Chips
    const elUrl = document.getElementById('valServerUrl');
    const elId = document.getElementById('valDeviceIdentifier');
    if (elUrl) elUrl.textContent = osmandUrl;
    if (elId) elId.textContent = bib;
  }

  // ── Fetch Events ──
  async function loadEvents() {
    try {
      const res = await fetch('/api/events');
      if (!res.ok) throw new Error('Gagal memuat event');
      allEvents = await res.json();

      if (!allEvents.length) {
        eventSelect.innerHTML = '<option value="">Belum ada event dibuka</option>';
        return;
      }

      // Check query param for pre-selected event
      const urlParams = new URLSearchParams(window.location.search);
      const paramEventId = Number(urlParams.get('event') || params?.eventId);

      eventSelect.innerHTML = allEvents.map(ev => {
        const isSelected = paramEventId ? ev.id === paramEventId : (ev.active ? true : false);
        return `<option value="${ev.id}" ${isSelected ? 'selected' : ''}>${escapeHtml(ev.name)} (${escapeHtml(ev.date || 'TBA')})</option>`;
      }).join('');

      currentEventId = Number(eventSelect.value) || allEvents[0].id;
      loadRoster(currentEventId);
    } catch (err) {
      eventSelect.innerHTML = `<option value="">${err.message}</option>`;
    }
  }

  // ── Fetch Roster of Event ──
  async function loadRoster(eventId) {
    if (!eventId) return;
    try {
      const res = await fetch(`/api/events/${eventId}/riders`);
      if (!res.ok) {
        rosterBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:#DC2626">Akses roster dibatasi panitia.</td></tr>`;
        rosterCountBadge.textContent = '0 Rider';
        return;
      }
      currentRiders = await res.json();
      renderRosterTable(currentRiders);
    } catch {
      rosterBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:#DC2626">Gagal memuat peserta.</td></tr>`;
    }
  }

  // ── Render Roster Table ──
  function renderRosterTable(list) {
    const q = (rosterSearchInput?.value || '').trim().toLowerCase();
    const filtered = q
      ? list.filter(r => (r.name || '').toLowerCase().includes(q) || String(r.bib).toLowerCase().includes(q))
      : list;

    rosterCountBadge.textContent = `${list.length} Rider`;

    if (!filtered.length) {
      rosterBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:24px;color:#64748B">${q ? 'Tidak ada peserta yang cocok dengan pencarian.' : 'Belum ada peserta terdaftar di event ini.'}</td></tr>`;
      return;
    }

    rosterBody.innerHTML = filtered.map(r => {
      const role = r.role || 'rider';
      const roleClass = role === 'sweeper' ? 'sweeper' : (role === 'marshall' ? 'marshall' : (role === 'medic' ? 'medic' : 'rider'));
      const roleLabel = role === 'sweeper' ? 'SWEEPER' : (role === 'marshall' ? 'MARSHALL' : (role === 'medic' ? 'MEDIS' : 'RIDER'));

      return `
        <tr>
          <td>
            <span class="roster-bib-pill" style="background:${r.color || '#FFE600'}22;border-color:${r.color || '#0D1117'}">
              #${escapeHtml(r.bib)}
            </span>
          </td>
          <td>
            <div class="roster-name-cell">${escapeHtml(r.name)}</div>
          </td>
          <td>
            <span class="role-badge-pill ${roleClass}">${roleLabel}</span>
          </td>
          <td style="text-align:center">
            <span style="display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:800;color:#16A34A">
              ✓ Terdaftar
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ── Event Selection Changed ──
  eventSelect.addEventListener('change', () => {
    currentEventId = Number(eventSelect.value);
    loadRoster(currentEventId);
  });

  // ── Search Roster ──
  rosterSearchInput?.addEventListener('input', () => {
    renderRosterTable(currentRiders);
  });

  // ── Form Submission ──
  regForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errMsg.style.display = 'none';
    errMsg.textContent = '';

    const eventId = Number(eventSelect.value);
    const name = document.getElementById('regName').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const role = document.getElementById('regRole').value;

    if (!eventId) {
      errMsg.textContent = 'Pilih event terlebih dahulu.';
      errMsg.style.display = 'block';
      return;
    }
    if (!name) {
      errMsg.textContent = 'Nama lengkap peserta wajib diisi.';
      errMsg.style.display = 'block';
      return;
    }
    if (!phone || phone.length < 8) {
      errMsg.textContent = 'Nomor WhatsApp / HP tidak valid.';
      errMsg.style.display = 'block';
      return;
    }

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span>⏳</span> Mendaftarkan...`;

    try {
      const res = await fetch('/api/auth/rider/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          name,
          phone,
          role
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Pendaftaran gagal. Silakan coba lagi.');
      }

      registeredRiderData = data;

      // Populate Success Card
      document.getElementById('resBibBig').textContent = `#${data.rider.bib}`;
      document.getElementById('resNameBig').textContent = data.rider.name;
      document.getElementById('resEventLabel').textContent = data.event?.name || 'Event CycloPon';
      document.getElementById('resPinBig').textContent = data.rider.pin || '1234';

      const roleBadge = document.getElementById('resRoleBadge');
      if (roleBadge) {
        const rRole = (data.rider.role || 'rider').toLowerCase();
        const roleNames = { rider: 'PESERTA', sweeper: 'SWEEPER', marshall: 'MARSHALL', medic: 'MEDIS' };
        roleBadge.textContent = roleNames[rRole] || 'PESERTA';
        roleBadge.className = `ticket-role-badge ${rRole}`;
      }

      const btnGoMap = document.getElementById('btnGoLiveMap');
      if (btnGoMap) {
        btnGoMap.href = `/watch/${eventId}`;
      }

      // Initialize Traccar Auto-Config
      updateTraccarConfig(45);

      // Transition views: hide form, show success
      formCard.style.display = 'none';
      successCard.style.display = 'block';
      window.scrollTo({ top: successCard.offsetTop - 40, behavior: 'smooth' });

      // Add to current roster list and re-render
      currentRiders.unshift({
        id: data.rider.id,
        bib: data.rider.bib,
        name: data.rider.name,
        role: data.rider.role,
        color: data.rider.color
      });
      renderRosterTable(currentRiders);

      showToast(`Pendaftaran berhasil! Nomor BIB Anda: #${data.rider.bib}`, 'success');
    } catch (err) {
      errMsg.textContent = err.message;
      errMsg.style.display = 'block';
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<span>⚡</span> DAFTAR EVENT SEKARANG →`;
    }
  });

  // ── Interval Selector Buttons ──
  document.querySelectorAll('.interval-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.interval-pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const intervalSec = Number(btn.dataset.interval) || 45;
      updateTraccarConfig(intervalSec);
    });
  });

  // ── Copy Buttons ──
  document.getElementById('btnCopyServerUrl')?.addEventListener('click', () => {
    const val = document.getElementById('valServerUrl')?.textContent || '';
    navigator.clipboard?.writeText(val);
    showToast('Server URL disalin!', 'success');
  });

  document.getElementById('btnCopyDeviceId')?.addEventListener('click', () => {
    const val = document.getElementById('valDeviceIdentifier')?.textContent || '';
    navigator.clipboard?.writeText(val);
    showToast('Device Identifier disalin!', 'success');
  });

  // ── Register Another Rider ──
  document.getElementById('btnRegisterAnother')?.addEventListener('click', () => {
    document.getElementById('regName').value = '';
    document.getElementById('regPhone').value = '';
    successCard.style.display = 'none';
    formCard.style.display = 'block';
    window.scrollTo({ top: formCard.offsetTop - 40, behavior: 'smooth' });
  });

  // Initial load
  updateTraccarConfig(45);
  loadEvents();
}

window.renderRegisterPage = renderRegisterPage;
