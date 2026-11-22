/**
 * CycloPon Official User & Rider Documentation Hub (/guide & /panduan)
 * Comprehensive guides for Rider Registration, Traccar Client GPS Setup, Real-Time Telemetry Tracking & Race Management.
 */

function renderGuide() {
  const app = document.getElementById('app');
  document.title = 'Panduan Pengguna — CycloPon Live Tracker';

  const currentHost = (window.location && window.location.hostname) ? window.location.hostname : 'localhost';
  const traccarServerUrl = `${window.location.origin}/api/osmand`;

  app.innerHTML = `
    <div class="landing-page-wrapper guide-page">
      <!-- ── Top Navigation Bar ── -->
      <nav class="landing-nav">
        <a href="/" data-link class="brand-title">
          <div class="brand-name-group">
            <span class="brand-name">CYCLOPON</span>
            <span class="brand-spec-label">// PANDUAN PENGGUNA</span>
          </div>
        </a>

        <div class="nav-actions-group">
          <a href="/guide" data-link class="btn-guide-nav active" title="Panduan Pengguna &amp; Pesepeda" aria-label="Panduan pengguna">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
            <span class="nav-label-full">PANDUAN</span>
          </a>

          <a href="/register" data-link class="btn-register-nav" title="Daftar Menjadi Peserta Event" aria-label="Daftar event">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
            <span class="nav-label-full">DAFTAR EVENT</span>
            <span class="nav-label-short">DAFTAR</span>
          </a>

          <a href="/admin" data-link class="btn-admin-nav">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span class="nav-label-full">PANEL PANITIA</span>
            <span class="nav-label-short">PANITIA</span>
            <span class="admin-nav-arrow">↗</span>
          </a>
        </div>
      </nav>

      <!-- ── Guide Main Container ── -->
      <main class="landing-hero fade-in guide-hero" style="padding-top:20px">
        <!-- Hero Title -->
        <div class="guide-hero-inner">
          <div class="guide-breadcrumb">
            <a href="/" data-link>Beranda</a>
            <span aria-hidden="true">/</span>
            <span>Panduan Pengguna</span>
          </div>
          <span class="guide-hero-kicker">// DOKUMENTASI RINGKAS HARI-H</span>
          <h1 class="guide-hero-title">Panduan Singkat CycloPon<br><span>Rider &amp; Panitia</span></h1>
          <p class="guide-hero-lead">
            Panduan cepat konfigurasi GPS Traccar (10s/30s), pendaftaran BIB, navigasi Live Map, hingga Cockpit — ringkas dan langsung bisa diterapkan saat hari-H.
          </p>
          <div class="guide-hero-meta">
            <span class="guide-meta-chip">⚡ Live GPS (10s/30s)</span>
            <span class="guide-meta-chip">📲 Setup 1 Menit</span>
            <span class="guide-meta-chip">📋 BIB &amp; Pass Digital</span>
            <span class="guide-meta-chip">🚴 Cockpit HUD</span>
            <span class="guide-meta-chip">❓ Solusi Cepat</span>
          </div>

          <!-- Hero Search Box for Instant Topic Lookup -->
          <div class="guide-search-box">
            <svg class="guide-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="search" id="guideSearchInput" class="guide-search-input" placeholder="Cari cepat (misal: interval, izin baterai, bib, blank spot, zoom, cot)..." autocomplete="off" aria-label="Cari panduan">
            <button type="button" id="guideSearchClear" class="guide-search-clear" aria-label="Bersihkan pencarian" style="display:none">✕</button>
          </div>
          <div id="guideSearchFeedback" class="guide-search-feedback" role="status" aria-live="polite" style="display:none"></div>
        </div>

        <!-- ── Quick Guide Jump Switcher ── -->
        <div class="guide-nav-bar" id="guideNavBar">
          <div class="guide-nav-progress" aria-hidden="true"><span id="guideNavProgress"></span></div>
          <div class="guide-nav-label">
            <span class="guide-mono-tag" style="margin-bottom:0">// PILIH BAB</span>
          </div>
          <div class="guide-nav-pills" id="guideNavPills">
            <a href="#trackingFlowSection" class="guide-nav-pill-btn active" id="pillNavTracking">
              <span class="guide-pill-index">01</span>
              <span class="guide-pill-label">Alur &amp; Peta</span>
            </a>
            <a href="#traccarGuideSection" class="guide-nav-pill-btn" id="pillNavTraccar">
              <span class="guide-pill-index">02</span>
              <span class="guide-pill-label">Setup Traccar</span>
            </a>
            <a href="#rosterGuideSection" class="guide-nav-pill-btn" id="pillNavRoster">
              <span class="guide-pill-index">03</span>
              <span class="guide-pill-label">Pendaftaran</span>
            </a>
            <a href="#cockpitGuideSection" class="guide-nav-pill-btn" id="pillNavCockpit">
              <span class="guide-pill-index">04</span>
              <span class="guide-pill-label">Rider Cockpit</span>
            </a>
            <a href="#faqGuideSection" class="guide-nav-pill-btn" id="pillNavFaq">
              <span class="guide-pill-index">05</span>
              <span class="guide-pill-label">FAQ &amp; Solusi</span>
            </a>
          </div>
        </div>

        <!-- ══════════════════════════════════════════════════════════════════════════════
             BAB 1: ALUR PELACAKAN LIVE TRACKING & KONTROL PETA
             ══════════════════════════════════════════════════════════════════════════════ -->
        <section class="landing-guide-section" id="trackingFlowSection" style="margin-top:0">
          <div class="landing-guide-header">
            <div class="guide-tag-wrap">
              <span class="guide-mono-tag">// ARSITEKTUR &amp; KONTROL PETA TERBARU</span>
              <h2 class="guide-main-title">
                <span class="guide-chapter-num">01</span>
                <span class="guide-title-text"><span class="guide-phone-icon" aria-hidden="true">⚡</span> Alur Pelacakan Real-Time &amp; Kontrol Peta</span>
              </h2>
              <p class="guide-subtitle">
                GPS smartphone memancarkan koordinat secara berkala. Server menghitung jarak tempuh &amp; posisi rute, lalu memindahkan marker sepeda di peta penonton tanpa reload.
              </p>
            </div>
            <div class="guide-header-actions">
              <a href="/" data-link class="store-badge-btn" style="background:#1C3E24" title="Buka Live Map Event">
                <span>🗺️ Buka Live Map</span>
                <span>→</span>
              </a>
            </div>
          </div>

          <!-- Pipeline Visual Transmisi GPS Ringkas -->
          <div class="guide-pipeline-box">
            <div class="guide-pipeline-kicker">
              // 4 TAHAP TRANSMISI TELEMETRI GPS
            </div>
            <div class="guide-pipeline-grid">
              <div class="guide-pipeline-item">
                <span class="guide-pipeline-badge">1</span>
                <div class="guide-pipeline-title">📱 Smartphone Rider</div>
                <div class="guide-pipeline-desc">
                  Traccar Client memancarkan koordinat via HTTP port <code>5055</code> tiap <strong>10s</strong> (balap) atau <strong>30s</strong> (ultra).
                </div>
              </div>

              <div class="guide-pipeline-item">
                <span class="guide-pipeline-badge">2</span>
                <div class="guide-pipeline-title">🛡️ Server CycloPon</div>
                <div class="guide-pipeline-desc">
                  Mencocokkan Device ID dengan BIB, menghitung jarak tempuh rute (KM), dan memvalidasi batas waktu Cut-Off Time (COT).
                </div>
              </div>

              <div class="guide-pipeline-item">
                <span class="guide-pipeline-badge">3</span>
                <div class="guide-pipeline-title">📡 Broadcast Instan</div>
                <div class="guide-pipeline-desc">
                  Data disalurkan serentak via WebSocket Fan-Out ke seluruh browser penonton &amp; panitia tanpa perlu me-refresh halaman.
                </div>
              </div>

              <div class="guide-pipeline-item active-node">
                <span class="guide-pipeline-badge">4</span>
                <div class="guide-pipeline-title">🚴 Live Map Penonton</div>
                <div class="guide-pipeline-desc">
                  Marker pesepeda bergeser halus di jalur rute dengan animasi interpolasi sliding.
                </div>
              </div>
            </div>
          </div>

          <div class="guide-steps-grid">
            <div class="guide-step-card primary-step">
              <div class="step-card-num">FITUR PETA · KONTROL TERBARU</div>
              <div class="step-card-title">Tombol Navigasi Live Map Ramah Rider</div>
              <ul class="step-checklist">
                <li><strong>Kembali ke Beranda (←):</strong> Terletak di bar header atas (kiri samping CYCLOPON) untuk navigasi instan ke beranda.</li>
                <li><strong>Pusatkan Kamera (🎯):</strong> 1x klik kunci rider (zoom 15); klik ke-2 tampilkan seluruh rute event.</li>
                <li><strong>Zoom Pill Vertikal (+ / −):</strong> Tombol zoom mandiri di sisi kanan, mudah ditekan dengan jempol saat gowes.</li>
                <li><strong>Lapisan Peta &amp; Elevasi:</strong> Tombol layer 📑 dan profil elevasi rute ⛰️ tersedia rapi di sudut kanan.</li>
              </ul>
            </div>

            <div class="guide-step-card primary-step">
              <div class="step-card-num">INTERVAL &amp; KETENTUAN MURNI</div>
              <div class="step-card-title">Pilihan Interval Waktu (10s vs 30s)</div>
              <ul class="step-checklist">
                <li><strong>Interval 10 Detik:</strong> Sangat responsif. Cocok untuk criterium, road race, dan segmen tanjakan pendek.</li>
                <li><strong>Interval 30 Detik:</strong> Sangat hemat baterai. Sangat direkomendasikan untuk event ultra-cycling (200km–1200km).</li>
                <li><strong>Distance: Wajib 0 meter</strong> agar transmisi posisi murni berdasarkan waktu detik dan tidak tertahan saat rider pelan.</li>
                <li><strong>Tanpa Metrik Speed:</strong> Kecepatan seketika dihilangkan demi fokus pada akurasi jarak tempuh (KM) &amp; profil elevasi.</li>
              </ul>
            </div>

            <div class="guide-step-card alert-step">
              <div class="step-card-num">PENTING · IZIN ANDROID</div>
              <div class="step-card-title">Izin Latar Belakang "Allow all the time"</div>
              <div class="step-warning-box">
                <strong>WAJIB: Pilih "Allow all the time"</strong><br>
                Jika memilih "Only while using app", Android otomatis mematikan GPS begitu layar HP mati atau dimasukkan ke saku jersey!
              </div>
            </div>

            <div class="guide-step-card">
              <div class="step-card-num">PEMBATAS FINISH</div>
              <div class="step-card-title">Marker Sweeper &amp; Virtual Cut-Off Time (COT)</div>
              <ul class="step-checklist">
                <li><strong>Sweeper Virtual:</strong> Marker sweeper melaju di rute GPX sesuai batas waktu resmi finish.</li>
                <li><strong>Zona Aman:</strong> Posisi rider harus selalu berada di <em>depan</em> marker sweeper agar aman dari batas DNF.</li>
                <li><strong>Split Checkpoint:</strong> Waktu singgah pos kontrol tercatat otomatis saat melintasi radius pos.</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- ══════════════════════════════════════════════════════════════════════════════
             BAB 2: SETUP SMARTPHONE RIDER (TRACCAR CLIENT)
             ══════════════════════════════════════════════════════════════════════════════ -->
        <section class="landing-guide-section" id="traccarGuideSection">
          <div class="landing-guide-header">
            <div class="guide-tag-wrap">
              <span class="guide-mono-tag">// APLIKASI PELACAK RESMI · TRACCAR CLIENT</span>
              <h2 class="guide-main-title">
                <span class="guide-chapter-num">02</span>
                <span class="guide-title-text"><span class="guide-phone-icon" aria-hidden="true">📲</span> Setup Traccar Client dalam 1 Menit</span>
              </h2>
              <p class="guide-subtitle">
                Aplikasi resmi gratis Traccar Client. Layar HP dapat dimatikan sepenuhnya dan disimpan hemat daya di saku jersey.
              </p>
            </div>
            <div class="guide-store-badges">
              <a href="https://play.google.com/store/apps/details?id=org.traccar.client" target="_blank" rel="noopener" class="store-badge-btn" title="Download di Google Play Store">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.609 1.814L13.793 12 3.61 22.186c-.378-.403-.61-.976-.61-1.621V3.435c0-.645.232-1.218.61-1.621zM15.207 13.414l2.564 2.564-11.89 6.837 9.326-9.401zm0-2.828L5.881 1.185l11.89 6.837-2.564 2.564zm1.414 1.414l3.657 2.102c.866.498.866 1.31 0 1.808l-3.657 2.102-2.146-2.146 2.146-2.146z"/>
                </svg>
                <span>Google Play</span>
              </a>
              <a href="https://apps.apple.com/app/traccar-client/id843156976" target="_blank" rel="noopener" class="store-badge-btn" title="Download di Apple App Store">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.77 1.04-1.84.93-2.91-.9.04-2 .61-2.65 1.37-.57.66-.99 1.74-.86 2.78 1.01.08 1.96-.47 2.58-1.24z"/>
                </svg>
                <span>App Store</span>
              </a>
            </div>
          </div>

          <!-- Parameter Cheat-Sheet Table -->
          <div class="guide-step-card primary-step" style="margin-bottom:20px">
            <div class="step-card-num">// CHEAT-SHEET PARAMETER · MENU SETTINGS TRACCAR</div>
            <div class="step-card-title">Cukup Atur 5 Nilai Praktis Berikut:</div>
            
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin:12px 0">
              <div style="background:#FFFFFF;border:1px solid #CBD5E1;border-radius:8px;padding:12px">
                <div style="font-size:11px;font-weight:800;color:#64748B;text-transform:uppercase">1. Server URL</div>
                <div class="step-code-box" style="margin:6px 0 4px;padding:6px 10px;font-size:11.5px">
                  <code id="traccarServerUrlDisplay">${traccarServerUrl}</code>
                  <button id="btnCopyServerUrl" class="btn-copy-code" title="Salin ke Clipboard" style="padding:2px 8px;font-size:10px">
                    <span id="copyUrlText">Salin</span>
                  </button>
                </div>
              </div>

              <div style="background:#FFFFFF;border:1px solid #CBD5E1;border-radius:8px;padding:12px">
                <div style="font-size:11px;font-weight:800;color:#64748B;text-transform:uppercase">2. Device Identifier</div>
                <div style="display:flex;align-items:center;gap:6px;margin-top:6px">
                  <span class="bib-pill" style="font-size:12px">BIB-001</span>
                  <span class="bib-sep">atau</span>
                  <span class="bib-pill" style="font-size:12px">001</span>
                </div>
                <div style="font-size:11px;color:#64748B;margin-top:4px">Ganti angka acak dengan nomor BIB resmi Anda.</div>
              </div>

              <div style="background:#FFFFFF;border:1px solid #CBD5E1;border-radius:8px;padding:12px">
                <div style="font-size:11px;font-weight:800;color:#64748B;text-transform:uppercase">3. Interval &amp; Distance</div>
                <div style="font-size:13px;font-weight:800;color:#0D1117;margin-top:4px">
                  Interval: <code>10</code> atau <code>30</code> detik
                </div>
                <div style="font-size:11.5px;color:#047857;margin-top:2px">
                  Distance: <strong>0 meter</strong> (Wajib)
                </div>
              </div>

              <div style="background:#FFFFFF;border:1px solid #CBD5E1;border-radius:8px;padding:12px">
                <div style="font-size:11px;font-weight:800;color:#64748B;text-transform:uppercase">4. Akurasi &amp; Buffering</div>
                <div style="font-size:12.5px;color:#334155;margin-top:4px">
                  • <strong>Location accuracy:</strong> <code>Highest</code><br>
                  • <strong>Offline buffering:</strong> <code>ON</code> (Rekam blank spot)
                </div>
              </div>
            </div>
          </div>

          <!-- 2 Visual Step Cards -->
          <div class="guide-visual-card">
            <div class="guide-phone-frame" data-src="/img/traccar-guide/traccar-settings-full.png" data-caption="Menu Settings Traccar Client: Konfigurasi Server URL, Device Identifier (Nomor BIB), dan Interval" title="Klik untuk memperbesar screenshot">
              <img src="/img/traccar-guide/traccar-settings-full.png" alt="Screenshot Menu Settings Traccar Client" class="guide-phone-img" loading="lazy">
              <div class="guide-zoom-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <span>Perbesar</span>
              </div>
            </div>

            <div class="guide-step-body">
              <div class="step-card-num">// LANGKAH 1 · ATUR PARAMETER</div>
              <h3 class="step-card-title">Buka Menu Settings di Traccar Client</h3>
              <p class="step-card-desc">
                Tekan ikon roda gigi <strong>Settings</strong> pada aplikasi Traccar Client ponsel Anda, lalu pastikan:
              </p>
              <ul class="step-checklist">
                <li><strong>Server URL:</strong> Tempelkan alamat server (<code>${traccarServerUrl}</code>).</li>
                <li><strong>Device Identifier:</strong> Masukkan nomor BIB Anda (misal <code>001</code>).</li>
                <li><strong>Interval:</strong> Isi <code>10</code> (balap) atau <code>30</code> (ultra-endurance).</li>
                <li><strong>Distance:</strong> Set <code>0</code> agar posisi dikirim murni berdasarkan interval waktu.</li>
              </ul>
            </div>
          </div>

          <div class="guide-visual-card">
            <div class="guide-phone-frame" data-src="/img/traccar-guide/traccar-continuous-tracking.png" data-caption="Layar Utama Traccar Client: Menyalakan Saklar Continuous Tracking hingga bertuliskan Service Started" title="Klik untuk memperbesar screenshot">
              <img src="/img/traccar-guide/traccar-continuous-tracking.png" alt="Screenshot Layar Utama Traccar Client" class="guide-phone-img" loading="lazy">
              <div class="guide-zoom-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <span>Perbesar</span>
              </div>
            </div>

            <div class="guide-step-body">
              <div class="step-card-num">// LANGKAH 2 · AKTIFKAN TRACKING</div>
              <h3 class="step-card-title">Nyalakan Saklar Tracking &amp; Siap Gowes</h3>
              <p class="step-card-desc">
                Kembali ke layar utama aplikasi Traccar Client:
              </p>
              <ul class="step-checklist">
                <li>Geser saklar <strong>Continuous tracking</strong> ke posisi <strong>ON (Hijau)</strong>.</li>
                <li>Pastikan status berubah menjadi <strong style="color:#166534">"Service started"</strong>.</li>
                <li>Saat muncul izin Android, <strong>WAJIB pilih "Allow all the time"</strong>.</li>
                <li>Tekan tombol <strong>"Send location"</strong> sekali untuk tes kirim awal.</li>
              </ul>
              <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:10px 12px;margin-top:12px;font-size:12px;color:#166534">
                🎉 <strong>Selesai:</strong> Layar HP dapat langsung dimatikan dan disimpan aman di saku jersey sepanjang race.
              </div>
            </div>
          </div>
        </section>

        <!-- ══════════════════════════════════════════════════════════════════════════════
             BAB 3: PENDAFTARAN EVENT & ROSTER PESERTA
             ══════════════════════════════════════════════════════════════════════════════ -->
        <section class="landing-guide-section" id="rosterGuideSection">
          <div class="landing-guide-header">
            <div class="guide-tag-wrap">
              <span class="guide-mono-tag">// REGISTRASI PESERTA &amp; ROSTER</span>
              <h2 class="guide-main-title">
                <span class="guide-chapter-num">03</span>
                <span class="guide-title-text"><span class="guide-phone-icon" aria-hidden="true">📋</span> Pendaftaran Event &amp; Roster</span>
              </h2>
              <p class="guide-subtitle">
                Bergabung ke event, mendapatkan Nomor BIB resmi, Tiket Pass Digital QR Code, dan mengunduh rute GPX resmi.
              </p>
            </div>
            <div class="guide-header-actions">
              <a href="/events/1" id="btnGuideOpenRoster" data-link class="store-badge-btn" style="background:#1C3E24" title="Buka Halaman Roster Event">
                <span>👥 Buka Roster Event</span>
                <span>→</span>
              </a>
            </div>
          </div>

          <div class="guide-steps-grid">
            <div class="guide-step-card primary-step">
              <div class="step-card-num">LANGKAH 1</div>
              <div class="step-card-title">Isi Formulir Pendaftaran</div>
              <ul class="step-checklist">
                <li>Klik tombol <strong>"DAFTAR EVENT"</strong> di menu atas.</li>
                <li><strong>Nama &amp; Kategori:</strong> Ditampilkan di Leaderboard &amp; Live Map.</li>
                <li><strong>Nomor WhatsApp:</strong> 4 digit terakhir otomatis menjadi PIN login akun rider.</li>
                <li><strong>Nomor BIB:</strong> Pilih nomor sendiri atau ditentukan otomatis oleh panitia.</li>
              </ul>
            </div>

            <div class="guide-step-card primary-step">
              <div class="step-card-num">LANGKAH 2</div>
              <div class="step-card-title">Terbit Tiket Pass Digital &amp; QR</div>
              <p class="step-card-desc">
                Sistem menerbitkan tiket pass digital resmi ber-QR Code:
              </p>
              <div class="guide-mini-ticket" style="margin-bottom:10px">
                <div class="guide-mini-ticket-top">
                  <span class="guide-mini-ticket-kicker">DIGITAL PASS // OFFICIAL TICKET</span>
                  <span style="font-size:14px">🎟️</span>
                </div>
                <div class="guide-mini-ticket-bib">#BIB-001</div>
                <div class="guide-mini-ticket-meta">
                  <span>PIN: <strong>1234</strong></span>
                  <span class="guide-ticket-status">✓ TERKONFIRMASI</span>
                </div>
              </div>
              <div class="step-card-hint">
                💡 Tombol <strong>"Buka Pelacak GPS Rider"</strong> memungkinkan langsung masuk Cockpit tanpa login manual.
              </div>
            </div>

            <div class="guide-step-card">
              <div class="step-card-num">LANGKAH 3</div>
              <div class="step-card-title">Unduh GPX &amp; Pos Checkpoint (CP)</div>
              <ul class="step-checklist">
                <li><strong>Unduh GPX Resmi:</strong> Masukkan file rute ke cyclocomp (Garmin, Wahoo, Bryton).</li>
                <li><strong>Pos Checkpoint:</strong> Cek kilometer tiap pos kontrol dan batas waktu Cut-Off Time (COT).</li>
                <li><strong>Direktori Roster:</strong> Pantau daftar peleton peserta di tab Roster event.</li>
              </ul>
            </div>

            <div class="guide-step-card">
              <div class="step-card-num">PANITIA</div>
              <div class="step-card-title">Import Peserta Massal (CSV)</div>
              <p class="step-card-desc">
                Panitia dapat mengunggah ratusan peserta sekaligus via <strong>Panel Panitia (/admin)</strong> dengan file CSV format: <code>bib,nama,no_hp,peran,pin</code>.
              </p>
              <a href="/admin" data-link class="btn-callout-action" style="margin-top:auto">
                <span>Panel Panitia →</span>
              </a>
            </div>
          </div>
        </section>

        <!-- ══════════════════════════════════════════════════════════════════════════════
             BAB 4: RIDER COCKPIT HUD (PELACAK WEB BROWSER)
             ══════════════════════════════════════════════════════════════════════════════ -->
        <section class="landing-guide-section" id="cockpitGuideSection">
          <div class="landing-guide-header">
            <div class="guide-tag-wrap">
              <span class="guide-mono-tag">// PELACAK WEB BROWSER · TANPA INSTALL APLIKASI</span>
              <h2 class="guide-main-title">
                <span class="guide-chapter-num">04</span>
                <span class="guide-title-text"><span class="guide-phone-icon" aria-hidden="true">🚴</span> Rider Cockpit HUD</span>
              </h2>
              <p class="guide-subtitle">
                Alternatif praktis pelacakan langsung dari browser smartphone dengan navigasi jalur GPX dan alarm peringatan deviasi.
              </p>
            </div>
            <div class="guide-header-actions">
              <a href="/rider" data-link class="store-badge-btn" style="background:#1C3E24" title="Buka Rider Portal">
                <span>🚴 Buka Cockpit</span>
                <span>→</span>
              </a>
            </div>
          </div>

          <div class="guide-steps-grid">
            <div class="guide-step-card primary-step">
              <div class="step-card-num">FITUR 1</div>
              <div class="step-card-title">Navigasi Rute GPX &amp; Jarak Tempuh</div>
              <ul class="step-checklist">
                <li>Akses <strong>/rider/cockpit</strong> saat HP dipasang di mount stang / handlebar.</li>
                <li>Aktifkan <strong>💡 Layar ON (Wake Lock)</strong> agar layar tidak mati otomatis saat gowes.</li>
                <li>Menampilkan kilometer jarak tempuh dan sisa jarak ke pos kontrol berikutnya.</li>
              </ul>
            </div>

            <div class="guide-step-card">
              <div class="step-card-num">FITUR 2</div>
              <div class="step-card-title">Mode Kantong Jersey (Layar Mati)</div>
              <ul class="step-checklist">
                <li>Pilih <strong>🎒 Mode Kantong Jersey</strong> untuk hemat daya maksimal.</li>
                <li>Sistem memutar loop audio sunyi di background agar browser terus aktif mengirimkan koordinat saat layar HP terkunci di saku.</li>
              </ul>
            </div>

            <div class="guide-step-card alert-step">
              <div class="step-card-num">FITUR 3</div>
              <div class="step-card-title">Alarm Suara Deviasi Rute (Off-Route)</div>
              <ul class="step-checklist">
                <li>Mendeteksi otomatis jika rider menyimpang &gt;50 meter dari jalur resmi GPX event.</li>
                <li>Memutar alarm nada peringatan dan banner peringatan deviasi rute.</li>
                <li>Otomatis kembali tenang begitu pesepeda kembali ke jalur resmi rute.</li>
              </ul>
            </div>

            <div class="guide-step-card alert-step">
              <div class="step-card-num">FITUR 4</div>
              <div class="step-card-title">Tombol Darurat SOS Cepat</div>
              <ul class="step-checklist">
                <li>Tombol SOS darurat 1-sentuhan untuk insiden kecelakaan, kendala mekanis, atau medis.</li>
                <li>Mengirim koordinat GPS instan ke layar pantau panitia, tim medis, dan evakuasi sweeper.</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- ══════════════════════════════════════════════════════════════════════════════
             BAB 5: TANYA JAWAB & SOLUSI CEPAT (FAQ)
             ══════════════════════════════════════════════════════════════════════════════ -->
        <section class="landing-guide-section" id="faqGuideSection">
          <div class="landing-guide-header">
            <div class="guide-tag-wrap">
              <span class="guide-mono-tag">// SOLUSI CEPAT KENDALA OPERASIONAL</span>
              <h2 class="guide-main-title">
                <span class="guide-chapter-num">05</span>
                <span class="guide-title-text"><span class="guide-phone-icon" aria-hidden="true">❓</span> Tanya Jawab &amp; Solusi Cepat (FAQ)</span>
              </h2>
              <p class="guide-subtitle">
                Solusi ringkas kendala operasional yang paling sering dialami pesepeda saat hari-H.
              </p>
            </div>
          </div>

          <div class="guide-faq-grid">
            <div class="guide-faq-card">
              <div class="guide-faq-q">
                <span class="guide-faq-q-icon">⚠️</span>
                <span>Marker saya tidak bergerak atau diam di peta, apa solusinya?</span>
              </div>
              <p class="guide-faq-a">
                <strong>1.</strong> Pastikan saklar <em>Continuous tracking</em> di Traccar berstatus <code>Service started</code>.<br>
                <strong>2.</strong> Buka izin lokasi aplikasi di Android, pilih <strong>"Allow all the time"</strong>.<br>
                <strong>3.</strong> Pastikan <em>Device identifier</em> sesuai dengan nomor BIB resmi Anda.<br>
                <strong>4.</strong> Matikan Battery Saver (mode hemat baterai ekstrem) khusus aplikasi Traccar.
              </p>
            </div>

            <div class="guide-faq-card">
              <div class="guide-faq-q">
                <span class="guide-faq-q-icon">🔋</span>
                <span>Bagaimana cara menghemat baterai HP untuk gowes ultra (200km–1200km)?</span>
              </div>
              <p class="guide-faq-a">
                <strong>1.</strong> Set <strong>Interval: 30 detik</strong> di Traccar Client (hemat hingga 70%).<br>
                <strong>2.</strong> Matikan layar HP sepenuhnya dan simpan ponsel di saku jersey.<br>
                <strong>3.</strong> Bawa powerbank kecil (5.000–10.000 mAh) di top-tube bag untuk pengisian daya.
              </p>
            </div>

            <div class="guide-faq-card">
              <div class="guide-faq-q">
                <span class="guide-faq-q-icon">🚴</span>
                <span>Bisa dipakai bersamaan dengan Garmin / Wahoo / Strava?</span>
              </div>
              <p class="guide-faq-a">
                <strong>100% aman dan kompatibel!</strong> Satelit GPS smartphone bekerja pasif di latar belakang dan tidak mengganggu sinkronisasi sensor Bluetooth maupun antarmuka bike computer Anda.
              </p>
            </div>

            <div class="guide-faq-card">
              <div class="guide-faq-q">
                <span class="guide-faq-q-icon">📶</span>
                <span>Bagaimana jika melewati daerah blank spot tanpa sinyal internet?</span>
              </div>
              <p class="guide-faq-a">
                Aktifkan <strong>Offline buffering: ON</strong> di Traccar Client. Koordinat tetap terekam di memori ponsel dan otomatis terkirim serentak ke server begitu kembali mendapat sinyal seluler.
              </p>
            </div>

            <div class="guide-faq-card">
              <div class="guide-faq-q">
                <span class="guide-faq-q-icon">🧹</span>
                <span>Apa arti Sweeper Virtual COT di Live Map?</span>
              </div>
              <p class="guide-faq-a">
                Sweeper virtual melaju di rute GPX sesuai batas waktu finish resmi. Rider harus selalu berada di <em>depan</em> sweeper agar terhindar dari batas waktu DNF.
              </p>
            </div>
          </div>
        </section>

      </main>

      <!-- ── Lightbox Modal for Fullscreen Screenshots ── -->
      <div id="guideLightbox" class="guide-lightbox-overlay" style="display:none" role="dialog" aria-modal="true" aria-label="Pratinjau Screenshot Panduan">
        <div class="guide-lightbox-content">
          <button id="guideLightboxClose" class="guide-lightbox-close" aria-label="Tutup pratinjau">✕</button>
          <img id="guideLightboxImg" src="" alt="Pratinjau Screenshot" class="guide-lightbox-img">
          <div id="guideLightboxCaption" class="guide-lightbox-caption"></div>
        </div>
      </div>

      <!-- ── Pro Editorial Footer ── -->
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
              <span class="footer-author">ENGINEERED BY <a href="https://www.instagram.com/kruzamidiwinata/" target="_blank" rel="noopener noreferrer" class="footer-author-link" style="color:#0D1117;text-decoration:none;font-weight:800;" title="Instagram @kruzamidiwinata">RUSHAMIDIWINATA</a></span>
            </div>
            <div class="footer-copy">
              <span>© 2026 CYCLOPON · REAL-TIME GPS TRACKING ENGINE</span>
            </div>
          </div>
        </div>
      </footer>

      <!-- ── Back to top ── -->
      <button id="guideBackToTop" class="guide-back-to-top" type="button" aria-label="Kembali ke atas" title="Kembali ke atas">↑</button>
    </div>
  `;

  // ── Event Handlers: Copy Server URL ──
  const btnCopy = document.getElementById('btnCopyServerUrl');
  const copyText = document.getElementById('copyUrlText');
  if (btnCopy) {
    btnCopy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(traccarServerUrl);
        if (copyText) copyText.textContent = 'Tersalin ✓';
        btnCopy.classList.add('copied');
        if (typeof showToast === 'function') {
          showToast('Server URL berhasil disalin!', 'success');
        }
        setTimeout(() => {
          if (copyText) copyText.textContent = 'Salin';
          btnCopy.classList.remove('copied');
        }, 2500);
      } catch {
        prompt('Salin Server URL:', traccarServerUrl);
      }
    });
  }

  // ── Lightbox Modal for Screenshots ──
  const lightbox = document.getElementById('guideLightbox');
  const lightboxImg = document.getElementById('guideLightboxImg');
  const lightboxCaption = document.getElementById('guideLightboxCaption');
  const lightboxClose = document.getElementById('guideLightboxClose');

  function openLightbox(src, caption) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    if (lightboxCaption) lightboxCaption.textContent = caption || '';
    lightbox.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.style.display = 'none';
    if (lightboxImg) lightboxImg.src = '';
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.guide-phone-frame').forEach(frame => {
    frame.addEventListener('click', () => {
      const src = frame.getAttribute('data-src');
      const caption = frame.getAttribute('data-caption');
      if (src) openLightbox(src, caption);
    });
  });

  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }

  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox && lightbox.style.display === 'flex') {
      closeLightbox();
    }
  });

  // ── Smooth Scroll Navigation Pills (5 Chapters) ──
  const pills = [
    { id: 'pillNavTracking', target: 'trackingFlowSection' },
    { id: 'pillNavTraccar', target: 'traccarGuideSection' },
    { id: 'pillNavRoster', target: 'rosterGuideSection' },
    { id: 'pillNavCockpit', target: 'cockpitGuideSection' },
    { id: 'pillNavFaq', target: 'faqGuideSection' }
  ];

  pills.forEach(p => {
    const el = document.getElementById(p.id);
    if (el) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.guide-nav-pill-btn').forEach(b => b.classList.remove('active'));
        el.classList.add('active');
        const targetEl = document.getElementById(p.target);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  });

  // ── Reading progress, scroll-spy & back-to-top ──
  const progressBar = document.getElementById('guideNavProgress');
  const backToTop = document.getElementById('guideBackToTop');
  const navPills = document.getElementById('guideNavPills');
  const chapters = pills
    .map(p => ({ pill: document.getElementById(p.id), section: document.getElementById(p.target) }))
    .filter(item => item.pill && item.section);
  let activePillId = 'pillNavTracking';
  let scrollTicking = false;

  function centerActivePill(pill) {
    if (!navPills || navPills.scrollWidth <= navPills.clientWidth) return;
    const pillRect = pill.getBoundingClientRect();
    const barRect = navPills.getBoundingClientRect();
    const delta = (pillRect.left - barRect.left) - (barRect.width - pillRect.width) / 2;
    navPills.scrollTo({ left: navPills.scrollLeft + delta, behavior: 'smooth' });
  }

  function updateGuideScrollState() {
    scrollTicking = false;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

    if (progressBar) {
      const pct = Math.min(100, Math.max(0, (scrollY / maxScroll) * 100));
      progressBar.style.width = `${pct}%`;
    }
    if (backToTop) backToTop.classList.toggle('visible', scrollY > 560);

    const probe = scrollY + window.innerHeight * 0.32;
    let current = chapters[0];
    for (const item of chapters) {
      const top = item.section.getBoundingClientRect().top + scrollY;
      if (top <= probe) current = item;
    }
    if (scrollY >= maxScroll - 4) current = chapters[chapters.length - 1];

    if (current && current.pill.id !== activePillId) {
      activePillId = current.pill.id;
      chapters.forEach(item => item.pill.classList.toggle('active', item.pill.id === activePillId));
      if (window.innerWidth <= 768) centerActivePill(current.pill);
    }
  }

  window.addEventListener('scroll', () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(updateGuideScrollState);
  }, { passive: true });
  updateGuideScrollState();

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ── Live Search & Instant Topic Filter ──
  const searchInput = document.getElementById('guideSearchInput');
  const searchClear = document.getElementById('guideSearchClear');
  const searchFeedback = document.getElementById('guideSearchFeedback');
  const searchableCards = Array.from(document.querySelectorAll(
    '.guide-step-card, .guide-visual-card, .guide-faq-card, .guide-pipeline-item'
  ));

  function executeGuideSearch() {
    const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
    if (!query) {
      if (searchClear) searchClear.style.display = 'none';
      if (searchFeedback) searchFeedback.style.display = 'none';
      searchableCards.forEach(card => {
        card.classList.remove('guide-search-dimmed', 'guide-search-highlight');
      });
      return;
    }

    if (searchClear) searchClear.style.display = 'flex';
    let matchCount = 0;

    searchableCards.forEach(card => {
      const text = card.textContent.toLowerCase();
      const isMatch = text.includes(query);
      if (isMatch) {
        matchCount++;
        card.classList.remove('guide-search-dimmed');
        card.classList.add('guide-search-highlight');
      } else {
        card.classList.remove('guide-search-highlight');
        card.classList.add('guide-search-dimmed');
      }
    });

    if (searchFeedback) {
      searchFeedback.style.display = 'block';
      if (matchCount > 0) {
        searchFeedback.textContent = `✓ Ditemukan ${matchCount} topik yang cocok dengan "${query}"`;
        searchFeedback.style.color = '#166534';
      } else {
        searchFeedback.textContent = `Tidak ada topik yang cocok dengan "${query}". Coba kata kunci lain (misal: bib, traccar, cot, cockpit).`;
        searchFeedback.style.color = '#DC2626';
      }
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', executeGuideSearch);
  }

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      executeGuideSearch();
    });
  }

  // Dynamic active event check for roster link
  fetch('/api/events')
    .then(r => r.json())
    .then(events => {
      if (Array.isArray(events) && events.length > 0) {
        const ev = events.find(e => e.status === 'active') || events[0];
        const btnRoster = document.getElementById('btnGuideOpenRoster');
        if (btnRoster && ev) {
          btnRoster.href = `/events/${ev.id}`;
        }
      }
    })
    .catch(() => {});
}
