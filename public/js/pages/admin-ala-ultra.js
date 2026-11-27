/**
 * Race Control: ALA-ALA ULTRA 2027 Registration Verification & Configuration
 * Implements Section D, E, and G workflows directly inside Race Control.
 */

async function renderAdminAlaUltra() {
  loadCss('/css/admin.css?v=92');

  const adminUser = sessionStorage.getItem('adminUser') || localStorage.getItem('adminUser');
  if (!adminUser) {
    Router.navigate('/admin');
    return;
  }
  if (!sessionStorage.getItem('adminUser')) sessionStorage.setItem('adminUser', adminUser);

  const app = document.getElementById('app');
  const escapeHtml = window.escapeHtml || function (str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const state = {
    activeTab: 'registrations', // 'registrations' | 'settings'
    loading: true,
    error: null,
    config: null,
    events: [],
    registrations: [],
    summary: { total: 0, menunggu: 0, disetujui: 0, ditolak: 0, wa_terkirim: 0, sudah_grup: 0 },
    search: '',
    statusFilter: 'all',
    extraFilter: 'all',
    savingConfig: false,
    settingsDraft: null
  };

  app.innerHTML = `
    <div class="admin-layout">
      ${adminSidebar('ala-ultra')}
      <main class="admin-content">
        <div class="page-header">
          <div class="page-header-title-col">
            <span class="page-header-tag">// RACE CONTROL · EVENT REGISTRATION MANAGEMENT</span>
            <h1>ALA-ALA ULTRA 2027</h1>
            <p style="color:#4B5563;font-size:13px;margin:4px 0 0">
              Verifikasi data peserta, tautan Strava, bukti transfer, undangan grup WhatsApp, serta pengaturan formulir &amp; pembayaran.
            </p>
          </div>
          <div class="page-header-actions" style="display:flex;gap:8px;flex-wrap:wrap">
            <a href="/ala-ala-ultra" target="_blank" rel="noopener noreferrer" class="btn btn-outline">Lihat Formulir Publik</a>
            <button type="button" id="btnAauRefresh" class="btn btn-outline">Muat Ulang</button>
            <button type="button" id="btnAauExportExcel" class="btn btn-primary" title="Unduh laporan pendaftaran dalam format Excel (.xlsx)">Export Excel</button>
          </div>
        </div>

        <div class="aau-admin-tabs" role="tablist" aria-label="Menu Race Control ALA-ALA ULTRA">
          <button type="button" class="aau-admin-tab active" role="tab" aria-selected="true" data-aau-tab="registrations">
            Verifikasi &amp; Daftar Peserta
          </button>
          <button type="button" class="aau-admin-tab" role="tab" aria-selected="false" data-aau-tab="settings">
            Pengaturan Form &amp; Pembayaran
          </button>
        </div>

        <div id="aauAdminBody"></div>
      </main>
    </div>
  `;

  setupAdminDrawer();
  AdminSosMonitor.init();

  const bodyEl = document.getElementById('aauAdminBody');

  function formatRupiah(val) {
    const n = Number(val);
    if (!Number.isFinite(n)) return '-';
    return `Rp ${n.toLocaleString('id-ID')}`;
  }

  function normalizeWaPhone(phone) {
    const d = String(phone || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.startsWith('0')) return '62' + d.slice(1);
    if (d.startsWith('8')) return '62' + d;
    return d;
  }

  function renderSafeStravaLink(url, kind, label, inlineStyle = '', btnClass = 'btn btn-outline') {
    const check = typeof window.validateStravaUrl === 'function'
      ? window.validateStravaUrl(url, kind)
      : { valid: /^https:\/\//i.test(String(url || '').trim()) };
    if (check.valid) {
      const clsAttr = btnClass ? ` class="${btnClass}"` : '';
      const styleAttr = inlineStyle ? ` style="${inlineStyle}"` : '';
      return `<a href="${escapeHtml(check.url || url)}" target="_blank" rel="noopener noreferrer"${clsAttr}${styleAttr}>${escapeHtml(label)}</a>`;
    }
    return `<span class="aau-admin-pill is-bad" title="${escapeHtml(url || 'URL tidak valid')}">${escapeHtml(label)}: Tautan Bukan Strava</span>`;
  }

  function statusPillClass(status) {
    if (status === 'Disetujui' || status === 'Valid' || status === 'Terkirim' || status === 'Sudah Bergabung') {
      return 'is-valid';
    }
    if (status === 'Ditolak' || status === 'Tidak Valid') {
      return 'is-bad';
    }
    return 'is-warn';
  }

  function getFilteredRegistrations() {
    const q = state.search.trim().toLowerCase();
    return state.registrations.filter(r => {
      if (state.statusFilter !== 'all' && r.registration_status !== state.statusFilter) return false;
      if (state.extraFilter === 'pending_verify') {
        if (r.verify_data === 'Valid' && r.verify_strava === 'Valid' && r.verify_payment === 'Valid') return false;
      } else if (state.extraFilter === 'no_media') {
        if (r.media_consent !== 'Tidak bersedia') return false;
      } else if (state.extraFilter === 'wa_pending') {
        if (r.registration_status !== 'Disetujui' || r.wa_group_status === 'Sudah Bergabung') return false;
      }
      if (!q) return true;
      return [
        r.reg_code,
        r.full_name,
        r.whatsapp,
        r.email,
        r.city,
        r.community,
        r.payer_account_name
      ].some(val => String(val || '').toLowerCase().includes(q));
    });
  }

  async function patchRegistration(id, payload, quiet = false) {
    try {
      const res = await fetch(`/api/admin/ala-ultra/registrations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal memperbarui status.');

      const idx = state.registrations.findIndex(r => r.id === id);
      if (idx >= 0) state.registrations[idx] = data.registration;
      recomputeSummary();
      renderBody();
      if (!quiet && typeof showToast === 'function') {
        showToast(`Status ${data.registration.reg_code} diperbarui.`, 'success');
      }
    } catch (err) {
      if (typeof showToast === 'function') showToast(err.message, 'error');
    }
  }

  function recomputeSummary() {
    const rows = state.registrations;
    state.summary = {
      total: rows.length,
      menunggu: rows.filter(r => r.registration_status === 'Menunggu').length,
      disetujui: rows.filter(r => r.registration_status === 'Disetujui').length,
      ditolak: rows.filter(r => r.registration_status === 'Ditolak').length,
      wa_terkirim: rows.filter(r => r.wa_invite_status === 'Terkirim').length,
      sudah_grup: rows.filter(r => r.wa_group_status === 'Sudah Bergabung').length
    };
  }

  function openModal(title, contentHtml, onMount) {
    const existing = document.getElementById('aauAdminModal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'aauAdminModal';
    overlay.className = 'aau-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="aau-modal-card">
        <div class="aau-modal-head">
          <h2 style="font-size:15px;font-weight:900;margin:0;color:#0D1117">${escapeHtml(title)}</h2>
          <button type="button" id="btnCloseAauModal" class="btn btn-outline" style="padding:5px 12px;font-size:12px" aria-label="Tutup dialog">Tutup</button>
        </div>
        <div class="aau-modal-body">${contentHtml}</div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    let cleanupEsc = () => {};
    function close() {
      cleanupEsc();
      overlay.remove();
      document.body.style.overflow = '';
    }

    const escHandler = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', escHandler);
    cleanupEsc = () => document.removeEventListener('keydown', escHandler);

    document.getElementById('btnCloseAauModal')?.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    if (typeof onMount === 'function') onMount(overlay, close);
  }

  async function openProofModal(reg) {
    openModal(`Bukti Transfer: ${reg.reg_code} (${reg.full_name})`, `
      <p style="margin:0 0 12px">Memuat berkas bukti transfer...</p>
    `, async (overlay) => {
      const body = overlay.querySelector('.aau-modal-body');
      try {
        const res = await fetch(`/api/admin/ala-ultra/registrations/${reg.id}/proof`, {
          credentials: 'include'
        });
        if (!res.ok) throw new Error('Berkas bukti transfer tidak ditemukan.');
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const isPdf = (reg.payment_proof_mime || '').includes('pdf') || (reg.payment_proof_path || '').toLowerCase().endsWith('.pdf');

        body.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">
            <div>
              <strong>Pengirim:</strong> ${escapeHtml(reg.payer_account_name)}<br>
              <strong>Nominal:</strong> ${escapeHtml(formatRupiah(reg.payment_amount))} · <strong>Tanggal:</strong> ${escapeHtml(reg.payment_date)}
            </div>
            <a href="${blobUrl}" download="${escapeHtml(reg.payment_proof_original_name || reg.reg_code)}" class="btn btn-outline">Unduh Berkas</a>
          </div>
          ${isPdf
            ? `<iframe src="${blobUrl}" title="Pratinjau PDF Bukti Transfer" style="width:100%;height:460px;border:1px solid #CBD5E1;border-radius:8px"></iframe>`
            : `<img src="${blobUrl}" alt="Bukti transfer ${escapeHtml(reg.reg_code)}" style="max-width:100%;height:auto;border-radius:8px;border:1px solid #CBD5E1;display:block;margin:0 auto">`}
        `;
      } catch (err) {
        body.innerHTML = `<p style="color:#991B1B;font-weight:700">${escapeHtml(err.message)}</p>`;
      }
    });
  }

  function openDetailModal(reg) {
    const items = [
      ['Nomor Registrasi', reg.reg_code],
      ['Waktu Daftar', reg.created_at],
      ['Nama Lengkap (KTP)', reg.full_name],
      ['Tanggal Lahir', reg.birth_date],
      ['Jenis Kelamin', reg.gender],
      ['Nomor WhatsApp', reg.whatsapp],
      ['Alamat Email', reg.email],
      ['Kota/Kabupaten Domisili', reg.city],
      ['Akun Instagram', reg.instagram || '-'],
      ['Komunitas Sepeda', reg.community || '-'],
      ['Nama Kontak Darurat', reg.emergency_name],
      ['Hubungan Kontak Darurat', reg.emergency_relation],
      ['WA Kontak Darurat', reg.emergency_whatsapp],
      ['Jenis Sepeda', reg.bike_type],
      ['Jarak Terjauh Pernah Ditempuh', `${reg.longest_distance_km} KM`],
      ['Pernah Event Jarak Jauh', reg.has_ultra_experience],
      ['Nama Event Sebelumnya', reg.past_events || '-'],
      ['Sepeda Layak Jalan', reg.bike_roadworthy],
      ['Helm & Perlengkapan', reg.has_helmet_gear],
      ['Kondisi Kesehatan / Cedera', reg.medical_conditions || '-'],
      ['Persetujuan Ketentuan', reg.terms_agreed],
      ['Persetujuan Dokumentasi', reg.media_consent],
      ['Pemilik Rekening Pengirim', reg.payer_account_name],
      ['Nominal Pembayaran', formatRupiah(reg.payment_amount)],
      ['Tanggal Pembayaran', reg.payment_date]
    ];

    openModal(`Detail Pendaftar: ${reg.reg_code}`, `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
        ${renderSafeStravaLink(reg.strava_profile_url, 'profile', 'Buka Profil Strava')}
        ${renderSafeStravaLink(reg.strava_activity_url, 'activity', 'Buka Aktivitas Strava')}
        <button type="button" class="btn btn-primary" id="btnDetailOpenProof">Lihat Bukti Transfer</button>
      </div>
      <div class="aau-detail-grid">
        ${items.map(([lbl, val]) => `
          <div class="aau-detail-item">
            <div class="aau-detail-lbl">${escapeHtml(lbl)}</div>
            <div class="aau-detail-val">${escapeHtml(val)}</div>
          </div>
        `).join('')}
      </div>
      <div style="border-top:1px dashed #CBD5E1;padding-top:12px">
        <label for="aauModalAdminNotes" style="display:block;font-weight:800;margin-bottom:6px">Catatan Admin</label>
        <textarea id="aauModalAdminNotes" class="input" rows="2" placeholder="Catatan verifikasi atau tindak lanjut panitia...">${escapeHtml(reg.admin_notes || '')}</textarea>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px">
          <button type="button" class="btn btn-primary" id="btnSaveDetailNotes">Simpan Catatan</button>
        </div>
      </div>
    `, (_overlay, close) => {
      document.getElementById('btnDetailOpenProof')?.addEventListener('click', () => {
        close();
        openProofModal(reg);
      });
      document.getElementById('btnSaveDetailNotes')?.addEventListener('click', async () => {
        const notes = document.getElementById('aauModalAdminNotes')?.value || '';
        await patchRegistration(reg.id, { admin_notes: notes });
        close();
      });
    });
  }

  async function handleSendWaInvite(reg) {
    if (reg.registration_status !== 'Disetujui') {
      if (typeof showToast === 'function') {
        showToast('Ubah Status Pendaftaran menjadi Disetujui sebelum mengirim undangan grup WhatsApp.', 'error');
      }
      return;
    }
    const groupLink = state.config?.wa_group_link;
    if (!groupLink) {
      if (typeof showToast === 'function') {
        showToast('Isi terlebih dahulu Link Undangan Grup WhatsApp di tab Pengaturan Form & Pembayaran.', 'error');
      }
      return;
    }
    const waNum = normalizeWaPhone(reg.whatsapp);
    if (!waNum) {
      if (typeof showToast === 'function') showToast('Nomor WhatsApp peserta tidak valid.', 'error');
      return;
    }

    const eventLocation = state.config?.event_location || 'Tasikmalaya';
    const eventDateLabel = state.config?.event_date_label || 'Minggu, 17 Januari 2027';
    const msg = [
      `Halo ${reg.full_name},`,
      `Selamat, pendaftaran Anda untuk ALA-ALA ULTRA 2027 (Nomor Registrasi: ${reg.reg_code}) telah DISETUJUI oleh panitia SUDDENLY.CC.`,
      '',
      `Silakan bergabung ke grup WhatsApp resmi peserta melalui tautan berikut:`,
      groupLink,
      '',
      `Sampai bertemu di ${eventLocation} pada ${eventDateLabel}.`
    ].join('\n');

    window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
    await patchRegistration(reg.id, { wa_invite_status: 'Terkirim' }, true);
    if (typeof showToast === 'function') {
      showToast(`Undangan WhatsApp dibuka & ditandai Terkirim untuk ${reg.reg_code}.`, 'success');
    }
  }

  async function handleSyncRider(reg) {
    try {
      const res = await fetch(`/api/admin/ala-ultra/registrations/${reg.id}/sync-rider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal sinkronisasi ke roster event.');

      if (data.registration) {
        const idx = state.registrations.findIndex(r => r.id === reg.id);
        if (idx >= 0) state.registrations[idx] = data.registration;
      }
      renderBody();
      if (typeof showToast === 'function') {
        showToast(
          data.already_synced
            ? `Peserta sudah terdaftar di roster event dengan BIB #${data.rider.bib}.`
            : `Peserta berhasil masuk ke roster event dengan BIB #${data.rider.bib}.`,
          'success'
        );
      }
    } catch (err) {
      if (typeof showToast === 'function') showToast(err.message, 'error');
    }
  }

  async function handleDeleteRegistration(reg) {
    if (!confirm(`Hapus permanen data pendaftaran ${reg.reg_code} (${reg.full_name})?`)) return;
    try {
      const res = await fetch(`/api/admin/ala-ultra/registrations/${reg.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal menghapus data.');
      state.registrations = state.registrations.filter(r => r.id !== reg.id);
      recomputeSummary();
      renderBody();
      if (typeof showToast === 'function') showToast(`Data ${reg.reg_code} dihapus.`, 'info');
    } catch (err) {
      if (typeof showToast === 'function') showToast(err.message, 'error');
    }
  }

  function buildRegistrationsRowsHtml(filtered) {
    if (!filtered.length) {
      return `<tr><td colspan="9" style="text-align:center;padding:28px;color:#475569">
        ${state.registrations.length === 0
          ? 'Belum ada peserta yang mendaftar melalui formulir ALA-ALA ULTRA 2027.'
          : 'Tidak ada data pendaftar yang cocok dengan filter pencarian.'}
      </td></tr>`;
    }

    return filtered.map(r => {
      const isApproved = r.registration_status === 'Disetujui';
      const noMediaBadge = r.media_consent === 'Tidak bersedia'
        ? `<div style="margin-top:4px"><span class="aau-admin-pill is-bad">Dokumentasi: Tidak Bersedia</span></div>`
        : '';
      const syncedBadge = r.rider_id
        ? `<div style="margin-top:4px"><span class="aau-admin-pill is-valid">Sudah di Roster</span></div>`
        : '';

      return `
        <tr data-reg-id="${r.id}">
          <td class="aau-cell-reg">
            <strong style="font-family:var(--font-mono);font-size:12.5px;color:#0D1117">${escapeHtml(r.reg_code)}</strong>
            <div style="font-size:11px;color:#475569">${escapeHtml((r.created_at || '').slice(0, 16))}</div>
            ${syncedBadge}
          </td>
          <td class="aau-cell-participant">
            <div style="font-weight:800;color:#0D1117">${escapeHtml(r.full_name)}</div>
            <div style="font-size:12px;color:#334155;font-family:var(--font-mono)">${escapeHtml(r.whatsapp)}</div>
            <div style="font-size:11.5px;color:#475569">${escapeHtml(r.city)}${r.community ? ' · ' + escapeHtml(r.community) : ''}</div>
            ${noMediaBadge}
          </td>
          <td class="aau-cell-bike">
            <div style="font-weight:700;color:#0D1117">${escapeHtml(r.bike_type)} · <span style="font-family:var(--font-mono)">${escapeHtml(r.longest_distance_km)} KM</span></div>
            <div class="aau-strava-links">
              ${renderSafeStravaLink(r.strava_profile_url, 'profile', 'Profil Strava', '', 'aau-strava-chip')}
              ${renderSafeStravaLink(r.strava_activity_url, 'activity', 'Aktivitas', '', 'aau-strava-chip')}
            </div>
          </td>
          <td class="aau-cell-payment">
            <div style="font-weight:800;font-family:var(--font-mono);color:#0D1117">${escapeHtml(formatRupiah(r.payment_amount))}</div>
            <div style="font-size:11.5px;color:#475569">${escapeHtml(r.payer_account_name)} (${escapeHtml(r.payment_date)})</div>
            <button type="button" class="btn btn-outline btn-aau-proof aau-btn-compact is-inline" data-id="${r.id}">Lihat Bukti</button>
          </td>
          <td>
            <div class="aau-verify-list">
              <label class="aau-verify-row">
                <span>Data</span>
                <select class="aau-admin-select-inline sel-verify-field" data-id="${r.id}" data-field="verify_data" aria-label="Verifikasi Data ${escapeHtml(r.reg_code)}">
                  ${['Pending', 'Valid'].map(v => `<option value="${v}" ${r.verify_data === v ? 'selected' : ''}>${v}</option>`).join('')}
                </select>
              </label>
              <label class="aau-verify-row">
                <span>Strava</span>
                <select class="aau-admin-select-inline sel-verify-field" data-id="${r.id}" data-field="verify_strava" aria-label="Verifikasi Strava ${escapeHtml(r.reg_code)}">
                  ${['Pending', 'Valid', 'Tidak Valid'].map(v => `<option value="${v}" ${r.verify_strava === v ? 'selected' : ''}>${v}</option>`).join('')}
                </select>
              </label>
              <label class="aau-verify-row">
                <span>Bayar</span>
                <select class="aau-admin-select-inline sel-verify-field" data-id="${r.id}" data-field="verify_payment" aria-label="Verifikasi Pembayaran ${escapeHtml(r.reg_code)}">
                  ${['Pending', 'Valid', 'Tidak Valid'].map(v => `<option value="${v}" ${r.verify_payment === v ? 'selected' : ''}>${v}</option>`).join('')}
                </select>
              </label>
            </div>
          </td>
          <td>
            <div class="aau-status-cell">
              <select class="aau-admin-select-inline sel-verify-field" data-id="${r.id}" data-field="registration_status" aria-label="Status Pendaftaran ${escapeHtml(r.reg_code)}">
                ${['Menunggu', 'Disetujui', 'Ditolak'].map(v => `<option value="${v}" ${r.registration_status === v ? 'selected' : ''}>${v}</option>`).join('')}
              </select>
              <span class="aau-admin-pill ${statusPillClass(r.registration_status)}">${escapeHtml(r.registration_status)}</span>
            </div>
          </td>
          <td>
            <div class="aau-wa-cell">
              <label class="aau-verify-row is-wa">
                <span>Undangan</span>
                <select class="aau-admin-select-inline sel-verify-field" data-id="${r.id}" data-field="wa_invite_status" aria-label="Status Undangan WA ${escapeHtml(r.reg_code)}">
                  ${['Belum Dikirim', 'Terkirim'].map(v => `<option value="${v}" ${r.wa_invite_status === v ? 'selected' : ''}>${v}</option>`).join('')}
                </select>
              </label>
              <label class="aau-verify-row is-wa">
                <span>Grup</span>
                <select class="aau-admin-select-inline sel-verify-field" data-id="${r.id}" data-field="wa_group_status" aria-label="Status Grup WA ${escapeHtml(r.reg_code)}">
                  ${['Belum Bergabung', 'Sudah Bergabung'].map(v => `<option value="${v}" ${r.wa_group_status === v ? 'selected' : ''}>${v}</option>`).join('')}
                </select>
              </label>
              <button type="button" class="btn btn-outline btn-aau-wa aau-btn-compact aau-btn-wa-invite" data-id="${r.id}" ${isApproved ? '' : 'disabled title="Setujui status pendaftaran terlebih dahulu untuk mengirim undangan WA"'}>Kirim Undangan WA</button>
            </div>
          </td>
          <td class="aau-cell-notes">
            <div style="font-size:12px;color:${r.admin_notes ? '#0D1117' : '#64748B'}">${escapeHtml(r.admin_notes || '-')}</div>
          </td>
          <td>
            <div class="aau-actions-cell">
              <button type="button" class="btn btn-outline btn-aau-detail aau-btn-compact" data-id="${r.id}">Detail</button>
              ${(isApproved && state.config?.linked_event_id && !r.rider_id)
                ? `<button type="button" class="btn btn-primary btn-aau-sync aau-btn-compact" data-id="${r.id}">Sync Roster</button>`
                : ''}
              <button type="button" class="btn btn-outline btn-aau-delete aau-btn-compact is-danger" data-id="${r.id}">Hapus</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function wireRegistrationTableEvents(tbodyEl) {
    if (!tbodyEl) return;

    tbodyEl.querySelectorAll('.sel-verify-field').forEach(sel => {
      sel.addEventListener('change', () => {
        const id = Number(sel.dataset.id);
        const field = sel.dataset.field;
        patchRegistration(id, { [field]: sel.value });
      });
    });

    tbodyEl.querySelectorAll('.btn-aau-proof').forEach(btn => {
      btn.addEventListener('click', () => {
        const reg = state.registrations.find(r => r.id === Number(btn.dataset.id));
        if (reg) openProofModal(reg);
      });
    });

    tbodyEl.querySelectorAll('.btn-aau-detail').forEach(btn => {
      btn.addEventListener('click', () => {
        const reg = state.registrations.find(r => r.id === Number(btn.dataset.id));
        if (reg) openDetailModal(reg);
      });
    });

    tbodyEl.querySelectorAll('.btn-aau-wa').forEach(btn => {
      btn.addEventListener('click', () => {
        const reg = state.registrations.find(r => r.id === Number(btn.dataset.id));
        if (reg) handleSendWaInvite(reg);
      });
    });

    tbodyEl.querySelectorAll('.btn-aau-sync').forEach(btn => {
      btn.addEventListener('click', () => {
        const reg = state.registrations.find(r => r.id === Number(btn.dataset.id));
        if (reg) handleSyncRider(reg);
      });
    });

    tbodyEl.querySelectorAll('.btn-aau-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const reg = state.registrations.find(r => r.id === Number(btn.dataset.id));
        if (reg) handleDeleteRegistration(reg);
      });
    });
  }

  function refreshRegistrationsTableOnly() {
    const filtered = getFilteredRegistrations();
    const tbodyEl = document.getElementById('aauRegistrationsTbody');
    const countEl = document.getElementById('aauFilterCount');
    if (countEl) {
      countEl.textContent = `Menampilkan ${filtered.length} dari ${state.registrations.length} pendaftar`;
    }
    if (tbodyEl) {
      tbodyEl.innerHTML = buildRegistrationsRowsHtml(filtered);
      wireRegistrationTableEvents(tbodyEl);
    }
  }

  function renderRegistrationsTab() {
    const filtered = getFilteredRegistrations();
    const s = state.summary;

    bodyEl.innerHTML = `
      <div class="aau-admin-stats">
        <div class="aau-admin-stat">
          <div class="aau-admin-stat-lbl">Total Pendaftar</div>
          <div class="aau-admin-stat-val">${s.total}</div>
        </div>
        <div class="aau-admin-stat">
          <div class="aau-admin-stat-lbl">Menunggu</div>
          <div class="aau-admin-stat-val">${s.menunggu}</div>
        </div>
        <div class="aau-admin-stat">
          <div class="aau-admin-stat-lbl">Disetujui</div>
          <div class="aau-admin-stat-val" style="color:#065F46">${s.disetujui}</div>
        </div>
        <div class="aau-admin-stat">
          <div class="aau-admin-stat-lbl">Ditolak</div>
          <div class="aau-admin-stat-val" style="color:#991B1B">${s.ditolak}</div>
        </div>
        <div class="aau-admin-stat">
          <div class="aau-admin-stat-lbl">Sudah Grup WA</div>
          <div class="aau-admin-stat-val">${s.sudah_grup}</div>
        </div>
      </div>

      <div class="card">
        <div class="aau-admin-toolbar">
          <input type="text" id="aauAdminSearch" class="aau-admin-search" value="${escapeHtml(state.search)}" placeholder="Cari no. reg, nama, WA, email, komunitas..." aria-label="Cari peserta">
          <div class="aau-admin-filter-group">
            <select id="aauAdminStatusFilter" class="aau-admin-select-inline" aria-label="Filter status pendaftaran">
              <option value="all" ${state.statusFilter === 'all' ? 'selected' : ''}>Semua Status</option>
              <option value="Menunggu" ${state.statusFilter === 'Menunggu' ? 'selected' : ''}>Menunggu</option>
              <option value="Disetujui" ${state.statusFilter === 'Disetujui' ? 'selected' : ''}>Disetujui</option>
              <option value="Ditolak" ${state.statusFilter === 'Ditolak' ? 'selected' : ''}>Ditolak</option>
            </select>
            <select id="aauAdminExtraFilter" class="aau-admin-select-inline" aria-label="Filter verifikasi">
              <option value="all" ${state.extraFilter === 'all' ? 'selected' : ''}>Semua Kondisi</option>
              <option value="pending_verify" ${state.extraFilter === 'pending_verify' ? 'selected' : ''}>Belum Terverifikasi Penuh</option>
              <option value="wa_pending" ${state.extraFilter === 'wa_pending' ? 'selected' : ''}>Disetujui, Belum Masuk Grup WA</option>
              <option value="no_media" ${state.extraFilter === 'no_media' ? 'selected' : ''}>Dokumentasi: Tidak Bersedia</option>
            </select>
          </div>
          <span class="aau-admin-count" id="aauFilterCount">Menampilkan ${filtered.length} dari ${state.registrations.length} pendaftar</span>
        </div>

        <div class="table-responsive-wrapper">
          <table class="rider-table aau-admin-table">
            <thead>
              <tr>
                <th>No. Reg</th>
                <th>Peserta &amp; Kontak</th>
                <th>Sepeda &amp; Strava</th>
                <th>Pembayaran</th>
                <th>Verifikasi</th>
                <th>Status</th>
                <th>Grup WA</th>
                <th>Catatan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody id="aauRegistrationsTbody">${buildRegistrationsRowsHtml(filtered)}</tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('aauAdminSearch')?.addEventListener('input', (e) => {
      state.search = e.target.value;
      refreshRegistrationsTableOnly();
    });
    document.getElementById('aauAdminStatusFilter')?.addEventListener('change', (e) => {
      state.statusFilter = e.target.value;
      refreshRegistrationsTableOnly();
    });
    document.getElementById('aauAdminExtraFilter')?.addEventListener('change', (e) => {
      state.extraFilter = e.target.value;
      refreshRegistrationsTableOnly();
    });

    wireRegistrationTableEvents(document.getElementById('aauRegistrationsTbody'));
  }

  function readSettingsFormValues() {
    if (!document.getElementById('aauConfigForm')) return null;
    return {
      is_open: document.getElementById('cfgIsOpen').value === '1',
      linked_event_id: document.getElementById('cfgLinkedEvent').value || null,
      open_date: document.getElementById('cfgOpenDate').value,
      close_date: document.getElementById('cfgCloseDate').value || null,
      max_quota: document.getElementById('cfgMaxQuota').value || null,
      min_strava_km: document.getElementById('cfgMinStrava').value || null,
      event_date_label: document.getElementById('cfgEventDateLabel').value,
      event_distance: document.getElementById('cfgEventDistance').value,
      event_elevation: document.getElementById('cfgEventElevation').value,
      event_location: document.getElementById('cfgEventLocation').value,
      fee_amount: document.getElementById('cfgFeeAmount').value,
      bank_name: document.getElementById('cfgBankName').value,
      account_holder: document.getElementById('cfgAccountHolder').value,
      account_number: document.getElementById('cfgAccountNumber').value,
      admin_whatsapp: document.getElementById('cfgAdminWa').value,
      wa_group_link: document.getElementById('cfgWaGroupLink').value,
      refund_policy: document.getElementById('cfgRefundPolicy').value,
      insurance_note: document.getElementById('cfgInsuranceNote').value
    };
  }

  function renderSettingsTab() {
    const saved = state.config || {};
    const cfg = state.settingsDraft ? { ...saved, ...state.settingsDraft } : saved;
    const isPaymentReady = Boolean(saved.fee_amount && saved.bank_name && saved.account_holder && saved.account_number);
    const updatedDisplay = saved.updated_at && typeof formatSosTime === 'function'
      ? formatSosTime(saved.updated_at, true)
      : (saved.updated_at || '-');

    bodyEl.innerHTML = `
      <form class="card" id="aauConfigForm">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;border-bottom:1px solid #E5E7EB;padding-bottom:12px;margin-bottom:18px">
          <div>
            <span style="font-family:var(--font-mono);font-size:10px;font-weight:800;color:#4B5563;letter-spacing:0.08em">// CHECKLIST &amp; KONFIGURASI PANITIA</span>
            <h2 style="font-size:16px;font-weight:900;color:#0D1117;margin:2px 0 0">Pengaturan Form &amp; Pembayaran ALA-ALA ULTRA 2027</h2>
            <p style="font-size:12px;color:#4B5563;margin:4px 0 0">Data yang sudah disimpan tetap terisi di kolom di bawah agar Anda dapat mengecek dan memperbarui perubahan kapan saja.</p>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
            <span class="aau-admin-pill ${isPaymentReady ? 'is-valid' : 'is-warn'}">
              ${isPaymentReady ? 'Info Pembayaran: Sudah Diisi' : 'Info Pembayaran: Belum Lengkap'}
            </span>
            <span style="font-family:var(--font-mono);font-size:10.5px;color:#4B5563">Terakhir disimpan: ${escapeHtml(updatedDisplay)}</span>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="cfgIsOpen">Status Formulir Pendaftaran</label>
            <select class="input" id="cfgIsOpen">
              <option value="1" ${cfg.is_open ? 'selected' : ''}>Dibuka (Menerima Pendaftaran)</option>
              <option value="0" ${!cfg.is_open ? 'selected' : ''}>Ditutup Sementara</option>
            </select>
          </div>

          <div class="form-group">
            <label for="cfgLinkedEvent">Hubungkan ke Event Live Tracking CycloPon</label>
            <select class="input" id="cfgLinkedEvent">
              <option value="">-- Tidak Dihubungkan --</option>
              ${state.events.map(ev => `
                <option value="${ev.id}" ${Number(cfg.linked_event_id) === Number(ev.id) ? 'selected' : ''}>
                  #${ev.id} · ${escapeHtml(ev.name)} (${escapeHtml(ev.date)})
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="cfgOpenDate">Tanggal Pendaftaran Dibuka (Info)</label>
            <input class="input" type="date" id="cfgOpenDate" value="${escapeHtml(cfg.open_date || '2026-11-30')}">
          </div>
          <div class="form-group">
            <label for="cfgCloseDate">Tanggal Penutupan Pendaftaran (Opsional)</label>
            <input class="input" type="date" id="cfgCloseDate" value="${escapeHtml(cfg.close_date || '')}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="cfgMaxQuota">Kuota Maksimal Peserta (Opsional)</label>
            <input class="input" type="number" min="1" step="1" id="cfgMaxQuota" value="${cfg.max_quota ?? ''}" placeholder="Kosongkan jika tanpa batas">
          </div>
          <div class="form-group">
            <label for="cfgMinStrava">Syarat Minimal Jarak Strava (KM, Opsional)</label>
            <input class="input" type="number" min="0" step="0.5" id="cfgMinStrava" value="${cfg.min_strava_km ?? ''}" placeholder="Contoh: 100">
          </div>
        </div>

        <div style="border-top:1px dashed #CBD5E1;margin:18px 0;padding-top:16px">
          <h3 style="font-size:14px;font-weight:900;color:#0D1117;margin:0 0 12px">Informasi Event (Ditampilkan di Kartu Informasi Form Publik)</h3>
          <div class="form-row">
            <div class="form-group">
              <label for="cfgEventDateLabel">Hari / Tanggal Event</label>
              <input class="input" type="text" id="cfgEventDateLabel" maxlength="120" value="${escapeHtml(cfg.event_date_label || 'Minggu, 17 Januari 2027')}" placeholder="Contoh: Minggu, 17 Januari 2027">
            </div>
            <div class="form-group">
              <label for="cfgEventLocation">Lokasi Event</label>
              <input class="input" type="text" id="cfgEventLocation" maxlength="120" value="${escapeHtml(cfg.event_location || 'Tasikmalaya')}" placeholder="Contoh: Tasikmalaya">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="cfgEventDistance">Jarak</label>
              <input class="input" type="text" id="cfgEventDistance" maxlength="60" value="${escapeHtml(cfg.event_distance || '130 KM')}" placeholder="Contoh: 130 KM">
            </div>
            <div class="form-group">
              <label for="cfgEventElevation">Total Elevasi</label>
              <input class="input" type="text" id="cfgEventElevation" maxlength="60" value="${escapeHtml(cfg.event_elevation || '2.200 Meter')}" placeholder="Contoh: 2.200 Meter">
            </div>
          </div>
        </div>

        <div style="border-top:1px dashed #CBD5E1;margin:18px 0;padding-top:16px">
          <h3 style="font-size:14px;font-weight:900;color:#0D1117;margin:0 0 12px">Informasi Pembayaran (Ditampilkan di Section 6)</h3>
          <div class="form-row">
            <div class="form-group">
              <label for="cfgFeeAmount">Biaya Pendaftaran</label>
              <input class="input" type="text" id="cfgFeeAmount" value="${escapeHtml(cfg.fee_amount || '')}" placeholder="Contoh: 250000 (kosong = [DIISI PANITIA])">
            </div>
            <div class="form-group">
              <label for="cfgBankName">Bank / Metode Pembayaran</label>
              <input class="input" type="text" id="cfgBankName" value="${escapeHtml(cfg.bank_name || '')}" placeholder="Contoh: BCA / Mandiri / QRIS">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="cfgAccountHolder">Atas Nama Rekening</label>
              <input class="input" type="text" id="cfgAccountHolder" value="${escapeHtml(cfg.account_holder || '')}" placeholder="Nama pemilik rekening panitia">
            </div>
            <div class="form-group">
              <label for="cfgAccountNumber">Nomor Rekening</label>
              <input class="input" type="text" id="cfgAccountNumber" value="${escapeHtml(cfg.account_number || '')}" placeholder="Nomor rekening panitia">
            </div>
          </div>
        </div>

        <div style="border-top:1px dashed #CBD5E1;margin:18px 0;padding-top:16px">
          <h3 style="font-size:14px;font-weight:900;color:#0D1117;margin:0 0 12px">WhatsApp &amp; Kebijakan Tambahan</h3>
          <div class="form-row">
            <div class="form-group">
              <label for="cfgAdminWa">Nomor WhatsApp Resmi Panitia</label>
              <input class="input" type="tel" id="cfgAdminWa" value="${escapeHtml(cfg.admin_whatsapp || '')}" placeholder="08xxxxxxxxxx">
            </div>
            <div class="form-group">
              <label for="cfgWaGroupLink">Tautan Grup WhatsApp Resmi Peserta</label>
              <input class="input" type="url" id="cfgWaGroupLink" value="${escapeHtml(cfg.wa_group_link || '')}" placeholder="https://chat.whatsapp.com/...">
              <div style="font-size:11px;color:#4B5563;margin-top:4px">Dipakai untuk tombol Kirim Undangan WA kepada peserta yang sudah lolos verifikasi (tidak ditampilkan di halaman publik setelah mendaftar).</div>
            </div>
          </div>

          <div class="form-group">
            <label for="cfgRefundPolicy">Kebijakan Pembatalan &amp; Verifikasi Strava (Opsional)</label>
            <textarea class="input" id="cfgRefundPolicy" rows="2" placeholder="Contoh: Jika tautan Strava belum memenuhi syarat, panitia memberi waktu 2x24 jam untuk mengirim aktivitas pengganti.">${escapeHtml(cfg.refund_policy || '')}</textarea>
          </div>

          <div class="form-group">
            <label for="cfgInsuranceNote">Catatan Asuransi Pribadi di Section 4 (Opsional)</label>
            <textarea class="input" id="cfgInsuranceNote" rows="2" placeholder="Isi hanya jika kebijakan asuransi sudah final ditetapkan panitia.">${escapeHtml(cfg.insurance_note || '')}</textarea>
          </div>
        </div>

        <div id="aauConfigFeedback" style="margin-top:12px">
          ${state.settingsDraft ? `<div class="aau-admin-pill is-warn" style="display:block;padding:9px 12px;font-size:12px">Ada perubahan yang belum disimpan. Klik <strong>Update Perubahan</strong> untuk menerapkan ke formulir publik.</div>` : ''}
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px">
          <button type="submit" class="btn btn-primary" id="btnSaveAauConfig">
            Update Perubahan
          </button>
        </div>
      </form>
    `;

    document.getElementById('aauConfigForm')?.addEventListener('input', () => {
      state.settingsDraft = readSettingsFormValues();
    });
    document.getElementById('aauConfigForm')?.addEventListener('change', () => {
      state.settingsDraft = readSettingsFormValues();
    });

    document.getElementById('aauConfigForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (state.savingConfig) return;

      // Capture all typed values BEFORE disabling UI or re-rendering
      const payload = readSettingsFormValues();
      if (!payload) return;

      const saveBtn = document.getElementById('btnSaveAauConfig');
      const feedbackEl = document.getElementById('aauConfigFeedback');
      state.savingConfig = true;
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Menyimpan perubahan...';
      }
      if (feedbackEl) feedbackEl.innerHTML = '';

      try {
        const res = await fetch('/api/admin/ala-ultra/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Gagal menyimpan perubahan.');
        state.config = data.config;
        state.settingsDraft = null;
        state.savingConfig = false;
        renderSettingsTab();
        const savedFeedback = document.getElementById('aauConfigFeedback');
        if (savedFeedback) {
          savedFeedback.innerHTML = `<div class="aau-admin-pill is-valid" style="display:block;padding:10px 12px;font-size:12.5px">Perubahan tersimpan. Data di atas tetap dipertahankan dan sudah aktif di halaman formulir publik (/ala-ala-ultra).</div>`;
        }
        if (typeof showToast === 'function') showToast('Perubahan pengaturan ALA-ALA ULTRA 2027 disimpan.', 'success');
      } catch (err) {
        state.savingConfig = false;
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Update Perubahan';
        }
        if (feedbackEl) {
          feedbackEl.innerHTML = `<div class="aau-admin-pill is-bad" role="alert" style="display:block;padding:10px 12px;font-size:12.5px">${escapeHtml(err.message)}</div>`;
        }
        if (typeof showToast === 'function') showToast(err.message, 'error');
      }
    });
  }

  function renderBody() {
    if (!bodyEl) return;

    if (state.loading) {
      bodyEl.innerHTML = `
        <div class="card" role="status" style="text-align:center;padding:36px">
          <strong>Memuat data pendaftaran ALA-ALA ULTRA 2027...</strong>
        </div>
      `;
      return;
    }

    if (state.error) {
      bodyEl.innerHTML = `
        <div class="card" role="alert" style="border-color:#FCA5A5;background:#FEF2F2">
          <p style="color:#991B1B;font-weight:800;margin:0 0 10px">${escapeHtml(state.error)}</p>
          <button type="button" class="btn btn-primary" id="btnRetryAauAdmin">Coba Lagi</button>
        </div>
      `;
      document.getElementById('btnRetryAauAdmin')?.addEventListener('click', loadAllData);
      return;
    }

    if (state.activeTab === 'settings') {
      renderSettingsTab();
    } else {
      renderRegistrationsTab();
    }
  }

  async function loadAllData() {
    state.loading = true;
    state.error = null;
    renderBody();
    try {
      const [cfgRes, regRes] = await Promise.all([
        fetch('/api/admin/ala-ultra/config', { credentials: 'include' }),
        fetch('/api/admin/ala-ultra/registrations', { credentials: 'include' })
      ]);
      if (!cfgRes.ok || !regRes.ok) {
        throw new Error('Gagal mengambil data ALA-ALA ULTRA dari server.');
      }
      const cfgData = await cfgRes.json();
      const regData = await regRes.json();
      state.config = cfgData.config;
      state.events = cfgData.events || [];
      state.registrations = regData.registrations || [];
      state.summary = regData.summary || state.summary;
    } catch (err) {
      state.error = err.message || 'Koneksi ke server bermasalah.';
    } finally {
      state.loading = false;
      renderBody();
    }
  }

  document.querySelectorAll('[data-aau-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.activeTab === 'settings') {
        const currentDraft = readSettingsFormValues();
        if (currentDraft) state.settingsDraft = currentDraft;
      }
      state.activeTab = btn.dataset.aauTab;
      document.querySelectorAll('[data-aau-tab]').forEach(b => {
        const active = b.dataset.aauTab === state.activeTab;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      renderBody();
    });
  });

  document.getElementById('btnAauRefresh')?.addEventListener('click', loadAllData);

  const exportBtn = document.getElementById('btnAauExportExcel');
  exportBtn?.addEventListener('click', async () => {
    const origText = exportBtn.textContent;
    exportBtn.disabled = true;
    exportBtn.textContent = 'Menyiapkan Excel...';
    try {
      const res = await fetch('/api/admin/ala-ultra/export.xlsx', { credentials: 'include' });
      if (!res.ok) throw new Error('Gagal menyiapkan file Excel.');
      const disposition = res.headers.get('Content-Disposition') || '';
      const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);
      const todayFallback = new Date().toISOString().slice(0, 10);
      const filename = filenameMatch?.[1] || `ala-ala-ultra-2027-registrations-${todayFallback}.xlsx`;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 150);
    } catch (err) {
      if (typeof showToast === 'function') showToast(err.message, 'error');
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = origText;
    }
  });

  loadAllData();
}

window.renderAdminAlaUltra = renderAdminAlaUltra;
