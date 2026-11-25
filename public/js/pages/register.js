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

          <a href="/install" data-link class="btn-guide-nav" title="Tutorial Install Aplikasi PWA di HP" aria-label="Install aplikasi">
            <span class="nav-label-full">INSTALL</span>
            <span class="nav-label-short">INSTALL</span>
          </a>

          <a href="/login" data-link class="btn-login-nav" title="Login Cockpit Rider" aria-label="Login rider">
            <span class="nav-label-full">LOGIN RIDER</span>
            <span class="nav-label-short">LOGIN</span>
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

      <div class="register-container">
        <!-- Hero Section -->
        <div class="register-hero">
          <div class="register-hero-tag">⚡ PENDAFTARAN PESERTA INSTAN</div>
          <h1 class="register-hero-title">Gabung &amp; Pantau <span>Live di Peta</span></h1>
          <p class="register-hero-lead register-hero-desc">
            Cukup masukkan nama &amp; nomor WhatsApp. Nomor BIB diterbitkan otomatis, dan aplikasi Traccar Client ponsel Anda langsung siap disetting dalam 1 klik.
          </p>
        </div>

        <!-- Tab Switcher: Pendaftaran & Roster | Panduan Pengguna -->
        <div class="reg-tabs-bar" role="tablist" aria-label="Menu daftar event dan panduan">
          <button type="button" class="reg-tab-btn active" id="tabBtnRegForm" role="tab" aria-selected="true" aria-controls="regTabPanelForm" data-reg-tab="register">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <line x1="19" y1="8" x2="19" y2="14"></line>
              <line x1="22" y1="11" x2="16" y2="11"></line>
            </svg>
            <span>Pendaftaran &amp; Roster</span>
          </button>
          <button type="button" class="reg-tab-btn" id="tabBtnRegGuide" role="tab" aria-selected="false" aria-controls="regTabPanelGuide" data-reg-tab="panduan" tabindex="-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
            <span>Panduan Pengguna</span>
          </button>
        </div>

        <div id="regTabPanelForm" class="reg-tab-panel" role="tabpanel" aria-labelledby="tabBtnRegForm">
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

            <!-- Conditional Event Access PIN (shown only when selected event is locked) -->
            <div class="form-group-reg" id="regEventPinGroup" style="display:none;margin-bottom:20px">
              <label class="form-label-reg" for="regEventPin">
                PIN Akses Event <span class="req">*</span>
                <span class="hint">(Khusus event yang dikunci panitia)</span>
              </label>
              <div class="reg-field-wrap">
                <span class="reg-field-icon" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <input type="password" id="regEventPin" class="form-input-reg" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="Masukkan PIN akses dari panitia">
              </div>
              <p style="margin:6px 0 0;font-size:11.5px;line-height:1.45;color:#475569">
                Event ini sedang dikunci panitia. Jika seharusnya terbuka untuk umum, panitia dapat mengosongkan PIN Akses Event di Panel Panitia.
              </p>
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

          <div class="roster-table-wrap" id="rosterTableWrap">
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
          <div class="roster-slider-bar" id="rosterSliderBar" hidden>
            <span class="roster-slider-hint">← Geser →</span>
            <input type="range" id="rosterScrollSlider" class="roster-scroll-slider" min="0" max="100" value="0" aria-label="Geser tabel daftar peserta ke kiri atau kanan">
          </div>
        </div>
        </div>

        <div id="regTabPanelGuide" class="reg-tab-panel guide-page reg-guide-embedded" role="tabpanel" aria-labelledby="tabBtnRegGuide" hidden></div>
      </div>

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

  // ── Safe HTML Escape Helper ──
  const escapeHtml = window.escapeHtml || function (str) {
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
  const rosterTableWrap = document.getElementById('rosterTableWrap');
  const rosterSliderBar = document.getElementById('rosterSliderBar');
  const rosterScrollSlider = document.getElementById('rosterScrollSlider');

  function syncRosterSlider() {
    if (!rosterTableWrap || !rosterSliderBar || !rosterScrollSlider || !rosterTableWrap.isConnected) return;
    const maxScroll = Math.max(0, rosterTableWrap.scrollWidth - rosterTableWrap.clientWidth);
    if (maxScroll <= 2) {
      rosterSliderBar.hidden = true;
      return;
    }
    rosterSliderBar.hidden = false;
    rosterScrollSlider.max = String(maxScroll);
    rosterScrollSlider.value = String(Math.round(rosterTableWrap.scrollLeft));
  }

  rosterTableWrap?.addEventListener('scroll', () => {
    if (!rosterScrollSlider || rosterSliderBar?.hidden) return;
    rosterScrollSlider.value = String(Math.round(rosterTableWrap.scrollLeft));
  }, { passive: true });

  rosterScrollSlider?.addEventListener('input', () => {
    if (!rosterTableWrap) return;
    rosterTableWrap.scrollLeft = Number(rosterScrollSlider.value);
  });

  window.addEventListener('resize', syncRosterSlider);

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
      btnDeepLink.onclick = function (e) {
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

  const eventPinGroup = document.getElementById('regEventPinGroup');
  const eventPinInput = document.getElementById('regEventPin');

  function syncRegEventPinField() {
    if (!eventPinGroup || !eventPinInput) return;
    const ev = allEvents.find(item => Number(item.id) === Number(eventSelect.value));
    const required = !!(ev && ev.access_pin_required);
    eventPinGroup.style.display = required ? 'block' : 'none';
    eventPinInput.required = required;
    if (required) {
      const savedPin = sessionStorage.getItem('event_pin_' + ev.id) || '';
      if (savedPin && !eventPinInput.value) eventPinInput.value = savedPin;
    } else {
      eventPinInput.value = '';
    }
  }

  // ── Fetch Events ──
  async function loadEvents() {
    try {
      const res = await fetch('/api/events');
      if (!res.ok) throw new Error('Gagal memuat event');
      allEvents = await res.json();

      if (!allEvents.length) {
        eventSelect.innerHTML = '<option value="">Belum ada event dibuka</option>';
        syncRegEventPinField();
        return;
      }

      // Check query param for pre-selected event
      const urlParams = new URLSearchParams(window.location.search);
      const paramEventId = Number(urlParams.get('event') || params?.eventId);

      eventSelect.innerHTML = allEvents.map(ev => {
        const isSelected = paramEventId ? ev.id === paramEventId : (ev.active ? true : false);
        const lockLabel = ev.access_pin_required ? ' · Terkunci PIN' : '';
        return `<option value="${ev.id}" ${isSelected ? 'selected' : ''}>${escapeHtml(ev.name)} (${escapeHtml(ev.date || 'TBA')})${lockLabel}</option>`;
      }).join('');

      currentEventId = Number(eventSelect.value) || allEvents[0].id;
      syncRegEventPinField();
      loadRoster(currentEventId);
    } catch (err) {
      eventSelect.innerHTML = `<option value="">${err.message}</option>`;
      syncRegEventPinField();
    }
  }

  // ── Fetch Roster of Event ──
  async function loadRoster(eventId) {
    if (!eventId) return;
    try {
      const savedPin = sessionStorage.getItem('event_pin_' + eventId) || '';
      const res = await fetch(`/api/events/${eventId}/riders`, {
        headers: savedPin ? { 'x-event-pin': savedPin } : {}
      });
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
      requestAnimationFrame(syncRosterSlider);
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
            <span style="display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:800;color:#16A34A;white-space:nowrap">
              ✓ Terdaftar
            </span>
          </td>
        </tr>
      `;
    }).join('');
    requestAnimationFrame(syncRosterSlider);
  }

  // ── Event Selection Changed ──
  eventSelect.addEventListener('change', () => {
    currentEventId = Number(eventSelect.value);
    syncRegEventPinField();
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
    const eventPin = eventPinInput ? eventPinInput.value.trim() : '';
    const selectedEvent = allEvents.find(item => Number(item.id) === eventId);

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
    if (selectedEvent && selectedEvent.access_pin_required && !eventPin) {
      errMsg.textContent = 'Event ini terkunci panitia. Masukkan PIN Akses Event dari panitia.';
      errMsg.style.display = 'block';
      eventPinInput?.focus();
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
          role,
          event_pin: eventPin || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Pendaftaran gagal. Silakan coba lagi.');
      }

      if (eventPin) {
        sessionStorage.setItem('event_pin_' + eventId, eventPin);
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
      if (eventPin) {
        loadRoster(eventId);
      } else {
        currentRiders.unshift({
          id: data.rider.id,
          bib: data.rider.bib,
          name: data.rider.name,
          role: data.rider.role,
          color: data.rider.color
        });
        renderRosterTable(currentRiders);
      }

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

  // ── Tab Switcher (Pendaftaran & Roster <-> Panduan Pengguna) ──
  const tabBtns = Array.from(document.querySelectorAll('.reg-tab-btn'));
  const tabPanelForm = document.getElementById('regTabPanelForm');
  const tabPanelGuide = document.getElementById('regTabPanelGuide');
  let guideRendered = false;

  function ensureGuideRendered() {
    if (guideRendered || !tabPanelGuide) return;
    if (typeof window.renderGuidePanel === 'function') {
      window.renderGuidePanel(tabPanelGuide, {
        onOpenRegister: () => {
          switchRegTab('register', { updateUrl: true });
          const targetCard = successCard && successCard.style.display !== 'none' ? successCard : formCard;
          if (targetCard) {
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
      guideRendered = true;
    }
  }

  function switchRegTab(tabName, opts = {}) {
    const isGuide = tabName === 'panduan' || tabName === 'guide';
    const nextTab = isGuide ? 'panduan' : 'register';
    const updateUrl = opts.updateUrl !== false;

    tabBtns.forEach(btn => {
      const active = btn.dataset.regTab === nextTab;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
      btn.setAttribute('tabindex', active ? '0' : '-1');
    });

    if (tabPanelForm) tabPanelForm.hidden = isGuide;
    if (tabPanelGuide) tabPanelGuide.hidden = !isGuide;

    if (isGuide) {
      ensureGuideRendered();
      document.title = 'Panduan Pengguna - Daftar Event CycloPon';
      if (typeof tabPanelGuide?._refreshGuideScroll === 'function') {
        requestAnimationFrame(() => tabPanelGuide._refreshGuideScroll());
      }
      if (opts.scrollToSection) {
        const sec = tabPanelGuide?.querySelector(`#${opts.scrollToSection}`);
        if (sec) {
          requestAnimationFrame(() => sec.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        }
      }
    } else {
      document.title = 'Daftar Event — CycloPon Live Tracker';
      if (typeof tabPanelGuide?._refreshGuideScroll === 'function') {
        tabPanelGuide._refreshGuideScroll();
      }
      requestAnimationFrame(syncRosterSlider);
    }

    if (updateUrl && window.history && typeof window.history.replaceState === 'function') {
      const nextUrl = new URL(window.location.href);
      if (isGuide) {
        nextUrl.searchParams.set('tab', 'panduan');
      } else {
        nextUrl.searchParams.delete('tab');
        nextUrl.searchParams.delete('section');
      }
      window.history.replaceState({}, '', nextUrl.pathname + nextUrl.search + nextUrl.hash);
    }
  }

  tabBtns.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      switchRegTab(btn.dataset.regTab, { updateUrl: true });
    });

    btn.addEventListener('keydown', (e) => {
      let targetIdx = null;
      if (e.key === 'ArrowRight') targetIdx = (idx + 1) % tabBtns.length;
      else if (e.key === 'ArrowLeft') targetIdx = (idx - 1 + tabBtns.length) % tabBtns.length;
      else if (e.key === 'Home') targetIdx = 0;
      else if (e.key === 'End') targetIdx = tabBtns.length - 1;

      if (targetIdx !== null) {
        e.preventDefault();
        const targetBtn = tabBtns[targetIdx];
        targetBtn.focus();
        switchRegTab(targetBtn.dataset.regTab, { updateUrl: true });
      }
    });
  });

  // Initial load
  const initQuery = params?.query || {};
  const initUrlParams = new URLSearchParams(window.location.search);
  const initialTab = initQuery.tab || initUrlParams.get('tab');
  const initialSection = initQuery.section || initUrlParams.get('section') || (window.location.hash ? window.location.hash.slice(1) : null);

  if (initialTab === 'panduan' || initialTab === 'guide') {
    switchRegTab('panduan', { updateUrl: false, scrollToSection: initialSection });
  }

  updateTraccarConfig(45);
  loadEvents();
}

window.renderRegisterPage = renderRegisterPage;
