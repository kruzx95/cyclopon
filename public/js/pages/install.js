/**
 * /install — PWA Installation Tutorial Page
 * Interactive platform tabs (Android Chrome, iOS Safari, Desktop) with visual UI mockups
 * and 1-click native install prompt support when available.
 */

function renderInstallPage() {
  const app = document.getElementById('app');
  if (!app) return;

  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const defaultTab = isIOS ? 'ios' : (isAndroid ? 'android' : 'desktop');
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  app.innerHTML = `
    <div class="install-page-wrapper">
      <!-- ── Top Navigation Bar ── -->
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

          <a href="/share" data-link class="btn-guide-nav" title="Buat Ride Card peserta event untuk media sosial" aria-label="Buat Ride Card">
            <span class="nav-label-full">RIDE CARD</span>
            <span class="nav-label-short">RIDE CARD</span>
          </a>

          <a href="/install" data-link class="btn-guide-nav active" title="Cara Install Aplikasi CycloPon di HP" aria-label="Install aplikasi">
            <span class="nav-label-full">INSTALL</span>
            <span class="nav-label-short">INSTALL</span>
          </a>

          <a href="/register" data-link class="btn-register-nav" title="Daftar Menjadi Peserta Event" aria-label="Daftar">
            <span class="nav-label-full">DAFTAR</span>
            <span class="nav-label-short">DAFTAR</span>
          </a>

          <a href="/admin" data-link class="btn-admin-nav" title="Race Control / Panel Khusus Panitia Event" aria-label="Race Control">
            <span class="nav-label-full">RACE CONTROL</span>
            <span class="nav-label-short">RACE CONTROL</span>
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

      <main class="install-container">
        <!-- ── Hero Card ── -->
        <section class="install-hero">
          <div>
            <span class="install-eyebrow">⚡ PROGRESSIVE WEB APP (PWA)</span>
            <h1 class="install-hero-title">Pasang CycloPon di <span>Layar Utama HP</span></h1>
            <p class="install-hero-desc">
              Akses Live Map, Cockpit Rider, dan Ride Card langsung seperti aplikasi native tanpa perlu mengunduh lewat Play Store atau App Store. Ringan, cepat, dan layar penuh.
            </p>
            <div class="install-benefits-row">
              <span class="install-benefit-chip">✓ Ukuran &lt; 2 MB</span>
              <span class="install-benefit-chip">✓ Akses 1-Ketuk dari Home Screen</span>
              <span class="install-benefit-chip">✓ Tampilan Fullscreen Tanpa Bar Browser</span>
            </div>
          </div>

          <div class="install-action-card" id="installActionCard">
            <div class="install-app-preview">
              <div class="install-app-meta" style="text-align:center">
                <div class="install-app-name">CycloPon Live Tracker</div>
                <div class="install-app-sub">Web App · v2.0</div>
              </div>
            </div>
            <div id="installActionSlot" style="width:100%"></div>
          </div>
        </section>

        <!-- ── Platform Selector Tabs ── -->
        <div class="install-platform-tabs" role="tablist" aria-label="Pilih jenis perangkat">
          <button type="button" class="install-tab-btn ${defaultTab === 'android' ? 'active' : ''}" data-install-tab="android" role="tab" aria-selected="${defaultTab === 'android'}">
            <span>🤖 Android (Chrome)</span>
            ${isAndroid ? '<span class="install-tab-badge">Perangkat Anda</span>' : ''}
          </button>
          <button type="button" class="install-tab-btn ${defaultTab === 'ios' ? 'active' : ''}" data-install-tab="ios" role="tab" aria-selected="${defaultTab === 'ios'}">
            <span>🍎 iPhone / iPad (Safari)</span>
            ${isIOS ? '<span class="install-tab-badge">Perangkat Anda</span>' : ''}
          </button>
          <button type="button" class="install-tab-btn ${defaultTab === 'desktop' ? 'active' : ''}" data-install-tab="desktop" role="tab" aria-selected="${defaultTab === 'desktop'}">
            <span>💻 Laptop / Desktop</span>
            ${!isIOS && !isAndroid ? '<span class="install-tab-badge">Perangkat Anda</span>' : ''}
          </button>
        </div>

        <!-- ══════════════════════════════════════════════════
             TAB 1: ANDROID (CHROME)
             ══════════════════════════════════════════════════ -->
        <section class="install-panel ${defaultTab === 'android' ? 'active' : ''}" id="installPanel-android" role="tabpanel">
          <div class="install-warning-banner">
            <span class="install-warning-icon">💡</span>
            <div>
              <strong>Buka melalui Google Chrome:</strong> Jika Anda membuka link CycloPon dari dalam WhatsApp atau Instagram, ketuk menu kanan atas lalu pilih <strong>"Buka di Chrome"</strong> terlebih dahulu.
            </div>
          </div>

          <div class="install-steps-grid">
            <!-- Step 1 -->
            <article class="install-step-card">
              <div class="install-step-head">
                <span class="install-step-num">1</span>
                <h2 class="install-step-title">Ketuk Ikon Titik Tiga (⋮)</h2>
              </div>
              <p class="install-step-desc">
                Di halaman utama CycloPon pada browser Google Chrome, ketuk tombol menu <strong>Titik Tiga (⋮)</strong> di pojok kanan atas layar.
              </p>
              <div class="install-visual-box" aria-hidden="true">
                <span class="mockup-caption">Tampilan Atas Chrome</span>
                <div class="mockup-chrome-bar">
                  <div class="mockup-url-pill">
                    <span>🔒</span>
                    <span>cyclopon.com</span>
                  </div>
                  <span class="mockup-tap-target" title="Ketuk ikon titik tiga">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="5" r="2.2"></circle>
                      <circle cx="12" cy="12" r="2.2"></circle>
                      <circle cx="12" cy="19" r="2.2"></circle>
                    </svg>
                  </span>
                </div>
              </div>
            </article>

            <!-- Step 2 -->
            <article class="install-step-card">
              <div class="install-step-head">
                <span class="install-step-num">2</span>
                <h2 class="install-step-title">Pilih "Install Aplikasi"</h2>
              </div>
              <p class="install-step-desc">
                Pada daftar menu yang muncul, pilih <strong>"Tambahkan ke Layar utama"</strong> atau <strong>"Install aplikasi"</strong> (<em>Add to Home screen</em>).
              </p>
              <div class="install-visual-box" aria-hidden="true">
                <span class="mockup-caption">Daftar Menu Chrome</span>
                <div class="mockup-menu-list">
                  <div class="mockup-menu-row">↻ Muat ulang</div>
                  <div class="mockup-menu-row highlight">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="5" y="2" width="14" height="20" rx="2"></rect>
                      <path d="M12 10v6"></path>
                      <path d="m9 13 3 3 3-3"></path>
                    </svg>
                    <span>Tambahkan ke Layar utama / Install</span>
                  </div>
                  <div class="mockup-menu-row">⚙ Setelan</div>
                </div>
              </div>
            </article>

            <!-- Step 3 -->
            <article class="install-step-card">
              <div class="install-step-head">
                <span class="install-step-num">3</span>
                <h2 class="install-step-title">Konfirmasi "Install"</h2>
              </div>
              <p class="install-step-desc">
                Ketuk tombol <strong>"Install"</strong> pada popup konfirmasi. Dalam beberapa detik, ikon aplikasi <strong>CycloPon</strong> akan muncul di layar utama HP Anda.
              </p>
              <div class="install-visual-box" aria-hidden="true">
                <span class="mockup-caption">Popup Konfirmasi</span>
                <div class="mockup-confirm-dialog">
                  <div class="mockup-dialog-app">
                    <div>
                      <div style="font-size:11.5px;font-weight:800;color:#0D1117">Install aplikasi?</div>
                      <div style="font-size:10px;color:#64748B">CycloPon Live Tracker</div>
                    </div>
                  </div>
                  <div class="mockup-dialog-actions">
                    <span class="mockup-btn-cancel">Batal</span>
                    <span class="mockup-btn-confirm">Install</span>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <!-- ══════════════════════════════════════════════════
             TAB 2: IPHONE / IPAD (SAFARI)
             ══════════════════════════════════════════════════ -->
        <section class="install-panel ${defaultTab === 'ios' ? 'active' : ''}" id="installPanel-ios" role="tabpanel">
          <div class="install-warning-banner">
            <span class="install-warning-icon">⚠️</span>
            <div>
              <strong>Wajib Menggunakan Browser Safari:</strong> Apple iOS hanya mengizinkan instalasi aplikasi web melalui browser bawaan <strong>Safari</strong>. Jika Anda membuka dari WhatsApp, ketuk ikon kompas Safari di pojok kanan bawah terlebih dahulu.
            </div>
          </div>

          <div class="install-steps-grid">
            <!-- Step 1 -->
            <article class="install-step-card">
              <div class="install-step-head">
                <span class="install-step-num">1</span>
                <h2 class="install-step-title">Ketuk Ikon Share (⬆)</h2>
              </div>
              <p class="install-step-desc">
                Pada bilah menu bagian bawah browser Safari, ketuk ikon <strong>Share</strong> (kotak dengan tanda panah mengarah ke atas).
              </p>
              <div class="install-visual-box" aria-hidden="true">
                <span class="mockup-caption">Bilah Bawah Safari iPhone</span>
                <div class="mockup-safari-bar">
                  <span style="font-size:15px">‹</span>
                  <span style="font-size:15px">›</span>
                  <span class="mockup-tap-target" title="Ketuk ikon Share">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                      <polyline points="16 6 12 2 8 6"></polyline>
                      <line x1="12" y1="2" x2="12" y2="15"></line>
                    </svg>
                  </span>
                  <span style="font-size:13px">📖</span>
                  <span style="font-size:13px">❏</span>
                </div>
              </div>
            </article>

            <!-- Step 2 -->
            <article class="install-step-card">
              <div class="install-step-head">
                <span class="install-step-num">2</span>
                <h2 class="install-step-title">Pilih "Add to Home Screen"</h2>
              </div>
              <p class="install-step-desc">
                Geser panel menu Share ke atas, lalu ketuk pilihan <strong>"Add to Home Screen"</strong> (atau <em>"Tambah ke Layar Utama"</em>) dengan ikon tanda tambah (+).
              </p>
              <div class="install-visual-box" aria-hidden="true">
                <span class="mockup-caption">Menu Share iOS</span>
                <div class="mockup-menu-list">
                  <div class="mockup-menu-row">❐ Copy Link</div>
                  <div class="mockup-menu-row highlight">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="4"></rect>
                      <line x1="12" y1="8" x2="12" y2="16"></line>
                      <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                    <span>Add to Home Screen</span>
                  </div>
                  <div class="mockup-menu-row">★ Add Bookmark</div>
                </div>
              </div>
            </article>

            <!-- Step 3 -->
            <article class="install-step-card">
              <div class="install-step-head">
                <span class="install-step-num">3</span>
                <h2 class="install-step-title">Ketuk "Add" di Pojok Kanan</h2>
              </div>
              <p class="install-step-desc">
                Pastikan nama aplikasi tertulis <strong>CycloPon</strong>, lalu ketuk tombol <strong>"Add"</strong> (<em>Tambah</em>) di pojok kanan atas. Aplikasi siap dibuka dari Home Screen!
              </p>
              <div class="install-visual-box" aria-hidden="true">
                <span class="mockup-caption">Konfirmasi Home Screen</span>
                <div class="mockup-confirm-dialog">
                  <div class="mockup-ios-sheet-header">
                    <span style="color:#64748B">Cancel</span>
                    <span style="color:#0D1117;font-weight:800">Add to Home</span>
                    <span class="mockup-ios-add">Add</span>
                  </div>
                  <div class="mockup-dialog-app">
                    <div>
                      <div style="font-size:11.5px;font-weight:800;color:#0D1117">CycloPon</div>
                      <div style="font-size:10px;color:#64748B">cyclopon.com</div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <!-- ══════════════════════════════════════════════════
             TAB 3: DESKTOP / LAPTOP
             ══════════════════════════════════════════════════ -->
        <section class="install-panel ${defaultTab === 'desktop' ? 'active' : ''}" id="installPanel-desktop" role="tabpanel">
          <div class="install-steps-grid two-cols">
            <!-- Step 1 -->
            <article class="install-step-card">
              <div class="install-step-head">
                <span class="install-step-num">1</span>
                <h2 class="install-step-title">Klik Ikon Install di Kolom Alamat URL</h2>
              </div>
              <p class="install-step-desc">
                Pada browser <strong>Google Chrome</strong> atau <strong>Microsoft Edge</strong>, klik tombol <strong>"Install Aplikasi Sekarang"</strong> di kartu atas atau klik ikon layar kecil dengan panah turun di ujung kanan address bar.
              </p>
              <div class="install-visual-box" aria-hidden="true">
                <span class="mockup-caption">Address Bar Browser Desktop</span>
                <div class="mockup-chrome-bar">
                  <div class="mockup-url-pill">
                    <span>🔒</span>
                    <span>https://cyclopon.com</span>
                  </div>
                  <span class="mockup-tap-target" title="Klik ikon Install">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2"></rect>
                      <line x1="8" y1="21" x2="16" y2="21"></line>
                      <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                  </span>
                </div>
              </div>
            </article>

            <!-- Step 2 -->
            <article class="install-step-card">
              <div class="install-step-head">
                <span class="install-step-num">2</span>
                <h2 class="install-step-title">Konfirmasi &amp; Jalankan Sebagai App</h2>
              </div>
              <p class="install-step-desc">
                Klik <strong>"Install"</strong> pada dialog konfirmasi browser. CycloPon akan terbuka di jendela aplikasi mandiri yang rapi untuk pemantauan Live Map panitia maupun penonton.
              </p>
              <div class="install-visual-box" aria-hidden="true">
                <span class="mockup-caption">Dialog Konfirmasi Browser</span>
                <div class="mockup-confirm-dialog">
                  <div class="mockup-dialog-app">
                    <div>
                      <div style="font-size:11.5px;font-weight:800;color:#0D1117">Install CycloPon Live Tracker?</div>
                      <div style="font-size:10px;color:#64748B">Buka sebagai jendela aplikasi mandiri</div>
                    </div>
                  </div>
                  <div class="mockup-dialog-actions">
                    <span class="mockup-btn-cancel">Batal</span>
                    <span class="mockup-btn-confirm">Install</span>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <!-- ── Helpful Tips ── -->
        <section class="install-tips-grid" aria-label="Pertanyaan umum instalasi PWA">
          <div class="install-tip-card">
            <h3 class="install-tip-title">📱 Link Dibuka dari WhatsApp?</h3>
            <p class="install-tip-text">
              Browser bawaan WhatsApp tidak mendukung tombol Install. Ketuk menu pojok kanan lalu pilih <strong>Buka di Chrome / Safari</strong> terlebih dahulu.
            </p>
          </div>
          <div class="install-tip-card">
            <h3 class="install-tip-title">⚡ Bedanya dengan Traccar Client?</h3>
            <p class="install-tip-text">
              Aplikasi web <strong>CycloPon</strong> dipakai untuk melihat Live Map, Cockpit, &amp; SOS. Untuk pelacakan GPS latar belakang saat layar mati, tetap aktifkan juga aplikasi <strong>Traccar Client</strong> sesuai Panduan.
            </p>
          </div>
          <div class="install-tip-card">
            <h3 class="install-tip-title">🔄 Selalu Otomatis Update</h3>
            <p class="install-tip-text">
              Anda tidak perlu update manual seperti app store. Setiap ada pembaruan peta atau fitur baru, aplikasi PWA otomatis memperbarui diri di latar belakang.
            </p>
          </div>
        </section>
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

  // ── Platform Tab Switching ──
  const tabBtns = app.querySelectorAll('[data-install-tab]');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-install-tab');
      tabBtns.forEach(b => {
        const active = b === btn;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', String(active));
      });
      app.querySelectorAll('.install-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `installPanel-${target}`);
      });
    });
  });

  // ── Live PWA Status & Native 1-Click Install Prompt ──
  const actionSlot = document.getElementById('installActionSlot');
  function renderInstallAction() {
    if (!actionSlot) return;

    if (isStandalone) {
      actionSlot.innerHTML = `
        <div class="install-status-note is-installed">
          ✓ Aplikasi CycloPon sudah terpasang dan berjalan di mode aplikasi.
        </div>
      `;
      return;
    }

    if (window.__deferredInstallPrompt) {
      actionSlot.innerHTML = `
        <button type="button" class="btn-pwa-direct" id="btnTriggerPwaInstall">
          <span>📲 Install Aplikasi Sekarang</span>
        </button>
        <div class="install-status-note">Siap dipasang langsung ke perangkat Anda dalam 1 klik.</div>
      `;
      document.getElementById('btnTriggerPwaInstall')?.addEventListener('click', async () => {
        const promptEvent = window.__deferredInstallPrompt;
        if (!promptEvent) return;
        promptEvent.prompt();
        const choice = await promptEvent.userChoice.catch(() => null);
        if (choice && choice.outcome === 'accepted') {
          window.__deferredInstallPrompt = null;
          if (typeof showToast === 'function') {
            showToast('CycloPon berhasil ditambahkan ke layar utama!', 'success');
          }
          renderInstallAction();
        }
      });
      return;
    }

    actionSlot.innerHTML = `
      <div class="install-status-note">
        ${isIOS
          ? 'Ikuti 3 langkah visual <strong>Safari iOS</strong> di bawah untuk menambahkan ke Home Screen.'
          : 'Ikuti langkah visual di bawah melalui menu browser Anda untuk memasang ke layar utama.'}
      </div>
    `;
  }

  renderInstallAction();

  // Re-render CTA automatically if browser fires beforeinstallprompt while on /install
  const onPromptReady = () => renderInstallAction();
  window.addEventListener('cyclopon:pwa-prompt-ready', onPromptReady, { once: true });
}
