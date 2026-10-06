async function renderAdminEvent(params) {
  loadCss('/css/admin.css');

  // Route guard: check if admin is logged in
  if (!sessionStorage.getItem('adminUser')) {
    Router.navigate('/admin');
    return;
  }

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
            <button onclick="Router.navigate('/admin/dashboard')" class="btn btn-outline" style="padding:8px 14px;font-size:13px">← Back</button>
            <h1>${isNew ? 'Event Baru' : 'Edit Event'}</h1>
          </div>
          ${!isNew ? `
            <div style="display:flex;gap:8px">
              <a class="btn btn-outline" style="font-size:13px;padding:8px 14px" href="/events/${eventId}/results" target="_blank">🏆 Hasil & Brevet</a>
              <a class="btn btn-outline" style="font-size:13px;padding:8px 14px" href="/watch/${eventId}" target="_blank">🗺️ Live Map</a>
            </div>
          ` : ''}
        </div>

        <!-- Event Details Form -->
        <div class="card" style="margin-bottom:20px">
          <h2 style="font-size:15px;font-weight:700;margin-bottom:18px">Detail Event</h2>
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
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;text-transform:none;font-size:14px;font-weight:400;color:var(--text-primary)">
                  <input type="radio" name="evActive" value="1" ${event.active ? 'checked' : ''}> Aktif
                </label>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;text-transform:none;font-size:14px;font-weight:400;color:var(--text-primary)">
                  <input type="radio" name="evActive" value="0" ${!event.active ? 'checked' : ''}> Selesai
                </label>
              </div>
            </div>
            ` : ''}
            <button class="btn btn-primary" type="submit" id="saveEventBtn">
              ${isNew ? 'Buat Event' : 'Simpan Perubahan'}
            </button>
          </form>
        </div>

        ${!isNew ? `
        <!-- GPX Upload -->
        <div class="card" style="margin-bottom:20px">
          <h2 style="font-size:15px;font-weight:700;margin-bottom:6px">Rute GPX</h2>
          ${event.gpx_path
            ? `<p style="color:var(--color-green);font-size:13px;margin-bottom:14px">✅ GPX sudah di-upload: <code style="background:var(--bg-surface);padding:2px 8px;border-radius:4px">${event.gpx_path}</code></p>`
            : `<p style="color:var(--text-secondary);font-size:13px;margin-bottom:14px">⚠️ Belum ada file GPX. Upload rute agar tampil di Live Map.</p>`
          }
          <label class="gpx-drop-zone" for="gpxFileInput">
            <div style="font-size:36px;margin-bottom:8px">📁</div>
            <p style="font-weight:600">Klik atau drag file .gpx ke sini</p>
            <p style="color:var(--text-secondary);font-size:12px;margin-top:4px">Maksimal 10MB</p>
            <input type="file" id="gpxFileInput" accept=".gpx">
          </label>
          <p id="gpxStatus" style="font-size:13px;margin-top:10px;min-height:18px"></p>
        </div>

        <!-- Checkpoints & Cut-Off Time (Audax / Brevet) -->
        <div class="card" style="margin-bottom:20px">
          <div class="page-header" style="margin-bottom:16px">
            <div>
              <h2 style="font-size:15px;font-weight:700">Checkpoints & Cut-Off Time (Audax / Brevet)
                <span class="badge badge-cyan" style="margin-left:8px">${checkpoints.length}</span>
              </h2>
              <p style="color:var(--text-secondary);font-size:12px;margin-top:2px">Pos pemeriksaan, water station, dan batas waktu tempuh resmi</p>
            </div>
            <button class="btn btn-primary" style="font-size:13px;padding:8px 16px" id="btnShowAddCp">
              + Tambah Checkpoint
            </button>
          </div>

          <div id="addCpContainer"></div>

          <div style="overflow-x:auto">
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
          <div class="page-header" style="margin-bottom:16px">
            <div>
              <h2 style="font-size:15px;font-weight:700">Daftar Rider & Panitia Lapangan
                <span class="badge badge-cyan" style="margin-left:8px">${riders.length}</span>
              </h2>
              <p style="color:var(--text-secondary);font-size:12px;margin-top:2px">
                Kelola peserta, sweeper, marshall rute, tim medis, nomor BIB, PIN akses, dan Magic Link 1-klik
              </p>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <a class="btn btn-outline" style="font-size:13px;padding:8px 14px" href="/api/admin/riders/events/${eventId}/template" download="template_riders_cyclopon.csv" title="Unduh contoh template Excel/CSV">
                📥 Template CSV
              </a>
              <button class="btn btn-outline" style="font-size:13px;padding:8px 14px" id="btnShowImportRider" title="Impor data peserta massal dari file atau teks CSV">
                📁 Import CSV
              </button>
              <button class="btn btn-primary" style="font-size:13px;padding:8px 16px" id="btnShowAddRider">
                + Tambah Manual
              </button>
            </div>
          </div>

          <div id="importRiderContainer"></div>
          <div id="addRiderContainer"></div>

          <div style="overflow-x:auto">
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
    return '<tr><td colspan="6" style="text-align:center;color:var(--text-secondary);padding:24px">Belum ada checkpoint. Tambahkan checkpoint untuk memantau COT!</td></tr>';
  }
  return checkpoints.map((cp, idx) => `
    <tr>
      <td><strong style="color:var(--color-cyan)">CP ${idx + 1}</strong></td>
      <td><strong>${cp.name}</strong></td>
      <td><span class="badge badge-yellow">${cp.km_distance} KM</span></td>
      <td>${cp.open_time || '—'}</td>
      <td>${cp.close_time ? `<span style="color:var(--color-red);font-weight:600">⏱️ ${cp.close_time}</span>` : '—'}</td>
      <td>
        <button class="btn btn-danger" style="padding:5px 12px;font-size:12px" onclick="deleteCheckpoint(${cp.id}, '${cp.name.replace(/'/g, "\\'")}')">
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
    return '<tr><td colspan="9" style="text-align:center;color:var(--text-secondary);padding:28px">Belum ada peserta atau panitia terdaftar. Tambahkan manual atau impor file CSV!</td></tr>';
  }

  const safeEventName = (eventName || 'Event CycloPon').replace(/'/g, "\\'");

  return riders.map(r => {
    let roleBadge = '<span class="badge badge-cyan">🚴 Rider</span>';
    if (r.role === 'sweeper') {
      roleBadge = '<span class="badge" style="background:#FFF7ED;color:#C2410C;border:1px solid #F97316;font-weight:700">🧹 Sweeper</span>';
    } else if (r.role === 'marshall') {
      roleBadge = '<span class="badge" style="background:#EFF6FF;color:#1D4ED8;border:1px solid #3B82F6;font-weight:700">🏍️ Marshall</span>';
    } else if (r.role === 'medic') {
      roleBadge = '<span class="badge" style="background:#FEF2F2;color:#B91C1C;border:1px solid #EF4444;font-weight:700">🚑 Medis</span>';
    }

    const safeName = (r.name || '').replace(/'/g, "\\'");
    const safeBib = (r.bib || '').replace(/'/g, "\\'");
    const safePin = r.pin || '1234';
    const safeToken = r.token || '';
    const safePhone = r.phone || '';

    return `
      <tr>
        <td><strong style="font-size:15px;color:var(--text-primary)">#${r.bib}</strong></td>
        <td>${roleBadge}</td>
        <td><strong>${r.name}</strong></td>
        <td>${r.phone ? `<span style="font-size:13px">${r.phone}</span>` : '<span style="color:var(--text-secondary);font-size:12px">—</span>'}</td>
        <td>
          <code style="background:var(--bg-surface);padding:3px 8px;border-radius:4px;font-size:13px;font-weight:800;color:var(--text-primary);letter-spacing:0.05em">
            ${safePin}
          </code>
        </td>
        <td>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            ${safeToken ? `
              <button class="btn btn-outline" style="padding:4px 8px;font-size:11px;font-weight:600" onclick="copyMagicLink('${safeToken}', '${safeBib}')" title="Salin tautan login instan tanpa ketik">
                📋 Salin Link
              </button>
            ` : ''}
            ${safePhone ? `
              <button class="btn btn-outline" style="padding:4px 8px;font-size:11px;font-weight:700;color:#16A34A;border-color:rgba(22,163,74,0.3)" onclick="shareWhatsApp('${safePhone}', '${safeName}', '${safeBib}', '${safePin}', '${safeToken}', '${safeEventName}')" title="Kirim detail akun via WhatsApp">
                💬 WA
              </button>
            ` : ''}
          </div>
        </td>
        <td><span class="color-swatch" style="background:${r.color}" title="${r.color}"></span></td>
        <td><code style="font-size:11px;color:var(--text-secondary)">${r.traccar_device_id || '—'}</code></td>
        <td>
          <button class="btn btn-danger" style="padding:5px 12px;font-size:12px" onclick="deleteRider(${r.id}, '${safeBib}')">
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

window.deleteRider = deleteRider;
window.deleteCheckpoint = deleteCheckpoint;
window.copyMagicLink = copyMagicLink;
window.shareWhatsApp = shareWhatsApp;
