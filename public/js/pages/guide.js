/**
 * CycloPon Official User & Rider Documentation Hub (/guide & /panduan)
 * Comprehensive guides for Rider Registration, Traccar Client GPS Setup, Real-Time Telemetry Tracking & Race Management.
 */

function buildGuideContentHtml(traccarServerUrl, options = {}) {
  const embedded = Boolean(options.embedded);

  const heroIntroMarkup = embedded ? `
    <div class="guide-hero-inner guide-embedded-intro">
      <span class="guide-hero-kicker">// DOKUMENTASI RINGKAS HARI-H</span>
      <h2 class="guide-hero-title">Panduan Cepat CycloPon <span>Rider &amp; Penonton</span></h2>
      <p class="guide-hero-lead">
        Buka tab <strong>"Pendaftaran &amp; Roster"</strong> di atas untuk mendapatkan nomor BIB dan mengonfigurasi GPS Traccar di ponsel secara otomatis dalam 1 klik.
      </p>
      <div class="guide-hero-meta">
        <span class="guide-meta-chip">Live Tracking (10s/30s)</span>
        <span class="guide-meta-chip">1-Klik Daftar &amp; Traccar</span>
        <span class="guide-meta-chip">Cockpit HUD</span>
        <span class="guide-meta-chip">Solusi Cepat</span>
      </div>

      <!-- Hero Search Box for Instant Topic Lookup -->
      <div class="guide-search-box">
        <svg class="guide-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="search" id="guideSearchInput" class="guide-search-input" placeholder="Cari cepat (misal: daftar, traccar, izin baterai, bib, zoom, cot)..." autocomplete="off" aria-label="Cari panduan">
        <button type="button" id="guideSearchClear" class="guide-search-clear" aria-label="Bersihkan pencarian" style="display:none">✕</button>
      </div>
      <div id="guideSearchFeedback" class="guide-search-feedback" role="status" aria-live="polite" style="display:none"></div>
    </div>
  ` : `
    <div class="guide-hero-inner">
      <div class="guide-breadcrumb">
        <a href="/" data-link>Beranda</a>
        <span aria-hidden="true">/</span>
        <span>Panduan Pengguna</span>
      </div>
      <span class="guide-hero-kicker">// DOKUMENTASI RINGKAS HARI-H</span>
      <h1 class="guide-hero-title">Panduan Cepat CycloPon<br><span>Rider &amp; Penonton</span></h1>
      <p class="guide-hero-lead">
        Cukup klik tombol <strong>"DAFTAR"</strong> di header atas untuk mendapatkan nomor BIB dan mengonfigurasi GPS Traccar di ponsel secara otomatis dalam 1 klik.
      </p>
      <div class="guide-hero-meta">
        <span class="guide-meta-chip">Live Tracking (10s/30s)</span>
        <span class="guide-meta-chip">1-Klik Daftar &amp; Traccar</span>
        <span class="guide-meta-chip">Cockpit HUD</span>
        <span class="guide-meta-chip">Solusi Cepat</span>
      </div>

      <!-- Hero Search Box for Instant Topic Lookup -->
      <div class="guide-search-box">
        <svg class="guide-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="search" id="guideSearchInput" class="guide-search-input" placeholder="Cari cepat (misal: daftar, traccar, izin baterai, bib, zoom, cot)..." autocomplete="off" aria-label="Cari panduan">
        <button type="button" id="guideSearchClear" class="guide-search-clear" aria-label="Bersihkan pencarian" style="display:none">✕</button>
      </div>
      <div id="guideSearchFeedback" class="guide-search-feedback" role="status" aria-live="polite" style="display:none"></div>
    </div>
  `;

  const openRegHeaderAction = embedded
    ? `<button type="button" class="store-badge-btn" style="background:#1C3E24" data-guide-action="open-register" title="Buka Tab Pendaftaran Event"><span>Buka Pendaftaran</span></button>`
    : `<a href="/register" data-link class="store-badge-btn" style="background:#1C3E24" title="Daftar Sekarang"><span>Buka DAFTAR</span></a>`;

  const openRegStepAction = embedded
    ? `<button type="button" class="btn-callout-action" style="margin-top:auto" data-guide-action="open-register"><span>Menuju Formulir Pendaftaran</span></button>`
    : `<a href="/register" data-link class="btn-callout-action" style="margin-top:auto"><span>Menuju Formulir Pendaftaran</span></a>`;

  const bab2Subtitle = embedded
    ? `Tidak perlu mengetik konfigurasi manual! Cukup buka tab <strong>"Pendaftaran &amp; Roster"</strong>, nomor BIB terbit otomatis, dan Traccar langsung terkonfigurasi dalam 1 klik.`
    : `Tidak perlu mengetik konfigurasi manual! Cukup klik tombol <strong>"DAFTAR"</strong> di header, nomor BIB terbit otomatis, dan Traccar langsung terkonfigurasi dalam 1 klik.`;

  const bab2Step1Title = embedded ? 'Buka Tab "Pendaftaran &amp; Roster"' : 'Klik "DAFTAR" di Header Atas';
  const bab2Step1Lead = embedded
    ? 'Pilih tab <strong>"Pendaftaran &amp; Roster"</strong> di bagian atas halaman ini.'
    : 'Klik tombol <strong>"DAFTAR"</strong> di bar header atas (atau buka <code>/register</code>).';

  return `
    ${heroIntroMarkup}

    <!-- ── Quick Guide Jump Switcher (4 Clean Chapters) ── -->
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
          <span class="guide-pill-label">Daftar &amp; Auto Traccar</span>
        </a>
        <a href="#cockpitGuideSection" class="guide-nav-pill-btn" id="pillNavCockpit">
          <span class="guide-pill-index">03</span>
          <span class="guide-pill-label">Rider Cockpit</span>
        </a>
        <a href="#faqGuideSection" class="guide-nav-pill-btn" id="pillNavFaq">
          <span class="guide-pill-index">04</span>
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
            <span class="guide-title-text">Alur Pelacakan Real-Time &amp; Kontrol Peta</span>
          </h2>
          <p class="guide-subtitle">
            GPS smartphone memancarkan koordinat secara berkala. Server menghitung jarak tempuh &amp; posisi rute, lalu memindahkan marker sepeda di peta penonton tanpa reload.
          </p>
        </div>
        <div class="guide-header-actions">
          <a href="/" data-link class="store-badge-btn" style="background:#1C3E24" title="Buka Live Map Event">
            <span>Buka Live Map</span>
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
            <div class="guide-pipeline-title">Smartphone Rider</div>
            <div class="guide-pipeline-desc">
              Traccar Client memancarkan koordinat via HTTP port <code>5055</code> tiap <strong>10s</strong> (balap) atau <strong>30s</strong> (ultra).
            </div>
          </div>

          <div class="guide-pipeline-item">
            <span class="guide-pipeline-badge">2</span>
            <div class="guide-pipeline-title">Server CycloPon</div>
            <div class="guide-pipeline-desc">
              Mencocokkan Device ID dengan BIB, menghitung jarak tempuh rute (KM), dan memvalidasi batas waktu Cut-Off Time (COT).
            </div>
          </div>

          <div class="guide-pipeline-item">
            <span class="guide-pipeline-badge">3</span>
            <div class="guide-pipeline-title">Broadcast Instan</div>
            <div class="guide-pipeline-desc">
              Data disalurkan serentak via WebSocket Fan-Out ke seluruh browser penonton &amp; panitia tanpa perlu me-refresh halaman.
            </div>
          </div>

          <div class="guide-pipeline-item active-node">
            <span class="guide-pipeline-badge">4</span>
            <div class="guide-pipeline-title">Live Map Penonton</div>
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
            <li><strong>Pusatkan Kamera:</strong> 1x klik kunci rider (zoom 15); klik ke-2 tampilkan seluruh rute event.</li>
            <li><strong>Zoom Pill Vertikal (+ / −):</strong> Tombol zoom mandiri di sisi kanan, mudah ditekan dengan jempol saat gowes.</li>
            <li><strong>Lapisan Peta &amp; Elevasi:</strong> Tombol layer dan profil elevasi rute tersedia rapi di sudut kanan.</li>
          </ul>
        </div>

        <div class="guide-step-card primary-step">
          <div class="step-card-num">INTERVAL &amp; KETENTUAN MURNI</div>
          <div class="step-card-title">Pilihan Interval Waktu (10s vs 30s)</div>
          <ul class="step-checklist">
            <li><strong>Interval 10 Detik:</strong> Sangat responsif. Cocok untuk criterium, road race, dan segmen tanjakan pendek.</li>
            <li><strong>Interval 30 Detik:</strong> Sangat hemat baterai. Sangat direkomendasikan untuk event ultra-cycling (200km–1200km).</li>
            <li><strong>Distance: Wajib 0 meter</strong> agar transmisi posisi murni berdasarkan waktu detik dan tidak tertahan saat rider pelan.</li>
            <li><strong>Tanpa Metrik Speed:</strong> Kecepatan seketika ditiadakan demi fokus pada akurasi jarak tempuh (KM) &amp; profil elevasi.</li>
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
         BAB 2: PENDAFTARAN EVENT & AUTO-SETUP TRACCAR (1-KLIK)
         ══════════════════════════════════════════════════════════════════════════════ -->
    <section class="landing-guide-section" id="traccarGuideSection">
      <div class="landing-guide-header">
        <div class="guide-tag-wrap">
          <span class="guide-mono-tag">// ALUR TERCEPAT PESERTA · 1-KLIK</span>
          <h2 class="guide-main-title">
            <span class="guide-chapter-num">02</span>
            <span class="guide-title-text">Pendaftaran Event &amp; Auto-Setup Traccar (1-Klik)</span>
          </h2>
          <p class="guide-subtitle">${bab2Subtitle}</p>
        </div>
        <div class="guide-header-actions">
          ${openRegHeaderAction}
        </div>
      </div>

      <!-- Alur 3 Langkah Kilat -->
      <div class="guide-steps-grid">
        <div class="guide-step-card primary-step">
          <div class="step-card-num">LANGKAH 1 · FORMULIR</div>
          <div class="step-card-title">${bab2Step1Title}</div>
          <ul class="step-checklist">
            <li>${bab2Step1Lead}</li>
            <li><strong>Nama &amp; WhatsApp:</strong> Masukkan nama lengkap dan nomor WhatsApp Anda.</li>
            <li><strong>PIN Akun:</strong> 4 digit terakhir nomor WA otomatis menjadi PIN akses Cockpit Anda.</li>
            <li><strong>Nomor BIB:</strong> Sistem otomatis menerbitkan nomor BIB resmi Anda di lintasan.</li>
          </ul>
          ${openRegStepAction}
        </div>

        <div class="guide-step-card primary-step">
          <div class="step-card-num">LANGKAH 2 · AUTO-SETUP 1-KLIK</div>
          <div class="step-card-title">Tekan "Buka &amp; Setting Otomatis di Traccar"</div>
          <p class="step-card-desc">
            Setelah form terkirim, Tiket Pass Digital instan muncul di layar lengkap dengan QR Code &amp; nomor BIB resmi:
          </p>
          <ul class="step-checklist">
            <li>Tekan tombol hijau besar: <strong>"Buka &amp; Setting Otomatis di Traccar Client"</strong>.</li>
            <li>Aplikasi Traccar Client di ponsel otomatis terbuka.</li>
            <li><strong>Server URL, nomor BIB, interval (30s/10s), distance 0, dan offline buffering OTOMATIS TERISI</strong> tanpa perlu mengetik satu huruf pun!</li>
            <li><em>(Jika mendaftar via laptop/PC, cukup scan QR Code dari aplikasi kamera ponsel).</em></li>
          </ul>
        </div>

        <div class="guide-step-card alert-step">
          <div class="step-card-num">LANGKAH 3 · NYALAKAN TRACKING</div>
          <div class="step-card-title">Aktivasi Continuous Tracking &amp; Izin HP</div>
          <ul class="step-checklist">
            <li>Di layar utama Traccar Client, geser saklar <strong>Continuous tracking</strong> ke posisi <strong>ON (Hijau)</strong>.</li>
            <li>Pastikan status berubah menjadi <strong style="color:#166534">"Service started"</strong>.</li>
            <li>Saat muncul izin lokasi Android, <strong>WAJIB pilih "Allow all the time"</strong>.</li>
            <li>Layar HP dapat langsung dimatikan dan dimasukkan ke saku jersey. Selesai! Posisi Anda langsung live di peta.</li>
          </ul>
          <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:8px 12px;margin-top:10px;font-size:11.5px;color:#166534">
            <strong>Bebas Repot:</strong> Tidak perlu repot input URL atau konfigurasi rumit di hari-H.
          </div>
        </div>

        <div class="guide-step-card">
          <div class="step-card-num">RUTE &amp; POS KONTROL</div>
          <div class="step-card-title">Unduh Rute GPX &amp; Pos Checkpoint (CP)</div>
          <ul class="step-checklist">
            <li><strong>Unduh GPX Resmi:</strong> Masukkan file rute resmi <code>.gpx</code> ke cyclocomp sepeda Anda (Garmin, Wahoo, Bryton) untuk navigasi belokan.</li>
            <li><strong>Pos Checkpoint:</strong> Periksa kilometer tiap pos kontrol dan batas waktu Cut-Off Time (COT) agar tidak terkena diskualifikasi DNF.</li>
            <li><strong>Pantau Roster:</strong> Pantau peleton seluruh peserta yang terdaftar pada tab Roster event.</li>
          </ul>
          <a href="/events/1" id="btnGuideOpenRoster" data-link class="btn-callout-action" style="margin-top:auto">
            <span>Buka Rute &amp; Roster Event</span>
          </a>
        </div>
      </div>

      <!-- Opsi Tambahan / Fallback Manual -->
      <div class="guide-step-card" style="margin-top:14px;background:#F8FAFC;border:1px dashed #CBD5E1">
        <div class="step-card-num">// OPSI CADANGAN · JIKA MEMERLUKAN INPUT MANUAL</div>
        <div class="step-card-title" style="font-size:13.5px">Pengaturan Manual Traccar Client (Tanpa Auto-Setup)</div>
        <div style="font-size:12.5px;color:#475569;margin-bottom:8px">
          Jika ponsel Anda tidak mendukung fitur deep link otomatis atau menggunakan perangkat GPS tracker khusus, masukkan parameter berikut di menu Settings Traccar:
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:10px">
          <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:6px;padding:10px">
            <span style="font-size:10.5px;font-weight:800;color:#64748B">SERVER URL:</span>
            <div class="step-code-box" style="margin:4px 0 0;padding:4px 8px;font-size:11px">
              <code id="traccarServerUrlDisplay">${traccarServerUrl}</code>
              <button type="button" id="btnGuideCopyServerUrl" class="btn-copy-code" title="Salin ke Clipboard" style="padding:2px 6px;font-size:9.5px">
                <span id="guideCopyUrlText">Salin</span>
              </button>
            </div>
          </div>
          <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:6px;padding:10px">
            <span style="font-size:10.5px;font-weight:800;color:#64748B">DEVICE IDENTIFIER:</span>
            <div style="font-size:12px;font-weight:800;color:#0D1117;margin-top:4px">Nomor BIB Anda (misal <code>001</code>)</div>
          </div>
          <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:6px;padding:10px">
            <span style="font-size:10.5px;font-weight:800;color:#64748B">INTERVAL &amp; DISTANCE:</span>
            <div style="font-size:12px;color:#0D1117;margin-top:4px">Interval: <code>10s</code> / <code>30s</code> · Distance: <code>0m</code></div>
          </div>
          <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:6px;padding:10px">
            <span style="font-size:10.5px;font-weight:800;color:#64748B">BUFFERING:</span>
            <div style="font-size:12px;color:#0D1117;margin-top:4px">Offline buffering: <code>ON</code></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════════════════════
         BAB 3: RIDER COCKPIT HUD (PELACAK WEB BROWSER)
         ══════════════════════════════════════════════════════════════════════════════ -->
    <section class="landing-guide-section" id="cockpitGuideSection">
      <div class="landing-guide-header">
        <div class="guide-tag-wrap">
          <span class="guide-mono-tag">// PELACAK WEB BROWSER · TANPA INSTALL APLIKASI</span>
          <h2 class="guide-main-title">
            <span class="guide-chapter-num">03</span>
            <span class="guide-title-text">Rider Cockpit HUD</span>
          </h2>
          <p class="guide-subtitle">
            Alternatif praktis pelacakan langsung dari browser smartphone dengan navigasi jalur GPX dan alarm peringatan deviasi.
          </p>
        </div>
        <div class="guide-header-actions">
          <a href="/rider" data-link class="store-badge-btn" style="background:#1C3E24" title="Buka Rider Portal">
            <span>Buka Cockpit</span>
          </a>
        </div>
      </div>

      <div class="guide-steps-grid">
        <div class="guide-step-card primary-step">
          <div class="step-card-num">FITUR 1</div>
          <div class="step-card-title">Navigasi Rute GPX &amp; Jarak Tempuh</div>
          <ul class="step-checklist">
            <li>Akses <strong>/rider/cockpit</strong> saat HP dipasang di mount stang / handlebar.</li>
            <li>Aktifkan <strong>Layar ON (Wake Lock)</strong> agar layar tidak mati otomatis saat gowes.</li>
            <li>Menampilkan kilometer jarak tempuh dan sisa jarak ke pos kontrol berikutnya.</li>
          </ul>
        </div>

        <div class="guide-step-card">
          <div class="step-card-num">FITUR 2</div>
          <div class="step-card-title">Mode Kantong Jersey (Layar Mati)</div>
          <ul class="step-checklist">
            <li>Pilih <strong>Mode Kantong Jersey</strong> untuk hemat daya maksimal.</li>
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
         BAB 4: TANYA JAWAB & SOLUSI CEPAT (FAQ)
         ══════════════════════════════════════════════════════════════════════════════ -->
    <section class="landing-guide-section" id="faqGuideSection">
      <div class="landing-guide-header">
        <div class="guide-tag-wrap">
          <span class="guide-mono-tag">// SOLUSI CEPAT KENDALA OPERASIONAL</span>
          <h2 class="guide-main-title">
            <span class="guide-chapter-num">04</span>
            <span class="guide-title-text">Tanya Jawab &amp; Solusi Cepat (FAQ)</span>
          </h2>
          <p class="guide-subtitle">
            Solusi ringkas kendala operasional yang paling sering dialami pesepeda saat hari-H.
          </p>
        </div>
      </div>

      <div class="guide-faq-grid">
        <div class="guide-faq-card">
          <div class="guide-faq-q">
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
            <span>Bisa dipakai bersamaan dengan Garmin / Wahoo / Strava?</span>
          </div>
          <p class="guide-faq-a">
            <strong>100% aman dan kompatibel!</strong> Satelit GPS smartphone bekerja pasif di latar belakang dan tidak mengganggu sinkronisasi sensor Bluetooth maupun antarmuka bike computer Anda.
          </p>
        </div>

        <div class="guide-faq-card">
          <div class="guide-faq-q">
            <span>Bagaimana jika melewati daerah blank spot tanpa sinyal internet?</span>
          </div>
          <p class="guide-faq-a">
            Aktifkan <strong>Offline buffering: ON</strong> di Traccar Client. Koordinat tetap terekam di memori ponsel dan otomatis terkirim serentak ke server begitu kembali mendapat sinyal seluler.
          </p>
        </div>

        <div class="guide-faq-card">
          <div class="guide-faq-q">
            <span>Apa arti Sweeper Virtual COT di Live Map?</span>
          </div>
          <p class="guide-faq-a">
            Sweeper virtual melaju di rute GPX sesuai batas waktu finish resmi. Rider harus selalu berada di <em>depan</em> sweeper agar terhindar dari batas waktu DNF.
          </p>
        </div>
      </div>
    </section>

    <!-- ── Lightbox Modal for Fullscreen Screenshots ── -->
    <div id="guideLightbox" class="guide-lightbox-overlay" style="display:none" role="dialog" aria-modal="true" aria-label="Pratinjau Screenshot Panduan">
      <div class="guide-lightbox-content">
        <button type="button" id="guideLightboxClose" class="guide-lightbox-close" aria-label="Tutup pratinjau">✕</button>
        <img id="guideLightboxImg" src="" alt="Pratinjau Screenshot" class="guide-lightbox-img">
        <div id="guideLightboxCaption" class="guide-lightbox-caption"></div>
      </div>
    </div>

    <!-- ── Back to top ── -->
    <button id="guideBackToTop" class="guide-back-to-top" type="button" aria-label="Kembali ke atas" title="Kembali ke atas">↑</button>
  `;
}

function initGuideInteractions(rootEl, traccarServerUrl, options = {}) {
  const onOpenRegister = typeof options.onOpenRegister === 'function' ? options.onOpenRegister : null;

  // ── Switch-to-register buttons (when embedded in /register) ──
  if (onOpenRegister) {
    rootEl.querySelectorAll('[data-guide-action="open-register"]').forEach(btn => {
      btn.addEventListener('click', () => onOpenRegister());
    });
  }

  // ── Event Handlers: Copy Server URL ──
  const btnCopy = rootEl.querySelector('#btnGuideCopyServerUrl');
  const copyText = rootEl.querySelector('#guideCopyUrlText');
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
  const lightbox = rootEl.querySelector('#guideLightbox');
  const lightboxImg = rootEl.querySelector('#guideLightboxImg');
  const lightboxCaption = rootEl.querySelector('#guideLightboxCaption');
  const lightboxClose = rootEl.querySelector('#guideLightboxClose');

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

  rootEl.querySelectorAll('.guide-phone-frame').forEach(frame => {
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

  const onKeyDown = (e) => {
    if (e.key === 'Escape' && lightbox && lightbox.style.display === 'flex') {
      closeLightbox();
    }
  };
  window.addEventListener('keydown', onKeyDown);

  // ── Smooth Scroll Navigation Pills (4 Chapters) ──
  const pills = [
    { id: 'pillNavTracking', target: 'trackingFlowSection' },
    { id: 'pillNavTraccar', target: 'traccarGuideSection' },
    { id: 'pillNavCockpit', target: 'cockpitGuideSection' },
    { id: 'pillNavFaq', target: 'faqGuideSection' }
  ];

  pills.forEach(p => {
    const el = rootEl.querySelector(`#${p.id}`);
    if (el) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        rootEl.querySelectorAll('.guide-nav-pill-btn').forEach(b => b.classList.remove('active'));
        el.classList.add('active');
        const targetEl = rootEl.querySelector(`#${p.target}`);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  });

  // ── Reading progress, scroll-spy & back-to-top ──
  const progressBar = rootEl.querySelector('#guideNavProgress');
  const backToTop = rootEl.querySelector('#guideBackToTop');
  const navPills = rootEl.querySelector('#guideNavPills');
  const chapters = pills
    .map(p => ({ pill: rootEl.querySelector(`#${p.id}`), section: rootEl.querySelector(`#${p.target}`) }))
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
    if (!rootEl.isConnected || rootEl.hidden || rootEl.closest('[hidden]')) {
      if (backToTop) backToTop.classList.remove('visible');
      return;
    }

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

  const onScroll = () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(updateGuideScrollState);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  updateGuideScrollState();
  rootEl._refreshGuideScroll = updateGuideScrollState;

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ── Live Search & Instant Topic Filter ──
  const searchInput = rootEl.querySelector('#guideSearchInput');
  const searchClear = rootEl.querySelector('#guideSearchClear');
  const searchFeedback = rootEl.querySelector('#guideSearchFeedback');
  const searchableCards = Array.from(rootEl.querySelectorAll(
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
        searchFeedback.textContent = `Tidak ada topik yang cocok dengan "${query}". Coba kata kunci lain (misal: daftar, traccar, cot, cockpit).`;
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

  if (typeof Router !== 'undefined' && typeof Router.onUnmount === 'function') {
    Router.onUnmount(() => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('keydown', onKeyDown);
      if (lightbox && lightbox.style.display === 'flex') {
        document.body.style.overflow = '';
      }
    });
  }
}

function renderGuidePanel(containerEl, options = {}) {
  if (!containerEl) return;
  const traccarServerUrl = `${window.location.origin}/api/osmand`;
  containerEl.innerHTML = buildGuideContentHtml(traccarServerUrl, { embedded: true });
  initGuideInteractions(containerEl, traccarServerUrl, options);
}

function renderGuide() {
  const app = document.getElementById('app');
  document.title = 'Panduan Pengguna — CycloPon Live Tracker';

  const traccarServerUrl = `${window.location.origin}/api/osmand`;

  app.innerHTML = `
    <div class="landing-page-wrapper guide-page">
      <!-- ── Top Navigation Bar ── -->
      <nav class="landing-nav">
        <a href="/" data-link class="brand-title">
          <div class="brand-name-group">
            <img src="/icons/cyclopon-mark.svg" alt="" width="28" height="28" class="brand-logo-mark">
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

          <a href="/install" data-link class="btn-guide-nav" title="Tutorial Install Aplikasi PWA di HP" aria-label="Install aplikasi">
            <span class="nav-label-full">INSTALL</span>
            <span class="nav-label-short">INSTALL</span>
          </a>

          <a href="/register" data-link class="btn-register-nav" title="Daftar Menjadi Peserta Event" aria-label="Daftar">
            <span class="nav-label-full">DAFTAR</span>
            <span class="nav-label-short">DAFTAR</span>
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

      <!-- ── Guide Main Container ── -->
      <main class="landing-hero fade-in guide-hero" style="padding-top:20px">
        ${buildGuideContentHtml(traccarServerUrl, { embedded: false })}
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

  initGuideInteractions(app, traccarServerUrl, { embedded: false });
}

window.renderGuidePanel = renderGuidePanel;
window.renderGuide = renderGuide;
