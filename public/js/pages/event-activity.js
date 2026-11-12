/**
 * CycloPon Event Activity & Rider Roster Page
 * Redesigned to match Beranda (Earthy Gravel & Pro Editorial Dossier Theme)
 */

async function renderEventActivity(params) {
  const eventId = Number(params.id || params.eventId);
  if (!eventId || isNaN(eventId)) {
    Router.navigate('/');
    return;
  }

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="activity-page-wrapper">
      <nav class="landing-nav">
        <a href="/" data-link class="brand-title">
          <img src="/icons/logo-emblem.svg" alt="CYCLOPON" class="brand-logo-emblem" width="32" height="32">
          <div class="brand-name-group">
            <span class="brand-name">CYCLOPON</span>
            <span class="brand-spec-label">// PRO GPS TELEMETRY</span>
          </div>
        </a>
      </nav>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;text-align:center;padding:48px 24px">
        <div>
          <div style="font-family:ui-monospace,monospace;font-size:11px;font-weight:800;color:#1C3E24;letter-spacing:0.06em;margin-bottom:8px">// EVENT DOSSIER</div>
          <div style="font-size:22px;font-weight:900;letter-spacing:-0.03em;color:#0D1117;margin-bottom:8px">MEMUAT DOSSIER EVENT...</div>
          <div style="font-size:13px;color:#6B7280;font-weight:600">Mengambil data telemetri &amp; roster peserta</div>
        </div>
      </div>
    </div>
  `;

  let event = null;
  let riders = [];
  let checkpoints = [];

  try {
    const [evRes, rRes, cpRes] = await Promise.all([
      fetch(`/api/events/${eventId}`),
      fetch(`/api/events/${eventId}/riders`),
      fetch(`/api/events/${eventId}/checkpoints`).catch(() => ({ ok: false }))
    ]);

    if (!evRes.ok) {
      showToast('Event tidak ditemukan.', 'error');
      Router.navigate('/');
      return;
    }

    event = await evRes.json();
    riders = rRes.ok ? await rRes.json() : [];
    checkpoints = cpRes.ok ? await cpRes.json() : [];
  } catch (err) {
    showToast('Gagal terhubung ke server.', 'error');
    Router.navigate('/');
    return;
  }

  let activeTab = 'roster'; // 'roster' | 'route'
  let activeRoleFilter = 'all'; // 'all' | 'rider' | 'sweeper' | 'marshall' | 'medic'
  let searchQuery = '';

  function getInitials(name) {
    if (!name) return 'R';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function getAvatarColor(rider, idx) {
    if (rider.color && rider.color !== '#00E5FF') return rider.color;
    const colors = ['#1C3E24', '#1F2937', '#374151', '#966025', '#1E3A8A', '#0F766E'];
    return colors[idx % colors.length];
  }

  function renderView() {
    const filteredRiders = riders.filter(r => {
      const matchRole = activeRoleFilter === 'all' || (r.role || 'rider') === activeRoleFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.bib && String(r.bib).toLowerCase().includes(q));
      return matchRole && matchSearch;
    });

    const isRegistrationOpen = event.active !== 0;

    app.innerHTML = `
      <div class="activity-page-wrapper">
        <!-- ── Pro Editorial Top Nav (Consistent with Beranda) ── -->
        <nav class="landing-nav">
          <a href="/" data-link class="brand-title">
            <img src="/icons/logo-emblem.svg" alt="CYCLOPON" class="brand-logo-emblem" width="32" height="32">
            <div class="brand-name-group">
              <span class="brand-name">CYCLOPON</span>
              <span class="brand-spec-label">// PRO GPS TELEMETRY</span>
            </div>
          </a>

          <div class="nav-system-status">
            <span class="system-radar-dot"></span>
            <span class="mono-label">STAGE #${String(event.id).padStart(2, '0')} · EVENT DOSSIER</span>
          </div>

          <div style="display:flex;align-items:center;gap:10px">
            <a href="/" data-link class="btn-gpx-chip" style="padding:7px 14px;font-size:11.5px" title="Kembali ke Beranda">
              <span>← BERANDA</span>
            </a>
            <a href="/watch/${event.id}" data-link class="btn-watch-action" style="padding:8px 16px;font-size:12px" title="Buka Live Radar GPS">
              <span>BUKA RADAR</span>
              <span class="btn-arrow-icon">↗</span>
            </a>
          </div>
        </nav>

        <!-- ── Main Editorial Content ── -->
        <main class="activity-main-container fade-in">
          <!-- Editorial Tech Badge -->
          <div class="hero-tech-badge" style="margin-bottom:14px">
            <span class="badge-hash">#</span>
            <span class="badge-text">EVENT DOSSIER // STAGE #${String(event.id).padStart(2, '0')} · ROSTER &amp; TELEMETRI</span>
          </div>

          <!-- ── Race Dossier Hero Card (Matches Beranda Right Column) ── -->
          <div class="event-detail-hero-card">
            <div class="event-detail-card">
              <div class="dossier-card-topbar">
                <div class="dossier-live-tag">
                  <span class="live-radar-dot"></span>
                  <span>${isRegistrationOpen ? 'PENDAFTARAN BUKA' : 'EVENT SELESAI / ARSIP'}</span>
                </div>
                <span class="dossier-stage-code">STAGE ${String(event.id).padStart(2, '0')}</span>
              </div>

              <div class="dossier-event-header">
                <div class="featured-event-meta" style="margin-bottom:10px">
                  <span class="event-live-pill">
                    <span class="pulse-dot"></span>
                    <span>CYCLING / ENDURANCE</span>
                  </span>
                  <span class="event-date-chip">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="10"/></svg>
                    <span>${escapeHtml(event.date || 'TBA')}</span>
                  </span>
                  ${event.gpx_path ? `
                    <span class="event-gpx-chip">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                      <span>GPX LOADED</span>
                    </span>
                  ` : ''}
                </div>

                <h1 class="dossier-event-title">${escapeHtml(event.name)}</h1>
                <div class="dossier-event-location">ORGANIZER: CYCLOPON RACE CONTROL</div>
              </div>

              <div class="dossier-metrics-grid event-detail-metrics">
                <div class="dossier-metric-cell">
                  <div class="metric-cell-val" style="font-size:15px;letter-spacing:0">${escapeHtml(event.date || 'TBA')}</div>
                  <div class="metric-cell-unit">JADWAL</div>
                  <div class="metric-cell-lbl">TANGGAL EVENT</div>
                </div>
                <div class="dossier-metric-cell">
                  <div class="metric-cell-val" id="rosterCountVal">${riders.length}</div>
                  <div class="metric-cell-unit">PESERTA</div>
                  <div class="metric-cell-lbl">TERDAFTAR RESMI</div>
                </div>
                <div class="dossier-metric-cell">
                  <div class="metric-cell-val">${checkpoints.length}</div>
                  <div class="metric-cell-unit">CHECKPOINTS</div>
                  <div class="metric-cell-lbl">POS KONTROL &amp; COT</div>
                </div>
                <div class="dossier-metric-cell">
                  <div class="metric-cell-val">${event.gpx_path ? 'GPX' : 'MANUAL'}</div>
                  <div class="metric-cell-unit">TRACK TYPE</div>
                  <div class="metric-cell-lbl">RUTE TELEMETRI</div>
                </div>
              </div>
            </div>
          </div>

          <!-- ── Section Header with Title & Tab Switcher ── -->
          <div class="activity-section-header">
            <div class="featured-section-title-wrap">
              <span class="section-mono-tag">// DATA TELEMETRI · DIREKTORI RESMI</span>
              <h2 class="featured-section-title" style="margin:0">
                <span class="mobile-radar-dot"></span>Data Roster &amp; Pos Kontrol
              </h2>
            </div>

            <div class="activity-tabs-row">
              <button class="activity-tab-btn ${activeTab === 'roster' ? 'active' : ''}" id="tabBtnRoster">
                <span>👥 Daftar Peserta</span>
                <span class="tab-count-badge" id="tabRosterCount">${riders.length}</span>
              </button>
              <button class="activity-tab-btn ${activeTab === 'route' ? 'active' : ''}" id="tabBtnRoute">
                <span>🗺️ Rute &amp; Pos CP</span>
                <span class="tab-count-badge">${checkpoints.length}</span>
              </button>
            </div>
          </div>

          <!-- ── TAB 1: Roster Peserta ── -->
          <div id="tabContentRoster" style="${activeTab === 'roster' ? 'display:block' : 'display:none'}">
            <!-- Search & Role Filter Bar -->
            <div class="roster-controls-row">
              <div class="roster-search-box">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2.5" style="margin-right:10px;flex-shrink:0">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input class="roster-search-input" id="rosterSearchInput" type="text"
                       placeholder="Cari nama peserta atau nomor BIB..." value="${escapeHtml(searchQuery)}">
              </div>

              <div class="filter-pills-row">
                <button class="filter-chip ${activeRoleFilter === 'all' ? 'active' : ''}" data-role="all">Semua (${riders.length})</button>
                <button class="filter-chip ${activeRoleFilter === 'rider' ? 'active' : ''}" data-role="rider">🚴 Rider</button>
                <button class="filter-chip ${activeRoleFilter === 'sweeper' ? 'active' : ''}" data-role="sweeper">🧹 Sweeper</button>
                <button class="filter-chip ${activeRoleFilter === 'marshall' ? 'active' : ''}" data-role="marshall">🏍️ Marshall</button>
                <button class="filter-chip ${activeRoleFilter === 'medic' ? 'active' : ''}" data-role="medic">🚑 Medis</button>
              </div>
            </div>

            <!-- Roster Participant Grid -->
            <div class="roster-grid" id="rosterListContainer">
              ${filteredRiders.length ? filteredRiders.map((r, idx) => {
                const initials = getInitials(r.name);
                const avatarBg = getAvatarColor(r, idx);
                const roleType = r.role || 'rider';
                const roleLabel = roleType === 'sweeper' ? 'Sweeper' : (roleType === 'marshall' ? 'Marshall' : (roleType === 'medic' ? 'Medis' : 'Rider'));

                return `
                  <div class="roster-item-card fade-in">
                    <div class="roster-left">
                      <div class="roster-avatar" style="background:${escapeHtml(avatarBg)}">
                        ${escapeHtml(initials)}
                      </div>
                      <div class="roster-info">
                        <div class="roster-name-row">
                          <span class="roster-name">${escapeHtml(r.name)}</span>
                          <span class="verified-icon" title="Peserta Terverifikasi">✓</span>
                        </div>
                        <div class="roster-sub-row">
                          <span class="bib-pill-small">BIB #${escapeHtml(r.bib)}</span>
                          <span class="role-badge-tag ${escapeHtml(roleType)}">${escapeHtml(roleLabel)}</span>
                        </div>
                      </div>
                    </div>

                    <div class="roster-right">
                      <span class="status-confirmed-pill">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>Terdaftar</span>
                      </span>
                    </div>
                  </div>
                `;
              }).join('') : `
                <div style="background:#FFFFFF;border:1.5px dashed #D0C9BF;border-radius:10px;padding:48px 24px;text-align:center;color:#6B7280">
                  <div style="font-size:36px;margin-bottom:12px">🔍</div>
                  <div style="font-weight:900;color:#0D1117;font-size:16px;letter-spacing:-0.02em;margin-bottom:6px">Tidak Ada Peserta yang Cocok</div>
                  <div style="font-size:13px">${searchQuery ? `Tidak ada hasil pencarian untuk "<strong>${escapeHtml(searchQuery)}</strong>"` : 'Belum ada peserta terdaftar. Daftarkan diri Anda sekarang!'}</div>
                </div>
              `}
            </div>
          </div>

          <!-- ── TAB 2: Detail Rute & Checkpoints ── -->
          <div id="tabContentRoute" style="${activeTab === 'route' ? 'display:block' : 'display:none'}">
            <div class="route-card-box">
              <div class="route-card-header">
                <div>
                  <div class="guide-mono-tag">// TIMING &amp; CHECKPOINT SPEC</div>
                  <h3 style="font-size:18px;font-weight:900;margin:0 0 4px;color:#0D1117;letter-spacing:-0.02em">Pos Kontrol &amp; Cut-Off Time (COT)</h3>
                  <p style="font-size:13px;color:#4B5563;margin:0">Pantau batas waktu kedatangan resmi (COT) di setiap checkpoint rute balap.</p>
                </div>
                ${event.gpx_path ? `
                  <a href="/api/events/${event.id}/gpx/download" download class="btn-gpx-chip" title="Unduh File GPX Resmi">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    <span>UNDUH GPX RESMI</span>
                  </a>
                ` : ''}
              </div>

              ${checkpoints.length ? `
                <div class="checkpoint-list-wrap">
                  ${checkpoints.map((cp, idx) => `
                    <div class="checkpoint-item-row">
                      <div class="checkpoint-left">
                        <span class="cp-mono-badge">CP ${String(idx + 1).padStart(2, '0')}</span>
                        <div>
                          <strong style="font-size:14.5px;font-weight:800;color:#0D1117;display:block">${escapeHtml(cp.name)}</strong>
                          <span style="font-family:ui-monospace,monospace;font-size:12px;color:#6B7280;font-weight:600">${cp.km_distance} KM dari Start</span>
                        </div>
                      </div>
                      <div>
                        ${cp.close_time ? `
                          <span class="cp-cot-badge">
                            <span>⏱️ COT:</span>
                            <strong>${escapeHtml(cp.close_time)}</strong>
                          </span>
                        ` : '<span style="color:#9CA3AF;font-size:12px;font-family:ui-monospace,monospace">— OPEN —</span>'}
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div style="text-align:center;padding:36px 20px;color:#6B7280;font-size:13px;background:#F9FAFB;border-radius:8px;border:1px dashed #E5E7EB">
                  Pos kontrol rute belum ditentukan untuk event ini.
                </div>
              `}
            </div>
          </div>
        </main>

        <!-- ── Pro Editorial Footer (Identical with Beranda) ── -->
        <footer class="landing-footer">
          <div class="footer-inner">
            <div class="footer-left">
              <a href="/" data-link class="footer-brand-lockup">
                <img src="/icons/logo-emblem.svg" alt="CYCLOPON" class="footer-logo" width="30" height="30">
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

        <!-- ── Sticky Bottom Action Bar ── -->
        <div class="activity-sticky-bar">
          <div class="sticky-bar-inner">
            <div class="sticky-info-col">
              <span class="sticky-info-label">// STATUS EVENT &amp; KUOTA</span>
              <span class="sticky-info-val">${riders.length} Rider Terdaftar</span>
            </div>

            <div class="sticky-btn-group">
              <a href="/watch/${event.id}" data-link class="btn-sticky-radar" title="Buka Live Radar GPS">
                <span class="system-radar-dot"></span>
                <span>PANTAU RADAR</span>
              </a>

              <button class="btn-sticky-join" id="btnOpenJoinModal">
                <span>+ GABUNG / DAFTAR</span>
                <span class="cta-arrow-icon">→</span>
              </button>
            </div>
          </div>
        </div>

        <!-- ── Modal Pendaftaran Mandiri (CycloPon Pro Dialog) ── -->
        <div id="kuyyJoinModal" class="kuyy-modal-overlay" style="display:none">
          <div class="kuyy-modal-card">
            <div class="kuyy-modal-header">
              <h3 class="kuyy-modal-title">
                <span>🚴</span> PENDAFTARAN PESERTA EVENT
              </h3>
              <button id="btnCloseJoinModal" class="kuyy-modal-close-btn" title="Tutup Modal">✕</button>
            </div>

            <div class="kuyy-modal-body">
              <p style="font-size:13px;color:#4B5563;margin-bottom:18px;line-height:1.5">
                Daftarkan diri Anda untuk event <strong>${escapeHtml(event.name)}</strong>. Tiket Pass Digital &amp; QR Code otomatis terbit setelah mendaftar.
              </p>

              <form id="kuyyJoinForm">
                <div style="margin-bottom:14px">
                  <label style="display:block;font-size:11px;font-weight:800;color:#374151;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:5px">Nama Lengkap *</label>
                  <input id="joinName" required class="modal-input-field" placeholder="Contoh: Budi Santoso">
                </div>

                <div style="margin-bottom:14px">
                  <label style="display:block;font-size:11px;font-weight:800;color:#374151;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:5px">Nomor WhatsApp / HP</label>
                  <input id="joinPhone" class="modal-input-field" placeholder="081234567890">
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
                  <div>
                    <label style="display:block;font-size:11px;font-weight:800;color:#374151;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:5px">Kategori / Peran</label>
                    <select id="joinRole" class="modal-input-field">
                      <option value="rider">🚴 Rider</option>
                      <option value="sweeper">🧹 Sweeper</option>
                      <option value="marshall">🏍️ Marshall</option>
                      <option value="medic">🚑 Medis</option>
                    </select>
                  </div>
                  <div>
                    <label style="display:block;font-size:11px;font-weight:800;color:#374151;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:5px">Nomor BIB <span style="font-weight:normal;color:#9CA3AF">(Opsional)</span></label>
                    <input id="joinBib" class="modal-input-field" style="text-transform:uppercase;font-family:ui-monospace,monospace" placeholder="Otomatis">
                  </div>
                </div>

                <p id="joinErrorMsg" style="color:#DC2626;font-size:12px;min-height:16px;margin-bottom:12px;font-weight:700"></p>

                <div style="display:flex;gap:10px">
                  <button type="submit" id="btnSubmitJoin" class="btn btn-primary" style="flex:1;padding:12px;font-size:13px;font-weight:800;border-radius:8px;background:#0D1117;color:#FFF">
                    Daftar &amp; Ambil Tiket QR →
                  </button>
                  <button type="button" id="btnCancelJoin" class="btn btn-outline" style="padding:12px 18px;font-size:13px;border-radius:8px;border:1.5px solid #E5E7EB;color:#374151;font-weight:700">
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- ── Modal Sukses: Tiket Pass Digital dengan QR Code ── -->
        <div id="ticketSuccessModal" class="kuyy-modal-overlay" style="display:none">
          <div class="kuyy-modal-card" style="max-width:420px;text-align:center">
            <div class="kuyy-modal-header" style="background:#1C3E24">
              <h3 class="kuyy-modal-title" style="margin:0 auto">
                <span>🎉</span> PENDAFTARAN BERHASIL!
              </h3>
            </div>

            <div class="kuyy-modal-body" style="padding:24px 20px">
              <div class="ticket-pass-box" id="digitalTicketCard">
                <div style="font-family:ui-monospace,monospace;font-size:10px;font-weight:800;color:#6B7280;text-transform:uppercase;letter-spacing:0.06em">
                  ${escapeHtml(event.name)}
                </div>
                <div style="font-family:ui-monospace,monospace;font-size:38px;font-weight:900;color:#0D1117;margin:4px 0" id="resBibDisplay">
                  #001
                </div>
                <div style="font-size:16px;font-weight:800;color:#0D1117" id="resNameDisplay">
                  Nama Rider
                </div>

                <div class="ticket-qr-wrap" id="resQrContainer">
                  <!-- QR Canvas or SVG -->
                </div>

                <div style="font-size:12px;color:#4B5563;margin-top:6px;line-height:1.4">
                  Scan QR atau gunakan link ini untuk langsung mengakses telemetri cockpit rider.
                </div>

                <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:6px;padding:8px 12px;margin-top:12px;display:flex;justify-content:space-around;font-family:ui-monospace,monospace;font-size:11.5px">
                  <span>BIB: <strong id="resBibSub" style="color:#0D1117">001</strong></span>
                  <span>PIN: <strong id="resPinSub" style="color:#0D1117">1234</strong></span>
                </div>
              </div>

              <div style="display:flex;flex-direction:column;gap:8px">
                <button id="btnLaunchCockpitDirect" class="btn btn-primary" style="padding:12px;font-size:13px;font-weight:800;border-radius:8px;background:#0D1117;color:#FFF">
                  🚀 Buka Pelacak GPS Rider Sekarang
                </button>
                <div style="display:flex;gap:8px">
                  <button id="btnDownloadTicketPng" class="btn btn-outline" style="flex:1;padding:10px;font-size:12px;font-weight:700;border-radius:8px;border:1.5px solid #E5E7EB">
                    📥 Simpan QR (PNG)
                  </button>
                  <button id="btnCloseTicketModal" class="btn btn-outline" style="padding:10px 16px;font-size:12px;border-radius:8px;border:1.5px solid #E5E7EB">
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // ── Bind Tab Handlers ──
    document.getElementById('tabBtnRoster').addEventListener('click', () => {
      activeTab = 'roster';
      renderView();
    });

    document.getElementById('tabBtnRoute').addEventListener('click', () => {
      activeTab = 'route';
      renderView();
    });

    // ── Bind Search Handler ──
    const searchInput = document.getElementById('rosterSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        const filtered = riders.filter(r => {
          const matchRole = activeRoleFilter === 'all' || (r.role || 'rider') === activeRoleFilter;
          const q = searchQuery.toLowerCase().trim();
          const matchSearch = !q ||
            (r.name && r.name.toLowerCase().includes(q)) ||
            (r.bib && String(r.bib).toLowerCase().includes(q));
          return matchRole && matchSearch;
        });

        const listContainer = document.getElementById('rosterListContainer');
        if (listContainer) {
          listContainer.innerHTML = filtered.length ? filtered.map((r, idx) => {
            const initials = getInitials(r.name);
            const avatarBg = getAvatarColor(r, idx);
            const roleType = r.role || 'rider';
            const roleLabel = roleType === 'sweeper' ? 'Sweeper' : (roleType === 'marshall' ? 'Marshall' : (roleType === 'medic' ? 'Medis' : 'Rider'));

            return `
              <div class="roster-item-card fade-in">
                <div class="roster-left">
                  <div class="roster-avatar" style="background:${escapeHtml(avatarBg)}">
                    ${escapeHtml(initials)}
                  </div>
                  <div class="roster-info">
                    <div class="roster-name-row">
                      <span class="roster-name">${escapeHtml(r.name)}</span>
                      <span class="verified-icon" title="Peserta Terverifikasi">✓</span>
                    </div>
                    <div class="roster-sub-row">
                      <span class="bib-pill-small">BIB #${escapeHtml(r.bib)}</span>
                      <span class="role-badge-tag ${escapeHtml(roleType)}">${escapeHtml(roleLabel)}</span>
                    </div>
                  </div>
                </div>

                <div class="roster-right">
                  <span class="status-confirmed-pill">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Terdaftar</span>
                  </span>
                </div>
              </div>
            `;
          }).join('') : `
            <div style="background:#FFFFFF;border:1.5px dashed #D0C9BF;border-radius:10px;padding:48px 24px;text-align:center;color:#6B7280">
              <div style="font-size:36px;margin-bottom:12px">🔍</div>
              <div style="font-weight:900;color:#0D1117;font-size:16px;letter-spacing:-0.02em;margin-bottom:6px">Tidak Ada Peserta yang Cocok</div>
              <div style="font-size:13px">Tidak ada hasil pencarian untuk "<strong>${escapeHtml(searchQuery)}</strong>"</div>
            </div>
          `;
        }
      });
    }

    // ── Bind Filter Role Handlers ──
    document.querySelectorAll('.filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        activeRoleFilter = btn.dataset.role;
        renderView();
      });
    });

    // ── Join Modal Handlers ──
    const joinModal = document.getElementById('kuyyJoinModal');
    const btnOpenJoin = document.getElementById('btnOpenJoinModal');
    const btnCloseJoin = document.getElementById('btnCloseJoinModal');
    const btnCancelJoin = document.getElementById('btnCancelJoin');
    const joinForm = document.getElementById('kuyyJoinForm');
    const joinErrMsg = document.getElementById('joinErrorMsg');
    const btnSubmitJoin = document.getElementById('btnSubmitJoin');

    const openJoin = () => {
      joinModal.style.display = 'flex';
      joinErrMsg.textContent = '';
      document.getElementById('joinName').focus();
    };
    const closeJoin = () => { joinModal.style.display = 'none'; };

    btnOpenJoin?.addEventListener('click', openJoin);
    btnCloseJoin?.addEventListener('click', closeJoin);
    btnCancelJoin?.addEventListener('click', closeJoin);

    joinForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      joinErrMsg.textContent = '';
      btnSubmitJoin.disabled = true;
      btnSubmitJoin.textContent = 'Mendaftarkan...';

      const name = document.getElementById('joinName').value.trim();
      const phone = document.getElementById('joinPhone').value.trim();
      const role = document.getElementById('joinRole').value;
      const bib = document.getElementById('joinBib').value.trim();

      try {
        const res = await fetch('/api/auth/rider/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: eventId,
            name,
            phone: phone || null,
            role,
            bib: bib || null
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          sessionStorage.setItem('riderConfig', JSON.stringify(data));
          localStorage.setItem('riderConfig', JSON.stringify(data));

          riders.push(data.rider);

          closeJoin();
          showTicketSuccessModal(data);
        } else {
          joinErrMsg.textContent = data.error || 'Pendaftaran gagal.';
          btnSubmitJoin.disabled = false;
          btnSubmitJoin.textContent = 'Daftar & Ambil Tiket QR →';
        }
      } catch (err) {
        joinErrMsg.textContent = 'Koneksi ke server bermasalah.';
        btnSubmitJoin.disabled = false;
        btnSubmitJoin.textContent = 'Daftar & Ambil Tiket QR →';
      }
    });
  }

  function showTicketSuccessModal(data) {
    const { rider } = data;
    const ticketModal = document.getElementById('ticketSuccessModal');
    if (!ticketModal) return;

    document.getElementById('resBibDisplay').textContent = `#${rider.bib}`;
    document.getElementById('resNameDisplay').textContent = rider.name;
    document.getElementById('resBibSub').textContent = rider.bib;
    document.getElementById('resPinSub').textContent = rider.pin || '1234';

    const qrContainer = document.getElementById('resQrContainer');
    qrContainer.innerHTML = '';

    const magicUrl = `${window.location.origin}/r/${rider.token}`;
    const canvas = document.createElement('canvas');

    if (typeof qrcode === 'function') {
      try {
        const qr = qrcode(0, 'M');
        qr.addData(magicUrl);
        qr.make();
        qr.renderToCanvas(canvas, 5, 6);
        canvas.style.maxWidth = '150px';
        canvas.style.maxHeight = '150px';
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        qrContainer.appendChild(canvas);
      } catch {
        qrContainer.innerHTML = `<div style="padding:10px;font-size:11px;color:#6B7280">${magicUrl}</div>`;
      }
    } else {
      qrContainer.innerHTML = `<div style="padding:10px;font-size:11px;color:#6B7280">${magicUrl}</div>`;
    }

    ticketModal.style.display = 'flex';

    document.getElementById('btnCloseTicketModal').onclick = () => {
      ticketModal.style.display = 'none';
      renderView();
    };

    document.getElementById('btnLaunchCockpitDirect').onclick = () => {
      Router.navigate('/rider/setup');
    };

    document.getElementById('btnDownloadTicketPng').onclick = () => {
      try {
        const link = document.createElement('a');
        link.download = `TIKET_BIB_${rider.bib}_${rider.name.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('Tiket QR berhasil disimpan!', 'success');
      } catch {
        showToast('Gagal mengunduh gambar QR.', 'error');
      }
    };
  }

  renderView();

  // ── Lightweight polling every 15s for live real-time roster updates ──
  const pollTimer = setInterval(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/riders`);
      if (res.ok) {
        const updated = await res.json();
        if (Array.isArray(updated) && updated.length !== riders.length) {
          riders = updated;
          const countEl = document.getElementById('rosterCountVal');
          const tabCountEl = document.getElementById('tabRosterCount');
          if (countEl) countEl.textContent = `${riders.length}`;
          if (tabCountEl) tabCountEl.textContent = riders.length;
          renderView();
        }
      }
    } catch {}
  }, 15000);

  Router.onUnmount(() => {
    clearInterval(pollTimer);
  });
}

window.renderEventActivity = renderEventActivity;
