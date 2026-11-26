let activeAdminCpWs = null;

async function renderAdminEvent(params) {
  if (activeAdminCpWs) {
    try { activeAdminCpWs.close(); } catch {}
    activeAdminCpWs = null;
  }
  loadCss('/css/admin.css?v=94');

  // Route guard: check if admin is logged in
  const adminUser = sessionStorage.getItem('adminUser') || localStorage.getItem('adminUser');
  if (!adminUser) {
    Router.navigate('/admin');
    return;
  }
  if (!sessionStorage.getItem('adminUser')) sessionStorage.setItem('adminUser', adminUser);

  const eventId = params.id;
  const isNew = eventId === 'new';
  const app = document.getElementById('app');

  let event = { name: '', date: new Date().toISOString().slice(0, 10), gpx_path: null, active: 1, cot_mode: 'off', access_pin: '' };
  let riders = [];
  let checkpoints = [];
  let splits = [];
  let sponsors = [];

  if (!isNew) {
    try {
      const [evRes, rRes, cpRes, spRes, sponRes] = await Promise.all([
        fetch(`/api/events/admin/${eventId}`, { credentials: 'include' }),
        fetch(`/api/admin/riders/events/${eventId}`, { credentials: 'include' }),
        fetch(`/api/events/${eventId}/checkpoints`, { credentials: 'include' }),
        fetch(`/api/events/${eventId}/splits`, { credentials: 'include' }),
        fetch(`/api/events/${eventId}/sponsors`, { credentials: 'include' })
      ]);
      if (!evRes.ok) { Router.navigate('/admin/dashboard'); return; }
      event = await evRes.json();
      riders = rRes.ok ? await rRes.json() : [];
      checkpoints = cpRes.ok ? await cpRes.json() : [];
      splits = spRes.ok ? await spRes.json() : [];
      sponsors = sponRes.ok ? await sponRes.json() : [];
    } catch { Router.navigate('/admin/dashboard'); return; }
  }

  /**
   * Estimated COT finish clock: start time + (route km / pace) in WIB.
   * Returns '—' until a start time, pace, and route length are all known.
   */
  function formatCotEndTime(start, pace, routeKm) {
    const match = /^(\d{1,2}):(\d{2})/.exec(String(start || '').trim());
    const speed = Number(pace);
    const km = Number(routeKm);
    if (!match || !(speed > 0) || !(km > 0)) return '—';
    const startMinutes = Number(match[1]) * 60 + Number(match[2]);
    const totalMinutes = startMinutes + (km / speed) * 60;
    const dayMinutes = ((Math.floor(totalMinutes) % 1440) + 1440) % 1440;
    const hh = String(Math.floor(dayMinutes / 60)).padStart(2, '0');
    const mm = String(dayMinutes % 60).padStart(2, '0');
    return `${hh}:${mm} WIB`;
  }

  app.innerHTML = `
    <div class="admin-layout">
      ${adminSidebar('')}
      <main class="admin-content">
        <div class="page-header">
          <div style="display:flex;align-items:center;gap:12px">
            <button onclick="Router.navigate('/admin/dashboard')" class="btn btn-outline" style="padding:7px 12px;font-size:12.5px">← Back</button>
            <div class="page-header-title-col">
              <span class="page-header-tag">// RACE CONTROL · EVENT CONFIGURATION</span>
              <h1>${isNew ? 'Event Baru' : escapeHtml(event.name || 'Edit Event')}</h1>
            </div>
          </div>
          ${!isNew ? `
            <div class="page-header-actions">
              <a class="btn btn-outline" style="font-size:12.5px;padding:7px 14px" href="/events/${eventId}/results" target="_blank">🏆 Hasil &amp; Brevet</a>
              <a class="btn btn-primary" style="font-size:12.5px;padding:7px 14px" href="/watch/${eventId}?admin=1" target="_blank">🗺️ Live Map</a>
            </div>
          ` : ''}
        </div>

        ${!isNew ? `
          <!-- Real-Time Event & Spectator Telemetry Monitoring -->
          <div class="card" id="eventLiveMonitorCard" style="margin-bottom:20px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #E5E7EB;flex-wrap:wrap;gap:8px">
              <div>
                <span style="font-family:var(--font-mono);font-size:10px;font-weight:800;color:#6B7280;letter-spacing:0.08em">// REAL-TIME TELEMETRY &amp; SPECTATOR SURGE</span>
                <h2 style="font-size:15px;font-weight:900;color:#0D1117;text-transform:uppercase;margin:0;display:flex;align-items:center;gap:8px">
                  <span class="live-pulse-dot" style="display:inline-block;width:8px;height:8px;background:#10B981;border-radius:50%"></span>
                  Live Monitoring &amp; Penonton
                </h2>
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:11px;color:#6B7280;font-weight:600">Pembaruan tiap 5 dtk</span>
                <span id="evSurgeBadge" class="badge badge-active">● KAPASITAS AMAN</span>
              </div>
            </div>
            <div class="traffic-metrics-grid">
              <div class="traffic-metric-item" title="Jumlah koneksi live spectator yang membuka peta event ini via WebSocket">
                <div class="traffic-metric-lbl">Penonton Live</div>
                <div class="traffic-metric-val" id="evMetricViewers">0</div>
                <div class="traffic-metric-sub">Koneksi Penonton Aktif</div>
              </div>
              <div class="traffic-metric-item" title="Jumlah pesepeda yang perangkat GPS-nya aktif mengirim sinyal dalam 5 menit terakhir">
                <div class="traffic-metric-lbl">Rider Online</div>
                <div class="traffic-metric-val" id="evMetricActiveRiders" style="color:#166534">0 / --</div>
                <div class="traffic-metric-sub">Sinyal 5 Menit Terakhir</div>
              </div>
              <div class="traffic-metric-item" title="Kecepatan update koordinat GPS yang masuk dan disimpan database per menit">
                <div class="traffic-metric-lbl">Laju Update GPS</div>
                <div class="traffic-metric-val" id="evMetricTelemetryRate" style="color:#0284C7">0 titik/mnt</div>
                <div class="traffic-metric-sub">Titik per Menit (t/m)</div>
              </div>
              <div class="traffic-metric-item" title="Beban prosesor dan memori server VPS yang sedang berjalan">
                <div class="traffic-metric-lbl">Beban Server VPS</div>
                <div class="traffic-metric-val" id="evMetricServerLoad">--% RAM</div>
                <div class="traffic-metric-sub" id="evMetricServerLoadSub">CPU: --% · Traccar: OK</div>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Event Details Form -->
        <div class="card" style="margin-bottom:20px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #E5E7EB">
            <div>
              <span style="font-family:var(--font-mono);font-size:10px;font-weight:800;color:#6B7280;letter-spacing:0.08em">// EVENT ATTRIBUTES</span>
              <h2 style="font-size:15px;font-weight:900;color:#0D1117;text-transform:uppercase;margin:0">Detail Event</h2>
            </div>
            ${!isNew ? `
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <span class="badge ${event.active ? 'badge-active' : 'badge-finished'}">${event.active ? '● EVENT AKTIF' : 'EVENT SELESAI'}</span>
                ${event.access_pin
        ? '<span class="badge badge-medic">🔒 AKSES DIBATASI</span>'
        : '<span class="badge badge-active">🔓 AKSES TERBUKA</span>'}
              </div>
            ` : ''}
          </div>
          <form id="eventForm">
            <div class="form-row">
              <div class="form-group">
                <label for="evName">Nama Event</label>
                <input class="input" id="evName" value="${event.name}" placeholder="Gran Fondo Bandung 2026" required>
              </div>
              <div class="form-group">
                <label for="evDate">Tanggal</label>
                <input class="input" type="date" id="evDate" value="${event.date}" required>
              </div>
            </div>
            ${!isNew ? `
            <div class="form-group">
              <label>Status Event</label>
              <div style="display:flex;gap:8px;margin-top:4px">
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;text-transform:none;font-size:13.5px;font-weight:700;color:#0D1117">
                  <input type="radio" name="evActive" value="1" ${event.active ? 'checked' : ''}> Aktif
                </label>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;text-transform:none;font-size:13.5px;font-weight:700;color:#0D1117">
                  <input type="radio" name="evActive" value="0" ${!event.active ? 'checked' : ''}> Selesai
                </label>
              </div>
            </div>
            ` : ''}

            <div class="form-group" style="margin-top:16px;padding-top:16px;border-top:1px dashed #E5E7EB">
              <label style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
                ⏱️ Virtual COT — Garis Potong Bergerak
              </label>
              <div style="padding:12px;background:#F8FAFC;border:1px solid #E5E7EB;border-radius:10px">
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:12px">
                  <div>
                    <label for="evCotStart" style="margin-bottom:5px">Jam Mulai (WIB)</label>
                    <input class="input" type="time" id="evCotStart" value="${event.cot_start_time || ''}" style="height:42px">
                  </div>
                  <div>
                    <label for="evCotPace" style="margin-bottom:5px">Kecepatan (km/jam)</label>
                    <input class="input" type="number" min="1" step="0.1" id="evCotPace" value="${event.cot_pace || ''}" placeholder="20" style="height:42px">
                  </div>
                  <div>
                    <label for="evCotMode" style="margin-bottom:5px">Mode</label>
                    <select class="input" id="evCotMode" style="height:42px">
                      <option value="off" ${(event.cot_mode || 'off') === 'off' ? 'selected' : ''}>Nonaktif</option>
                      <option value="dry_run" ${event.cot_mode === 'dry_run' ? 'selected' : ''}>Uji (dry run)</option>
                      <option value="live" ${event.cot_mode === 'live' ? 'selected' : ''}>Aktif (live)</option>
                    </select>
                  </div>
                </div>
                <div id="evCotEndPreview" role="status" aria-live="polite"
                     title="Dihitung dari jam mulai + (panjang rute ÷ kecepatan)"
                     style="margin-top:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;height:42px;padding:0 14px;border:1.5px dashed #CBD5E1;border-radius:8px;background:#FFFFFF;transition:background 0.15s ease,border-color 0.15s ease">
                  <span style="display:inline-flex;align-items:center;gap:7px;font-family:var(--font-mono);font-size:11px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:#6B7280">
                    <span aria-hidden="true" style="font-size:13px;opacity:0.85">🕒</span>
                    Estimasi Jam Berakhir
                  </span>
                  <span id="evCotEndPreviewText" style="font-family:var(--font-mono);font-size:14px;font-weight:900;letter-spacing:0.01em;color:#94A3B8">—</span>
                </div>
              </div>
              <p style="color:#6B7280;font-size:12px;line-height:1.5;margin:8px 0 0">
                Kosongkan jam/kecepatan untuk menonaktifkan. Mode <strong>Uji</strong> hanya menghitung kandidat DNF tanpa mencatat apa pun.
                Jam berakhir COT dihitung otomatis: <strong>jam mulai + (panjang rute ÷ kecepatan)</strong> dan tampil di kartu status COT di bawah.
              </p>
            </div>

            <div class="form-group" style="margin-top:16px;padding-top:16px;border-top:1px dashed #E5E7EB">
              <label style="display:flex;align-items:center;gap:8px">
                🔐 PIN Akses Event — Batasi Rider Uji Coba
              </label>
              <div style="display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap;margin-top:6px">
                <input class="input" id="evAccessPin" inputmode="numeric" autocomplete="off" maxlength="8"
                       value="${escapeHtml(event.access_pin || '')}"
                       placeholder="Kosongkan untuk akses terbuka"
                       style="flex:1;min-width:180px;font-family:var(--font-mono);font-weight:800;letter-spacing:0.12em">
                <button class="btn btn-outline" type="button" id="btnGenerateEventPin" style="padding:10px 14px;font-size:12.5px" title="Buat PIN acak 6 digit">
                  🎲 Acak
                </button>
                <button class="btn btn-outline" type="button" id="btnClearEventPin" style="padding:10px 14px;font-size:12.5px" title="Hapus PIN dan buka akses untuk semua rider">
                  🔓 Buka Akses
                </button>
              </div>
              <p style="color:#6B7280;font-size:12px;margin:8px 0 0">
                Jika diisi (4-8 digit), rider wajib memasukkan PIN ini saat <strong>login BIB + PIN</strong> atau <strong>daftar mandiri</strong>.
                Kosongkan untuk membuka akses ke semua rider. Link Magic Link dari admin tetap dapat digunakan tanpa PIN.
              </p>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:16px">
              <button class="btn btn-primary" type="submit" id="saveEventBtn" style="padding:10px 20px">
                ${isNew ? 'Buat Event' : 'Simpan Perubahan'}
              </button>
              ${!isNew ? `
                <button type="button" class="btn btn-outline" id="btnDeleteCurrentEvent" style="color:#DC2626;border-color:#FCA5A5;padding:10px 16px;font-size:12.5px" title="Hapus event secara permanen">
                  🗑️ Hapus Event
                </button>
              ` : ''}
            </div>
          </form>
        </div>

        ${!isNew ? `
        <!-- GPX Upload -->
        <div class="card" style="margin-bottom:20px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #E5E7EB">
            <div>
              <span style="font-family:var(--font-mono);font-size:10px;font-weight:800;color:#6B7280;letter-spacing:0.08em">// ROUTE &amp; ELEVATION TELEMETRY</span>
              <h2 style="font-size:15px;font-weight:900;color:#0D1117;text-transform:uppercase;margin:0">Rute GPX</h2>
            </div>
            ${event.gpx_path ? '<span class="badge badge-active">TERPASANG</span>' : '<span class="badge badge-medic">BELUM ADA GPX</span>'}
          </div>
          ${event.gpx_path
        ? `<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">
                <span style="color:#047857;font-size:13px;font-weight:700">✅ GPX sudah di-upload: <code style="background:#F3F4F6;padding:2px 8px;border-radius:4px;color:#0D1117;border:1px solid #E5E7EB">${event.gpx_path}</code></span>
                <a href="/api/events/${event.id}/gpx/download" download class="btn btn-outline" style="font-size:12px;padding:4px 10px;text-decoration:none;display:inline-flex;align-items:center;gap:5px">📥 Unduh GPX</a>
              </div>`
        : `<p style="color:#D97706;font-size:13px;font-weight:700;margin-bottom:14px">⚠️ Belum ada file GPX. Upload rute agar tampil di Live Map.</p>`
      }
          <label class="gpx-drop-zone" for="gpxFileInput">
            <div style="font-size:32px;margin-bottom:8px">📁</div>
            <p style="font-weight:800;color:#0D1117;margin-bottom:4px">Klik atau drag file .gpx ke sini</p>
            <p style="color:#6B7280;font-size:12px;margin:0">Maksimal 10MB</p>
            <input type="file" id="gpxFileInput" accept=".gpx">
          </label>
          <p id="gpxStatus" style="font-size:13px;margin-top:10px;min-height:18px"></p>
        </div>

        <!-- Virtual COT Monitor -->
        <div class="card" style="margin-bottom:20px">
          <div class="page-header" style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #E5E7EB">
            <div>
              <span style="font-family:var(--font-mono);font-size:10px;font-weight:800;color:#6B7280;letter-spacing:0.08em">// MOVING CUT-OFF</span>
              <h2 style="font-size:15px;font-weight:900;color:#0D1117;text-transform:uppercase;margin:0">
                Virtual COT — Monitor
              </h2>
              <p style="color:#6B7280;font-size:12px;margin-top:2px;margin-bottom:0">
                Marker bergerak menyusuri rute. Rider dengan posisi segar di belakang marker dicatat DNF.
              </p>
            </div>
            <div class="cot-header-actions">
              <button class="btn btn-outline" id="btnCotRefresh" style="font-size:12.5px;padding:7px 14px">↻ Muat Ulang</button>
              <button class="btn btn-outline" id="btnCotReset" style="font-size:12.5px;padding:7px 14px;color:#B91C1C;border-color:#FCA5A5" title="Reset posisi marker dan hapus seluruh status DNF Virtual COT">🔄 Reset Sesi COT</button>
            </div>
          </div>
          <div id="cotMonitor">
            <p style="color:#6B7280;font-size:13px">Memuat status COT…</p>
          </div>
        </div>

        <!-- Checkpoints & Cut-Off Time (Audax / Brevet) -->
        <div class="card" style="margin-bottom:20px">
          <div class="page-header" style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #E5E7EB">
            <div>
              <span style="font-family:var(--font-mono);font-size:10px;font-weight:800;color:#6B7280;letter-spacing:0.08em">// CHRONO &amp; SPLIT MATRIX</span>
              <h2 style="font-size:15px;font-weight:900;color:#0D1117;text-transform:uppercase;margin:0">
                Checkpoints &amp; Cut-Off Time (Audax / Brevet)
                <span class="badge badge-cyan" style="margin-left:6px">${checkpoints.length}</span>
              </h2>
              <p style="color:#6B7280;font-size:12px;margin-top:2px;margin-bottom:0">Pos pemeriksaan, water station, dan batas waktu tempuh resmi</p>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
              ${checkpoints.length ? `
                <button type="button" class="btn btn-outline" style="font-size:12.5px;padding:7px 14px" id="btnPrintAllCpQr">
                  Cetak Semua QR Pos
                </button>
              ` : ''}
              <button type="button" class="btn btn-primary" style="font-size:12.5px;padding:7px 14px" id="btnShowAddCp">
                + Tambah Checkpoint
              </button>
            </div>
          </div>

          <div id="addCpContainer"></div>

          <div class="table-responsive-wrapper">
            <table class="rider-table">
              <thead>
                <tr>
                  <th>Pos</th><th>Nama Checkpoint</th><th>Jarak Target</th><th>Jam Buka</th><th>Batas COT</th><th>Aksi</th>
                </tr>
              </thead>
              <tbody id="cpTableBody">
                ${renderCheckpointTableRows(checkpoints)}
              </tbody>
            </table>
          </div>

          ${checkpoints.length ? `
            <div id="cpSplitsMonitorSection" style="margin-top:22px;padding-top:18px;border-top:1.5px solid #E5E7EB">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px">
                <div>
                  <h3 style="font-size:14px;font-weight:900;color:#0D1117;text-transform:uppercase;margin:0">
                    Monitor Check-In Peserta
                    <span id="cpLiveWsPill" style="display:none;margin-left:8px;font-family:var(--font-mono);font-size:10.5px;font-weight:800;padding:2px 8px;border-radius:4px;background:#ECFDF5;color:#047857;border:1px solid #047857">LIVE</span>
                  </h3>
                  <p style="color:#4B5563;font-size:12px;margin:2px 0 0 0">Pantau peserta yang sudah melakukan scan QR atau catat manual jika HP peserta terkendala</p>
                </div>
                <button type="button" class="btn btn-outline" id="btnRefreshCpSplits" style="font-size:12px;padding:7px 12px;min-height:40px">
                  Muat Ulang Check-In
                </button>
              </div>

              <div id="cpSplitsSummaryBar" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"></div>

              <div style="position:relative;display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
                <label for="cpSplitSearchInput" style="position:absolute;top:0;left:0;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap">Cari BIB atau nama peserta</label>
                <input type="text" id="cpSplitSearchInput" class="input" placeholder="Cari BIB atau nama peserta..." style="max-width:240px;padding:8px 12px;font-size:12.5px;min-height:40px">
                <div style="display:flex;gap:6px;flex-wrap:wrap" id="cpSplitFilterGroup">
                  <button type="button" class="tbl-filter-pill active" data-split-filter="all">Semua</button>
                  <button type="button" class="tbl-filter-pill" data-split-filter="checked">Sudah Scan</button>
                  <button type="button" class="tbl-filter-pill" data-split-filter="pending">Belum Scan</button>
                  <button type="button" class="tbl-filter-pill" id="btnFilterNeedsVerify" data-split-filter="needs_verify">Perlu Verifikasi (0)</button>
                </div>
              </div>

              <div class="table-responsive-wrapper" id="cpSplitsMatrixContainer"></div>
            </div>
          ` : ''}
        </div>

        <!-- Sponsor & Partner Logos (Live Map) -->
        <div class="card" style="margin-bottom:20px">
          <div class="page-header" style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #E5E7EB">
            <div>
              <span style="font-family:var(--font-mono);font-size:10px;font-weight:800;color:#6B7280;letter-spacing:0.08em">// SPONSORSHIP &amp; PARTNER LOGOS</span>
              <h2 style="font-size:15px;font-weight:900;color:#0D1117;text-transform:uppercase;margin:0">
                Logo Sponsor Live Map
                <span class="badge badge-cyan" id="sponsorCountBadge" style="margin-left:6px">${sponsors.length}</span>
              </h2>
              <p style="color:#6B7280;font-size:12px;margin-top:2px;margin-bottom:0">Logo sponsor yang melayang di bagian bawah Live Map publik dan dapat diklik menuju website masing-masing</p>
            </div>
            <button class="btn btn-primary" style="font-size:12.5px;padding:7px 14px" id="btnShowAddSponsor">
              + Tambah Sponsor
            </button>
          </div>

          <!-- Sponsor Strip Display Settings -->
          <div class="sponsor-strip-config-bar">
            <div class="sponsor-strip-config-desc">
              <span class="sponsor-strip-config-tag">⚙️ TAMPILAN DI LIVE MAP</span>
              <span class="sponsor-strip-config-sub">Atur tampilan bilah sponsor yang melayang:</span>
            </div>
            <div class="sponsor-strip-config-controls">
              <div class="sponsor-config-field">
                <label for="sponsorStripBg">Latar:</label>
                <select class="input" id="sponsorStripBg">
                  <option value="white" ${(event.sponsor_strip_bg || 'white') === 'white' ? 'selected' : ''}>Background Putih</option>
                  <option value="transparent" ${event.sponsor_strip_bg === 'transparent' ? 'selected' : ''}>Tanpa Background (Transparan)</option>
                </select>
              </div>
              <div class="sponsor-config-field sponsor-config-field-text">
                <label for="sponsorStripLabel">Teks Label:</label>
                <div class="sponsor-text-color-combo">
                  <input class="input" id="sponsorStripLabel" maxlength="40" value="${escapeHtml(event.sponsor_strip_label ?? 'Didukung oleh')}" placeholder="kosong = sembunyikan">
                  <input type="color" id="sponsorStripLabelColor" value="${event.sponsor_strip_label_color || '#64748B'}" title="Pilih warna teks">
                </div>
              </div>
            </div>
          </div>

          <div id="addSponsorContainer" style="display:none;margin-bottom:16px;background:#F9FAFB;padding:16px;border:1px solid #E5E7EB;border-radius:8px">
            <form id="addSponsorForm">
              <div class="form-row">
                <div class="form-group">
                  <label for="sponsorName">Nama Sponsor *</label>
                  <input class="input" id="sponsorName" placeholder="Contoh: Suddenly CC / Polygon" required>
                </div>
                <div class="form-group">
                  <label for="sponsorLink">Tautan Website / Instagram</label>
                  <input class="input" id="sponsorLink" placeholder="https://instagram.com/suddenlycc">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="sponsorFile">Upload File Logo (.png, .jpg, .svg, .webp)</label>
                  <input class="input" type="file" id="sponsorFile" accept="image/*">
                </div>
                <div class="form-group">
                  <label for="sponsorLogoPath">Atau Path / URL Logo Gambar</label>
                  <input class="input" id="sponsorLogoPath" placeholder="/uploads/sponsors/sdnlycc.jpeg">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="sponsorSort">Urutan Tampil</label>
                  <input class="input" type="number" id="sponsorSort" value="${sponsors.length + 1}">
                </div>
                <div class="form-group">
                  <label for="sponsorSize">Ukuran Logo (px, kosong = auto)</label>
                  <input class="input" type="number" id="sponsorSize" min="16" max="200" placeholder="auto">
                </div>
              </div>
              <div style="display:flex;gap:8px;margin-top:10px">
                <button type="submit" class="btn btn-primary" id="btnSaveSponsor" style="font-size:12.5px">Simpan Sponsor</button>
                <button type="button" class="btn btn-outline" id="btnCancelAddSponsor" style="font-size:12.5px">Batal</button>
              </div>
            </form>
          </div>

          <div class="table-responsive-wrapper">
            <table class="rider-table">
              <thead>
                <tr>
                  <th style="width:110px">Logo</th><th>Nama Sponsor</th><th>Tautan (Link)</th><th style="width:80px">Urutan</th><th style="width:90px">Ukuran (px)</th><th style="width:80px">Aksi</th>
                </tr>
              </thead>
              <tbody id="sponsorTableBody">
                ${renderSponsorTableRows(sponsors)}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Rider Management -->
        <div class="card">
          <div class="page-header" style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #E5E7EB">
            <div>
              <span style="font-family:var(--font-mono);font-size:10px;font-weight:800;color:#6B7280;letter-spacing:0.08em">// ACCREDITED ROSTER &amp; MARSHALL</span>
              <h2 style="font-size:15px;font-weight:900;color:#0D1117;text-transform:uppercase;margin:0">
                Daftar Rider &amp; Panitia Lapangan
                <span class="badge badge-cyan" style="margin-left:6px">${riders.length}</span>
              </h2>
              <p style="color:#6B7280;font-size:12px;margin-top:2px;margin-bottom:0">
                Kelola peserta, sweeper, marshall rute, tim medis, nomor BIB, PIN akses, dan Magic Link 1-klik
              </p>
            </div>
            <div class="rider-header-actions">
              <button class="btn btn-outline btn-print-qrs" style="font-size:12px;padding:7px 12px;font-weight:700" id="btnPrintAllQrs" title="Cetak Kartu BIB / QR Code semua peserta untuk event ini">
                🖨️ Cetak Semua QR (Batch BIB)
              </button>
              <a class="btn btn-outline btn-template-rider" style="font-size:12px;padding:7px 12px" href="/api/admin/riders/events/${eventId}/template" download="template_riders_cyclopon.csv" title="Unduh contoh template Excel/CSV">
                📥 Template CSV
              </a>
              <button class="btn btn-outline btn-import-rider" style="font-size:12px;padding:7px 12px" id="btnShowImportRider" title="Impor data peserta massal dari file atau teks CSV">
                📁 Import CSV
              </button>
              <button class="btn btn-primary btn-add-rider" style="font-size:12px;padding:7px 14px" id="btnShowAddRider">
                + Tambah Manual
              </button>
            </div>
          </div>

          <div id="importRiderContainer"></div>
          <div id="addRiderContainer"></div>

          <div class="table-responsive-wrapper">
            <table class="rider-table">
              <thead>
                <tr>
                  <th>BIB / Plat</th>
                  <th>Peran</th>
                  <th>Nama</th>
                  <th>WhatsApp / HP</th>
                  <th>PIN Akses</th>
                  <th>Akses Cepat (Magic Link / WA)</th>
                  <th>Warna</th>
                  <th>Device ID</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody id="riderTableBody">
                ${renderRiderTableRows(riders, event.name)}
              </tbody>
            </table>
          </div>
        </div>
        ` : ''}
      </main>
    </div>
  `;

  // Initialize Race Control SOS Monitor
  if (window.AdminSosMonitor) {
    window.AdminSosMonitor.init();
  }

  // Delegated table action handlers for rider operations
  const riderTableBody = document.getElementById('riderTableBody');
  if (riderTableBody) {
    riderTableBody.addEventListener('click', (e) => {
      const btnQr = e.target.closest('.btn-qr-code');
      if (btnQr) {
        showRiderQrModal({
          token: btnQr.dataset.token,
          bib: btnQr.dataset.bib,
          name: btnQr.dataset.name,
          role: btnQr.dataset.role,
          pin: btnQr.dataset.pin,
          eventName: btnQr.dataset.event
        });
        return;
      }
      const btnCopy = e.target.closest('.btn-copy-magic');
      if (btnCopy) {
        copyMagicLink(btnCopy.dataset.token, btnCopy.dataset.bib);
        return;
      }
      const btnWa = e.target.closest('.btn-wa-share');
      if (btnWa) {
        shareWhatsApp(btnWa.dataset.phone, btnWa.dataset.name, btnWa.dataset.bib, btnWa.dataset.pin, btnWa.dataset.token, btnWa.dataset.event);
        return;
      }
      const btnDel = e.target.closest('.btn-delete-rider');
      if (btnDel) {
        deleteRider(btnDel.dataset.id, btnDel.dataset.bib);
        return;
      }
    });
  }

  // Batch Print All QRs Handler
  const btnPrintAllQrs = document.getElementById('btnPrintAllQrs');
  if (btnPrintAllQrs) {
    btnPrintAllQrs.addEventListener('click', () => {
      showBatchPrintModal(riders, event.name);
    });
  }

  // ── Mobile Hamburger Drawer ──
  if (typeof setupAdminDrawer === 'function') setupAdminDrawer();

  // ── Event form handler ──
  document.getElementById('eventForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('saveEventBtn');
    btn.textContent = 'Menyimpan...';
    btn.disabled = true;

    const activeEl = document.querySelector('input[name="evActive"]:checked');
    const body = {
      name: document.getElementById('evName').value,
      date: document.getElementById('evDate').value,
      active: activeEl ? Number(activeEl.value) : 1,
      cot_start_time: document.getElementById('evCotStart')?.value || null,
      cot_pace: document.getElementById('evCotPace')?.value || null,
      cot_mode: document.getElementById('evCotMode')?.value || 'off',
      access_pin: document.getElementById('evAccessPin')?.value.trim() || null
    };

    const url = isNew ? '/api/events/admin' : `/api/events/admin/${eventId}`;
    const method = isNew ? 'POST' : 'PUT';

    let res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' });
    let data = await res.json();

    // Activation guard: confirm when too many riders would be flagged immediately
    if (res.status === 409 && data.preview) {
      const list = (data.preview.candidates || [])
        .slice(0, 10)
        .map(c => `• ${c.bib} ${c.name} (km ${Number(c.rider_km).toFixed(1)})`)
        .join('\n');
      const more = data.preview.candidates.length > 10 ? `\n…dan ${data.preview.candidates.length - 10} lainnya` : '';
      const proceed = confirm(
        `Aktivasi COT akan menandai ${data.preview.candidates.length} dari ${data.preview.riders_total} rider sebagai DNF.\n\n${list}${more}\n\nPeriksa jam mulai & kecepatan. Lanjutkan tetap?`
      );
      if (!proceed) {
        btn.textContent = isNew ? 'Buat Event' : 'Simpan Perubahan';
        btn.disabled = false;
        return;
      }
      body.force = true;
      res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' });
      data = await res.json();
    }

    if (res.ok) {
      showToast(isNew ? 'Event berhasil dibuat!' : 'Event diperbarui!', 'success');
      if (isNew) Router.navigate(`/admin/events/${data.id}`);
      else {
        btn.textContent = 'Simpan Perubahan';
        btn.disabled = false;
        refreshCotMonitor();
      }
    } else {
      showToast(data.error || 'Gagal menyimpan.', 'error');
      btn.textContent = isNew ? 'Buat Event' : 'Simpan Perubahan';
      btn.disabled = false;
    }
  });

  // ── Live COT finish estimate (start time + route ÷ pace) ──
  const updateCotEndPreview = () => {
    const box = document.getElementById('evCotEndPreview');
    const text = document.getElementById('evCotEndPreviewText');
    if (!box || !text) return;
    const value = formatCotEndTime(
      document.getElementById('evCotStart')?.value,
      document.getElementById('evCotPace')?.value,
      event.distance_km
    );
    const known = value && value !== '—';
    text.textContent = value || '—';
    text.style.color = known ? '#047857' : '#94A3B8';
    box.style.background = known ? '#F0FDF4' : '#FFFFFF';
    box.style.borderColor = known ? '#86EFAC' : '#CBD5E1';
    box.style.borderStyle = known ? 'solid' : 'dashed';
    box.title = known
      ? `Estimasi COT mencapai finish pukul ${value}`
      : 'Isi jam mulai, kecepatan, dan rute GPX untuk menghitung estimasi';
  };
  ['evCotStart', 'evCotPace'].forEach(id =>
    document.getElementById(id)?.addEventListener('input', updateCotEndPreview)
  );
  updateCotEndPreview();

  // ── Event access PIN helpers ──
  document.getElementById('btnGenerateEventPin')?.addEventListener('click', () => {
    const pinInput = document.getElementById('evAccessPin');
    if (!pinInput) return;
    pinInput.value = String(Math.floor(100000 + Math.random() * 900000));
    pinInput.focus();
    pinInput.select?.();
  });

  document.getElementById('btnClearEventPin')?.addEventListener('click', () => {
    const pinInput = document.getElementById('evAccessPin');
    if (!pinInput) return;
    pinInput.value = '';
    if (!isNew) showToast('PIN dikosongkan. Klik "Simpan Perubahan" untuk membuka akses.', 'success');
  });

  if (isNew) return;

  // ── Virtual COT monitor ─────────────────────────────────────
  const cotMonitor = document.getElementById('cotMonitor');
  const btnCotRefresh = document.getElementById('btnCotRefresh');

  function cotStatCard(label, value, accent) {
    return `
      <div style="border:1px solid #E5E7EB;border-radius:8px;padding:10px 12px;background:#FAFAFA">
        <div style="font-family:var(--font-mono);font-size:9.5px;font-weight:800;color:#6B7280;letter-spacing:0.08em">${label}</div>
        <div style="font-size:16px;font-weight:900;color:${accent || '#0D1117'};margin-top:2px">${value}</div>
      </div>`;
  }

  function formatWib(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  function renderCotMonitor(data) {
    if (!cotMonitor) return;

    const marker = data.marker || {};
    const statusMap = {
      MOVING: ['BERGERAK', '#047857'],
      NOT_STARTED: ['BELUM MULAI', '#92400E'],
      FINISHED: ['SELESAI', '#374151'],
      DISABLED: ['NONAKTIF', '#6B7280']
    };
    const [statusLabel, statusColor] = statusMap[marker.status] || [marker.status || '—', '#374151'];
    const modeLabel = { off: 'NONAKTIF', dry_run: 'UJI (DRY RUN)', live: 'LIVE' }[marker.mode] || (marker.mode || '—');

    const candidates = data.candidates || [];
    const stale = data.stale || [];
    const ledger = data.ledger || [];
    const activeDnf = ledger.filter(row => row.status === 'ACTIVE');

    const candidateBlock = candidates.length > 0
      ? `<div style="border:1px solid #FCA5A5;background:#FEF2F2;border-radius:8px;padding:10px 12px;margin-bottom:12px">
           <strong style="color:#B91C1C;font-size:12.5px">${candidates.length} kandidat DNF (posisi segar di belakang marker)</strong>
           <div style="margin-top:6px;font-size:12.5px;color:#7F1D1D">
             ${candidates.slice(0, 15).map(c => `• ${escapeHtml(c.bib)} ${escapeHtml(c.name)} — km ${Number(c.rider_km).toFixed(1)}`).join('<br>')}
             ${candidates.length > 15 ? `<br>…dan ${candidates.length - 15} lainnya` : ''}
           </div>
         </div>`
      : '';

    const staleBlock = stale.length > 0
      ? `<div style="border:1px solid #FDE68A;background:#FFFBEB;border-radius:8px;padding:10px 12px;margin-bottom:12px">
           <strong style="color:#92400E;font-size:12.5px">${stale.length} rider perlu verifikasi manual (posisi belum segar)</strong>
           <div style="margin-top:6px;font-size:12.5px;color:#78350F">
             ${stale.slice(0, 15).map(s => `• ${escapeHtml(s.bib)} ${escapeHtml(s.name)} — terakhir ${formatWib(s.last_seen_at)} (km ${Number(s.rider_km || 0).toFixed(1)})`).join('<br>')}
           </div>
         </div>`
      : '';

    const ledgerRows = ledger.length === 0
      ? `<tr><td colspan="7" style="text-align:center;color:#6B7280;padding:16px">Belum ada rider yang tercatat DNF.</td></tr>`
      : ledger.map(row => `
          <tr>
            <td><strong>${escapeHtml(row.bib)}</strong></td>
            <td>${escapeHtml(row.name)}</td>
            <td>${row.rider_km != null ? Number(row.rider_km).toFixed(1) : '—'}</td>
            <td>${Number(row.cot_km).toFixed(1)}</td>
            <td style="font-size:12px;color:#6B7280">${formatWib(row.last_seen_at)}</td>
            <td>
              <span class="badge ${row.status === 'ACTIVE' ? 'badge-medic' : 'badge-finished'}">${row.status === 'ACTIVE' ? 'DNF' : 'DIBATALKAN'}</span>
              ${row.status === 'VOID' && row.void_reason ? `<div style="font-size:11px;color:#6B7280;margin-top:2px">${escapeHtml(row.void_reason)}</div>` : ''}
            </td>
            <td>
              ${row.status === 'ACTIVE'
          ? `<button class="btn btn-outline btn-void-cot" data-rider="${row.rider_id}" data-bib="${escapeHtml(row.bib)}" style="font-size:11.5px;padding:4px 10px">Batalkan</button>`
          : '—'}
            </td>
          </tr>`).join('');

    cotMonitor.innerHTML = `
      <div class="cot-stats-grid">
        ${cotStatCard('MODE', modeLabel)}
        ${cotStatCard('STATUS MARKER', statusLabel, statusColor)}
        ${cotStatCard('POSISI MARKER', `${Number(marker.distanceKm || 0).toFixed(1)} km`)}
        ${cotStatCard('KECEPATAN', `${marker.pace ? marker.pace : '—'} km/jam`)}
        ${cotStatCard('EST. SELESAI', marker.endTime ? `${marker.endTime} WIB` : '—')}
        ${cotStatCard('PANJANG RUTE', `${Number(marker.routeLengthKm || 0).toFixed(1)} km`)}
        ${cotStatCard('DNF AKTIF', activeDnf.length, activeDnf.length > 0 ? '#B91C1C' : '#047857')}
      </div>
      ${marker.status === 'FINISHED' ? '<p style="font-size:12.5px;color:#374151;margin-bottom:10px">Marker sudah mencapai finish — tidak ada evaluasi DNF baru.</p>' : ''}
      ${data.evaluation && data.evaluation.state === 'deferred' ? '<p style="font-size:12.5px;color:#92400E;margin-bottom:10px">⚠️ Penilaian DNF ditunda: telemetri event belum segar.</p>' : ''}
      ${candidateBlock}
      ${staleBlock}
      <div class="table-responsive-wrapper">
        <table class="rider-table">
          <thead>
            <tr><th>BIB</th><th>Rider</th><th>Km Rider</th><th>Km COT</th><th>Posisi Terakhir</th><th>Status</th><th>Aksi</th></tr>
          </thead>
          <tbody>${ledgerRows}</tbody>
        </table>
      </div>`;
  }

  async function refreshCotMonitor() {
    if (!cotMonitor) return;
    try {
      // Public status call performs the real (live-mode) evaluation and ledger writes.
      await fetch(`/api/events/${eventId}/virtual-cot`, { credentials: 'include' }).catch(() => null);

      const res = await fetch(`/api/events/${eventId}/virtual-cot/preview`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) {
        cotMonitor.innerHTML = `<p style="color:#B91C1C;font-size:13px">${escapeHtml(data.error || 'Gagal memuat status COT.')}</p>`;
        return;
      }
      renderCotMonitor(data);
    } catch (err) {
      cotMonitor.innerHTML = '<p style="color:#B91C1C;font-size:13px">Gagal memuat status COT.</p>';
    }
  }

  if (btnCotRefresh) btnCotRefresh.addEventListener('click', refreshCotMonitor);

  function showCotResetModal() {
    const existing = document.getElementById('cotResetModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'cotResetModal';
    modal.className = 'qr-modal-overlay';
    modal.innerHTML = `
      <div class="qr-modal-card" style="max-width:480px;max-height:90vh;overflow-y:auto">
        <div class="qr-modal-header" style="background:#0D1117;display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:18px">🔄</span>
            <h3 style="margin:0;font-size:15px;font-weight:800;color:#FFFFFF">Reset Sesi Virtual COT</h3>
          </div>
          <button class="qr-modal-close" id="btnCloseCotReset" title="Tutup" style="background:none;border:none;color:#9CA3AF;font-size:18px;cursor:pointer">✕</button>
        </div>
        <div style="padding:20px">
          <p style="font-size:13px;color:#374151;margin:0 0 16px 0;line-height:1.5">
            Pilih tindakan reset untuk sesi Virtual COT pada event ini. Seluruh catatan DNF Virtual COT akan <strong>dihapus bersih</strong> sehingga status rider kembali aktif (putih).
          </p>

          <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:16px">
            <div style="padding:14px;border:1.5px solid #FCA5A5;background:#FEF2F2;border-radius:10px">
              <div style="font-weight:800;font-size:13px;color:#991B1B;margin-bottom:4px">🚀 Mulai Ulang Sekarang (KM 0.0)</div>
              <p style="font-size:12px;color:#7F1D1D;margin:0 0 10px 0;line-height:1.4">
                Menggeser jam mulai COT ke waktu saat ini (WIB), mengembalikan marker ke awal rute (KM 0.0), dan membersihkan seluruh DNF Virtual COT. Jika COT sedang nonaktif, mode akan otomatis diaktifkan ke live.
              </p>
              <button class="btn btn-primary" id="btnExecCotRestartNow" style="width:100%;font-size:12px;padding:8px 12px;background:#DC2626;border-color:#DC2626">
                Mulai Ulang dari KM 0 Sekarang
              </button>
            </div>

            <div style="padding:14px;border:1.5px solid #E5E7EB;background:#F9FAFB;border-radius:10px">
              <div style="font-weight:800;font-size:13px;color:#374151;margin-bottom:4px">⏹️ Matikan COT & Hapus DNF</div>
              <p style="font-size:12px;color:#6B7280;margin:0 0 10px 0;line-height:1.4">
                Menonaktifkan mode COT (off), menyembunyikan marker dari peta, dan membersihkan seluruh catatan DNF Virtual COT.
              </p>
              <button class="btn btn-outline" id="btnExecCotStop" style="width:100%;font-size:12px;padding:8px 12px">
                Matikan COT & Bersihkan
              </button>
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end">
            <button class="btn btn-outline" id="btnCancelCotReset" style="font-size:12px;padding:6px 14px">Batal</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Reset Sesi Virtual COT');

    const closeModal = () => {
      document.removeEventListener('keydown', onKeydown);
      modal.remove();
    };
    function onKeydown(e) {
      if (e.key === 'Escape') closeModal();
    }
    document.addEventListener('keydown', onKeydown);

    modal.querySelector('#btnCloseCotReset').addEventListener('click', closeModal);
    modal.querySelector('#btnCancelCotReset').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    async function executeReset(action) {
      const confirmText = action === 'restart_now'
        ? 'Mulai ulang Virtual COT dari KM 0 pada menit ini? Semua catatan DNF uji coba akan dibersihkan.'
        : 'Matikan Virtual COT dan bersihkan semua catatan DNF?';

      if (!confirm(confirmText)) return;

      try {
        const res = await fetch(`/api/events/${eventId}/virtual-cot/reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
          credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Gagal mereset Virtual COT', 'error');
          return;
        }

        closeModal();
        showToast(`Virtual COT berhasil di-reset (${data.cleared_dnf_count} DNF dibersihkan).`, 'success');

        if (data.cot) {
          const evCotStart = document.getElementById('evCotStart');
          const evCotMode = document.getElementById('evCotMode');
          if (evCotStart && data.cot.start_time) evCotStart.value = data.cot.start_time;
          if (evCotMode && data.cot.mode) evCotMode.value = data.cot.mode;
          updateCotEndPreview();
        }

        await refreshCotMonitor();
      } catch (err) {
        showToast('Terjadi kesalahan saat mereset Virtual COT', 'error');
      }
    }

    modal.querySelector('#btnExecCotRestartNow').addEventListener('click', () => executeReset('restart_now'));
    modal.querySelector('#btnExecCotStop').addEventListener('click', () => executeReset('stop'));
  }

  const btnCotReset = document.getElementById('btnCotReset');
  if (btnCotReset) {
    btnCotReset.addEventListener('click', showCotResetModal);
  }

  if (cotMonitor) {
    cotMonitor.addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn-void-cot');
      if (!btn) return;

      const reason = prompt(`Batalkan DNF rider ${btn.dataset.bib}?\nTulis alasan pembatalan (tercatat di audit):`);
      if (!reason || !reason.trim()) return;

      try {
        const res = await fetch(`/api/events/${eventId}/virtual-cot/void/${btn.dataset.rider}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: reason.trim() }),
          credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Gagal membatalkan DNF', 'error');
          return;
        }
        showToast('DNF dibatalkan.', 'success');
        refreshCotMonitor();
      } catch (err) {
        showToast('Gagal membatalkan DNF', 'error');
      }
    });
  }

  refreshCotMonitor();

  // ── Delete event handler ──
  document.getElementById('btnDeleteCurrentEvent')?.addEventListener('click', async () => {
    if (!confirm(`Hapus event "${event.name}" secara permanen?\nSemua peserta, checkpoint, dan rute GPX akan dihapus.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/events/admin/${eventId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Event berhasil dihapus!', 'success');
        Router.navigate('/admin/dashboard');
      } else {
        showToast(data.error || 'Gagal menghapus event', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan saat menghapus event', 'error');
    }
  });

  // ── GPX upload handler ──
  document.getElementById('gpxFileInput').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const statusEl = document.getElementById('gpxStatus');
    statusEl.textContent = '⏳ Mengupload...';
    statusEl.style.color = 'var(--text-secondary)';

    const formData = new FormData();
    formData.append('gpx', file);
    const res = await fetch(`/api/events/admin/${eventId}/gpx`, { method: 'POST', body: formData, credentials: 'include' });
    const data = await res.json();

    if (res.ok) {
      statusEl.textContent = `✅ Upload berhasil: ${data.gpx_path}`;
      statusEl.style.color = 'var(--color-green)';
      refreshCotMonitor();
      showToast('File GPX berhasil di-upload!', 'success');
    } else {
      statusEl.textContent = `❌ ${data.error}`;
      statusEl.style.color = 'var(--color-red)';
    }
  });

  // ── Show add-cp form ──
  document.getElementById('btnShowAddCp')?.addEventListener('click', () => {
    const container = document.getElementById('addCpContainer');
    if (container.innerHTML) { container.innerHTML = ''; return; }

    container.innerHTML = `
      <div class="add-cp-panel">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:14px">Tambah Checkpoint Baru</h3>
        <form id="addCpForm">
          <div class="form-row">
            <div class="form-group">
              <label for="cpName">Nama Checkpoint / Pos</label>
              <input class="input" id="cpName" placeholder="Contoh: CP 1 Waduk Cirata" required>
            </div>
            <div class="form-group">
              <label for="cpKm">Target KM (dari Start)</label>
              <input class="input" id="cpKm" type="number" step="0.1" placeholder="62.5" required min="0">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="cpOpen">Jam Buka (Opsional, cth: 06:30)</label>
              <input class="input" id="cpOpen" placeholder="06:30">
            </div>
            <div class="form-group">
              <label for="cpClose">Jam Tutup / Cut-Off Time (Opsional, cth: 10:30)</label>
              <input class="input" id="cpClose" placeholder="10:30">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="cpCoords">Koordinat Pos (Opsional, Paste dari Google Maps)</label>
              <input class="input" id="cpCoords" placeholder="-6.721401, 107.351245">
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
                <button type="button" class="btn btn-outline" id="btnUseCurrentGeoCp" style="padding:5px 10px;font-size:11.5px;min-height:36px">Ambil Lokasi Saya</button>
                <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" id="linkPreviewCpMap" class="btn btn-outline" style="padding:5px 10px;font-size:11.5px;min-height:36px;text-decoration:none;display:inline-flex;align-items:center">Cek di Google Maps</a>
              </div>
            </div>
            <div class="form-group">
              <label for="cpRadius">Kunci Radius Check-In (Meter)</label>
              <input class="input" id="cpRadius" type="number" min="0" max="50000" step="50" placeholder="500">
              <small style="display:block;margin-top:4px;color:#4B5563;font-size:11.5px">Aktif bila koordinat diisi. Isi 0 untuk tanpa kunci radius (disarankan 300-500 m).</small>
            </div>
          </div>
          <p id="addCpError" style="color:var(--color-red);font-size:13px;min-height:18px;margin-bottom:10px"></p>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary" type="submit" id="addCpBtn">Tambah Checkpoint</button>
            <button class="btn btn-outline" type="button" id="cancelAddCp">Batal</button>
          </div>
        </form>
      </div>
    `;

    const coordsInput = document.getElementById('cpCoords');
    const radiusInput = document.getElementById('cpRadius');
    const previewLink = document.getElementById('linkPreviewCpMap');

    function syncPreviewAndRadius() {
      const val = coordsInput.value.trim();
      const match = /(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)/.exec(val);
      if (match) {
        previewLink.href = `https://www.google.com/maps?q=${encodeURIComponent(match[1] + ',' + match[2])}`;
        if (radiusInput.value === '') radiusInput.value = '500';
      } else {
        previewLink.href = 'https://www.google.com/maps';
      }
    }
    coordsInput.addEventListener('input', syncPreviewAndRadius);

    document.getElementById('btnUseCurrentGeoCp').addEventListener('click', () => {
      if (!('geolocation' in navigator)) {
        showToast('Browser tidak mendukung geolokasi.', 'error');
        return;
      }
      const geoBtn = document.getElementById('btnUseCurrentGeoCp');
      geoBtn.disabled = true;
      geoBtn.textContent = 'Mengambil GPS...';
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          coordsInput.value = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
          syncPreviewAndRadius();
          geoBtn.disabled = false;
          geoBtn.textContent = 'Ambil Lokasi Saya';
          showToast('Koordinat GPS saat ini diisi.', 'success');
        },
        () => {
          geoBtn.disabled = false;
          geoBtn.textContent = 'Ambil Lokasi Saya';
          showToast('Gagal mengambil GPS. Pastikan izin lokasi aktif.', 'error');
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    });

    document.getElementById('cancelAddCp').addEventListener('click', () => { container.innerHTML = ''; });
    document.getElementById('addCpForm').addEventListener('submit', async e => {
      e.preventDefault();
      const btn = document.getElementById('addCpBtn');
      const errEl = document.getElementById('addCpError');
      btn.textContent = 'Menambahkan...'; btn.disabled = true; errEl.textContent = '';

      const rawCoords = coordsInput.value.trim();
      const rawRadius = radiusInput.value.trim();
      const body = {
        name: document.getElementById('cpName').value.trim(),
        km_distance: parseFloat(document.getElementById('cpKm').value),
        open_time: document.getElementById('cpOpen').value.trim() || null,
        close_time: document.getElementById('cpClose').value.trim() || null,
        coords: rawCoords || null,
        radius_meters: rawCoords && rawRadius !== '' ? Number(rawRadius) : null,
        order_index: checkpoints.length + 1
      };

      const res = await fetch(`/api/events/${eventId}/checkpoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include'
      });
      const data = await res.json();

      if (res.ok) {
        showToast(`Checkpoint "${body.name}" ditambahkan!`, 'success');
        await renderAdminEvent({ id: eventId });
      } else {
        errEl.textContent = data.error || 'Gagal menambahkan checkpoint.';
        btn.textContent = 'Tambah Checkpoint'; btn.disabled = false;
      }
    });
  });

  document.getElementById('btnPrintAllCpQr')?.addEventListener('click', () => {
    showBatchCpQrModal(checkpoints, event.name);
  });

  // ── Live Check-In Monitor & Manual Fallback ──
  let splitFilterMode = 'all';
  let splitSearchQuery = '';
  let adminCpWs = null;
  let adminCpMounted = true;

  function formatAdminSplitWib(val) {
    if (!val) return '-';
    const raw = String(val).trim();
    if (!raw.includes('T') && !raw.includes('-')) return raw;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    try {
      return d.toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }) + ' WIB';
    } catch {
      return raw;
    }
  }

  function renderAdminSplitsMatrix() {
    const summaryEl = document.getElementById('cpSplitsSummaryBar');
    const matrixEl = document.getElementById('cpSplitsMatrixContainer');
    if (!summaryEl || !matrixEl || !checkpoints.length) return;

    const splitLookup = new Map();
    const countByCp = new Map();
    let pendingVerifyTotal = 0;
    splits.forEach(s => {
      splitLookup.set(`${s.rider_id}_${s.checkpoint_id}`, s);
      countByCp.set(Number(s.checkpoint_id), (countByCp.get(Number(s.checkpoint_id)) || 0) + 1);
      if (s.verification_status === 'PENDING_VERIFY') pendingVerifyTotal++;
    });

    const verifyFilterBtn = document.getElementById('btnFilterNeedsVerify');
    if (verifyFilterBtn) {
      verifyFilterBtn.textContent = `Perlu Verifikasi (${pendingVerifyTotal})`;
      verifyFilterBtn.style.borderColor = pendingVerifyTotal > 0 ? '#966025' : '';
      verifyFilterBtn.style.color = pendingVerifyTotal > 0 && !verifyFilterBtn.classList.contains('active') ? '#78350F' : '';
    }

    const participantRiders = riders.filter(r => !r.role || r.role === 'rider');
    const totalParticipants = participantRiders.length;

    summaryEl.innerHTML = checkpoints.map((cp, idx) => {
      const scannedCount = countByCp.get(Number(cp.id)) || 0;
      const cpNum = `CP ${String(idx + 1).padStart(2, '0')}`;
      return `
        <div style="background:#F8FAFC;border:1px solid #D0C9BF;border-radius:8px;padding:8px 12px;font-size:12px;display:inline-flex;align-items:center;gap:8px">
          <span style="font-family:var(--font-mono);font-weight:900;color:#0D1117">${cpNum}</span>
          <span style="color:#334338;font-weight:700">${escapeHtml(cp.name)}:</span>
          <strong style="font-family:var(--font-mono);color:#2B4E30">${scannedCount} / ${totalParticipants}</strong>
        </div>
      `;
    }).join('');

    const q = splitSearchQuery.trim().toLowerCase();
    const filteredRiders = participantRiders.filter(r => {
      if (q) {
        const bibMatch = String(r.bib || '').toLowerCase().includes(q);
        const nameMatch = String(r.name || '').toLowerCase().includes(q);
        if (!bibMatch && !nameMatch) return false;
      }
      const riderSplitsList = checkpoints.map(cp => splitLookup.get(`${r.id}_${cp.id}`)).filter(Boolean);
      const clearedCount = riderSplitsList.length;
      const hasPendingVerify = riderSplitsList.some(s => s.verification_status === 'PENDING_VERIFY');
      if (splitFilterMode === 'checked') return clearedCount > 0;
      if (splitFilterMode === 'pending') return clearedCount < checkpoints.length;
      if (splitFilterMode === 'needs_verify') return hasPendingVerify;
      return true;
    });

    if (!participantRiders.length) {
      matrixEl.innerHTML = '<div style="text-align:center;color:#4B5563;padding:20px;font-size:13px">Belum ada peserta terdaftar di event ini.</div>';
      return;
    }

    if (!filteredRiders.length) {
      matrixEl.innerHTML = '<div style="text-align:center;color:#4B5563;padding:20px;font-size:13px">Tidak ada peserta yang sesuai filter pencarian.</div>';
      return;
    }

    matrixEl.innerHTML = `
      <table class="rider-table">
        <thead>
          <tr>
            <th>BIB</th>
            <th>Peserta</th>
            ${checkpoints.map((cp, idx) => `<th>CP ${String(idx + 1).padStart(2, '0')} · ${escapeHtml(cp.name)}</th>`).join('')}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${filteredRiders.map(r => {
            let cleared = 0;
            const cells = checkpoints.map(cp => {
              const sp = splitLookup.get(`${r.id}_${cp.id}`);
              if (sp) {
                cleared++;
                const isPendingVerify = sp.verification_status === 'PENDING_VERIFY';
                const isOver = sp.status === 'OVER_COT';
                const srcTag = sp.source === 'qr_scan' ? 'QR' : 'ADMIN';
                const distLabel = sp.distance_meters != null
                  ? (sp.distance_meters >= 1000 ? `${(sp.distance_meters / 1000).toFixed(2)} km` : `${Math.round(sp.distance_meters)} m`)
                  : null;
                const reasonText = sp.flag_reason === 'GPS_REQUIRED'
                  ? 'Tanpa GPS'
                  : (distLabel ? `Jarak: ${distLabel}` : '');
                return `
                  <td>
                    <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-start">
                      <span style="font-family:var(--font-mono);font-size:12px;font-weight:800;color:#0D1117">${escapeHtml(formatAdminSplitWib(sp.arrival_time))}</span>
                      <span style="font-family:var(--font-mono);font-size:10px;font-weight:800;padding:2px 6px;border-radius:4px;background:${isPendingVerify || isOver ? '#966025' : '#047857'};color:#FFFFFF">
                        ${isPendingVerify ? 'PERLU VERIFIKASI' : `${isOver ? 'OVER COT' : 'LOLOS'} · ${srcTag}`}
                      </span>
                      ${reasonText ? `<span style="font-family:var(--font-mono);font-size:10px;color:#4B5563">${escapeHtml(reasonText)}</span>` : ''}
                      ${isPendingVerify ? `
                        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:2px">
                          <button type="button" class="btn btn-primary btn-approve-split" data-split-id="${sp.id}" style="padding:3px 8px;font-size:10.5px;min-height:30px;background:#2B4E30;border-color:#2B4E30">
                            Setujui
                          </button>
                          <button type="button" class="btn btn-danger btn-reject-split" data-split-id="${sp.id}" style="padding:3px 8px;font-size:10.5px;min-height:30px">
                            Tolak
                          </button>
                        </div>
                      ` : ''}
                    </div>
                  </td>
                `;
              }
              return `
                <td>
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                    <span style="font-size:11.5px;color:#6B7280;font-weight:600">Belum</span>
                    <button type="button" class="btn btn-outline btn-admin-manual-split" data-rider-id="${r.id}" data-cp-id="${cp.id}" style="padding:4px 8px;font-size:11px;min-height:32px">
                      Catat
                    </button>
                  </div>
                </td>
              `;
            }).join('');

            return `
              <tr>
                <td><span style="font-family:var(--font-mono);font-weight:900">#${escapeHtml(r.bib)}</span></td>
                <td><strong>${escapeHtml(r.name)}</strong></td>
                ${cells}
                <td><span style="font-family:var(--font-mono);font-weight:800;color:${cleared === checkpoints.length ? '#047857' : '#0D1117'}">${cleared}/${checkpoints.length}</span></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  async function refreshAdminSplits() {
    try {
      const res = await fetch(`/api/events/${eventId}/splits`, { credentials: 'include' });
      if (res.ok) {
        splits = await res.json();
        renderAdminSplitsMatrix();
      }
    } catch {}
  }

  if (!isNew && checkpoints.length) {
    renderAdminSplitsMatrix();

    document.getElementById('btnRefreshCpSplits')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnRefreshCpSplits');
      if (btn) { btn.disabled = true; btn.textContent = 'Memuat...'; }
      await refreshAdminSplits();
      if (btn) { btn.disabled = false; btn.textContent = 'Muat Ulang Check-In'; }
    });

    document.getElementById('cpSplitSearchInput')?.addEventListener('input', (e) => {
      splitSearchQuery = e.target.value || '';
      renderAdminSplitsMatrix();
    });

    document.getElementById('cpSplitFilterGroup')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-split-filter]');
      if (!btn) return;
      splitFilterMode = btn.dataset.splitFilter;
      document.querySelectorAll('#cpSplitFilterGroup .tbl-filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderAdminSplitsMatrix();
    });

    document.getElementById('cpSplitsMatrixContainer')?.addEventListener('click', async (e) => {
      const approveBtn = e.target.closest('.btn-approve-split');
      if (approveBtn) {
        const splitId = Number(approveBtn.dataset.splitId);
        approveBtn.disabled = true;
        approveBtn.textContent = '...';
        try {
          const res = await fetch(`/api/events/${eventId}/splits/${splitId}/approve`, {
            method: 'PUT',
            credentials: 'include'
          });
          if (!res.ok) throw new Error('Gagal menyetujui check-in.');
          showToast('Check-in peserta disetujui.', 'success');
          await refreshAdminSplits();
        } catch (err) {
          showToast(err.message || 'Gagal menyetujui check-in.', 'error');
          approveBtn.disabled = false;
          approveBtn.textContent = 'Setujui';
        }
        return;
      }

      const rejectBtn = e.target.closest('.btn-reject-split');
      if (rejectBtn) {
        const splitId = Number(rejectBtn.dataset.splitId);
        if (!confirm('Tolak dan hapus catatan check-in ini? Status peserta akan kembali ke Belum.')) return;
        rejectBtn.disabled = true;
        rejectBtn.textContent = '...';
        try {
          const res = await fetch(`/api/events/${eventId}/splits/${splitId}`, {
            method: 'DELETE',
            credentials: 'include'
          });
          if (!res.ok) throw new Error('Gagal menolak check-in.');
          showToast('Check-in ditolak dan dihapus.', 'info');
          await refreshAdminSplits();
        } catch (err) {
          showToast(err.message || 'Gagal menolak check-in.', 'error');
          rejectBtn.disabled = false;
          rejectBtn.textContent = 'Tolak';
        }
        return;
      }

      const btn = e.target.closest('.btn-admin-manual-split');
      if (!btn) return;
      const rId = Number(btn.dataset.riderId);
      const cId = Number(btn.dataset.cpId);
      const riderObj = riders.find(r => r.id === rId);
      const cpObj = checkpoints.find(c => c.id === cId);
      if (!riderObj || !cpObj) return;
      if (!confirm(`Catat check-in manual untuk #${riderObj.bib} ${riderObj.name} di ${cpObj.name} pada waktu sekarang?`)) return;

      btn.disabled = true;
      btn.textContent = '...';
      try {
        const res = await fetch(`/api/events/${eventId}/splits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            rider_id: rId,
            checkpoint_id: cId,
            arrival_time: new Date().toISOString()
          })
        });
        if (!res.ok) throw new Error('Gagal mencatat check-in manual.');
        showToast(`Check-in #${riderObj.bib} di ${cpObj.name} tercatat.`, 'success');
        await refreshAdminSplits();
      } catch (err) {
        showToast(err.message || 'Gagal mencatat check-in.', 'error');
        btn.disabled = false;
        btn.textContent = 'Catat';
      }
    });

    try {
      const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      adminCpWs = new WebSocket(`${wsProto}//${window.location.host}/traccar-ws?event_id=${eventId}`);
      activeAdminCpWs = adminCpWs;
      adminCpWs.onopen = () => {
        const pill = document.getElementById('cpLiveWsPill');
        if (pill && adminCpMounted) pill.style.display = 'inline-block';
      };
      adminCpWs.onmessage = (ev) => {
        if (!adminCpMounted) return;
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'checkpoint_split' && msg.split && Number(msg.event_id) === Number(eventId)) {
            const sp = msg.split;
            const existingIdx = splits.findIndex(s => Number(s.rider_id) === Number(sp.rider_id) && Number(s.checkpoint_id) === Number(sp.checkpoint_id));
            if (existingIdx >= 0) splits[existingIdx] = sp;
            else splits.push(sp);
            renderAdminSplitsMatrix();
            const isPend = sp.verification_status === 'PENDING_VERIFY';
            showToast(
              `${isPend ? 'Perlu Verifikasi' : 'Scan CP'}: #${sp.rider_bib || ''} ${sp.rider_name || ''} di ${sp.checkpoint_name || 'CP'} (${formatAdminSplitWib(sp.arrival_time)})`,
              isPend || sp.status === 'OVER_COT' ? 'warning' : 'success'
            );
          } else if (msg.type === 'checkpoint_split_removed' && Number(msg.event_id) === Number(eventId)) {
            splits = splits.filter(s => Number(s.id) !== Number(msg.split_id));
            renderAdminSplitsMatrix();
          }
        } catch {}
      };
      adminCpWs.onclose = () => {
        if (activeAdminCpWs === adminCpWs) activeAdminCpWs = null;
        const pill = document.getElementById('cpLiveWsPill');
        if (pill) pill.style.display = 'none';
      };
    } catch {}

    if (typeof Router !== 'undefined' && typeof Router.onUnmount === 'function') {
      Router.onUnmount(() => {
        adminCpMounted = false;
        if (adminCpWs) {
          try { adminCpWs.close(); } catch {}
          if (activeAdminCpWs === adminCpWs) activeAdminCpWs = null;
          adminCpWs = null;
        }
      });
    }
  }

  document.getElementById('cpTableBody')?.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.btn-cp-edit');
    if (editBtn) {
      const cpId = Number(editBtn.dataset.cpId);
      const cp = checkpoints.find(c => c.id === cpId);
      if (cp) {
        showEditCheckpointModal(cp, eventId, () => renderAdminEvent({ id: eventId }));
      }
      return;
    }
    const qrBtn = e.target.closest('.btn-cp-qr');
    if (qrBtn) {
      const cpId = Number(qrBtn.dataset.cpId);
      const idx = checkpoints.findIndex(c => c.id === cpId);
      if (idx >= 0) {
        showCheckpointQrModal(checkpoints[idx], idx, eventId, event.name, (updatedCp) => {
          checkpoints[idx] = updatedCp;
          const tbody = document.getElementById('cpTableBody');
          if (tbody) tbody.innerHTML = renderCheckpointTableRows(checkpoints);
        });
      }
      return;
    }
    const delBtn = e.target.closest('.btn-cp-delete');
    if (delBtn) {
      const cpId = Number(delBtn.dataset.cpId);
      const cp = checkpoints.find(c => c.id === cpId);
      if (cp) deleteCheckpoint(cp.id, cp.name);
    }
  });

  // ── Sponsor management handler ──
  async function saveSponsorStripStyle() {
    const res = await fetch(`/api/events/admin/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        sponsor_strip_bg: document.getElementById('sponsorStripBg').value,
        sponsor_strip_label: document.getElementById('sponsorStripLabel').value,
        sponsor_strip_label_color: document.getElementById('sponsorStripLabelColor').value
      })
    });
    showToast(res.ok ? 'Tampilan logo sponsor disimpan.' : 'Gagal menyimpan tampilan logo sponsor.', res.ok ? 'success' : 'error');
  }
  document.getElementById('sponsorStripBg')?.addEventListener('change', saveSponsorStripStyle);
  document.getElementById('sponsorStripLabel')?.addEventListener('change', saveSponsorStripStyle);
  document.getElementById('sponsorStripLabelColor')?.addEventListener('change', saveSponsorStripStyle);

  const btnShowAddSponsor = document.getElementById('btnShowAddSponsor');
  const addSponsorBox = document.getElementById('addSponsorContainer');
  const btnCancelAddSponsor = document.getElementById('btnCancelAddSponsor');
  if (btnShowAddSponsor && addSponsorBox) {
    btnShowAddSponsor.addEventListener('click', () => {
      addSponsorBox.style.display = addSponsorBox.style.display === 'none' ? 'block' : 'none';
      if (addSponsorBox.style.display === 'block') {
        document.getElementById('sponsorName')?.focus();
      }
    });
  }
  if (btnCancelAddSponsor && addSponsorBox) {
    btnCancelAddSponsor.addEventListener('click', () => {
      addSponsorBox.style.display = 'none';
    });
  }

  const addSponsorForm = document.getElementById('addSponsorForm');
  if (addSponsorForm) {
    addSponsorForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('btnSaveSponsor');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Menyimpan...';

      const fileInput = document.getElementById('sponsorFile');
      const name = document.getElementById('sponsorName').value.trim();
      const link = document.getElementById('sponsorLink').value.trim();
      const logoPath = document.getElementById('sponsorLogoPath').value.trim();
      const sortOrder = document.getElementById('sponsorSort').value;
      const sponsorSize = document.getElementById('sponsorSize').value;

      const formData = new FormData();
      formData.append('name', name);
      if (link) formData.append('link', link);
      if (sortOrder) formData.append('sort_order', sortOrder);
      if (sponsorSize) formData.append('sponsor_logo_size', sponsorSize);

      if (fileInput && fileInput.files && fileInput.files[0]) {
        formData.append('logo', fileInput.files[0]);
      } else if (logoPath) {
        formData.append('logo_path', logoPath);
      } else {
        showToast('Pilih file logo atau masukkan URL logo.', 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Simpan Sponsor';
        return;
      }

      try {
        const res = await fetch(`/api/events/admin/${eventId}/sponsors`, {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        const data = await res.json();
        if (res.ok) {
          showToast(`Sponsor "${name}" berhasil ditambahkan!`, 'success');
          await renderAdminEvent({ id: eventId });
        } else {
          showToast(data.error || 'Gagal menambahkan sponsor', 'error');
        }
      } catch (err) {
        showToast('Terjadi kesalahan jaringan.', 'error');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Simpan Sponsor';
      }
    });
  }

  // ── Show import-rider panel ──
  document.getElementById('btnShowImportRider')?.addEventListener('click', () => {
    const container = document.getElementById('importRiderContainer');
    if (container.innerHTML) { container.innerHTML = ''; return; }

    container.innerHTML = `
      <div class="add-rider-panel" style="border-color:var(--color-sage)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <h3 style="font-size:14px;font-weight:700">📁 Import Massal Rider & Panitia (CSV)</h3>
          <button class="btn btn-outline" id="cancelImportRider" style="padding:4px 10px;font-size:12px">✕ Tutup</button>
        </div>
        <p style="font-size:12px;color:var(--text-secondary);margin-bottom:14px;line-height:1.45">
          Unggah file <code>.csv</code> atau tempel teks data peserta. Format kolom: <code>bib,nama,no_hp,peran,pin</code>.<br>
          Pilihan peran: <code>rider</code>, <code>sweeper</code>, <code>marshall</code>, <code>medic</code>. PIN bersifat opsional (jika kosong, otomatis 4 digit nomor HP atau 1234).
        </p>
        <div class="form-group">
          <label>Pilih File .CSV</label>
          <input type="file" id="csvFileInput" accept=".csv" class="input" style="padding:8px">
        </div>
        <div class="form-group">
          <label>Atau Tempel (Paste) Teks CSV Langsung</label>
          <textarea id="csvTextInput" class="input" rows="4" placeholder="bib,nama,no_hp,peran,pin&#10;001,Budi Santoso,081234567890,rider,&#10;SWEEP-01,Doni Sweeper,085678901234,sweeper,1234"></textarea>
        </div>
        <p id="importStatus" style="font-size:13px;min-height:18px;margin-bottom:10px"></p>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary" id="btnExecuteImport" type="button">🚀 Mulai Proses Import</button>
          <a class="btn btn-outline" href="/api/admin/riders/events/${eventId}/template" download="template_riders_cyclopon.csv">📥 Unduh Template CSV</a>
        </div>
      </div>
    `;

    document.getElementById('cancelImportRider').addEventListener('click', () => { container.innerHTML = ''; });

    const fileInput = document.getElementById('csvFileInput');
    const textInput = document.getElementById('csvTextInput');
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => { textInput.value = ev.target.result; };
      reader.readAsText(file);
    });

    document.getElementById('btnExecuteImport').addEventListener('click', async () => {
      const statusEl = document.getElementById('importStatus');
      const btn = document.getElementById('btnExecuteImport');
      const csvData = textInput.value.trim();

      if (!csvData) {
        statusEl.textContent = '❌ Masukkan atau pilih file CSV terlebih dahulu.';
        statusEl.style.color = 'var(--color-red)';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Memproses Import...';
      statusEl.textContent = '⏳ Sedang mengimpor data peserta...';
      statusEl.style.color = 'var(--text-secondary)';

      try {
        const res = await fetch(`/api/admin/riders/events/${eventId}/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csv: csvData }),
          credentials: 'include'
        });
        const data = await res.json();

        if (res.ok) {
          showToast(`Berhasil import ${data.imported} peserta! (${data.skipped} dilewati)`, 'success');
          await renderAdminEvent({ id: eventId });
        } else {
          statusEl.textContent = `❌ ${data.error || 'Gagal mengimpor data.'}`;
          statusEl.style.color = 'var(--color-red)';
          btn.disabled = false;
          btn.textContent = '🚀 Mulai Proses Import';
        }
      } catch {
        statusEl.textContent = '❌ Gagal terhubung ke server.';
        statusEl.style.color = 'var(--color-red)';
        btn.disabled = false;
        btn.textContent = '🚀 Mulai Proses Import';
      }
    });
  });

  // ── Show add-rider form (Manual registration for Rider / Panitia / Sweeper) ──
  document.getElementById('btnShowAddRider')?.addEventListener('click', () => {
    const container = document.getElementById('addRiderContainer');
    if (container.innerHTML) { container.innerHTML = ''; return; }

    container.innerHTML = `
      <div class="add-rider-panel">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <h3 style="font-size:14px;font-weight:700">➕ Tambah Rider / Panitia Lapangan Manual</h3>
          <button class="btn btn-outline" id="cancelAddRider" style="padding:4px 10px;font-size:12px">✕ Tutup</button>
        </div>
        <form id="addRiderForm">
          <div class="form-row">
            <div class="form-group">
              <label>Peran / Role</label>
              <select class="input" id="rRole">
                <option value="rider">🚴 Peserta (Rider)</option>
                <option value="sweeper">🧹 Sweeper (Penyapu Belakang)</option>
                <option value="marshall">🏍️ Marshall / Road Captain</option>
                <option value="medic">🚑 Tim Medis / Evakuasi</option>
              </select>
            </div>
            <div class="form-group">
              <label>Nomor BIB / Plat Sepeda</label>
              <input class="input" id="rBib" placeholder="Contoh: 001 atau SWEEP-01" required style="text-transform:uppercase">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Nama Lengkap</label>
              <input class="input" id="rName" placeholder="Contoh: Budi Santoso" required>
            </div>
            <div class="form-group">
              <label>Nomor WhatsApp / HP <span style="color:var(--text-secondary);font-weight:400">(opsional)</span></label>
              <input class="input" id="rPhone" placeholder="081234567890">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>PIN Akses Manual <span style="color:var(--text-secondary);font-weight:400">(4-6 digit, opsional)</span></label>
              <input class="input" id="rPin" placeholder="Kosongkan untuk 4 digit akhir HP / 1234" maxlength="6">
            </div>
            <div class="form-group">
              <label>Traccar Device ID <span style="color:var(--text-secondary);font-weight:400">(opsional)</span></label>
              <input class="input" id="rDeviceId" type="number" placeholder="Dari Traccar dashboard">
            </div>
          </div>
          <p id="addRiderError" style="color:var(--color-red);font-size:13px;min-height:18px;margin-bottom:10px"></p>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary" type="submit" id="addRiderBtn">Simpan Rider / Panitia</button>
            <button class="btn btn-outline" type="button" id="cancelAddRiderBtn">Batal</button>
          </div>
        </form>
      </div>
    `;

    document.getElementById('cancelAddRider').addEventListener('click', () => { container.innerHTML = ''; });
    document.getElementById('cancelAddRiderBtn').addEventListener('click', () => { container.innerHTML = ''; });
    document.getElementById('addRiderForm').addEventListener('submit', async e => {
      e.preventDefault();
      const btn = document.getElementById('addRiderBtn');
      const errEl = document.getElementById('addRiderError');
      btn.textContent = 'Menyimpan...'; btn.disabled = true; errEl.textContent = '';

      const body = {
        event_id: eventId,
        role: document.getElementById('rRole').value,
        bib: document.getElementById('rBib').value.trim(),
        name: document.getElementById('rName').value.trim(),
        phone: document.getElementById('rPhone').value.trim() || null,
        pin: document.getElementById('rPin').value.trim() || null,
        traccar_device_id: document.getElementById('rDeviceId').value ? Number(document.getElementById('rDeviceId').value) : null
      };
      const res = await fetch('/api/admin/riders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' });
      const data = await res.json();

      if (res.ok) {
        showToast(`Peserta #${body.bib} (${body.name}) berhasil ditambahkan!`, 'success');
        await renderAdminEvent({ id: eventId });
      } else {
        errEl.textContent = data.error || 'Gagal menambahkan peserta.';
        btn.textContent = 'Simpan Rider / Panitia'; btn.disabled = false;
      }
    });
  });

  if (!isNew && eventId) {
    if (window._adminEventMetricInterval) {
      clearInterval(window._adminEventMetricInterval);
      window._adminEventMetricInterval = null;
    }
    const updateEventMetrics = async () => {
      if (!window.location.pathname.includes(`/admin/events/${eventId}`)) {
        if (window._adminEventMetricInterval) {
          clearInterval(window._adminEventMetricInterval);
          window._adminEventMetricInterval = null;
        }
        return;
      }
      try {
        const res = await fetch(`/api/admin/metrics/event/${eventId}`, { credentials: 'include' });
        if (!res.ok) return;
        const m = await res.json();
        if (!m.success) return;

        const vEl = document.getElementById('evMetricViewers');
        const rEl = document.getElementById('evMetricActiveRiders');
        const tEl = document.getElementById('evMetricTelemetryRate');
        const sEl = document.getElementById('evMetricServerLoad');
        const sSub = document.getElementById('evMetricServerLoadSub');
        const badge = document.getElementById('evSurgeBadge');

        if (vEl) vEl.textContent = Number(m.eventViewers || 0).toLocaleString();
        if (rEl) rEl.textContent = `${m.activeRiders || 0} / ${m.totalRiders || 0}`;
        if (tEl) tEl.textContent = `${m.telemetryRatePerMin || 0} titik/mnt`;
        if (sEl && m.system) sEl.textContent = `${m.system.memUsagePct || 0}% RAM`;
        if (sSub && m.system) sSub.textContent = `CPU: ${m.system.cpuLoadPct || 0}% · Traccar: ${m.system.traccarConnected ? 'OK' : 'Standby'}`;

        if (badge) {
          if (m.surgeStatus === 'HIGH_SURGE') {
            badge.className = 'badge badge-medic';
            badge.textContent = '● LONJAKAN TINGGI';
          } else if (m.surgeStatus === 'MODERATE') {
            badge.className = 'badge badge-sweeper';
            badge.textContent = '● TRAFIK MENINGKAT';
          } else {
            badge.className = 'badge badge-active';
            badge.textContent = '● KAPASITAS AMAN';
          }
        }
      } catch (e) { }
    };

    updateEventMetrics();
    window._adminEventMetricInterval = setInterval(updateEventMetrics, 5000);
  }
}

function renderSponsorTableRows(sponsors) {
  if (!sponsors || !sponsors.length) {
    return '<tr><td colspan="6" style="text-align:center;color:#6B7280;padding:24px;font-weight:600">Belum ada logo sponsor. Tambahkan logo sponsor untuk ditampilkan pada Live Map!</td></tr>';
  }
  return sponsors.map(s => {
    const rawLink = s.link ? String(s.link).trim() : '';
    const safeLink = rawLink && /^https?:\/\//i.test(rawLink) ? escapeHtml(rawLink) : '';
    return `
      <tr>
        <td>
          <img src="${escapeHtml(s.logo_path)}" alt="${escapeHtml(s.name)}" style="height:32px;max-width:100px;object-fit:contain;background:#F9FAFB;padding:2px 4px;border:1px solid #E5E7EB;border-radius:4px">
        </td>
        <td><strong style="color:#0D1117">${escapeHtml(s.name)}</strong></td>
        <td>
          ${safeLink
        ? `<a href="${safeLink}" target="_blank" rel="noopener noreferrer" style="color:#2563EB;font-weight:600;font-size:12px;text-decoration:none;display:inline-flex;align-items:center;gap:4px">🔗 ${safeLink}</a>`
        : '<span style="color:#9CA3AF">—</span>'}
        </td>
        <td><input type="number" min="0" class="input" style="padding:4px 8px;font-size:12px;width:60px" value="${s.sort_order || 0}" onchange="updateSponsorOrder(${s.id}, this.value, ${s.sort_order || 0})"></td>
        <td><input type="number" min="16" max="200" class="input" style="padding:4px 8px;font-size:12px;width:64px" value="${s.sponsor_logo_size || ''}" placeholder="auto" onchange="updateSponsorSize(${s.id}, this.value)"></td>
        <td>
          <button class="btn btn-danger" style="padding:4px 10px;font-size:11px" onclick="deleteSponsor(${s.id}, '${escapeHtml(s.name).replace(/'/g, "\\'")}')">
            Hapus
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function deleteSponsor(sponsorId, name) {
  if (!confirm(`Hapus sponsor "${name}"?`)) return;
  const res = await fetch(`/api/events/admin/sponsors/${sponsorId}`, { method: 'DELETE', credentials: 'include' });
  if (res.ok) {
    showToast(`Sponsor "${name}" berhasil dihapus.`, 'success');
    Router.resolve(window.location.pathname);
  } else {
    showToast('Gagal menghapus sponsor.', 'error');
  }
}
window.deleteSponsor = deleteSponsor;

async function updateSponsorOrder(sponsorId, value, prev) {
  const order = Number(value);
  if (!Number.isFinite(order) || order < 0) {
    showToast('Urutan harus angka >= 0.', 'error');
    return;
  }
  const res = await fetch(`/api/events/admin/sponsors/${sponsorId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ sort_order: order })
  });
  if (res.ok) {
    showToast('Urutan logo diperbarui.', 'success');
    const evtId = window.location.pathname.match(/\/admin\/events\/([^/]+)/)?.[1];
    const sponRes = evtId ? await fetch(`/api/events/${evtId}/sponsors`, { credentials: 'include' }) : null;
    if (sponRes.ok) {
      document.getElementById('sponsorTableBody').innerHTML = renderSponsorTableRows(await sponRes.json());
    }
  } else {
    const data = await res.json().catch(() => ({}));
    showToast(data.error || 'Gagal memperbarui urutan.', 'error');
  }
}
window.updateSponsorOrder = updateSponsorOrder;

async function updateSponsorSize(sponsorId, value) {
  const size = Number(value);
  if (value !== '' && (!Number.isFinite(size) || size < 16 || size > 200)) {
    showToast('Ukuran logo harus angka 16-200 (piksel).', 'error');
    return;
  }
  const res = await fetch(`/api/events/admin/sponsors/${sponsorId}/size`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ size: value === '' ? null : size })
  });
  if (res.ok) {
    showToast('Ukuran logo diperbarui.', 'success');
  } else {
    const data = await res.json().catch(() => ({}));
    showToast(data.error || 'Gagal memperbarui ukuran logo.', 'error');
  }
}
window.updateSponsorSize = updateSponsorSize;

function renderCheckpointTableRows(checkpoints) {
  if (!checkpoints.length) {
    return '<tr><td colspan="6" style="text-align:center;color:#6B7280;padding:24px;font-weight:600">Belum ada checkpoint. Tambahkan checkpoint untuk memantau COT!</td></tr>';
  }
  return checkpoints.map((cp, idx) => {
    const hasCoords = cp.latitude != null && cp.longitude != null;
    const coordStr = hasCoords ? `${Number(cp.latitude).toFixed(5)}, ${Number(cp.longitude).toFixed(5)}` : null;
    const radiusStr = hasCoords && cp.radius_meters ? `Radius: ${cp.radius_meters} m` : (hasCoords ? 'Tanpa kunci radius' : 'Koordinat belum diisi');
    return `
    <tr>
      <td><span style="font-family:var(--font-mono);font-weight:900;background:#F3F4F6;border:1px solid #0D1117;padding:3px 8px;border-radius:4px;font-size:11px">CP ${String(idx + 1).padStart(2, '0')}</span></td>
      <td>
        <strong style="color:#0D1117">${escapeHtml(cp.name)}</strong>
        ${cp.qr_token ? `<div style="font-family:var(--font-mono);font-size:10.5px;color:#4B5563;margin-top:2px">Kode QR: ${escapeHtml(cp.qr_token)}</div>` : ''}
        <div style="font-family:var(--font-mono);font-size:10.5px;color:${hasCoords && cp.radius_meters ? '#2B4E30' : '#4B5563'};margin-top:2px">
          ${coordStr ? `${escapeHtml(coordStr)} · ${escapeHtml(radiusStr)}` : escapeHtml(radiusStr)}
        </div>
      </td>
      <td><span class="badge badge-cyan">${cp.km_distance} KM</span></td>
      <td><span style="font-family:var(--font-mono);font-weight:700">${cp.open_time || '-'}</span></td>
      <td>${cp.close_time ? `<span style="font-family:var(--font-mono);color:#DC2626;font-weight:800">${cp.close_time} WIB</span>` : '-'}</td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button type="button" class="btn btn-outline btn-cp-edit" data-cp-id="${cp.id}" style="padding:6px 10px;font-size:11.5px;min-height:36px">
            Edit
          </button>
          <button type="button" class="btn btn-outline btn-cp-qr" data-cp-id="${cp.id}" style="padding:6px 10px;font-size:11.5px;min-height:36px">
            QR Pos
          </button>
          <button type="button" class="btn btn-danger btn-cp-delete" data-cp-id="${cp.id}" style="padding:6px 10px;font-size:11.5px;min-height:36px">
            Hapus
          </button>
        </div>
      </td>
    </tr>
  `;
  }).join('');
}

function showEditCheckpointModal(cp, eventId, onSaved) {
  const oldModal = document.getElementById('editCpModal');
  if (oldModal) oldModal.remove();

  const initialCoords = (cp.latitude != null && cp.longitude != null)
    ? `${cp.latitude}, ${cp.longitude}`
    : '';

  const modal = document.createElement('div');
  modal.id = 'editCpModal';
  modal.className = 'qr-modal-overlay';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'editCpModalTitle');
  modal.innerHTML = `
    <div class="qr-modal-card" style="max-width:520px">
      <div class="qr-modal-header">
        <h3 class="qr-modal-title" id="editCpModalTitle">Edit Checkpoint</h3>
        <button type="button" class="qr-modal-close" id="btnCloseEditCpModal" aria-label="Tutup dialog edit checkpoint">✕</button>
      </div>
      <form id="editCpForm" style="padding:20px">
        <div class="form-row">
          <div class="form-group">
            <label for="editCpName">Nama Checkpoint / Pos</label>
            <input class="input" id="editCpName" value="${escapeHtml(cp.name)}" required>
          </div>
          <div class="form-group">
            <label for="editCpKm">Target KM</label>
            <input class="input" id="editCpKm" type="number" step="0.1" min="0" value="${cp.km_distance}" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="editCpOpen">Jam Buka</label>
            <input class="input" id="editCpOpen" value="${escapeHtml(cp.open_time || '')}" placeholder="06:30">
          </div>
          <div class="form-group">
            <label for="editCpClose">Batas COT</label>
            <input class="input" id="editCpClose" value="${escapeHtml(cp.close_time || '')}" placeholder="10:30">
          </div>
        </div>
        <div class="form-group" style="margin-bottom:12px">
          <label for="editCpCoords">Koordinat Pos (Lat, Lng dari Google Maps)</label>
          <input class="input" id="editCpCoords" value="${escapeHtml(initialCoords)}" placeholder="-6.721401, 107.351245">
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
            <button type="button" class="btn btn-outline" id="btnEditUseGeo" style="padding:5px 10px;font-size:11.5px;min-height:36px">Ambil Lokasi Saya</button>
            <a href="${initialCoords ? `https://www.google.com/maps?q=${encodeURIComponent(initialCoords)}` : 'https://www.google.com/maps'}" target="_blank" rel="noopener noreferrer" id="linkEditPreviewMap" class="btn btn-outline" style="padding:5px 10px;font-size:11.5px;min-height:36px;text-decoration:none;display:inline-flex;align-items:center">Cek di Google Maps</a>
          </div>
        </div>
        <div class="form-group" style="margin-bottom:12px">
          <label for="editCpRadius">Kunci Radius Check-In (Meter)</label>
          <input class="input" id="editCpRadius" type="number" min="0" max="50000" step="50" value="${cp.radius_meters != null ? cp.radius_meters : ''}" placeholder="500">
          <small style="display:block;margin-top:4px;color:#4B5563;font-size:11.5px">Aktif bila koordinat diisi. Isi 0 atau kosongkan untuk tanpa kunci radius.</small>
        </div>
        <p id="editCpError" style="color:var(--color-red);font-size:13px;min-height:18px;margin-bottom:10px"></p>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button type="button" class="btn btn-outline" id="btnCancelEditCp" style="min-height:44px">Batal</button>
          <button type="submit" class="btn btn-primary" id="btnSaveEditCp" style="min-height:44px">Simpan Perubahan</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const coordsInput = modal.querySelector('#editCpCoords');
  const radiusInput = modal.querySelector('#editCpRadius');
  const mapLink = modal.querySelector('#linkEditPreviewMap');

  function syncEditGeo() {
    const val = coordsInput.value.trim();
    const m = /(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)/.exec(val);
    if (m) {
      mapLink.href = `https://www.google.com/maps?q=${encodeURIComponent(m[1] + ',' + m[2])}`;
      if (radiusInput.value === '') radiusInput.value = '500';
    } else {
      mapLink.href = 'https://www.google.com/maps';
    }
  }
  coordsInput.addEventListener('input', syncEditGeo);

  modal.querySelector('#btnEditUseGeo').addEventListener('click', () => {
    if (!('geolocation' in navigator)) {
      showToast('Browser tidak mendukung geolokasi.', 'error');
      return;
    }
    const geoBtn = modal.querySelector('#btnEditUseGeo');
    geoBtn.disabled = true;
    geoBtn.textContent = 'Mengambil GPS...';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        coordsInput.value = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
        syncEditGeo();
        geoBtn.disabled = false;
        geoBtn.textContent = 'Ambil Lokasi Saya';
      },
      () => {
        geoBtn.disabled = false;
        geoBtn.textContent = 'Ambil Lokasi Saya';
        showToast('Gagal mengambil lokasi GPS.', 'error');
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  });

  const closeModal = () => {
    document.removeEventListener('keydown', onEsc);
    modal.remove();
  };
  const onEsc = (e) => {
    if (e.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', onEsc);

  modal.querySelector('#btnCloseEditCpModal').addEventListener('click', closeModal);
  modal.querySelector('#btnCancelEditCp').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  modal.querySelector('#editCpForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = modal.querySelector('#btnSaveEditCp');
    const errEl = modal.querySelector('#editCpError');
    errEl.textContent = '';
    saveBtn.disabled = true;
    saveBtn.textContent = 'Menyimpan...';

    const rawCoords = coordsInput.value.trim();
    const rawRadius = radiusInput.value.trim();

    try {
      const res = await fetch(`/api/events/${eventId}/checkpoints/${cp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: modal.querySelector('#editCpName').value.trim(),
          km_distance: parseFloat(modal.querySelector('#editCpKm').value),
          open_time: modal.querySelector('#editCpOpen').value.trim() || null,
          close_time: modal.querySelector('#editCpClose').value.trim() || null,
          coords: rawCoords || null,
          radius_meters: rawCoords && rawRadius !== '' ? Number(rawRadius) : null
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memperbarui checkpoint.');
      }
      closeModal();
      showToast('Checkpoint diperbarui.', 'success');
      if (typeof onSaved === 'function') onSaved(data.checkpoint);
    } catch (err) {
      errEl.textContent = err.message || 'Gagal memperbarui checkpoint.';
      saveBtn.disabled = false;
      saveBtn.textContent = 'Simpan Perubahan';
    }
  });
}

async function deleteCheckpoint(cpId, name) {
  if (!confirm(`Hapus checkpoint "${name}"?`)) return;
  const res = await fetch(`/api/checkpoints/${cpId}`, { method: 'DELETE', credentials: 'include' });
  if (res.ok) {
    showToast(`Checkpoint "${name}" dihapus.`, 'success');
    Router.resolve(window.location.pathname);
  } else {
    showToast('Gagal menghapus checkpoint.', 'error');
  }
}

function renderRiderTableRows(riders, eventName) {
  if (!riders.length) {
    return '<tr><td colspan="9" style="text-align:center;color:#6B7280;padding:28px;font-weight:600">Belum ada peserta atau panitia terdaftar. Tambahkan manual atau impor file CSV!</td></tr>';
  }

  const safeEventName = eventName || 'Event CycloPon';

  return riders.map(r => {
    let roleBadge = '<span class="badge badge-rider">🚴 RIDER</span>';
    if (r.role === 'sweeper') {
      roleBadge = '<span class="badge badge-sweeper">🧹 SWEEPER</span>';
    } else if (r.role === 'marshall') {
      roleBadge = '<span class="badge badge-marshall">🏍️ MARSHALL</span>';
    } else if (r.role === 'medic') {
      roleBadge = '<span class="badge badge-medic">🚑 MEDIS</span>';
    }

    const safeName = r.name || '';
    const safeBib = r.bib || '';
    const safePin = r.pin || '1234';
    const safeToken = r.token || '';
    const safePhone = r.phone || '';

    return `
      <tr>
        <td><strong style="font-family:var(--font-mono);font-size:14px;color:#0D1117;background:#F3F4F6;padding:2px 7px;border-radius:4px;border:1px solid #E5E7EB">#${escapeHtml(safeBib)}</strong></td>
        <td>${roleBadge}</td>
        <td><strong style="color:#0D1117">${escapeHtml(safeName)}</strong></td>
        <td>${safePhone ? `<span style="font-family:var(--font-mono);font-size:12.5px;color:#4B5563">${escapeHtml(safePhone)}</span>` : '<span style="color:#9CA3AF;font-size:12px">—</span>'}</td>
        <td>
          <code style="background:#F3F4F6;padding:3px 8px;border-radius:4px;font-size:12.5px;font-weight:900;color:#0D1117;font-family:var(--font-mono);letter-spacing:0.06em;border:1px solid #E5E7EB">
            ${escapeHtml(safePin)}
          </code>
        </td>
        <td>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            ${safeToken ? `
              <button class="btn btn-outline btn-qr-code" style="padding:4px 8px;font-size:11px;font-weight:800;color:#0D1117;border-color:#0D1117;background:#F9FAFB" data-token="${escapeHtml(safeToken)}" data-bib="${escapeHtml(safeBib)}" data-name="${escapeHtml(safeName)}" data-role="${escapeHtml(r.role || 'rider')}" data-pin="${escapeHtml(safePin)}" data-event="${escapeHtml(safeEventName)}" title="Lihat dan Cetak QR Code Akses">
                📱 QR Code
              </button>
              <button class="btn btn-outline btn-copy-magic" style="padding:4px 8px;font-size:11px;font-weight:800" data-token="${escapeHtml(safeToken)}" data-bib="${escapeHtml(safeBib)}" title="Salin tautan login instan tanpa ketik">
                📋 Salin Link
              </button>
            ` : ''}
            ${safePhone ? `
              <button class="btn btn-outline btn-wa-share" style="padding:4px 8px;font-size:11px;font-weight:800;color:#047857;border-color:#047857" data-phone="${escapeHtml(safePhone)}" data-name="${escapeHtml(safeName)}" data-bib="${escapeHtml(safeBib)}" data-pin="${escapeHtml(safePin)}" data-token="${escapeHtml(safeToken)}" data-event="${escapeHtml(safeEventName)}" title="Kirim detail akun via WhatsApp">
                💬 WA
              </button>
            ` : ''}
          </div>
        </td>
        <td><span class="color-swatch" style="background:${escapeHtml(r.color || '#00E5FF')}" title="${escapeHtml(r.color || '')}"></span></td>
        <td><code style="font-family:var(--font-mono);font-size:11px;color:#6B7280">${escapeHtml(r.traccar_device_id || '—')}</code></td>
        <td>
          <button class="btn btn-danger btn-delete-rider" style="padding:4px 10px;font-size:11px" data-id="${r.id}" data-bib="${escapeHtml(safeBib)}">
            Hapus
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function copyMagicLink(token, bib) {
  const fullUrl = `${window.location.origin}/r/${token}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(fullUrl).then(() => {
      showToast(`Magic Link #${bib} berhasil disalin ke clipboard!`, 'success');
    }).catch(() => {
      prompt(`Salin Magic Link untuk BIB #${bib}:`, fullUrl);
    });
  } else {
    prompt(`Salin Magic Link untuk BIB #${bib}:`, fullUrl);
  }
}

function shareWhatsApp(phone, name, bib, pin, token, eventName) {
  const cleanPhone = String(phone).replace(/\D/g, '');
  const waNumber = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
  const magicLink = token ? `${window.location.origin}/r/${token}` : `${window.location.origin}/rider`;

  const text = `Halo Kak ${name}! 👋\n\nBerikut akses pelacak Cyclopon Anda untuk event *${eventName}*:\n• Nomor BIB: *#${bib}*\n• PIN Akses: *${pin}*\n\nAtau langsung login 1-klik tanpa ketik BIB & PIN:\n👉 ${magicLink}\n\nSelamat mengayuh dan tetap utamakan keselamatan! 🚴💨`;

  const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

async function deleteRider(riderId, bib) {
  if (!confirm(`Hapus peserta BIB #${bib}?`)) return;
  const res = await fetch(`/api/admin/riders/${riderId}`, { method: 'DELETE', credentials: 'include' });
  if (res.ok) {
    showToast(`Peserta #${bib} dihapus.`, 'success');
    Router.resolve(window.location.pathname);
  } else {
    showToast('Gagal menghapus peserta.', 'error');
  }
}

// ── QR Code Generator & Modal Functions (100% Client-Side / Zero VPS Load) ──
function getQrSvgString(text, cellSize = 4, margin = 8) {
  try {
    if (typeof qrcode !== 'function') {
      console.warn('[QR] Library qrcode belum dimuat');
      return '<div style="padding:20px;color:red;font-size:12px">Library QR belum siap</div>';
    }
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    return qr.createSvgTag(cellSize, margin);
  } catch (err) {
    console.error('[QR] Gagal generate QR code:', err);
    return '<div style="padding:20px;color:red;font-size:12px">Gagal render QR</div>';
  }
}

function showRiderQrModal(data) {
  const { token, bib, name, role, pin, eventName } = data;
  const magicUrl = `${window.location.origin}/r/${token}`;

  // Remove existing modal if any
  const oldModal = document.getElementById('riderQrModal');
  if (oldModal) oldModal.remove();

  const roleText = role === 'sweeper' ? '🧹 SWEEPER' : (role === 'marshall' ? '🏍️ MARSHALL' : (role === 'medic' ? '🚑 MEDIS' : '🚴 RIDER'));

  const modal = document.createElement('div');
  modal.id = 'riderQrModal';
  modal.className = 'qr-modal-overlay';
  modal.innerHTML = `
    <div class="qr-modal-card">
      <div class="qr-modal-header">
        <h3 class="qr-modal-title">
          <span>📱</span> AKSES LOGIN QR PESERTA
        </h3>
        <button class="qr-modal-close" id="btnCloseQrModal" title="Tutup">✕</button>
      </div>

      <div class="qr-pass-container">
        <div class="qr-bib-card" id="printableBibCard">
          <div class="qr-bib-top">
            <div>
              <div class="qr-bib-event-title">${escapeHtml(eventName || 'CYCLOPON LIVE')}</div>
              <div style="font-size:10px;color:#9CA3AF;font-family:var(--font-mono);font-weight:700">OFFICIAL ATHLETE PASS</div>
            </div>
            <span class="badge ${role === 'sweeper' ? 'badge-sweeper' : (role === 'marshall' ? 'badge-marshall' : (role === 'medic' ? 'badge-medic' : 'badge-rider'))}">
              ${roleText}
            </span>
          </div>

          <div class="qr-bib-number-large">#${escapeHtml(bib)}</div>
          <div class="qr-bib-rider-name">${escapeHtml(name)}</div>

          <div class="qr-image-wrapper" id="qrCanvasContainer">
            <!-- QR code rendered here -->
          </div>

          <p style="font-size:11.5px;color:#4B5563;margin:0 0 10px 0;line-height:1.4">
            Arahkan kamera HP ke QR Code untuk <strong>login instan 1-klik</strong> tanpa mengetik BIB & PIN.
          </p>

          <div class="qr-credentials-strip">
            <div class="qr-cred-item">
              <span class="qr-cred-label">NOMOR BIB</span>
              <span class="qr-cred-value">#${escapeHtml(bib)}</span>
            </div>
            <div style="width:1px;height:24px;background:#E5E7EB"></div>
            <div class="qr-cred-item">
              <span class="qr-cred-label">PIN AKSES</span>
              <span class="qr-cred-value">${escapeHtml(pin || '1234')}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="qr-modal-actions">
        <button class="btn btn-primary" id="btnDownloadQrPng" style="flex:1;font-size:12px;padding:9px 12px;display:flex;align-items:center;justify-content:center;gap:6px">
          <span>📥</span> Unduh QR (PNG)
        </button>
        <button class="btn btn-outline" id="btnCopyQrUrl" style="font-size:12px;padding:9px 12px" title="Salin URL Magic Link">
          📋 Salin Link
        </button>
        <button class="btn btn-outline" id="btnPrintSingleCard" style="font-size:12px;padding:9px 12px" title="Cetak Kartu">
          🖨️ Cetak
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Render QR Code onto high-res canvas
  const container = modal.querySelector('#qrCanvasContainer');
  const canvas = document.createElement('canvas');
  try {
    const qr = qrcode(0, 'M');
    qr.addData(magicUrl);
    qr.make();
    // cellSize 8 gives high-res sharp QR code
    qr.renderToCanvas(canvas, 6, 8);
    canvas.style.maxWidth = '180px';
    canvas.style.maxHeight = '180px';
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    container.appendChild(canvas);
  } catch (err) {
    container.innerHTML = getQrSvgString(magicUrl, 5, 8);
  }

  // Handlers
  modal.querySelector('#btnCloseQrModal').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  modal.querySelector('#btnCopyQrUrl').addEventListener('click', () => {
    copyMagicLink(token, bib);
  });

  modal.querySelector('#btnDownloadQrPng').addEventListener('click', () => {
    try {
      const link = document.createElement('a');
      link.download = `QR_BIB_${bib}_${name.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast(`QR Code BIB #${bib} berhasil diunduh!`, 'success');
    } catch {
      showToast('Gagal mengunduh gambar QR.', 'error');
    }
  });

  modal.querySelector('#btnPrintSingleCard').addEventListener('click', () => {
    showBatchPrintModal([{ bib, name, role, pin, token }], eventName);
  });
}

function showBatchPrintModal(ridersList, eventName) {
  if (!ridersList || !ridersList.length) {
    showToast('Belum ada peserta terdaftar untuk dicetak!', 'error');
    return;
  }

  // Remove existing modal if any
  const oldModal = document.getElementById('batchPrintModal');
  if (oldModal) oldModal.remove();

  const modal = document.createElement('div');
  modal.id = 'batchPrintModal';
  modal.innerHTML = `
    <div class="batch-print-toolbar">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:20px">🖨️</span>
        <div>
          <strong style="font-size:14px;letter-spacing:0.02em;text-transform:uppercase">Cetak Kartu BIB &amp; QR Code</strong>
          <div style="font-size:11px;color:#9CA3AF">${escapeHtml(eventName || 'Event')} — ${ridersList.length} Peserta</div>
        </div>
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        <button class="btn btn-primary" id="btnExecutePrint" style="padding:8px 16px;font-size:12px;font-weight:800;background:#00E5FF;color:#0D1117">
          🖨️ Print Sekarang / Simpan PDF
        </button>
        <button class="btn btn-outline" id="btnCloseBatchPrint" style="padding:8px 14px;font-size:12px;color:#FFF;border-color:rgba(255,255,255,0.3)">
          ✕ Tutup
        </button>
      </div>
    </div>

    <div class="batch-print-body">
      <div class="batch-print-paper" id="batchPrintPaper">
        <div style="text-align:center;margin-bottom:24px;border-bottom:2px solid #0D1117;padding-bottom:12px">
          <h1 style="font-family:'Barlow','Plus Jakarta Sans',system-ui,sans-serif;font-size:20px;font-weight:900;letter-spacing:-0.02em;margin:0;color:#0D1117;text-transform:uppercase">
            ${escapeHtml(eventName || 'CYCLOPON LIVE TRACKING')}
          </h1>
          <p style="font-family:var(--font-mono);font-size:11px;font-weight:700;color:#4B5563;margin:4px 0 0 0">
            KARTU RESMI NOMOR BIB &amp; AKSES QR CODE PELACAK GPS REAL-TIME
          </p>
        </div>

        <div class="batch-grid">
          ${ridersList.map(r => {
    const safeBib = escapeHtml(r.bib || '');
    const safeName = escapeHtml(r.name || '');
    const safeRole = r.role || 'rider';
    const safePin = escapeHtml(r.pin || '1234');
    const safeToken = r.token || '';
    const magicUrl = `${window.location.origin}/r/${safeToken}`;
    const qrSvg = getQrSvgString(magicUrl, 4, 6);
    const roleLabel = safeRole === 'sweeper' ? 'SWEEPER' : (safeRole === 'marshall' ? 'MARSHALL' : (safeRole === 'medic' ? 'MEDIS' : 'RIDER'));

    return `
              <div class="batch-card">
                <div class="batch-cut-badge">✂️ Gunting di sini</div>
                
                <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #E5E7EB;padding-bottom:6px;margin-bottom:8px">
                  <span style="font-family:var(--font-mono);font-size:9.5px;font-weight:900;color:#0D1117;letter-spacing:0.04em">
                    ${escapeHtml(eventName || 'CYCLOPON')}
                  </span>
                  <span style="font-family:var(--font-mono);font-size:9.5px;font-weight:900;padding:2px 6px;border-radius:3px;border:1px solid #0D1117;background:#F3F4F6">
                    ${roleLabel}
                  </span>
                </div>

                <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px">
                  <div>
                    <div style="font-family:var(--font-mono);font-size:32px;font-weight:900;color:#0D1117;line-height:1">
                      #${safeBib}
                    </div>
                    <div style="font-size:14px;font-weight:800;color:#0D1117;margin-top:4px;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                      ${safeName}
                    </div>
                  </div>
                  <div style="width:110px;height:110px;flex-shrink:0;background:#FFFFFF;border:1px solid #0D1117;border-radius:6px;padding:4px;display:flex;align-items:center;justify-content:center">
                    ${qrSvg}
                  </div>
                </div>

                <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:4px;padding:5px 8px;display:flex;justify-content:space-between;align-items:center;font-size:10px">
                  <span style="color:#6B7280;font-family:var(--font-mono)">Scan kamera HP untuk masuk</span>
                  <span style="font-family:var(--font-mono);font-weight:900;color:#0D1117">PIN: ${safePin}</span>
                </div>
              </div>
            `;
  }).join('')}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#btnCloseBatchPrint').addEventListener('click', () => modal.remove());
  modal.querySelector('#btnExecutePrint').addEventListener('click', () => {
    window.print();
  });
}

function showCheckpointQrModal(cp, idx, eventId, eventName, onRotated) {
  if (!cp || !cp.qr_token) {
    showToast('Token QR checkpoint belum tersedia. Muat ulang halaman.', 'error');
    return;
  }

  const oldModal = document.getElementById('cpQrModal');
  if (oldModal) oldModal.remove();

  const cpCodeLabel = `CP ${String(idx + 1).padStart(2, '0')}`;
  let currentCp = { ...cp };
  const getCheckinUrl = (token) => `${window.location.origin}/cp/${token}`;

  const modal = document.createElement('div');
  modal.id = 'cpQrModal';
  modal.className = 'qr-modal-overlay';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'cpQrModalTitle');
  modal.innerHTML = `
    <div class="qr-modal-card">
      <div class="qr-modal-header">
        <h3 class="qr-modal-title" id="cpQrModalTitle">
          POSTER QR CHECK-IN POS
        </h3>
        <button type="button" class="qr-modal-close" id="btnCloseCpQrModal" aria-label="Tutup dialog QR checkpoint">✕</button>
      </div>

      <div class="qr-pass-container">
        <div class="qr-bib-card">
          <div class="qr-bib-top">
            <div>
              <div class="qr-bib-event-title">${escapeHtml(eventName || 'CYCLOPON EVENT')}</div>
              <div style="font-size:10.5px;color:#4B5563;font-family:var(--font-mono);font-weight:700">SELF CHECK-IN POINT</div>
            </div>
            <span style="font-family:var(--font-mono);font-weight:900;background:#111815;color:#FFFFFF;padding:4px 10px;border-radius:6px;font-size:11.5px">${cpCodeLabel}</span>
          </div>

          <div class="qr-bib-rider-name" style="font-size:19px;margin-bottom:4px">${escapeHtml(currentCp.name)}</div>
          <div style="font-family:var(--font-mono);font-size:12px;font-weight:800;color:#2B4E30;margin-bottom:14px">
            JARAK TARGET: ${currentCp.km_distance} KM
          </div>

          <div class="qr-image-wrapper" id="cpQrCanvasContainer"></div>

          <p style="font-size:12px;color:#334338;margin:0 0 12px 0;line-height:1.45">
            Scan QR ini dari halaman Cockpit, Rider Hub, atau kamera HP untuk mencatat waktu kedatangan di pos ini.
          </p>

          <div class="qr-credentials-strip">
            <div class="qr-cred-item">
              <span class="qr-cred-label">KODE POS</span>
              <span class="qr-cred-value" id="cpQrTokenText">${escapeHtml(currentCp.qr_token)}</span>
            </div>
            <div style="width:1px;height:24px;background:#D0C9BF"></div>
            <div class="qr-cred-item">
              <span class="qr-cred-label">JAM BUKA</span>
              <span class="qr-cred-value">${escapeHtml(currentCp.open_time || '-')}</span>
            </div>
            <div style="width:1px;height:24px;background:#D0C9BF"></div>
            <div class="qr-cred-item">
              <span class="qr-cred-label">BATAS COT</span>
              <span class="qr-cred-value" style="color:${currentCp.close_time ? '#B91C1C' : '#0D1117'}">${escapeHtml(currentCp.close_time ? currentCp.close_time + ' WIB' : '-')}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="qr-modal-actions" style="flex-wrap:wrap">
        <button type="button" class="btn btn-primary" id="btnDownloadCpQrPng" style="flex:1;min-width:130px;font-size:12px;padding:9px 12px;min-height:44px">
          Unduh Poster PNG
        </button>
        <button type="button" class="btn btn-outline" id="btnCopyCpQrUrl" style="font-size:12px;padding:9px 12px;min-height:44px">
          Salin Link
        </button>
        <button type="button" class="btn btn-outline" id="btnPrintSingleCpQr" style="font-size:12px;padding:9px 12px;min-height:44px">
          Cetak
        </button>
        <button type="button" class="btn btn-outline" id="btnRotateCpQr" style="font-size:12px;padding:9px 12px;min-height:44px;color:#B91C1C;border-color:#FCA5A5">
          Ganti QR
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  let qrCanvas = null;
  function renderQrPreview() {
    const container = modal.querySelector('#cpQrCanvasContainer');
    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    const url = getCheckinUrl(currentCp.qr_token);
    try {
      const qr = qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      qr.renderToCanvas(canvas, 6, 8);
      canvas.style.maxWidth = '190px';
      canvas.style.maxHeight = '190px';
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
      container.appendChild(canvas);
      qrCanvas = canvas;
    } catch (err) {
      container.innerHTML = getQrSvgString(url, 5, 8);
      qrCanvas = null;
    }
    const tokenEl = modal.querySelector('#cpQrTokenText');
    if (tokenEl) tokenEl.textContent = currentCp.qr_token;
  }

  renderQrPreview();

  const closeModal = () => {
    document.removeEventListener('keydown', onEsc);
    modal.remove();
  };
  const onEsc = (e) => {
    if (e.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', onEsc);

  modal.querySelector('#btnCloseCpQrModal').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  modal.querySelector('#btnCopyCpQrUrl').addEventListener('click', () => {
    const url = getCheckinUrl(currentCp.qr_token);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        showToast(`Link check-in ${cpCodeLabel} disalin.`, 'success');
      }).catch(() => prompt('Salin link check-in:', url));
    } else {
      prompt('Salin link check-in:', url);
    }
  });

  modal.querySelector('#btnDownloadCpQrPng').addEventListener('click', () => {
    try {
      const poster = document.createElement('canvas');
      poster.width = 720;
      poster.height = 920;
      const ctx = poster.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, poster.width, poster.height);

      ctx.strokeStyle = '#111815';
      ctx.lineWidth = 6;
      ctx.strokeRect(24, 24, poster.width - 48, poster.height - 48);

      ctx.fillStyle = '#111815';
      ctx.fillRect(24, 24, poster.width - 48, 96);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText((eventName || 'CYCLOPON EVENT').toUpperCase().slice(0, 38), 52, 66);
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = '#E5E0D8';
      ctx.fillText(`${cpCodeLabel}  |  TARGET ${currentCp.km_distance} KM`, 52, 98);

      ctx.fillStyle = '#111815';
      ctx.textAlign = 'center';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText(currentCp.name.slice(0, 32), poster.width / 2, 185);

      if (qrCanvas) {
        ctx.drawImage(qrCanvas, (poster.width - 440) / 2, 225, 440, 440);
      }

      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = '#2B4E30';
      ctx.fillText(`KODE POS: ${currentCp.qr_token}`, poster.width / 2, 715);

      ctx.font = '600 18px sans-serif';
      ctx.fillStyle = '#334338';
      ctx.fillText(`Buka: ${currentCp.open_time || '-'}   |   Batas COT: ${currentCp.close_time ? currentCp.close_time + ' WIB' : '-'}`, poster.width / 2, 760);

      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = '#111815';
      ctx.fillText('Scan QR dari Rider Hub, Cockpit, atau kamera HP untuk check-in', poster.width / 2, 825);

      const link = document.createElement('a');
      link.download = `QR_${cpCodeLabel.replace(/\s+/g, '')}_${currentCp.name.replace(/\s+/g, '_')}.png`;
      link.href = poster.toDataURL('image/png');
      link.click();
      showToast(`Poster QR ${cpCodeLabel} diunduh.`, 'success');
    } catch {
      showToast('Gagal mengunduh poster QR.', 'error');
    }
  });

  modal.querySelector('#btnPrintSingleCpQr').addEventListener('click', () => {
    showBatchCpQrModal([currentCp], eventName, idx);
  });

  modal.querySelector('#btnRotateCpQr').addEventListener('click', async () => {
    if (!confirm(`Ganti kode QR untuk "${currentCp.name}"? Poster QR yang sudah dicetak sebelumnya tidak akan berlaku lagi.`)) return;
    const btn = modal.querySelector('#btnRotateCpQr');
    btn.disabled = true;
    btn.textContent = 'Memproses...';
    try {
      const res = await fetch(`/api/events/${eventId}/checkpoints/${currentCp.id}/regenerate-qr`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok || !data.checkpoint) {
        throw new Error(data.error || 'Gagal mengganti kode QR.');
      }
      currentCp = data.checkpoint;
      renderQrPreview();
      if (typeof onRotated === 'function') onRotated(currentCp);
      showToast('Kode QR checkpoint diperbarui.', 'success');
    } catch (err) {
      showToast(err.message || 'Gagal mengganti kode QR.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Ganti QR';
    }
  });
}

function showBatchCpQrModal(cpList, eventName, startIndex = 0) {
  if (!cpList || !cpList.length) {
    showToast('Belum ada checkpoint untuk dicetak.', 'error');
    return;
  }

  const oldModal = document.getElementById('batchPrintModal');
  if (oldModal) oldModal.remove();

  const modal = document.createElement('div');
  modal.id = 'batchPrintModal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="batch-print-toolbar">
      <div style="display:flex;align-items:center;gap:12px">
        <div>
          <strong style="font-size:14px;letter-spacing:0.02em;text-transform:uppercase">Cetak Poster QR Checkpoint</strong>
          <div style="font-size:11px;color:#9CA3AF">${escapeHtml(eventName || 'Event')} (${cpList.length} Pos)</div>
        </div>
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        <button type="button" class="btn" id="btnExecutePrintCp" style="padding:8px 16px;font-size:12px;font-weight:800;min-height:44px;background:#2B4E30;color:#FFFFFF;border:1.5px solid #748873;cursor:pointer">
          Print / Simpan PDF
        </button>
        <button type="button" class="btn" id="btnCloseBatchCpPrint" style="padding:8px 14px;font-size:12px;font-weight:800;min-height:44px;background:#FFFFFF;color:#0D1117;border:1.5px solid #FFFFFF;cursor:pointer">
          Tutup
        </button>
      </div>
    </div>

    <div class="batch-print-body">
      <div class="batch-print-paper" id="batchPrintPaper">
        <div style="text-align:center;margin-bottom:24px;border-bottom:2px solid #0D1117;padding-bottom:12px">
          <h1 style="font-family:'Barlow','Plus Jakarta Sans',system-ui,sans-serif;font-size:20px;font-weight:900;letter-spacing:-0.02em;margin:0;color:#0D1117;text-transform:uppercase">
            ${escapeHtml(eventName || 'CYCLOPON CHECKPOINT')}
          </h1>
          <p style="font-family:var(--font-mono);font-size:11px;font-weight:700;color:#4B5563;margin:4px 0 0 0">
            POSTER QR SELF CHECK-IN POS KONTROL
          </p>
        </div>

        <div class="batch-grid" style="${cpList.length === 1 ? 'grid-template-columns:1fr;max-width:460px;margin:0 auto' : ''}">
          ${cpList.map((cp, i) => {
            const cpNum = String(startIndex + i + 1).padStart(2, '0');
            const checkinUrl = `${window.location.origin}/cp/${cp.qr_token}`;
            const qrSvg = getQrSvgString(checkinUrl, 5, 6);
            return `
              <div class="batch-card" style="text-align:center;padding:20px">
                <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #0D1117;padding-bottom:8px;margin-bottom:12px">
                  <span style="font-family:var(--font-mono);font-size:12px;font-weight:900;background:#0D1117;color:#FFFFFF;padding:3px 9px;border-radius:4px">
                    CP ${cpNum}
                  </span>
                  <span style="font-family:var(--font-mono);font-size:12px;font-weight:800;color:#2B4E30">
                    ${cp.km_distance} KM
                  </span>
                </div>
                <div style="font-size:18px;font-weight:900;color:#0D1117;margin-bottom:12px">
                  ${escapeHtml(cp.name)}
                </div>
                <div style="width:170px;height:170px;margin:0 auto 12px;background:#FFFFFF;border:1.5px solid #0D1117;border-radius:8px;padding:6px;display:flex;align-items:center;justify-content:center">
                  ${qrSvg}
                </div>
                <div style="font-family:var(--font-mono);font-size:11px;font-weight:800;color:#0D1117;margin-bottom:6px">
                  KODE: ${escapeHtml(cp.qr_token || '')}
                </div>
                <div style="font-size:11px;color:#334338;border-top:1px dashed #D0C9BF;padding-top:8px">
                  Buka: <strong>${escapeHtml(cp.open_time || '-')}</strong> · COT: <strong>${escapeHtml(cp.close_time ? cp.close_time + ' WIB' : '-')}</strong>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  document.body.classList.add('printing-batch-modal');
  document.body.appendChild(modal);

  const closePrint = () => {
    document.body.classList.remove('printing-batch-modal');
    document.removeEventListener('keydown', onEsc);
    modal.remove();
  };
  const onEsc = (e) => {
    if (e.key === 'Escape') closePrint();
  };
  document.addEventListener('keydown', onEsc);

  modal.querySelector('#btnCloseBatchCpPrint').addEventListener('click', closePrint);
  modal.querySelector('#btnExecutePrintCp').addEventListener('click', () => {
    document.body.classList.add('printing-batch-modal');
    window.print();
  });
}

window.showRiderQrModal = showRiderQrModal;
window.showBatchPrintModal = showBatchPrintModal;
window.showCheckpointQrModal = showCheckpointQrModal;
window.showBatchCpQrModal = showBatchCpQrModal;
window.deleteRider = deleteRider;
window.deleteCheckpoint = deleteCheckpoint;
window.copyMagicLink = copyMagicLink;
window.shareWhatsApp = shareWhatsApp;
