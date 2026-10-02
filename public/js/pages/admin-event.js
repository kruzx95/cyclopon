async function renderAdminEvent(params) {
  loadCss('/css/admin.css');

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
        fetch(`/api/events/${eventId}/riders`, { credentials: 'include' }),
        fetch(`/api/events/${eventId}/checkpoints`, { credentials: 'include' })
      ]);
      if (!evRes.ok) { Router.navigate('/admin/dashboard'); return; }
      event       = await evRes.json();
      riders      = await rRes.json();
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
          ${!isNew ? `<a class="btn btn-outline" style="font-size:13px;padding:8px 14px" href="/watch/${eventId}" target="_blank">🗺️ Live Map</a>` : ''}
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
            <h2 style="font-size:15px;font-weight:700">Daftar Rider
              <span class="badge badge-cyan" style="margin-left:8px">${riders.length}</span>
            </h2>
            <button class="btn btn-primary" style="font-size:13px;padding:8px 16px" id="btnShowAddRider">
              + Tambah Rider
            </button>
          </div>

          <div id="addRiderContainer"></div>

          <div style="overflow-x:auto">
            <table class="rider-table">
              <thead>
                <tr>
                  <th>BIB</th><th>Nama</th><th>PIN</th><th>Warna</th><th>Device ID</th><th>Aksi</th>
                </tr>
              </thead>
              <tbody id="riderTableBody">
                ${renderRiderTableRows(riders)}
              </tbody>
            </table>
          </div>
        </div>
        ` : ''}
      </main>
    </div>
  `;

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

  // ── Show add-rider form ──
  document.getElementById('btnShowAddRider')?.addEventListener('click', () => {
    const container = document.getElementById('addRiderContainer');
    if (container.innerHTML) { container.innerHTML = ''; return; }

    container.innerHTML = `
      <div class="add-rider-panel">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:14px">Tambah Rider Baru</h3>
        <form id="addRiderForm">
          <div class="form-row">
            <div class="form-group">
              <label>Nomor BIB</label>
              <input class="input" id="rBib" placeholder="001" required inputmode="numeric">
            </div>
            <div class="form-group">
              <label>Nama Rider</label>
              <input class="input" id="rName" placeholder="Ahmad Rider" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>PIN (4-6 digit)</label>
              <input class="input" id="rPin" type="number" placeholder="1234" required min="1000" maxlength="6">
            </div>
            <div class="form-group">
              <label>Traccar Device ID <span style="color:var(--text-secondary);font-weight:400">(opsional)</span></label>
              <input class="input" id="rDeviceId" type="number" placeholder="Dari Traccar dashboard">
            </div>
          </div>
          <p id="addRiderError" style="color:var(--color-red);font-size:13px;min-height:18px;margin-bottom:10px"></p>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary" type="submit" id="addRiderBtn">Tambah Rider</button>
            <button class="btn btn-outline" type="button" id="cancelAddRider">Batal</button>
          </div>
        </form>
      </div>
    `;

    document.getElementById('cancelAddRider').addEventListener('click', () => { container.innerHTML = ''; });
    document.getElementById('addRiderForm').addEventListener('submit', async e => {
      e.preventDefault();
      const btn  = document.getElementById('addRiderBtn');
      const errEl = document.getElementById('addRiderError');
      btn.textContent = 'Menambahkan...'; btn.disabled = true; errEl.textContent = '';

      const body = {
        event_id:          eventId,
        bib:               document.getElementById('rBib').value,
        name:              document.getElementById('rName').value,
        pin:               document.getElementById('rPin').value,
        traccar_device_id: document.getElementById('rDeviceId').value || null
      };
      const res  = await fetch('/api/admin/riders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' });
      const data = await res.json();

      if (res.ok) {
        showToast(`Rider #${body.bib} ditambahkan!`, 'success');
        await renderAdminEvent({ id: eventId });
      } else {
        errEl.textContent = data.error || 'Gagal menambahkan rider.';
        btn.textContent = 'Tambah Rider'; btn.disabled = false;
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

function renderRiderTableRows(riders) {
  if (!riders.length) {
    return '<tr><td colspan="6" style="text-align:center;color:var(--text-secondary);padding:28px">Belum ada rider. Tambahkan rider pertama!</td></tr>';
  }
  return riders.map(r => `
    <tr>
      <td><strong style="font-size:16px">#${r.bib}</strong></td>
      <td>${r.name}</td>
      <td><code style="background:var(--bg-surface);padding:2px 8px;border-radius:4px;font-size:12px">****</code></td>
      <td><span class="color-swatch" style="background:${r.color}" title="${r.color}"></span></td>
      <td><code style="font-size:11px;color:var(--text-secondary)">${r.traccar_device_id || '—'}</code></td>
      <td>
        <button class="btn btn-danger" style="padding:5px 12px;font-size:12px" onclick="deleteRider(${r.id}, '${r.bib}')">
          Hapus
        </button>
      </td>
    </tr>
  `).join('');
}

async function deleteRider(riderId, bib) {
  if (!confirm(`Hapus rider BIB #${bib}?`)) return;
  const res = await fetch(`/api/admin/riders/${riderId}`, { method: 'DELETE', credentials: 'include' });
  if (res.ok) {
    showToast(`Rider #${bib} dihapus.`, 'success');
    Router.resolve(window.location.pathname);
  } else {
    showToast('Gagal menghapus rider.', 'error');
  }
}

window.deleteRider = deleteRider;
window.deleteCheckpoint = deleteCheckpoint;
