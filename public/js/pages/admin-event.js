async function renderAdminEvent(params) {
  loadCss('/css/admin.css');

  // Route guard: check if admin is logged in
  const adminUser = sessionStorage.getItem('adminUser') || localStorage.getItem('adminUser');
  if (!adminUser) {
    Router.navigate('/admin');
    return;
  }
  if (!sessionStorage.getItem('adminUser')) sessionStorage.setItem('adminUser', adminUser);

  const eventId = params.id;
  const isNew   = eventId === 'new';
  const app     = document.getElementById('app');

  let event       = { name: '', date: new Date().toISOString().slice(0,10), gpx_path: null, active: 1 };
  let riders      = [];
  let checkpoints = [];

  if (!isNew) {
    try {
      const [evRes, rRes, cpRes] = await Promise.all([
        fetch(`/api/events/${eventId}`, { credentials: 'include' }),
        fetch(`/api/admin/riders/events/${eventId}`, { credentials: 'include' }),
        fetch(`/api/events/${eventId}/checkpoints`, { credentials: 'include' })
      ]);
      if (!evRes.ok) { Router.navigate('/admin/dashboard'); return; }
      event       = await evRes.json();
      riders      = rRes.ok ? await rRes.json() : [];
      checkpoints = cpRes.ok ? await cpRes.json() : [];
    } catch { Router.navigate('/admin/dashboard'); return; }
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
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <a class="btn btn-outline" style="font-size:12.5px;padding:7px 14px" href="/events/${eventId}/results" target="_blank">🏆 Hasil &amp; Brevet</a>
              <a class="btn btn-primary" style="font-size:12.5px;padding:7px 14px" href="/watch/${eventId}?admin=1" target="_blank">🗺️ Live Map</a>
            </div>
          ` : ''}
        </div>

        <!-- Event Details Form -->
        <div class="card" style="margin-bottom:20px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #E5E7EB">
            <div>
              <span style="font-family:ui-monospace,monospace;font-size:10px;font-weight:800;color:#6B7280;letter-spacing:0.08em">// EVENT ATTRIBUTES</span>
              <h2 style="font-size:15px;font-weight:900;color:#0D1117;text-transform:uppercase;margin:0">Detail Event</h2>
            </div>
            ${!isNew ? `<span class="badge ${event.active ? 'badge-active' : 'badge-finished'}">${event.active ? '● EVENT AKTIF' : 'EVENT SELESAI'}</span>` : ''}
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
              <span style="font-family:ui-monospace,monospace;font-size:10px;font-weight:800;color:#6B7280;letter-spacing:0.08em">// ROUTE &amp; ELEVATION TELEMETRY</span>
              <h2 style="font-size:15px;font-weight:900;color:#0D1117;text-transform:uppercase;margin:0">Rute GPX</h2>
            </div>
            ${event.gpx_path ? '<span class="badge badge-active">TERPASANG</span>' : '<span class="badge badge-medic">BELUM ADA GPX</span>'}
          </div>
          ${event.gpx_path
            ? `<p style="color:#047857;font-size:13px;font-weight:700;margin-bottom:14px">✅ GPX sudah di-upload: <code style="background:#F3F4F6;padding:2px 8px;border-radius:4px;color:#0D1117;border:1px solid #E5E7EB">${event.gpx_path}</code></p>`
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

        <!-- Checkpoints & Cut-Off Time (Audax / Brevet) -->
        <div class="card" style="margin-bottom:20px">
          <div class="page-header" style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #E5E7EB">
            <div>
              <span style="font-family:ui-monospace,monospace;font-size:10px;font-weight:800;color:#6B7280;letter-spacing:0.08em">// CHRONO &amp; SPLIT MATRIX</span>
              <h2 style="font-size:15px;font-weight:900;color:#0D1117;text-transform:uppercase;margin:0">
                Checkpoints &amp; Cut-Off Time (Audax / Brevet)
                <span class="badge badge-cyan" style="margin-left:6px">${checkpoints.length}</span>
              </h2>
              <p style="color:#6B7280;font-size:12px;margin-top:2px;margin-bottom:0">Pos pemeriksaan, water station, dan batas waktu tempuh resmi</p>
            </div>
            <button class="btn btn-primary" style="font-size:12.5px;padding:7px 14px" id="btnShowAddCp">
              + Tambah Checkpoint
            </button>
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
        </div>

        <!-- Rider Management -->
        <div class="card">
          <div class="page-header" style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #E5E7EB">
            <div>
              <span style="font-family:ui-monospace,monospace;font-size:10px;font-weight:800;color:#6B7280;letter-spacing:0.08em">// ACCREDITED ROSTER &amp; MARSHALL</span>
              <h2 style="font-size:15px;font-weight:900;color:#0D1117;text-transform:uppercase;margin:0">
                Daftar Rider &amp; Panitia Lapangan
                <span class="badge badge-cyan" style="margin-left:6px">${riders.length}</span>
              </h2>
              <p style="color:#6B7280;font-size:12px;margin-top:2px;margin-bottom:0">
                Kelola peserta, sweeper, marshall rute, tim medis, nomor BIB, PIN akses, dan Magic Link 1-klik
              </p>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-outline" style="font-size:12px;padding:7px 12px;font-weight:700" id="btnPrintAllQrs" title="Cetak Kartu BIB / QR Code semua peserta untuk event ini">
                🖨️ Cetak Semua QR (Batch BIB)
              </button>
              <a class="btn btn-outline" style="font-size:12px;padding:7px 12px" href="/api/admin/riders/events/${eventId}/template" download="template_riders_cyclopon.csv" title="Unduh contoh template Excel/CSV">
                📥 Template CSV
              </a>
              <button class="btn btn-outline" style="font-size:12px;padding:7px 12px" id="btnShowImportRider" title="Impor data peserta massal dari file atau teks CSV">
                📁 Import CSV
              </button>
              <button class="btn btn-primary" style="font-size:12px;padding:7px 14px" id="btnShowAddRider">
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
  (function () {
    const hamburger = document.getElementById('adminHamburger');
    const drawer    = document.getElementById('adminDrawer');
    const overlay   = document.getElementById('adminDrawerOverlay');
    const closeBtn  = document.getElementById('adminDrawerClose');
    function openDrawer()  { if (drawer) drawer.classList.add('open');    if (overlay) overlay.classList.add('show');    document.body.style.overflow = 'hidden'; }
    function closeDrawer() { if (drawer) drawer.classList.remove('open'); if (overlay) overlay.classList.remove('show'); document.body.style.overflow = ''; }
    if (hamburger) hamburger.addEventListener('click', openDrawer);
    if (closeBtn)  closeBtn.addEventListener('click', closeDrawer);
    if (overlay)   overlay.addEventListener('click', closeDrawer);
    const drawerLinks = drawer ? drawer.querySelectorAll('a[data-link]') : [];
    drawerLinks.forEach(l => l.addEventListener('click', closeDrawer));
  })();

  // ── Event form handler ──
  document.getElementById('eventForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn    = document.getElementById('saveEventBtn');
    btn.textContent = 'Menyimpan...';
    btn.disabled    = true;

    const activeEl = document.querySelector('input[name="evActive"]:checked');
    const body = {
      name:   document.getElementById('evName').value,
      date:   document.getElementById('evDate').value,
      active: activeEl ? Number(activeEl.value) : 1
    };

    const url    = isNew ? '/api/events/admin' : `/api/events/admin/${eventId}`;
    const method = isNew ? 'POST' : 'PUT';
    const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' });
    const data   = await res.json();

    if (res.ok) {
      showToast(isNew ? 'Event berhasil dibuat!' : 'Event diperbarui!', 'success');
      if (isNew) Router.navigate(`/admin/events/${data.id}`);
      else { btn.textContent = 'Simpan Perubahan'; btn.disabled = false; }
    } else {
      showToast(data.error || 'Gagal menyimpan.', 'error');
      btn.textContent = isNew ? 'Buat Event' : 'Simpan Perubahan';
      btn.disabled = false;
    }
  });

  if (isNew) return;

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
    const res  = await fetch(`/api/events/admin/${eventId}/gpx`, { method: 'POST', body: formData, credentials: 'include' });
    const data = await res.json();

    if (res.ok) {
      statusEl.textContent = `✅ Upload berhasil: ${data.gpx_path}`;
      statusEl.style.color = 'var(--color-green)';
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
              <label>Nama Checkpoint / Pos</label>
              <input class="input" id="cpName" placeholder="Contoh: CP 1 Waduk Cirata" required>
            </div>
            <div class="form-group">
              <label>Target KM (dari Start)</label>
              <input class="input" id="cpKm" type="number" step="0.1" placeholder="62.5" required min="0">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Jam Buka (Opsional, cth: 06:30)</label>
              <input class="input" id="cpOpen" placeholder="06:30">
            </div>
            <div class="form-group">
              <label>Jam Tutup / Cut-Off Time (Opsional, cth: 10:30)</label>
              <input class="input" id="cpClose" placeholder="10:30">
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

    document.getElementById('cancelAddCp').addEventListener('click', () => { container.innerHTML = ''; });
    document.getElementById('addCpForm').addEventListener('submit', async e => {
      e.preventDefault();
      const btn = document.getElementById('addCpBtn');
      const errEl = document.getElementById('addCpError');
      btn.textContent = 'Menambahkan...'; btn.disabled = true; errEl.textContent = '';

      const body = {
        name:        document.getElementById('cpName').value.trim(),
        km_distance: parseFloat(document.getElementById('cpKm').value),
        open_time:   document.getElementById('cpOpen').value.trim() || null,
        close_time:  document.getElementById('cpClose').value.trim() || null,
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
      const btn  = document.getElementById('addRiderBtn');
      const errEl = document.getElementById('addRiderError');
      btn.textContent = 'Menyimpan...'; btn.disabled = true; errEl.textContent = '';

      const body = {
        event_id:          eventId,
        role:              document.getElementById('rRole').value,
        bib:               document.getElementById('rBib').value.trim(),
        name:              document.getElementById('rName').value.trim(),
        phone:             document.getElementById('rPhone').value.trim() || null,
        pin:               document.getElementById('rPin').value.trim() || null,
        traccar_device_id: document.getElementById('rDeviceId').value ? Number(document.getElementById('rDeviceId').value) : null
      };
      const res  = await fetch('/api/admin/riders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' });
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
}

function renderCheckpointTableRows(checkpoints) {
  if (!checkpoints.length) {
    return '<tr><td colspan="6" style="text-align:center;color:#6B7280;padding:24px;font-weight:600">Belum ada checkpoint. Tambahkan checkpoint untuk memantau COT!</td></tr>';
  }
  return checkpoints.map((cp, idx) => `
    <tr>
      <td><span style="font-family:ui-monospace,monospace;font-weight:900;background:#F3F4F6;border:1px solid #0D1117;padding:3px 8px;border-radius:4px;font-size:11px">CP ${String(idx + 1).padStart(2, '0')}</span></td>
      <td><strong style="color:#0D1117">${escapeHtml(cp.name)}</strong></td>
      <td><span class="badge badge-cyan">${cp.km_distance} KM</span></td>
      <td><span style="font-family:ui-monospace,monospace;font-weight:700">${cp.open_time || '—'}</span></td>
      <td>${cp.close_time ? `<span style="font-family:ui-monospace,monospace;color:#DC2626;font-weight:800">⏱️ ${cp.close_time}</span>` : '—'}</td>
      <td>
        <button class="btn btn-danger" style="padding:4px 10px;font-size:11px" onclick="deleteCheckpoint(${cp.id}, '${cp.name.replace(/'/g, "\\'")}')">
          Hapus
        </button>
      </td>
    </tr>
  `).join('');
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
        <td><strong style="font-family:ui-monospace,monospace;font-size:14px;color:#0D1117;background:#F3F4F6;padding:2px 7px;border-radius:4px;border:1px solid #E5E7EB">#${escapeHtml(safeBib)}</strong></td>
        <td>${roleBadge}</td>
        <td><strong style="color:#0D1117">${escapeHtml(safeName)}</strong></td>
        <td>${safePhone ? `<span style="font-family:ui-monospace,monospace;font-size:12.5px;color:#4B5563">${escapeHtml(safePhone)}</span>` : '<span style="color:#9CA3AF;font-size:12px">—</span>'}</td>
        <td>
          <code style="background:#F3F4F6;padding:3px 8px;border-radius:4px;font-size:12.5px;font-weight:900;color:#0D1117;font-family:ui-monospace,monospace;letter-spacing:0.06em;border:1px solid #E5E7EB">
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
        <td><code style="font-family:ui-monospace,monospace;font-size:11px;color:#6B7280">${escapeHtml(r.traccar_device_id || '—')}</code></td>
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
              <div style="font-size:10px;color:#9CA3AF;font-family:ui-monospace,monospace;font-weight:700">OFFICIAL ATHLETE PASS</div>
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
          <h1 style="font-family:'Inter',system-ui,sans-serif;font-size:20px;font-weight:900;letter-spacing:-0.02em;margin:0;color:#0D1117;text-transform:uppercase">
            ${escapeHtml(eventName || 'CYCLOPON LIVE TRACKING')}
          </h1>
          <p style="font-family:ui-monospace,monospace;font-size:11px;font-weight:700;color:#4B5563;margin:4px 0 0 0">
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
                  <span style="font-family:ui-monospace,monospace;font-size:9.5px;font-weight:900;color:#0D1117;letter-spacing:0.04em">
                    ${escapeHtml(eventName || 'CYCLOPON')}
                  </span>
                  <span style="font-family:ui-monospace,monospace;font-size:9.5px;font-weight:900;padding:2px 6px;border-radius:3px;border:1px solid #0D1117;background:#F3F4F6">
                    ${roleLabel}
                  </span>
                </div>

                <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px">
                  <div>
                    <div style="font-family:ui-monospace,monospace;font-size:32px;font-weight:900;color:#0D1117;line-height:1">
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
                  <span style="color:#6B7280;font-family:ui-monospace,monospace">Scan kamera HP untuk masuk</span>
                  <span style="font-family:ui-monospace,monospace;font-weight:900;color:#0D1117">PIN: ${safePin}</span>
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

window.showRiderQrModal = showRiderQrModal;
window.showBatchPrintModal = showBatchPrintModal;
window.deleteRider = deleteRider;
window.deleteCheckpoint = deleteCheckpoint;
window.copyMagicLink = copyMagicLink;
window.shareWhatsApp = shareWhatsApp;
