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
      <!-- ── Pro Editorial Top Navigation Bar ── -->
      <nav class="landing-nav">
        <a href="/" data-link class="brand-title">
          <img src="/icons/logo-emblem.svg" alt="CYCLOPON" class="brand-logo-emblem" width="32" height="32">
          <div class="brand-name-group">
            <span class="brand-name">CYCLOPON</span>
            <span class="brand-spec-label">// DOKUMENTASI PANDUAN</span>
          </div>
        </a>

        <div class="nav-actions-group">
          <a href="/guide" data-link class="btn-guide-nav active" title="Panduan Lengkap Pengguna &amp; Pesepeda" aria-label="Panduan pengguna">
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
      <main class="landing-hero fade-in guide-hero" style="padding-top:24px">
        <!-- Hero / Header Title -->
        <div class="guide-hero-inner">
          <div class="guide-breadcrumb">
            <a href="/" data-link>Beranda</a>
            <span aria-hidden="true">/</span>
            <span>Panduan Pengguna</span>
          </div>
          <span class="guide-hero-kicker">// PUSAT DOKUMENTASI OPERASIONAL</span>
          <h1 class="guide-hero-title">Panduan CycloPon<br><span>untuk Rider &amp; Panitia</span></h1>
          <p class="guide-hero-lead">
            Petunjuk lengkap pendaftaran event, konfigurasi Traccar Client (interval 10s/30s),
            pemantauan Live Map real-time, hingga Rider Cockpit — ringkas dan bisa diikuti langsung saat hari-H.
          </p>
          <div class="guide-hero-meta">
            <span class="guide-meta-chip"><strong>5</strong> bab panduan</span>
            <span class="guide-meta-chip">⚡ Live tracking</span>
            <span class="guide-meta-chip">📲 Traccar Client</span>
            <span class="guide-meta-chip">🚴 Cockpit HUD</span>
            <span class="guide-meta-chip">❓ FAQ &amp; Solusi</span>
          </div>

          <!-- Hero Search Box for Instant Topic Lookup -->
          <div class="guide-search-box">
            <svg class="guide-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="search" id="guideSearchInput" class="guide-search-input" placeholder="Cari topik panduan (misal: interval, izin baterai, bib, blank spot, cockpit, cot, alarm)..." autocomplete="off" aria-label="Cari panduan">
            <button type="button" id="guideSearchClear" class="guide-search-clear" aria-label="Bersihkan pencarian" style="display:none">✕</button>
          </div>
          <div id="guideSearchFeedback" class="guide-search-feedback" role="status" aria-live="polite" style="display:none"></div>
        </div>

        <!-- ── Quick Guide Jump Switcher ── -->
        <div class="guide-nav-bar" id="guideNavBar">
          <div class="guide-nav-progress" aria-hidden="true"><span id="guideNavProgress"></span></div>
          <div class="guide-nav-label">
            <span class="guide-mono-tag" style="margin-bottom:0">// PILIH BAB PANDUAN</span>
          </div>
          <div class="guide-nav-pills" id="guideNavPills">
            <a href="#trackingFlowSection" class="guide-nav-pill-btn active" id="pillNavTracking">
              <span class="guide-pill-index">01</span>
              <span class="guide-pill-label">Alur Pelacakan</span>
            </a>
            <a href="#traccarGuideSection" class="guide-nav-pill-btn" id="pillNavTraccar">
              <span class="guide-pill-index">02</span>
              <span class="guide-pill-label">Setup Traccar</span>
            </a>
            <a href="#rosterGuideSection" class="guide-nav-pill-btn" id="pillNavRoster">
              <span class="guide-pill-index">03</span>
              <span class="guide-pill-label">Pendaftaran &amp; Roster</span>
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
             BAB 1: ALUR PELACAKAN LIVE TRACKING & INTERVAL MARKER
             ══════════════════════════════════════════════════════════════════════════════ -->
        <section class="landing-guide-section" id="trackingFlowSection" style="margin-top:0">
          <div class="landing-guide-header">
            <div class="guide-tag-wrap">
              <span class="guide-mono-tag">// ARSITEKTUR &amp; ALUR OPERASIONAL · REAL-TIME TELEMETRY</span>
              <h2 class="guide-main-title">
                <span class="guide-chapter-num">01</span>
                <span class="guide-title-text"><span class="guide-phone-icon" aria-hidden="true">⚡</span> Alur Pelacakan Real-Time &amp; Interval Pergerakan Marker</span>
              </h2>
              <p class="guide-subtitle">
                Memahami bagaimana koordinat GPS dari smartphone rider dikirim, diproses oleh server, dan langsung menggerakkan marker pesepeda di Live Map sesuai interval yang ditentukan (10 detik atau 30 detik).
              </p>
            </div>
            <div class="guide-header-actions">
              <a href="/" data-link class="store-badge-btn" style="background:#1C3E24" title="Buka Live Map Event">
                <span>🗺️ Buka Live Map</span>
                <span>→</span>
              </a>
            </div>
          </div>

          <!-- Diagram Alur Transmisi GPS Scoped Classes -->
          <div class="guide-pipeline-box">
            <div class="guide-pipeline-kicker">
              // PIPELINE TRANSMISI KOORDINAT GPS (END-TO-END TELEMETRY)
            </div>
            <div class="guide-pipeline-grid">
              <div class="guide-pipeline-item">
                <span class="guide-pipeline-badge">1</span>
                <div class="guide-pipeline-title">📱 Smartphone Rider</div>
                <div class="guide-pipeline-desc">
                  Mengunci satelit GPS via <strong>Traccar Client</strong> atau <strong>Cockpit</strong>, memancarkan koordinat via OsmAnd HTTP port <code>5055</code> setiap <strong>10s</strong> atau <strong>30s</strong>.
                </div>
              </div>

              <div class="guide-pipeline-item">
                <span class="guide-pipeline-badge">2</span>
                <div class="guide-pipeline-title">🛡️ Server CycloPon</div>
                <div class="guide-pipeline-desc">
                  Mencocokkan Device ID dengan nomor BIB rider, menghitung jarak tempuh &amp; status COT, lalu mencatat telemetri ke database SQLite WAL.
                </div>
              </div>

              <div class="guide-pipeline-item">
                <span class="guide-pipeline-badge">3</span>
                <div class="guide-pipeline-title">📡 Broadcast Real-Time</div>
                <div class="guide-pipeline-desc">
                  Data disalurkan serentak via WebSocket Fan-Out Stream ke ribuan browser penonton &amp; panitia tanpa perlu me-refresh halaman.
                </div>
              </div>

              <div class="guide-pipeline-item active-node">
                <span class="guide-pipeline-badge">4</span>
                <div class="guide-pipeline-title">🚴 Live Map Penonton</div>
                <div class="guide-pipeline-desc">
                  Marker berpindah posisi mengikuti interval secara mulus berkat transisi interpolasi animasi lunak (CSS sliding animation).
                </div>
              </div>
            </div>
          </div>

          <div class="guide-steps-grid">
            <div class="guide-step-card primary-step">
              <div class="step-card-num">POIN PENTING 1</div>
              <div class="step-card-title">Mengatur Interval (10 Detik vs 30 Detik)</div>
              <p class="step-card-desc">
                Pada aplikasi Traccar Client di menu <strong>Settings</strong>:
              </p>
              <ul class="step-checklist">
                <li><strong>Interval 10 Detik:</strong> Sangat responsif, sangat cocok untuk event balap criterium, gravel, atau segmen tanjakan KOM/QOM.</li>
                <li><strong>Interval 30 Detik:</strong> Sangat hemat baterai, sangat ideal untuk event ultra-cycling (200km, 300km, 400km, 600km, hingga 1200km).</li>
                <li><strong>Distance: Wajib diset 0 meter</strong> agar transmisi posisi murni mengikuti interval detik dan tidak tertahan saat kecepatan rendah.</li>
              </ul>
            </div>

            <div class="guide-step-card alert-step">
              <div class="step-card-num">POIN PENTING 2</div>
              <div class="step-card-title">Izin Latar Belakang (Agar Marker Tidak Berhenti)</div>
              <p class="step-card-desc">
                Penyebab paling sering rider marker berhenti bergerak saat gowes adalah <strong>Android mematikan GPS saat layar mati</strong>:
              </p>
              <div class="step-warning-box">
                <strong>WAJIB: Izin Lokasi "Allow all the time"</strong><br>
                Saat mengaktifkan saklar Continuous tracking, pilih <strong>"Allow all the time"</strong> (Izinkan sepanjang waktu). Jika memilih "Only while using app", GPS otomatis mati begitu smartphone dimasukkan ke saku jersey!
              </div>
            </div>

            <div class="guide-step-card">
              <div class="step-card-num">POIN PENTING 3</div>
              <div class="step-card-title">Kesesuaian Device Identifier (BIB)</div>
              <p class="step-card-desc">
                Pastikan <strong>Device identifier</strong> di aplikasi Traccar Client Anda sesuai dengan nomor BIB yang terdaftar:
              </p>
              <div class="step-bib-example">
                <span class="bib-pill">BIB-001</span>
                <span class="bib-sep">atau</span>
                <span class="bib-pill">001</span>
              </div>
              <div class="step-card-hint" style="margin-top:8px">
                ✅ Sistem CycloPon secara cerdas mengenali variasi <code>BIB-001</code>, <code>001</code>, maupun <code>1</code>.
              </div>
            </div>

            <div class="guide-step-card primary-step">
              <div class="step-card-num">POIN PENTING 4</div>
              <div class="step-card-title">Cara Fokus Memantau di Live Map</div>
              <p class="step-card-desc">
                Agar peta otomatis mengikuti pergerakan pesepeda Anda di layar:
              </p>
              <ul class="step-checklist">
                <li>Buka Live Map event via menu <strong>Live Map</strong>.</li>
                <li>Klik nama Anda pada <strong>Leaderboard</strong> di sidebar kanan.</li>
                <li>Peta akan mengunci kamera dan mengikuti pergerakan sepeda secara otomatis (Auto-Follow).</li>
                <li>Bisa juga langsung membuka tautan personal: <code>/watch/{eventId}?bib={nomorBIB}</code>.</li>
              </ul>
            </div>

            <div class="guide-step-card">
              <div class="step-card-num">POIN PENTING 5</div>
              <div class="step-card-title">Marker Sweeper &amp; Virtual Cut-Off Time (COT)</div>
              <p class="step-card-desc">
                Live Map dilengkapi marker pemandu batas waktu Cut-Off Time:
              </p>
              <ul class="step-checklist">
                <li><strong>Broom Wagon Virtual:</strong> Marker mobil sweeper melaju di rute GPX sesuai batas waktu resmi finish.</li>
                <li><strong>Zona Aman:</strong> Jika marker sepeda Anda berada di <em>depan</em> marker Virtual COT, Anda berada dalam zona aman dan tidak berisiko diskualifikasi DNF.</li>
                <li><strong>Estimasi WIB:</strong> Posisi virtual COT dihitung presisi berdasarkan waktu WIB dan kecepatan rata-rata minimal event.</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- ══════════════════════════════════════════════════════════════════════════════
             BAB 2: PANDUAN SETUP SMARTPHONE RIDER (TRACCAR CLIENT)
             ══════════════════════════════════════════════════════════════════════════════ -->
        <section class="landing-guide-section" id="traccarGuideSection">
          <div class="landing-guide-header">
            <div class="guide-tag-wrap">
              <span class="guide-mono-tag">// PANDUAN APLIKASI · PESEPEDA (RIDER)</span>
              <h2 class="guide-main-title">
                <span class="guide-chapter-num">02</span>
                <span class="guide-title-text"><span class="guide-phone-icon" aria-hidden="true">📲</span> Cara Menghubungkan GPS Smartphone (Traccar Client)</span>
              </h2>
              <p class="guide-subtitle">
                Pesepeda cukup menggunakan aplikasi gratis <strong>Traccar Client</strong> resmi.
                Layar HP bisa dimatikan sepenuhnya dan disimpan aman di saku jersey selama bersepeda.
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

          <!-- ── Visual Step-by-Step Guide with Real Screenshots ── -->
          <div class="guide-visual-card">
            <div class="guide-phone-frame" data-src="/img/traccar-guide/traccar-settings-full.png" data-caption="Menu Settings Traccar Client: Konfigurasi Server URL, Device Identifier (Nomor BIB), Akurasi Satelit, dan Interval Detik" title="Klik untuk memperbesar screenshot">
              <img src="/img/traccar-guide/traccar-settings-full.png" alt="Screenshot Menu Settings Traccar Client" class="guide-phone-img" loading="lazy">
              <div class="guide-zoom-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="11" y1="8" x2="11" y2="14"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
                <span>Perbesar Gambar</span>
              </div>
            </div>

            <div class="guide-step-body">
              <div class="step-card-num">// LANGKAH 1 &amp; 2 DARI 4 · PENGATURAN PARAMETER GPS</div>
              <h3 class="step-card-title">Buka Menu Settings &amp; Isi Parameter Server</h3>
              <p class="step-card-desc">
                Buka aplikasi Traccar Client di ponsel Anda, lalu ketuk menu <strong>Settings</strong> (ikon setelan). Sesuaikan setiap parameter dengan panduan visual di samping:
              </p>

              <div class="guide-callout-list">
                <div class="guide-callout-row">
                  <span class="guide-callout-bullet sage">1</span>
                  <div class="guide-callout-text">
                    <div class="guide-callout-title">Server URL (Endpoint OsmAnd CycloPon)</div>
                    <div>Masukkan alamat server resmi CycloPon berikut (gunakan HTTPS tanpa port khusus):</div>
                    <div class="step-code-box" style="margin:8px 0 6px">
                      <code id="traccarServerUrlDisplay">${traccarServerUrl}</code>
                      <button id="btnCopyServerUrl" class="btn-copy-code" title="Salin ke Clipboard">
                        <span id="copyUrlText">Salin URL</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div class="guide-callout-row">
                  <span class="guide-callout-bullet sage">2</span>
                  <div class="guide-callout-text">
                    <div class="guide-callout-title">Device identifier (Nomor BIB Peserta)</div>
                    <div>Ganti angka acak bawaan dengan <strong>Nomor BIB</strong> resmi Anda yang terdaftar:</div>
                    <div class="step-bib-example" style="margin:6px 0">
                      <span class="bib-pill">BIB-001</span>
                      <span class="bib-sep">atau angka murni</span>
                      <span class="bib-pill">001</span>
                    </div>
                    <div style="font-size:11.5px;color:#64748B">
                      💡 <em>Sistem otomatis mengenali format BIB-001 maupun 001.</em>
                      <a href="/rider" data-link style="color:#1C3E24;font-weight:700;margin-left:6px;text-decoration:underline">Cek Nomor BIB Anda →</a>
                    </div>
                  </div>
                </div>

                <div class="guide-callout-row">
                  <span class="guide-callout-bullet green">3</span>
                  <div class="guide-callout-text">
                    <div class="guide-callout-title">Location accuracy &amp; Interval Detik</div>
                    <ul class="step-checklist" style="margin-top:6px">
                      <li><strong>Location accuracy:</strong> Pilih <code>High</code> atau <code>Highest</code> untuk akurasi antena satelit GPS maksimal.</li>
                      <li><strong>Interval:</strong> Isi <code>10</code> detik (balap/sprint/tanjakan) atau <code>30</code> detik (ultra cycling/brevet 200km–1200km, sangat hemat baterai).</li>
                      <li><strong>Distance:</strong> Wajib isi <code>0</code> meter agar koordinat tetap terkirim saat berhenti di lampu merah / pos istirahat.</li>
                    </ul>
                  </div>
                </div>

                <div class="guide-callout-row">
                  <span class="guide-callout-bullet green">4</span>
                  <div class="guide-callout-text">
                    <div class="guide-callout-title">Offline Buffering (Anti Blank Spot)</div>
                    <div>
                      Aktifkan centang <strong>Offline buffering: ON</strong> agar smartphone tetap merekam rute di memori internal saat melewati rute tanpa sinyal seluler, dan otomatis diunggah begitu sinyal pulih.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Visual Step 2: Continuous Tracking Activation & Signal Test -->
          <div class="guide-visual-card">
            <div class="guide-phone-frame" data-src="/img/traccar-guide/traccar-continuous-tracking.png" data-caption="Layar Utama Traccar Client: Menyalakan Saklar Continuous Tracking dan Tombol Uji Kirim Lokasi" title="Klik untuk memperbesar screenshot">
              <img src="/img/traccar-guide/traccar-continuous-tracking.png" alt="Screenshot Layar Utama Traccar Client" class="guide-phone-img" loading="lazy">
              <div class="guide-zoom-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="11" y1="8" x2="11" y2="14"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
                <span>Perbesar Gambar</span>
              </div>
            </div>

            <div class="guide-step-body">
              <div class="step-card-num">// LANGKAH 3 DARI 4 · AKTIVASI PEMANCAR GPS</div>
              <h3 class="step-card-title">Nyalakan Saklar Continuous Tracking &amp; Uji Sinyal</h3>
              <p class="step-card-desc">
                Kembali ke layar utama Traccar Client dengan menekan tombol kembali (Back). Nyalakan saklar pemancar koordinat:
              </p>

              <div class="guide-callout-list">
                <div class="guide-callout-row">
                  <span class="guide-callout-bullet green">1</span>
                  <div class="guide-callout-text">
                    <div class="guide-callout-title">Geser Saklar "Continuous tracking" ke ON</div>
                    <div>
                      Sentuh toggle saklar hingga bergeser ke kanan dan berwarna <strong>Hijau</strong>.
                    </div>
                  </div>
                </div>

                <div class="guide-callout-row">
                  <span class="guide-callout-bullet green">2</span>
                  <div class="guide-callout-text">
                    <div class="guide-callout-title">Verifikasi Status Berubah Menjadi "Service started"</div>
                    <div>
                      Lihat baris paling atas pada layar aplikasi. Status harus bertuliskan <strong style="color:#166534">Service started</strong>. Jika masih tertulis <em>Service stopped</em>, matikan dan nyalakan saklar sekali lagi.
                    </div>
                  </div>
                </div>

                <div class="guide-callout-row">
                  <span class="guide-callout-bullet sage">3</span>
                  <div class="guide-callout-text">
                    <div class="guide-callout-title">Tekan Tombol "Send location" untuk Uji Coba Awal</div>
                    <div>
                      Tekan tombol <strong>"Send location"</strong> satu kali untuk mengirimkan koordinat perdana ke server CycloPon secara manual.
                    </div>
                  </div>
                </div>

                <div class="guide-callout-row">
                  <span class="guide-callout-bullet blue">4</span>
                  <div class="guide-callout-text">
                    <div class="guide-callout-title">Marker Langsung Aktif di Live Map</div>
                    <div>
                      Buka tautan <strong>Live Map</strong> di browser penonton atau perangkat panitia. Marker dengan nomor BIB Anda akan langsung muncul di garis start atau posisi GPS terkini Anda!
                    </div>
                  </div>
                </div>
              </div>

              <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:12px 14px;margin-top:14px;font-size:12.5px;color:#166534;line-height:1.5">
                🎉 <strong>HP Siap Masuk Jersey:</strong> Setelah status "Service started", layar smartphone Anda dapat dimatikan sepenuhnya dan disimpan aman di saku belakang jersey.
              </div>
            </div>
          </div>

          <!-- Visual Step 3: Crucial Android Location Permission ("Allow all the time") -->
          <div class="guide-visual-card alert-card">
            <div class="guide-phone-frame" data-src="/img/traccar-guide/traccar-location-permission.png" data-caption="Dialog Izin Android: Wajib Pilih 'Allow all the time' Agar GPS Tidak Mati Saat Layar Mati" title="Klik untuk memperbesar screenshot">
              <img src="/img/traccar-guide/traccar-location-permission.png" alt="Screenshot Izin Lokasi Android Allow all the time" class="guide-phone-img" loading="lazy">
              <div class="guide-zoom-badge" style="background:rgba(180, 83, 9, 0.9);border-color:#FCD34D">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="11" y1="8" x2="11" y2="14"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
                <span>Perbesar Gambar</span>
              </div>
            </div>

            <div class="guide-step-body">
              <div class="step-card-num" style="color:#B45309">// LANGKAH 4 DARI 4 · SANGAT KRUSIAL</div>
              <h3 class="step-card-title">Izin Lokasi Latar Belakang ("Allow all the time")</h3>
              <p class="step-card-desc">
                Penyebab nomor satu mengapa marker pesepeda "membeku" atau berhenti di peta adalah <strong>Android mematikan GPS saat layar mati</strong>. Ikuti langkah perlindungan berikut:
              </p>

              <div class="guide-callout-list">
                <div class="guide-callout-row" style="background:#FFFBEB;border-color:#FDE68A">
                  <span class="guide-callout-bullet amber">!</span>
                  <div class="guide-callout-text">
                    <div class="guide-callout-title" style="color:#92400E">Wajib Pilih: "Allow all the time" (Izinkan sepanjang waktu)</div>
                    <div style="color:#78350F;line-height:1.5">
                      Saat sistem operasi ponsel memunculkan jendela dialog izin lokasi seperti gambar di samping, <strong>WAJIB ketuk pilihan paling atas: "Allow all the time"</strong>.
                    </div>
                  </div>
                </div>

                <div class="guide-callout-row" style="background:#FEF2F2;border-color:#FECACA">
                  <span class="guide-callout-bullet red">✕</span>
                  <div class="guide-callout-text">
                    <div class="guide-callout-title" style="color:#991B1B">Hindari Memilih "Only while using the app"</div>
                    <div style="color:#7F1D1D;line-height:1.5">
                      Jika Anda memilih opsi ini, Android akan <strong>langsung memutus sinyal GPS</strong> begitu Anda menekan tombol power untuk mematikan layar atau memasukkan ponsel ke kantong jersey!
                    </div>
                  </div>
                </div>

                <div class="guide-callout-row" style="background:#FEFCE8;border-color:#FEF08A">
                  <span class="guide-callout-bullet sage">✓</span>
                  <div class="guide-callout-text">
                    <div class="guide-callout-title">Tips Tambahan: Nonaktifkan Optimalisasi Baterai</div>
                    <div style="color:#475569;line-height:1.5">
                      Agar aplikasi tidak dihentikan paksa oleh fitur <em>Doze Mode</em> ponsel saat gowes berjam-jam:
                      <br>Buka <em>Setelan Ponsel &gt; Aplikasi &gt; Traccar Client &gt; Baterai</em> &gt; Ubah menjadi <strong>"Tidak Dibatasi" (Unrestricted)</strong>.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ══════════════════════════════════════════════════════════════════════════════
             BAB 3: PANDUAN PENDAFTARAN & ROSTER PESERTA
             ══════════════════════════════════════════════════════════════════════════════ -->
        <section class="landing-guide-section" id="rosterGuideSection">
          <div class="landing-guide-header">
            <div class="guide-tag-wrap">
              <span class="guide-mono-tag">// PANDUAN RESMI · REGISTRASI &amp; DIREKTORI ROSTER</span>
              <h2 class="guide-main-title">
                <span class="guide-chapter-num">03</span>
                <span class="guide-title-text"><span class="guide-phone-icon" aria-hidden="true">📋</span> Panduan Pendaftaran Event &amp; Manajemen Roster</span>
              </h2>
              <p class="guide-subtitle">
                Ikuti 4 langkah mudah untuk bergabung ke event sepeda jarak jauh, mendapatkan Nomor BIB resmi &amp; Tiket Pass Digital ber-QR Code instan, serta memantau direktori peleton peserta.
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
            <!-- Step 1: Pilih Event & Akses Halaman Roster -->
            <div class="guide-step-card primary-step">
              <div class="step-card-num">LANGKAH 1</div>
              <div class="step-card-title">Pilih Event &amp; Buka Roster</div>
              <p class="step-card-desc">
                Cari event balap di daftar <strong>Event Sedang Berlangsung</strong> beranda, lalu klik tombol <strong>👥 DAFTAR &amp; ROSTER</strong> untuk membuka halaman direktori resmi.
              </p>
              <div class="step-code-box" style="background:#F8FAFC;border:1px solid #CBD5E1;color:#0D1117">
                <span style="font-size:12px;font-weight:800;color:#1C3E24">STAGE LIVE // EVENT DOSSIER</span>
                <span style="font-size:11px;background:#DCFCE7;color:#166534;padding:2px 8px;border-radius:4px;font-weight:700">PENDAFTARAN BUKA</span>
              </div>
              <div class="step-card-hint">
                💡 <em>Setiap event memiliki halaman direktori dossier yang memuat profil rute GPX, pos checkpoint, dan daftar rider terdaftar.</em>
              </div>
            </div>

            <!-- Step 2: Pendaftaran Mandiri (On-The-Spot) -->
            <div class="guide-step-card">
              <div class="step-card-num">LANGKAH 2</div>
              <div class="step-card-title">Isi Formulir Pendaftaran</div>
              <p class="step-card-desc">
                Pada halaman event, klik tombol <strong>"+ GABUNG / DAFTAR"</strong> pada bilah bawah (sticky bar) lalu lengkapi data singkat berikut:
              </p>
              <ul class="step-checklist">
                <li><strong>Nama Lengkap:</strong> Ditampilkan di Leaderboard &amp; Live Radar.</li>
                <li><strong>Nomor WhatsApp:</strong> Verifikasi &amp; 4 digit terakhir otomatis jadi PIN login.</li>
                <li><strong>Kategori / Peran:</strong>
                  <div class="sub-switches" style="flex-wrap:wrap;margin-top:4px">
                    <span class="switch-badge" style="background:#E0F2FE;color:#0369A1">🚴 Rider</span>
                    <span class="switch-badge" style="background:#FEF3C7;color:#92400E">🧹 Sweeper</span>
                    <span class="switch-badge" style="background:#F3E8FF;color:#6B21A8">🏍️ Marshall</span>
                    <span class="switch-badge" style="background:#FEE2E2;color:#991B1B">🚑 Medis</span>
                  </div>
                </li>
                <li><strong>Nomor BIB:</strong> Bebas menentukan nomor start pilihan, atau kosongkan untuk nomor urut otomatis sistem (contoh: <code>001</code>, <code>002</code>).</li>
              </ul>
            </div>

            <!-- Step 3: Tiket Pass Digital & QR Code -->
            <div class="guide-step-card primary-step">
              <div class="step-card-num">LANGKAH 3 (INSTAN)</div>
              <div class="step-card-title">Terbit Tiket Pass Digital &amp; QR Code</div>
              <p class="step-card-desc">
                Setelah formulir dikirim, sistem otomatis menerbitkan <strong>Tiket Pass Digital</strong> resmi:
              </p>
              <!-- Sleek Scoped Ticket Preview -->
              <div class="guide-mini-ticket">
                <div class="guide-mini-ticket-top">
                  <span class="guide-mini-ticket-kicker">DIGITAL PASS // OFFICIAL TICKET</span>
                  <span style="font-size:14px">🎟️</span>
                </div>
                <div class="guide-mini-ticket-bib">#BIB-001</div>
                <div class="guide-mini-ticket-meta">
                  <span>PIN Keamanan: <strong>1234</strong></span>
                  <span class="guide-ticket-status">✓ TERKONFIRMASI</span>
                </div>
              </div>
              <p class="step-card-desc" style="margin:0 0 6px">
                Gunakan tombol <strong>"🚀 Buka Pelacak GPS Rider"</strong> untuk langsung masuk cockpit tanpa login manual, atau klik <strong>"Simpan QR (PNG)"</strong> ke galeri HP.
              </p>
            </div>

            <!-- Step 4: Pantau Direktori Roster & Pos Checkpoint (COT) -->
            <div class="guide-step-card">
              <div class="step-card-num">LANGKAH 4</div>
              <div class="step-card-title">Pantau Roster &amp; Batas Waktu COT</div>
              <p class="step-card-desc">
                Akses informasi lengkap event langsung dari direktori telemetri:
              </p>
              <ul class="step-checklist">
                <li>
                  <strong>👥 Tab Daftar Peserta:</strong> Cek seluruh pesepeda terdaftar dengan badge verifikasi resmi. Filter berdasarkan peran peserta atau cari nama/BIB dengan cepat.
                </li>
                <li>
                  <strong>🗺️ Tab Rute &amp; Pos CP:</strong> Pantau jarak kilometer tiap pos kontrol dan batas waktu kedatangan <em>Cut-Off Time (COT)</em> agar tidak terkena diskualifikasi DNF.
                </li>
                <li>
                  <strong>📥 Unduh GPX Resmi:</strong> Unduh file rute GPX resmi untuk disinkronkan ke bike computer (Garmin, Wahoo, Bryton, Hammerhead).
                </li>
              </ul>
            </div>
          </div>

          <!-- Dual Callout Banner: Admin CSV Import -->
          <div class="guide-dual-callout" style="margin-top:24px">
            <div class="guide-callout-card admin-callout" style="flex:1">
              <div class="callout-card-header">
                <span class="callout-card-icon">📁</span>
                <div>
                  <div class="callout-card-title">Untuk Panitia: Registrasi Massal (Import CSV)</div>
                  <div class="callout-card-desc">
                    Panitia pelaksana dapat mengunggah ratusan peserta sekaligus via <strong>Panel Panitia (/admin)</strong> menggunakan template CSV dengan format: <code>bib,nama,no_hp,peran,pin</code>.
                  </div>
                </div>
              </div>
              <a href="/admin" data-link class="btn-callout-action">
                <span>Buka Panel Panitia</span>
                <span>↗</span>
              </a>
            </div>
          </div>
        </section>

        <!-- ══════════════════════════════════════════════════════════════════════════════
             BAB 4: RIDER COCKPIT HUD & MODE KANTONG JERSEY
             ══════════════════════════════════════════════════════════════════════════════ -->
        <section class="landing-guide-section" id="cockpitGuideSection">
          <div class="landing-guide-header">
            <div class="guide-tag-wrap">
              <span class="guide-mono-tag">// IN-BROWSER HUD · SPEEDOMETER &amp; POCKET TRACKER</span>
              <h2 class="guide-main-title">
                <span class="guide-chapter-num">04</span>
                <span class="guide-title-text"><span class="guide-phone-icon" aria-hidden="true">🚴</span> Rider Cockpit HUD &amp; Mode Kantong Jersey</span>
              </h2>
              <p class="guide-subtitle">
                Solusi pelacakan GPS langsung dari browser tanpa perlu menginstal aplikasi pihak ketiga.
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
              <div class="step-card-title">Cockpit di Handlebar Sepeda</div>
              <p class="step-card-desc">
                Jika smartphone dipasang pada dudukan mount stang/handlebar:
              </p>
              <ul class="step-checklist">
                <li>Buka menu <strong>/rider/cockpit</strong>.</li>
                <li>Aktifkan <strong>💡 Layar ON (Wake Lock)</strong> agar layar tidak mati atau terkunci otomatis selama bersepeda.</li>
                <li>Nikmati tampilan speedometer digital besar, estimasi jarak ke checkpoint berikutnya, dan visualisasi rute peta.</li>
              </ul>
            </div>

            <div class="guide-step-card">
              <div class="step-card-num">FITUR 2</div>
              <div class="step-card-title">Mode Kantong Jersey (Layar Dikunci)</div>
              <p class="step-card-desc">
                Jika ingin menghemat daya dan mengantongi HP di saku jersey:
              </p>
              <ul class="step-checklist">
                <li>Klik tombol <strong>🎒 Mode Kantong Jersey</strong> di Cockpit atau Rider Hub.</li>
                <li>Sistem memutar loop audio sunyi berspesialisasi latar belakang yang menjaga browser tetap aktif mengirim titik GPS saat layar HP dimatikan.</li>
                <li>Data posisi otomatis disimpan sementara (offline queue) saat melewati daerah tanpa sinyal seluler.</li>
              </ul>
            </div>

            <div class="guide-step-card">
              <div class="step-card-num">FITUR 3</div>
              <div class="step-card-title">Peringatan Suara Deviasi Rute (Off-Route Alarm)</div>
              <p class="step-card-desc">
                Sistem peringatan cerdas navigasi sepeda:
              </p>
              <ul class="step-checklist">
                <li>Mendeteksi otomatis jika rider menyimpang &gt;50 meter dari jalur resmi GPX event.</li>
                <li>Memutar alarm nada stereo dan menampilkan banner peringatan oranye deviasi jalur.</li>
                <li>Rider dapat membisukan (mute) sementara suara alarm, dan sistem otomatis pulih tenang begitu rider kembali ke jalur resmi.</li>
              </ul>
            </div>

            <div class="guide-step-card alert-step">
              <div class="step-card-num">FITUR 4</div>
              <div class="step-card-title">Tombol Darurat SOS &amp; Koordinasi Medis/Sweeper</div>
              <p class="step-card-desc">
                Fasilitas keselamatan gowes jarak jauh:
              </p>
              <ul class="step-checklist">
                <li>Tombol SOS darurat satu sentuhan langsung di Cockpit untuk melaporkan kecelakaan, masalah teknis/mekanikal, atau kelelahan fisik.</li>
                <li>Mengirim koordinat GPS presisi terkini secara instan ke layar komando panitia, ambulans medis, dan tim marshall.</li>
                <li>Menghubungkan tombol panggilan cepat WhatsApp panitia darurat.</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- ══════════════════════════════════════════════════════════════════════════════
             BAB 5: TANYA JAWAB & KENDALA UMUM (FAQ / TROUBLESHOOTING)
             ══════════════════════════════════════════════════════════════════════════════ -->
        <section class="landing-guide-section" id="faqGuideSection">
          <div class="landing-guide-header">
            <div class="guide-tag-wrap">
              <span class="guide-mono-tag">// BANTUAN OPERASIONAL &amp; SOLUSI CEPAT</span>
              <h2 class="guide-main-title">
                <span class="guide-chapter-num">05</span>
                <span class="guide-title-text"><span class="guide-phone-icon" aria-hidden="true">❓</span> Tanya Jawab &amp; Kendala Umum (FAQ)</span>
              </h2>
              <p class="guide-subtitle">
                Pertanyaan yang paling sering diajukan oleh pesepeda dan panitia lapangan beserta solusi langkah demi langkah.
              </p>
            </div>
          </div>

          <div class="guide-faq-grid">
            <div class="guide-faq-card">
              <div class="guide-faq-q">
                <span class="guide-faq-q-icon">⚠️</span>
                <span>Marker saya tidak bergerak atau membeku di Live Map, apa solusinya?</span>
              </div>
              <p class="guide-faq-a">
                <strong>1.</strong> Buka aplikasi Traccar Client, pastikan saklar <em>Continuous tracking</em> dalam kondisi <strong>ON</strong> (bertuliskan <code>Service started</code>).<br>
                <strong>2.</strong> Buka pengaturan izin lokasi di Android, wajib ubah menjadi <strong>"Allow all the time"</strong> (Izinkan sepanjang waktu), bukan "Only while using the app".<br>
                <strong>3.</strong> Pastikan nomor pada <em>Device identifier</em> sama persis dengan nomor BIB yang terdaftar (contoh: <code>BIB-001</code> atau <code>001</code>).<br>
                <strong>4.</strong> Matikan mode hemat daya ekstrem (Battery Saver/Doze Mode) untuk Traccar Client.
              </p>
            </div>

            <div class="guide-faq-card">
              <div class="guide-faq-q">
                <span class="guide-faq-q-icon">🔋</span>
                <span>Bagaimana cara menghemat baterai HP untuk gowes ultra (200km–1200km)?</span>
              </div>
              <p class="guide-faq-a">
                <strong>1.</strong> Di menu <em>Settings</em> Traccar Client, atur <strong>Interval</strong> ke <code>30</code> detik (menghemat baterai hingga 70% dibanding interval 10 detik).<br>
                <strong>2.</strong> Matikan layar HP sepenuhnya dan simpan ponsel di saku belakang jersey.<br>
                <strong>3.</strong> Turunkan tingkat kecerahan layar jika menggunakan Cockpit di mount stang sepeda.<br>
                <strong>4.</strong> Siapkan powerbank kecil (5.000–10.000 mAh) di top-tube bag untuk pengisian daya saat melintasi pos kontrol checkpoint.
              </p>
            </div>

            <div class="guide-faq-card">
              <div class="guide-faq-q">
                <span class="guide-faq-q-icon">🚴</span>
                <span>Apakah bisa memakai Traccar Client bersamaan dengan Garmin / Wahoo / Strava?</span>
              </div>
              <p class="guide-faq-a">
                <strong>Ya, 100% kompatibel dan sangat dianjurkan!</strong><br>
                Satelit GPS pada smartphone bekerja secara pasif di latar belakang dan tidak mengganggu sinkronisasi Bluetooth sensor kecepatan/cadence/heart rate ke bike computer Garmin, Wahoo, Bryton, maupun aplikasi Strava.
              </p>
            </div>

            <div class="guide-faq-card">
              <div class="guide-faq-q">
                <span class="guide-faq-q-icon">📶</span>
                <span>Bagaimana jika melewati daerah blank spot tanpa sinyal internet?</span>
              </div>
              <p class="guide-faq-a">
                Jangan khawatir! Aktifkan opsi <strong>Offline buffering: ON</strong> di menu Settings Traccar Client atau gunakan fitur Mode Kantong Jersey di Rider Cockpit.<br>
                Seluruh titik koordinat rute Anda akan disimpan rapi di memori lokal ponsel dan langsung terkirim serentak ke server begitu Anda kembali mendapatkan sinyal seluler.
              </p>
            </div>

            <div class="guide-faq-card">
              <div class="guide-faq-q">
                <span class="guide-faq-q-icon">🧹</span>
                <span>Apa itu marker Sweeper / Virtual COT di Live Map?</span>
              </div>
              <p class="guide-faq-a">
                Marker <strong>Virtual COT (Cut-Off Time)</strong> adalah sweeper virtual yang melaju di jalur resmi GPX mengikuti kecepatan rata-rata minimal batas waktu finish event.<br>
                Jika marker sepeda Anda berada di <em>depan</em> marker sweeper virtual, posisi Anda berada di zona aman. Jika tertinggal di belakang sweeper, waspadai risiko terkena batas waktu diskualifikasi DNF.
              </p>
            </div>

            <div class="guide-faq-card">
              <div class="guide-faq-q">
                <span class="guide-faq-q-icon">🔄</span>
                <span>Kapan harus memilih Traccar Client vs Rider Cockpit Web?</span>
              </div>
              <p class="guide-faq-a">
                Gunakan <strong>Traccar Client (Aplikasi Resmi)</strong> jika smartphone Anda ingin disimpan di saku jersey sepanjang hari (paling hemat daya dan sangat stabil di background).<br>
                Gunakan <strong>Rider Cockpit (Browser Web)</strong> jika ponsel dipasang di mount stang/handlebar dan Anda butuh speedometer besar, profil tanjakan elevasi, serta alarm suara deviasi rute.
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

      <!-- ── Footer ── -->
      <footer class="landing-footer">
        <div class="footer-left">
          <span class="footer-brand">CYCLOPON PRO</span>
          <span class="footer-sep">·</span>
          <span class="footer-copy">© 2026 CYCLOPON. HAK CIPTA DILINDUNGI.</span>
        </div>
        <div class="footer-right">
          <a href="/" data-link style="color:var(--text-secondary);text-decoration:none;margin-right:16px;font-size:12px;font-weight:700">← Kembali ke Beranda</a>
          <span class="footer-spec-badge">OPEN PROTOCOL 5055</span>
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
          if (copyText) copyText.textContent = 'Salin URL';
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
    // Last chapter is short: keep it active once the page bottom is reached.
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
