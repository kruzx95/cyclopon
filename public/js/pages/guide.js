/**
 * CycloPon Official User & Rider Documentation Hub (/guide & /panduan)
 * Comprehensive guides for Rider Registration, Traccar Client GPS Setup, Real-Time Telemetry Tracking & Race Management.
 */

function renderGuide() {
  const app = document.getElementById('app');
  document.title = 'Panduan Pengguna — CycloPon Live Tracker';

  const currentHost = (window.location && window.location.hostname) ? window.location.hostname : 'localhost';
  const traccarServerUrl = `http://${currentHost}:5055`;

  app.innerHTML = `
    <div class="landing-page-wrapper">
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
          <a href="/guide" data-link class="btn-guide-nav active">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
            <span>PANDUAN</span>
          </a>

          <a href="/admin" data-link class="btn-admin-nav">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>PANEL PANITIA</span>
            <span class="admin-nav-arrow">↗</span>
          </a>
        </div>
      </nav>

      <!-- ── Guide Main Container ── -->
      <main class="landing-hero fade-in" style="padding-top:24px">
        <!-- Breadcrumb / Header Title -->
        <div style="margin-bottom:24px">
          <div style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;color:var(--text-secondary);margin-bottom:8px">
            <a href="/" data-link style="color:var(--text-secondary);text-decoration:none">Beranda</a>
            <span>/</span>
            <span style="color:#1C3E24">Panduan Pengguna</span>
          </div>
          <h1 style="font-size:28px;font-weight:900;letter-spacing:-0.03em;color:#0D1117;margin:0 0 8px 0">
            Pusat Panduan &amp; Operasional CycloPon
          </h1>
          <p style="font-size:14px;color:var(--text-secondary);margin:0;line-height:1.6;max-width:820px">
            Petunjuk lengkap pendaftaran event sepeda jarak jauh, konfigurasi aplikasi Traccar Client (interval 10s/30s), pemantauan pergerakan marker pesepeda secara real-time di Live Map, hingga penggunaan Rider Cockpit.
          </p>
        </div>

        <!-- ── Quick Guide Jump Switcher ── -->
        <div class="guide-nav-bar" id="guideNavBar" style="margin-bottom:24px">
          <div class="guide-nav-label">
            <span class="guide-mono-tag" style="margin-bottom:0">// PILIH BAB PANDUAN</span>
          </div>
          <div class="guide-nav-pills">
            <a href="#trackingFlowSection" class="guide-nav-pill-btn active" id="pillNavTracking">
              <span>⚡ 1. Alur Pelacakan &amp; Interval</span>
            </a>
            <a href="#traccarGuideSection" class="guide-nav-pill-btn" id="pillNavTraccar">
              <span>📲 2. Setup GPS Traccar Client</span>
            </a>
            <a href="#rosterGuideSection" class="guide-nav-pill-btn" id="pillNavRoster">
              <span>👥 3. Pendaftaran &amp; Roster</span>
            </a>
            <a href="#cockpitGuideSection" class="guide-nav-pill-btn" id="pillNavCockpit">
              <span>🚴 4. Rider Cockpit &amp; Kantong</span>
            </a>
          </div>
        </div>

        <!-- ══════════════════════════════════════════════════════════════════════════════
             BAB 1: ALUR PELACAKAN LIVE TRACKING & INTERVAL MARKER (NEW AUDITED GUIDE)
             ══════════════════════════════════════════════════════════════════════════════ -->
        <section class="landing-guide-section" id="trackingFlowSection" style="margin-top:0">
          <div class="landing-guide-header">
            <div class="guide-tag-wrap">
              <span class="guide-mono-tag">// ARSITEKTUR &amp; ALUR OPERASIONAL · REAL-TIME TELEMETRY</span>
              <h2 class="guide-main-title">
                <span class="guide-phone-icon">⚡</span> Alur Pelacakan Real-Time &amp; Interval Pergerakan Marker
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

          <!-- Diagram Alur Transmisi -->
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px;margin-bottom:24px">
            <div style="font-family:ui-monospace,monospace;font-size:11px;font-weight:800;color:#1C3E24;letter-spacing:0.06em;margin-bottom:12px">
              // PIPELINE TRANSMISI KOORDINAT GPS (END-TO-END)
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:14px">
              <div style="background:#FFFFFF;border:1px solid #CBD5E1;border-radius:8px;padding:14px">
                <div style="font-size:20px;margin-bottom:6px">📱 1. Smartphone Rider</div>
                <div style="font-size:13px;font-weight:700;color:#0D1117">Traccar Client / Cockpit</div>
                <div style="font-size:11.5px;color:#64748B;margin-top:4px;line-height:1.5">
                  Mengunci satelit GPS dan memancarkan koordinat via protokol OsmAnd HTTP port <code>5055</code> setiap <strong>10s</strong> atau <strong>30s</strong>.
                </div>
              </div>

              <div style="background:#FFFFFF;border:1px solid #CBD5E1;border-radius:8px;padding:14px">
                <div style="font-size:20px;margin-bottom:6px">🛡️ 2. Server CycloPon</div>
                <div style="font-size:13px;font-weight:700;color:#0D1117">WebSocket Proxy &amp; DB</div>
                <div style="font-size:11.5px;color:#64748B;margin-top:4px;line-height:1.5">
                  Mencocokkan Device ID dengan nomor BIB rider, menghitung jarak tempuh &amp; status COT, lalu menulis riwayat telemetri.
                </div>
              </div>

              <div style="background:#FFFFFF;border:1px solid #CBD5E1;border-radius:8px;padding:14px">
                <div style="font-size:20px;margin-bottom:6px">📡 3. Broadcast Real-Time</div>
                <div style="font-size:13px;font-weight:700;color:#0D1117">Push WebSocket Stream</div>
                <div style="font-size:11.5px;color:#64748B;margin-top:4px;line-height:1.5">
                  Data langsung disalurkan ke seluruh browser penonton secara instan tanpa perlu refresh halaman.
                </div>
              </div>

              <div style="background:#FFFFFF;border:1px solid #10B981;border-radius:8px;padding:14px;background:#F0FDF4">
                <div style="font-size:20px;margin-bottom:6px">🚴 4. Live Map Penonton</div>
                <div style="font-size:13px;font-weight:700;color:#166534">Marker Bergerak Mulus</div>
                <div style="font-size:11.5px;color:#15803D;margin-top:4px;line-height:1.5">
                  Marker berpindah posisi mengikuti interval dengan transisi animasi lunak (CSS sliding animation).
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
                <span class="guide-phone-icon">📲</span> Cara Menghubungkan GPS Smartphone (Traccar Client)
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

          <div class="guide-steps-grid">
            <!-- Step 1: Server URL -->
            <div class="guide-step-card primary-step">
              <div class="step-card-num">LANGKAH 1</div>
              <div class="step-card-title">Atur Server URL</div>
              <p class="step-card-desc">Buka menu <strong>Settings</strong> di aplikasi Traccar Client, pilih <strong>Server URL</strong> dan masukkan alamat server berikut:</p>
              <div class="step-code-box">
                <code id="traccarServerUrlDisplay">${traccarServerUrl}</code>
                <button id="btnCopyServerUrl" class="btn-copy-code" title="Salin ke Clipboard">
                  <span id="copyUrlText">Salin URL</span>
                </button>
              </div>
              <div class="step-card-hint">
                💡 <em>Wajib gunakan awalan <code>http://</code> dan sertakan port <code>:5055</code></em>
              </div>
            </div>

            <!-- Step 2: Device Identifier -->
            <div class="guide-step-card">
              <div class="step-card-num">LANGKAH 2</div>
              <div class="step-card-title">Atur Device Identifier</div>
              <p class="step-card-desc">Ganti angka default dengan nomor BIB resmi Anda yang terdaftar:</p>
              <div class="step-bib-example">
                <span class="bib-pill">BIB-001</span>
                <span class="bib-sep">atau</span>
                <span class="bib-pill">001</span>
              </div>
              <p class="step-card-desc" style="margin-top:8px">
                Format: <code>BIB-</code> diikuti nomor peserta Anda atau angka BIB murni.
              </p>
              <a href="/rider" data-link class="step-action-link">Cek Nomor BIB / Login Rider →</a>
            </div>

            <!-- Step 3: Optimal Tuning -->
            <div class="guide-step-card">
              <div class="step-card-num">LANGKAH 3</div>
              <div class="step-card-title">Pengaturan Akurasi &amp; Hemat Baterai</div>
              <ul class="step-checklist">
                <li><strong>Location accuracy:</strong> <code>Highest</code> (Akurasi Satelit GPS)</li>
                <li><strong>Interval:</strong> <code>10</code> detik (responsif &amp; akurat) atau <code>30</code> detik (ultra brevet)</li>
                <li><strong>Distance:</strong> <code>0</code> meter (kosongkan / 0 agar update murni berbasis interval)</li>
                <li><strong>Advanced Settings (Aktifkan):</strong>
                  <div class="sub-switches">
                    <span class="switch-badge">✓ Offline Buffering: ON</span>
                    <span class="switch-badge" style="background:rgba(239,68,68,0.15);color:#EF4444;border-color:rgba(239,68,68,0.3)">✕ Stop Detection: OFF</span>
                  </div>
                </li>
              </ul>
            </div>

            <!-- Step 4: Continuous Tracking & Android Permission -->
            <div class="guide-step-card alert-step">
              <div class="step-card-num">LANGKAH 4 (KRUSIAL)</div>
              <div class="step-card-title">Continuous Tracking &amp; Izin Android</div>
              <p class="step-card-desc">Kembali ke layar utama, geser saklar <strong>Continuous tracking</strong> ke posisi <strong>ON (Hijau)</strong>.</p>
              <div class="step-warning-box">
                <strong>⚠️ Peringatan Izin Lokasi Android:</strong><br>
                Saat dialog muncul, WAJIB pilih: <strong>"Allow all the time" (Izinkan sepanjang waktu)</strong>.<br>
                <em>(Jika memilih 'Only while using app', GPS mati saat layar mati di saku jersey).</em>
              </div>
              <div class="step-card-hint" style="margin-top:8px">
                ✅ Tekan <strong>"Send location"</strong> sekali untuk uji coba kirim koordinat awal.
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
                <span class="guide-phone-icon">📋</span> Panduan Pendaftaran Event &amp; Manajemen Roster
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
                  <div class="sub-switches" style="flex-wrap:wrap">
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
              <div style="background:#0D1117;border-radius:8px;padding:12px 14px;color:#FFFFFF;margin-bottom:10px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                  <span style="font-family:ui-monospace,monospace;font-size:10px;font-weight:800;color:#94A3B8;letter-spacing:0.06em">DIGITAL PASS // OFFICIAL TICKET</span>
                  <span style="font-size:14px">🎟️</span>
                </div>
                <div style="font-family:ui-monospace,monospace;font-size:20px;font-weight:900;color:#00E5FF;letter-spacing:-0.02em">
                  #BIB-001
                </div>
                <div style="font-size:11.5px;color:#CBD5E1;margin-top:2px">
                  PIN Keamanan: <strong style="color:#FFFFFF;font-family:ui-monospace,monospace">1234</strong> · Status: <span style="color:#4ADE80;font-weight:700">TERKONFIRMASI ✓</span>
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
                <span class="guide-phone-icon">🚴</span> Rider Cockpit HUD &amp; Mode Kantong Jersey
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
                <li>Aktifkan <strong>💡 Layar ON (Wake Lock)</strong> agar layar tidak mati atau terkunci otomatis.</li>
                <li>Nikmati tampilan speedometer besar, estimasi Cut-Off Time checkpoint berikutnya, elevasi tanjakan (ClimbPro), dan peringatan suara deviasi rute.</li>
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
          </div>
        </section>

      </main>

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
        showToast('Server URL berhasil disalin!', 'success');
        setTimeout(() => {
          if (copyText) copyText.textContent = 'Salin URL';
          btnCopy.classList.remove('copied');
        }, 2500);
      } catch {
        prompt('Salin Server URL:', traccarServerUrl);
      }
    });
  }

  // ── Smooth Scroll Navigation Pills ──
  const pills = [
    { id: 'pillNavTracking', target: 'trackingFlowSection' },
    { id: 'pillNavTraccar', target: 'traccarGuideSection' },
    { id: 'pillNavRoster', target: 'rosterGuideSection' },
    { id: 'pillNavCockpit', target: 'cockpitGuideSection' }
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