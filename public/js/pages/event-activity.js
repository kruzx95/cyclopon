/**
 * CycloPon Event Activity & Rider Roster Page
 * Design Inspiration: Kuyy.app mobile-first community event & participant roster
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
      <div style="min-height:80vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:32px">
        <div>
          <div style="font-family:'Inter',system-ui,sans-serif;font-size:26px;font-weight:900;letter-spacing:-0.03em;color:#0D1117;margin-bottom:12px">CYCLOPON</div>
          <div style="font-size:14px;color:#6B7280;font-weight:700">Memuat data aktivitas &amp; daftar peserta...</div>
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
    const colors = ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#DB2777', '#0891B2'];
    return colors[idx % colors.length];
  }

  function renderView() {
    // Filter riders by search query & role
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
        <!-- ── Top Nav Bar ── -->
        <header class="activity-top-nav">
          <a href="/" data-link class="activity-back-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Beranda</span>
          </a>

          <a href="/" data-link class="activity-nav-brand">
            <img src="/icons/logo-emblem.svg" alt="CYCLOPON" width="24" height="24">
            <span>CYCLOPON</span>
          </a>

          <a href="/watch/${event.id}" data-link class="btn-kuyy-live" style="padding:6px 12px;font-size:12px;border-radius:18px">
            <span class="pulse-dot-green" style="background:#0D1117;box-shadow:none"></span>
            <span>Live Map</span>
          </a>
        </header>

        <!-- ── Kuyy Banner Hero Section ── -->
        <section class="activity-hero-card">
          <div class="activity-banner">
            <div class="activity-tag-row">
              <span class="sport-pill">🚴 CYCLING / ENDURANCE</span>
              ${isRegistrationOpen
                ? `<span class="status-pill-open"><span class="pulse-dot-green"></span>PENDAFTARAN BUKA</span>`
                : `<span class="sport-pill" style="color:#9CA3AF;border-color:#4B5563;background:rgba(255,255,255,0.05)">SELESAI / ARSIP</span>`
              }
            </div>

            <h1 class="activity-title">${escapeHtml(event.name)}</h1>

            <div class="activity-meta-grid">
              <div class="meta-item">
                <div class="meta-icon-box">📅</div>
                <div>
                  <span class="meta-label">JADWAL PELAKSANAAN</span>
                  <span class="meta-value">${escapeHtml(event.date || 'TBA')}</span>
                </div>
              </div>

              <div class="meta-item">
                <div class="meta-icon-box">👥</div>
                <div>
                  <span class="meta-label">PESERTA TERDAFTAR</span>
                  <span class="meta-value" id="rosterCountVal">${riders.length} Peserta</span>
                </div>
              </div>

              <div class="meta-item">
                <div class="meta-icon-box">📍</div>
                <div>
                  <span class="meta-label">POS KONTROL &amp; RUTE</span>
                  <span class="meta-value">${checkpoints.length ? `${checkpoints.length} Checkpoints` : 'Rute Resmi GPX'}</span>
                </div>
              </div>

              <div class="meta-item">
                <div class="meta-icon-box">🏆</div>
                <div>
                  <span class="meta-label">ORGANIZER</span>
                  <span class="meta-value">CycloPon Race Control</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ── Main Content Area (Tabs Navigation) ── -->
        <main class="activity-content-container">
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

          <!-- TAB 1: Roster Peserta (Kuyy Style) -->
          <div id="tabContentRoster" style="${activeTab === 'roster' ? 'display:block' : 'display:none'}">
            <!-- Search & Filter Controls -->
            <div class="roster-controls-row">
              <div class="roster-search-box">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2.5" style="margin-right:8px;flex-shrink:0">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input class="roster-search-input" id="rosterSearchInput" type="text"
                       placeholder="Cari peserta atau nomor BIB..." value="${escapeHtml(searchQuery)}">
              </div>

              <div class="filter-pills-row">
                <button class="filter-chip ${activeRoleFilter === 'all' ? 'active' : ''}" data-role="all">Semua (${riders.length})</button>
                <button class="filter-chip ${activeRoleFilter === 'rider' ? 'active' : ''}" data-role="rider">🚴 Rider</button>
                <button class="filter-chip ${activeRoleFilter === 'sweeper' ? 'active' : ''}" data-role="sweeper">🧹 Sweeper</button>
                <button class="filter-chip ${activeRoleFilter === 'marshall' ? 'active' : ''}" data-role="marshall">🏍️ Marshall</button>
                <button class="filter-chip ${activeRoleFilter === 'medic' ? 'active' : ''}" data-role="medic">🚑 Medis</button>
              </div>
            </div>

            <!-- Roster Items List -->
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
                <div style="background:#FFF;border:1.5px dashed #E5E7EB;border-radius:16px;padding:36px 20px;text-align:center;color:#6B7280">
                  <div style="font-size:32px;margin-bottom:8px">🔍</div>
                  <div style="font-weight:800;color:#0D1117;font-size:15px;margin-bottom:4px">Tidak ada peserta yang cocok</div>
                  <div style="font-size:12.5px">${searchQuery ? `Tidak ada hasil untuk pencarian "${escapeHtml(searchQuery)}"` : 'Belum ada peserta terdaftar. Jadilah yang pertama bergabung!'}</div>
                </div>
              `}
            </div>
          </div>

          <!-- TAB 2: Detail Rute & Checkpoints -->
          <div id="tabContentRoute" style="${activeTab === 'route' ? 'display:block' : 'display:none'}">
            <div style="background:#FFFFFF;border:1.5px solid #E5E7EB;border-radius:16px;padding:20px;margin-bottom:16px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
                <div>
                  <h3 style="font-size:16px;font-weight:900;margin:0;color:#0D1117">Pos Kontrol &amp; Cut-Off Time</h3>
                  <p style="font-size:12px;color:#6B7280;margin:2px 0 0 0">Pantau batas waktu kedatangan (COT) di setiap checkpoint resmi.</p>
                </div>
                ${event.gpx_path ? `
                  <a href="/api/events/${event.id}/gpx/download" download class="btn-kuyy-live" style="padding:7px 12px;font-size:12px">
                    <span>📥 Unduh GPX</span>
                  </a>
                ` : ''}
              </div>

              ${checkpoints.length ? `
                <div style="display:flex;flex-direction:column;gap:12px">
                  ${checkpoints.map((cp, idx) => `
                    <div style="display:flex;align-items:center;justify-content:space-between;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:12px 14px">
                      <div style="display:flex;align-items:center;gap:10px">
                        <span style="font-family:ui-monospace,monospace;font-size:11px;font-weight:900;background:#0D1117;color:#FFF;padding:3px 7px;border-radius:6px">CP ${String(idx + 1).padStart(2, '0')}</span>
                        <div>
                          <strong style="font-size:14px;color:#0D1117;display:block">${escapeHtml(cp.name)}</strong>
                          <span style="font-size:12px;color:#6B7280;font-weight:600">${cp.km_distance} KM dari Start</span>
                        </div>
                      </div>
                      <div>
                        ${cp.close_time ? `
                          <span style="font-family:ui-monospace,monospace;font-size:12px;font-weight:800;color:#DC2626;background:#FEE2E2;padding:3px 8px;border-radius:6px">
                            ⏱️ COT: ${escapeHtml(cp.close_time)}
                          </span>
                        ` : '<span style="color:#9CA3AF;font-size:12px">—</span>'}
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div style="text-align:center;padding:24px;color:#6B7280;font-size:13px">
                  Pos kontrol rute belum ditentukan untuk event ini.
                </div>
              `}
            </div>
          </div>
        </main>

        <!-- ── Sticky Bottom Action Bar (Kuyy Style CTA) ── -->
        <div class="activity-sticky-bar">
          <div class="sticky-bar-inner">
            <div class="sticky-info-col">
              <span class="sticky-info-label">// KUOTA PESERTA</span>
              <span class="sticky-info-val">${riders.length} Rider Terdaftar</span>
            </div>

            <div class="sticky-btn-group">
              <a href="/watch/${event.id}" data-link class="btn-kuyy-live" title="Buka Live Tracking GPS">
                <span>📺 Radar</span>
              </a>

              <button class="btn-kuyy-join" id="btnOpenJoinModal">
                <span>➕ Gabung / Daftar</span>
              </button>
            </div>
          </div>
        </div>

        <!-- ── Modal Pendaftaran Mandiri (Kuyy Modal Style) ── -->
        <div id="kuyyJoinModal" class="kuyy-modal-overlay" style="display:none">
          <div class="kuyy-modal-card">
            <div class="kuyy-modal-header">
              <h3 class="kuyy-modal-title">
                <span>🚴</span> DAFTAR AKTIVITAS RIDER
              </h3>
              <button id="btnCloseJoinModal" style="background:transparent;border:none;color:#FFF;font-size:18px;cursor:pointer;padding:4px">✕</button>
            </div>

            <div class="kuyy-modal-body">
              <p style="font-size:12.5px;color:#4B5563;margin-bottom:16px;line-height:1.45">
                Daftarkan diri Anda untuk event <strong>${escapeHtml(event.name)}</strong>. Tiket Pass &amp; QR Code otomatis terbit setelah mendaftar.
              </p>

              <form id="kuyyJoinForm">
                <div style="margin-bottom:12px">
                  <label style="display:block;font-size:11px;font-weight:800;color:#4B5563;text-transform:uppercase;margin-bottom:4px">Nama Lengkap *</label>
                  <input id="joinName" required class="input" style="width:100%;font-size:13.5px;border-radius:10px;padding:10px 12px;border:1.5px solid #D1D5DB" placeholder="Contoh: Budi Santoso">
                </div>

                <div style="margin-bottom:12px">
                  <label style="display:block;font-size:11px;font-weight:800;color:#4B5563;text-transform:uppercase;margin-bottom:4px">Nomor WhatsApp / HP</label>
                  <input id="joinPhone" class="input" style="width:100%;font-size:13.5px;border-radius:10px;padding:10px 12px;border:1.5px solid #D1D5DB" placeholder="081234567890">
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
                  <div>
                    <label style="display:block;font-size:11px;font-weight:800;color:#4B5563;text-transform:uppercase;margin-bottom:4px">Kategori / Peran</label>
                    <select id="joinRole" class="input" style="width:100%;font-size:13px;border-radius:10px;padding:9px;border:1.5px solid #D1D5DB">
                      <option value="rider">🚴 Rider</option>
                      <option value="sweeper">🧹 Sweeper</option>
                      <option value="marshall">🏍️ Marshall</option>
                      <option value="medic">🚑 Medis</option>
                    </select>
                  </div>
                  <div>
                    <label style="display:block;font-size:11px;font-weight:800;color:#4B5563;text-transform:uppercase;margin-bottom:4px">Nomor BIB <span style="font-weight:normal;color:#9CA3AF">(Opsional)</span></label>
                    <input id="joinBib" class="input" style="width:100%;font-size:13px;border-radius:10px;padding:9px;border:1.5px solid #D1D5DB;text-transform:uppercase" placeholder="Otomatis">
                  </div>
                </div>

                <p id="joinErrorMsg" style="color:#DC2626;font-size:12px;min-height:16px;margin-bottom:12px;font-weight:700"></p>

                <div style="display:flex;gap:10px">
                  <button type="submit" id="btnSubmitJoin" class="btn btn-primary" style="flex:1;padding:12px;font-size:13px;font-weight:800;border-radius:12px;background:#0D1117;color:#FFF">
                    Daftar &amp; Ambil Tiket QR →
                  </button>
                  <button type="button" id="btnCancelJoin" class="btn btn-outline" style="padding:12px 16px;font-size:13px;border-radius:12px">
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
            <div class="kuyy-modal-header" style="background:#059669">
              <h3 class="kuyy-modal-title" style="margin:0 auto">
                <span>🎉</span> PENDAFTARAN BERHASIL!
              </h3>
            </div>

            <div class="kuyy-modal-body" style="padding:20px">
              <div class="ticket-pass-box" id="digitalTicketCard">
                <div style="font-family:ui-monospace,monospace;font-size:10.5px;font-weight:800;color:#6B7280;text-transform:uppercase">
                  ${escapeHtml(event.name)}
                </div>
                <div style="font-family:ui-monospace,monospace;font-size:36px;font-weight:900;color:#0D1117;margin:4px 0" id="resBibDisplay">
                  #001
                </div>
                <div style="font-size:15px;font-weight:800;color:#0D1117" id="resNameDisplay">
                  Nama Rider
                </div>

                <div class="ticket-qr-wrap" id="resQrContainer">
                  <!-- QR Canvas or SVG -->
                </div>

                <div style="font-size:12px;color:#4B5563;margin-top:6px;line-height:1.4">
                  Scan QR atau simpan tautan ini untuk langsung masuk ke GPS tracker tanpa login.
                </div>

                <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:6px 10px;margin-top:10px;display:flex;justify-content:space-around;font-family:ui-monospace,monospace;font-size:11px">
                  <span>BIB: <strong id="resBibSub">001</strong></span>
                  <span>PIN: <strong id="resPinSub">1234</strong></span>
                </div>
              </div>

              <div style="display:flex;flex-direction:column;gap:8px">
                <button id="btnLaunchCockpitDirect" class="btn btn-primary" style="padding:12px;font-size:13px;font-weight:800;border-radius:10px;background:#0D1117;color:#FFF">
                  🚀 Buka Pelacak GPS Rider Sekarang
                </button>
                <div style="display:flex;gap:8px">
                  <button id="btnDownloadTicketPng" class="btn btn-outline" style="flex:1;padding:10px;font-size:12px;font-weight:700;border-radius:10px">
                    📥 Simpan QR (PNG)
                  </button>
                  <button id="btnCloseTicketModal" class="btn btn-outline" style="padding:10px 16px;font-size:12px;border-radius:10px">
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
            <div style="background:#FFF;border:1.5px dashed #E5E7EB;border-radius:16px;padding:36px 20px;text-align:center;color:#6B7280">
              <div style="font-size:32px;margin-bottom:8px">🔍</div>
              <div style="font-weight:800;color:#0D1117;font-size:15px;margin-bottom:4px">Tidak ada peserta yang cocok</div>
              <div style="font-size:12.5px">Tidak ada hasil untuk pencarian "${escapeHtml(searchQuery)}"</div>
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
          // Success! Save session so rider is logged in
          sessionStorage.setItem('riderConfig', JSON.stringify(data));
          localStorage.setItem('riderConfig', JSON.stringify(data));

          // Add newly registered rider to local array for instant view update
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

  // ── Lightweight polling every 15s for live real-time roster updates (Zero Firebase load) ──
  const pollTimer = setInterval(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/riders`);
      if (res.ok) {
        const updated = await res.json();
        if (Array.isArray(updated) && updated.length !== riders.length) {
          riders = updated;
          const countEl = document.getElementById('rosterCountVal');
          const tabCountEl = document.getElementById('tabRosterCount');
          if (countEl) countEl.textContent = `${riders.length} Peserta`;
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

