/**
 * Admin Event Logs & Preventive Post-Mortem Recap Page
 * Provides audit recap for trial events, telemetry signal gap analysis,
 * incident history, automated prevention recommendations, and multi-format exports.
 */

async function renderAdminLogs(params = {}) {
  loadCss('/css/admin.css?v=88');

  // Route guard: check if admin is logged in
  const adminUser = sessionStorage.getItem('adminUser') || localStorage.getItem('adminUser');
  if (!adminUser) {
    Router.navigate('/admin');
    return;
  }
  if (!sessionStorage.getItem('adminUser')) sessionStorage.setItem('adminUser', adminUser);

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="admin-layout">
      ${adminSidebar('logs')}
      <main class="admin-content">
        <!-- Page Header -->
        <div class="page-header" style="flex-wrap:wrap;gap:14px">
          <div class="page-header-title-col">
            <span class="page-header-tag">// POST-EVENT RECAP &amp; TELEMETRY AUDIT</span>
            <h1 style="margin:4px 0">📋 Log &amp; Rekap Evaluasi Event</h1>
            <p style="color:#6B7280;font-size:13px;margin:0">
              Rekapitulasi pasca-event uji coba, audit sinyal &amp; blank spot rider, kronologi insiden, dan rekomendasi pencegahan kendala untuk event besar.
            </p>
          </div>

          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:6px;background:#FFFFFF;border:1.5px solid #E5E7EB;padding:5px 10px;border-radius:8px">
              <span style="font-size:12px;font-weight:700;color:#374151">Pilih Event:</span>
              <select id="logsEventSelect" style="border:none;background:transparent;font-size:12.5px;font-weight:800;color:#0D1117;outline:none;cursor:pointer">
                <option value="">Memuat daftar event...</option>
              </select>
            </div>

            <button id="btnRefreshLogs" class="btn btn-outline" style="font-size:12px;padding:6px 10px;display:flex;align-items:center;gap:5px" title="Muat Ulang Data">
              <span>🔄</span> Refresh
            </button>

            <button id="btnPrintLogs" class="btn btn-outline" style="font-size:12px;padding:6px 10px;display:flex;align-items:center;gap:5px" title="Cetak atau Simpan sebagai PDF">
              <span>🖨️</span> Cetak / PDF
            </button>

            <button id="btnDownloadMd" class="btn btn-outline" style="font-size:12px;padding:6px 10px;display:flex;align-items:center;gap:5px" title="Unduh Dokumen Laporan Lengkap (.md)">
              <span>📥</span> Unduh Dokumen (.md)
            </button>

            <button id="btnDownloadCsv" class="btn btn-outline" style="font-size:12px;padding:6px 10px;display:flex;align-items:center;gap:5px" title="Unduh Data Audit Telemetri Rider (.csv)">
              <span>📊</span> Unduh CSV
            </button>

            <button id="btnCopyWa" class="btn btn-outline" style="font-size:12px;padding:6px 10px;display:flex;align-items:center;gap:5px;background:#F0FDF4;color:#166534;border-color:#86EFAC" title="Salin Ringkasan untuk Diskusi WA Panitia">
              <span>📱</span> Salin Ringkasan WA
            </button>

            <a id="btnLogsLiveMap" href="#" data-link class="btn btn-primary" style="font-size:12px;padding:6px 12px;display:flex;align-items:center;gap:5px" title="Buka Live Map">
              <span>🗺️</span> Live Map
            </a>
          </div>
        </div>

        <!-- Main Logs Content Container -->
        <div id="logsContainer">
          <div class="card" style="padding:40px;text-align:center;color:#6B7280">
            <div style="font-size:32px;margin-bottom:10px">⏳</div>
            <div style="font-size:14px;font-weight:700">Mengambil data rekap event...</div>
          </div>
        </div>
      </main>
    </div>
  `;

  const selectEl = document.getElementById('logsEventSelect');
  const containerEl = document.getElementById('logsContainer');
  const btnRefresh = document.getElementById('btnRefreshLogs');
  const btnPrint = document.getElementById('btnPrintLogs');
  const btnDownloadMd = document.getElementById('btnDownloadMd');
  const btnDownloadCsv = document.getElementById('btnDownloadCsv');
  const btnCopyWa = document.getElementById('btnCopyWa');
  const btnLiveMap = document.getElementById('btnLogsLiveMap');

  let currentEventId = null;
  let currentRecapData = null;

  // Helper to trigger browser file download
  function downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  // 1. Print / Save as PDF handler
  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      window.print();
    });
  }

  // 2. Download Markdown Report (.md)
  if (btnDownloadMd) {
    btnDownloadMd.addEventListener('click', () => {
      if (!currentRecapData) return;
      const md = generateMarkdownReport(currentRecapData);
      const safeName = (currentRecapData.event?.name || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      downloadBlob(md, `evaluasi-${safeName}-${currentRecapData.event?.date || 'rekap'}.md`, 'text/markdown;charset=utf-8');
    });
  }

  // 3. Download CSV Audit Data (.csv)
  if (btnDownloadCsv) {
    btnDownloadCsv.addEventListener('click', () => {
      if (!currentRecapData) return;
      const csv = generateCsvData(currentRecapData);
      const safeName = (currentRecapData.event?.name || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      downloadBlob(csv, `audit-rider-${safeName}.csv`, 'text/csv;charset=utf-8');
    });
  }

  // 4. Copy WhatsApp Summary to clipboard
  if (btnCopyWa) {
    btnCopyWa.addEventListener('click', async () => {
      if (!currentRecapData) return;
      const waText = generateWaSummary(currentRecapData);
      try {
        await navigator.clipboard.writeText(waText);
        const originalText = btnCopyWa.innerHTML;
        btnCopyWa.innerHTML = '<span>✅</span> Tersalin ke Clipboard!';
        btnCopyWa.style.background = '#DCFCE7';
        setTimeout(() => {
          btnCopyWa.innerHTML = originalText;
          btnCopyWa.style.background = '#F0FDF4';
        }, 2500);
      } catch (e) {
        alert('Gagal menyalin otomatis. Silakan pilih opsi Unduh Dokumen (.md).');
      }
    });
  }

  // Load event list for dropdown
  async function loadEventsList() {
    try {
      const res = await fetch('/api/admin/metrics/event-logs', { credentials: 'include' });
      if (!res.ok) throw new Error('Gagal memuat event');
      const data = await res.json();
      const events = data.events || [];

      if (!events.length) {
        selectEl.innerHTML = '<option value="">Belum ada event</option>';
        containerEl.innerHTML = `
          <div class="card" style="padding:40px;text-align:center;color:#6B7280">
            <div style="font-size:32px;margin-bottom:8px">🏁</div>
            <div style="font-size:15px;font-weight:800;color:#0D1117">Belum Ada Event Terdaftar</div>
            <p style="font-size:13px;margin:6px 0 16px">Buat event baru terlebih dahulu di menu Dashboard untuk memulai uji coba.</p>
            <a href="/admin/events/new" data-link class="btn btn-primary">+ Buat Event Baru</a>
          </div>
        `;
        return;
      }

      selectEl.innerHTML = events.map(e => `
        <option value="${e.id}">${escapeHtml(e.name)} (${e.date}) · ${e.pings} titik</option>
      `).join('');

      currentEventId = events[0].id;
      loadEventLogRecap(currentEventId);
    } catch (err) {
      console.error('[Admin Logs] Error loading event list:', err);
      containerEl.innerHTML = `<div class="card" style="padding:24px;color:#B91C1C">Gagal memuat daftar event. Silakan refresh halaman.</div>`;
    }
  }

  // Change event dropdown
  selectEl.addEventListener('change', () => {
    const val = selectEl.value;
    if (val) {
      currentEventId = Number(val);
      loadEventLogRecap(currentEventId);
    }
  });

  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      if (currentEventId) loadEventLogRecap(currentEventId);
      else loadEventsList();
    });
  }

  // Load and render recap for selected event
  async function loadEventLogRecap(eventId) {
    if (!eventId) return;
    if (btnLiveMap) {
      btnLiveMap.href = `/watch/${eventId}?admin=1`;
    }

    containerEl.innerHTML = `
      <div class="card" style="padding:40px;text-align:center;color:#6B7280">
        <div style="font-size:32px;margin-bottom:10px">⏳</div>
        <div style="font-size:14px;font-weight:700">Menganalisis log telemetri dan riwayat event #${eventId}...</div>
      </div>
    `;

    try {
      const res = await fetch(`/api/admin/metrics/event-logs/${eventId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Gagal mengambil detail log event');
      const data = await res.json();
      currentRecapData = data;
      renderRecapView(data);
    } catch (err) {
      console.error('[Admin Logs] Error fetching event recap:', err);
      containerEl.innerHTML = `
        <div class="card" style="padding:30px;text-align:center;color:#B91C1C">
          <div style="font-size:28px;margin-bottom:8px">⚠️</div>
          <div style="font-weight:800;font-size:15px">Gagal memuat evaluasi event</div>
          <p style="font-size:12.5px;color:#6B7280;margin:4px 0 14px">${escapeHtml(err.message)}</p>
          <button class="btn btn-outline" onclick="location.reload()">Muat Ulang Halaman</button>
        </div>
      `;
    }
  }

  function renderRecapView(data) {
    const ev = data.event || {};
    const kpi = data.kpi || {};
    const recs = data.recommendations || [];
    const riders = data.riderLogs || [];
    const alerts = data.alerts || [];
    const sys = data.system || {};

    const score = kpi.healthScore || 100;
    let scoreBadgeClass = 'badge-active';
    let scoreLabel = 'SIAP UNTUK EVENT BESAR';
    if (score < 70) {
      scoreBadgeClass = 'badge-medic';
      scoreLabel = 'PERLU EVALUASI SEBELUM EVENT';
    } else if (score < 85) {
      scoreBadgeClass = 'badge-sweeper';
      scoreLabel = 'CUKUP SIAP (ADA CATATAN)';
    }

    containerEl.innerHTML = `
      <!-- Formal Header for Print Output -->
      <div class="print-only-header" style="margin-bottom:24px;border-bottom:2px solid #0D1117;padding-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-family:var(--font-mono);font-size:11px;font-weight:800;color:#6B7280;letter-spacing:0.08em">// CYCLOPON RACE CONTROL</div>
            <h1 style="font-size:22px;margin:2px 0;font-weight:900;color:#0D1117">LAPORAN EVALUASI &amp; AUDIT TELEMETRI EVENT</h1>
            <p style="margin:2px 0 0;font-size:12px;color:#4B5563">Rekapitulasi Teknis, Audit Sinyal Peserta, dan Analisis Mitigasi Lapangan</p>
          </div>
          <div style="text-align:right;font-size:11px;font-family:var(--font-mono);color:#374151">
            <div style="font-weight:800;color:#0D1117">DOKUMEN RESMI COMMISSAIRE</div>
            <div>Dicetak: ${new Date().toLocaleString('id-ID')}</div>
          </div>
        </div>
      </div>

      <!-- Executive Summary Card -->
      <div class="card" style="margin-bottom:20px;padding:20px 24px">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid #E5E7EB">
          <div>
            <span style="font-family:var(--font-mono);font-size:10px;font-weight:800;color:#6B7280;letter-spacing:0.08em">// EVENT IDENTIFIER #${ev.id}</span>
            <h2 style="font-size:18px;font-weight:900;color:#0D1117;margin:2px 0 4px">${escapeHtml(ev.name)}</h2>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12px;color:#6B7280">
              <span>📅 Tanggal: <strong style="color:#0D1117">${ev.date}</strong></span>
              <span>·</span>
              <span>📍 GPX: <strong style="color:#0D1117">${ev.gpx_path ? 'Terpasang' : 'Belum Ada'}</strong></span>
              <span>·</span>
              <span class="badge ${ev.active ? 'badge-active' : 'badge-finished'}">${ev.active ? '● EVENT AKTIF' : 'EVENT SELESAI'}</span>
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-family:var(--font-mono);font-size:10px;font-weight:800;color:#6B7280;letter-spacing:0.06em;text-transform:uppercase">Skor Kesiapan Sistem</div>
            <div style="font-family:var(--font-mono);font-size:32px;font-weight:900;color:${score >= 85 ? '#047857' : (score >= 70 ? '#D97706' : '#B91C1C')};line-height:1">
              ${score}<span style="font-size:16px;color:#9CA3AF">/100</span>
            </div>
            <span class="badge ${scoreBadgeClass}" style="margin-top:4px">${scoreLabel}</span>
          </div>
        </div>

        <!-- KPI Metrics Grid -->
        <div class="traffic-metrics-grid">
          <div class="traffic-metric-item" title="Total koordinat GPS yang berhasil dikirim dan tersimpan di SQLite">
            <div class="traffic-metric-lbl">Total Titik GPS</div>
            <div class="traffic-metric-val" style="color:#0284C7">${kpi.totalPings.toLocaleString()}</div>
            <div class="traffic-metric-sub">Durasi: ~${kpi.durationMinutes || 0} Menit</div>
          </div>
          <div class="traffic-metric-item" title="Peserta yang aktif memancarkan sinyal dari total terdaftar">
            <div class="traffic-metric-lbl">Konektivitas Rider</div>
            <div class="traffic-metric-val" style="color:#047857">${kpi.activeRidersWithPings} / ${kpi.totalRiders}</div>
            <div class="traffic-metric-sub">${kpi.totalRiders - kpi.activeRidersWithPings} Rider Tanpa Sinyal</div>
          </div>
          <div class="traffic-metric-item" title="Kejadian sinyal rider terputus lebih dari 10 menit">
            <div class="traffic-metric-lbl">Insiden Blank Spot</div>
            <div class="traffic-metric-val" style="color:${kpi.totalBlankSpotIncidents > 0 ? '#D97706' : '#047857'}">
              ${kpi.totalBlankSpotIncidents}
            </div>
            <div class="traffic-metric-sub">Jeda Sinyal &gt; 10 Menit</div>
          </div>
          <div class="traffic-metric-item" title="Laporan darurat SOS yang dicatat sistem">
            <div class="traffic-metric-lbl">Laporan Darurat (SOS)</div>
            <div class="traffic-metric-val" style="color:${kpi.unresolvedAlerts > 0 ? '#B91C1C' : '#0D1117'}">
              ${kpi.totalAlerts}
            </div>
            <div class="traffic-metric-sub">${kpi.unresolvedAlerts > 0 ? `${kpi.unresolvedAlerts} Belum Selesai` : 'Semua Diselesaikan'}</div>
          </div>
        </div>
      </div>

      <!-- Section 1: Automated Findings & Preventive Action Items -->
      <div class="card" style="margin-bottom:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #E5E7EB">
          <div>
            <span style="font-family:var(--font-mono);font-size:10px;font-weight:800;color:#6B7280;letter-spacing:0.08em">// LESSONS LEARNED &amp; PRE-RACE CHECKLIST</span>
            <h2 style="font-size:15px;font-weight:900;color:#0D1117;text-transform:uppercase;margin:0">💡 Temuan &amp; Rekomendasi Pencegahan Masalah</h2>
          </div>
          <span style="font-size:11px;color:#6B7280;font-weight:600">${recs.length} Butir Analisis</span>
        </div>

        <div style="display:flex;flex-direction:column;gap:12px">
          ${recs.map(r => {
            let borderColor = '#E5E7EB';
            let bgHeader = '#F9FAFB';
            let badgeStyle = 'background:#ECFDF5;color:#047857;border-color:#A7F3D0';
            let icon = '✅';

            if (r.type === 'DANGER') {
              borderColor = '#FCA5A5';
              bgHeader = '#FEF2F2';
              badgeStyle = 'background:#FEE2E2;color:#991B1B;border-color:#FCA5A5';
              icon = '🚨';
            } else if (r.type === 'WARNING') {
              borderColor = '#FDE68A';
              bgHeader = '#FFFBEB';
              badgeStyle = 'background:#FEF3C7;color:#92400E;border-color:#FCD34D';
              icon = '⚠️';
            } else if (r.type === 'INFO') {
              borderColor = '#BFDBFE';
              bgHeader = '#EFF6FF';
              badgeStyle = 'background:#EFF6FF;color:#1E40AF;border-color:#BFDBFE';
              icon = 'ℹ️';
            }

            return `
              <div style="border:1.5px solid ${borderColor};border-radius:8px;overflow:hidden;background:#FFFFFF">
                <div style="background:${bgHeader};padding:8px 14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;border-bottom:1px solid ${borderColor}">
                  <span style="font-size:12px;font-weight:800;color:#111827;display:flex;align-items:center;gap:6px">
                    <span>${icon}</span> ${escapeHtml(r.title)}
                  </span>
                  <span style="font-family:var(--font-mono);font-size:10px;font-weight:800;padding:2px 8px;border-radius:4px;border:1px solid;${badgeStyle}">
                    ${escapeHtml(r.category)}
                  </span>
                </div>
                <div style="padding:12px 14px;font-size:12.5px;color:#374151;display:flex;flex-direction:column;gap:6px">
                  <div><strong>Kondisi Saat Uji Coba:</strong> ${escapeHtml(r.detail)}</div>
                  <div style="background:#F8FAFC;padding:8px 12px;border-radius:6px;border-left:3px solid #0D1117;color:#0D1117">
                    <strong>🎯 Rekomendasi Tindakan untuk Event Utama:</strong> ${escapeHtml(r.action)}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Section 2: Rider Signal & Blank Spot Audit Table -->
      <div class="card" style="margin-bottom:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #E5E7EB">
          <div>
            <span style="font-family:var(--font-mono);font-size:10px;font-weight:800;color:#6B7280;letter-spacing:0.08em">// RIDER TELEMETRY TRANSMISSION AUDIT</span>
            <h2 style="font-size:15px;font-weight:900;color:#0D1117;text-transform:uppercase;margin:0">🚴 Audit Sinyal &amp; Blank Spot Per Rider</h2>
          </div>
          <span style="font-size:11px;color:#6B7280;font-weight:600">${riders.length} Peserta Terdaftar</span>
        </div>

        <div class="table-responsive-wrapper">
          <table class="rider-table" style="font-size:12px">
            <thead>
              <tr>
                <th style="width:70px">BIB</th>
                <th>Nama Rider</th>
                <th>Peran</th>
                <th>Total Titik</th>
                <th>Jeda Terlama (Blank Spot)</th>
                <th>Interval Kirim</th>
                <th>Kecepatan (Avg / Max)</th>
                <th>Jarak Max</th>
                <th>Kondisi Sinyal</th>
              </tr>
            </thead>
            <tbody>
              ${riders.length === 0 ? '<tr><td colspan="9" style="text-align:center;color:#9CA3AF;padding:20px">Belum ada rider terdaftar.</td></tr>' : riders.map(r => {
                let statusBadge = '<span class="badge badge-active">🟢 Sinyal Lancar</span>';
                if (r.pings === 0) {
                  statusBadge = '<span class="badge badge-finished">⚪ Tanpa Data</span>';
                } else if (r.hasBlankSpot) {
                  statusBadge = `<span class="badge badge-medic">⚠️ Blank Spot (~${r.longestGapMinutes}m)</span>`;
                }

                return `
                  <tr>
                    <td>
                      <span style="font-family:var(--font-mono);font-weight:900;background:#0D1117;color:#FFFFFF;padding:2px 6px;border-radius:4px;font-size:11px">
                        #${escapeHtml(r.bib)}
                      </span>
                    </td>
                    <td>
                      <strong style="color:#0D1117">${escapeHtml(r.name)}</strong>
                    </td>
                    <td>
                      <span class="badge badge-finished" style="text-transform:uppercase;font-size:10px">${escapeHtml(r.role)}</span>
                    </td>
                    <td style="font-family:var(--font-mono);font-weight:700">
                      ${r.pings.toLocaleString()} titik
                    </td>
                    <td>
                      <strong style="color:${r.hasBlankSpot ? '#B91C1C' : '#0D1117'}">
                        ${r.longestGapMinutes > 0 ? `${r.longestGapMinutes} menit` : '—'}
                      </strong>
                    </td>
                    <td style="color:#4B5563">
                      ${r.avgIntervalSeconds > 0 ? `~${r.avgIntervalSeconds} dtk/titik` : '—'}
                    </td>
                    <td>
                      ${r.avgSpeed} / <strong>${r.maxSpeed} km/h</strong>
                    </td>
                    <td>
                      ${r.maxDistanceKm > 0 ? `${r.maxDistanceKm} km` : '—'}
                    </td>
                    <td>
                      ${statusBadge}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section 3: Emergency SOS & Incident History -->
      <div class="card" style="margin-bottom:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #E5E7EB">
          <div>
            <span style="font-family:var(--font-mono);font-size:10px;font-weight:800;color:#6B7280;letter-spacing:0.08em">// EMERGENCY SOS INCIDENTS</span>
            <h2 style="font-size:15px;font-weight:900;color:#0D1117;text-transform:uppercase;margin:0">🚨 Kronologi Laporan Darurat &amp; SOS</h2>
          </div>
          <span style="font-size:11px;color:#6B7280;font-weight:600">${alerts.length} Total Laporan</span>
        </div>

        ${alerts.length === 0 ? `
          <div style="padding:24px;text-align:center;background:#F9FAFB;border-radius:8px;color:#047857;font-weight:700;font-size:13px">
            ✅ Tidak ada laporan insiden darurat atau SOS yang tercatat selama event ini.
          </div>
        ` : `
          <div class="table-responsive-wrapper">
            <table class="rider-table" style="font-size:12px">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Rider</th>
                  <th>Kategori</th>
                  <th>Pesan / Keterangan</th>
                  <th>Koordinat</th>
                  <th>Status Penanganan</th>
                </tr>
              </thead>
              <tbody>
                ${alerts.map(a => `
                  <tr>
                    <td style="font-family:var(--font-mono);color:#4B5563">
                      ${a.created_at ? a.created_at.replace('T', ' ').slice(0, 19) : '—'}
                    </td>
                    <td>
                      <strong>#${escapeHtml(a.bib || '?')}</strong> ${escapeHtml(a.rider_name || 'Rider')}
                    </td>
                    <td>
                      <span class="badge ${a.type === 'SOS' || a.type === 'MEDICAL' ? 'badge-medic' : 'badge-sweeper'}">
                        ${escapeHtml(a.type)}
                      </span>
                    </td>
                    <td>
                      ${escapeHtml(a.message || '—')}
                    </td>
                    <td style="font-family:var(--font-mono);font-size:11px">
                      ${a.latitude && a.longitude ? `${Number(a.latitude).toFixed(5)}, ${Number(a.longitude).toFixed(5)}` : '—'}
                    </td>
                    <td>
                      ${a.resolved ? '<span class="badge badge-active">✓ Selesai Ditangani</span>' : '<span class="badge badge-medic">⚠️ Belum Diselesaikan</span>'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <!-- Section 4: Infrastructure & Traffic Load Recap -->
      <div class="card" style="margin-bottom:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #E5E7EB">
          <div>
            <span style="font-family:var(--font-mono);font-size:10px;font-weight:800;color:#6B7280;letter-spacing:0.08em">// INFRASTRUCTURE STABILITY SNAPSHOT</span>
            <h2 style="font-size:15px;font-weight:900;color:#0D1117;text-transform:uppercase;margin:0">🛡️ Audit Beban Server &amp; Pengunjung Web</h2>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px">
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;padding:12px 14px;border-radius:8px">
            <div style="font-size:10.5px;font-weight:800;color:#64748B;text-transform:uppercase">Penonton Web Unik</div>
            <div style="font-size:22px;font-weight:900;color:#0D1117;margin:4px 0">${kpi.eventVisitors || 0} Pengunjung</div>
            <div style="font-size:11px;color:#94A3B8">Total ${kpi.eventPageViews || 0} tayangan halaman</div>
          </div>
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;padding:12px 14px;border-radius:8px">
            <div style="font-size:10.5px;font-weight:800;color:#64748B;text-transform:uppercase">Penggunaan Memori (RAM)</div>
            <div style="font-size:22px;font-weight:900;color:#047857;margin:4px 0">${sys.vps ? sys.vps.memUsagePct : '--'}% RAM</div>
            <div style="font-size:11px;color:#94A3B8">${sys.vps ? `${sys.vps.usedMemMB} MB / ${sys.vps.totalMemMB} MB` : 'Linux VPS'}</div>
          </div>
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;padding:12px 14px;border-radius:8px">
            <div style="font-size:10.5px;font-weight:800;color:#64748B;text-transform:uppercase">Beban Prosesor (CPU)</div>
            <div style="font-size:22px;font-weight:900;color:#0284C7;margin:4px 0">${sys.vps ? sys.vps.cpuLoadPct : '--'}% CPU</div>
            <div style="font-size:11px;color:#94A3B8">Kapasitas multi-core VPS</div>
          </div>
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;padding:12px 14px;border-radius:8px">
            <div style="font-size:10.5px;font-weight:800;color:#64748B;text-transform:uppercase">Plafon Socket Linux</div>
            <div style="font-size:22px;font-weight:900;color:#0D1117;margin:4px 0">65.535 FD</div>
            <div style="font-size:11px;color:#94A3B8">Batas Docker socket terbuka</div>
          </div>
        </div>
      </div>

      <!-- Formal Footer for Print Output -->
      <div class="print-only-footer" style="margin-top:40px;page-break-inside:avoid">
        <div style="display:flex;justify-content:space-between;padding:0 20px;font-size:12px">
          <div style="text-align:center;width:220px">
            <div>Dianalisis Oleh:</div>
            <div style="margin-top:60px;border-top:1.5px solid #0D1117;padding-top:4px;font-weight:800">
              Tim Race Control &amp; IT
            </div>
            <div style="font-size:10px;color:#6B7280">CycloPon Live Tracking</div>
          </div>
          <div style="text-align:center;width:220px">
            <div>Disetujui Untuk Evaluasi:</div>
            <div style="margin-top:60px;border-top:1.5px solid #0D1117;padding-top:4px;font-weight:800">
              Chief Commissaire
            </div>
            <div style="font-size:10px;color:#6B7280">Panitia Pelaksana Event</div>
          </div>
        </div>
      </div>
    `;
  }

  // Generate Comprehensive Markdown Report
  function generateMarkdownReport(data) {
    const ev = data.event || {};
    const kpi = data.kpi || {};
    const recs = data.recommendations || [];
    const riders = data.riderLogs || [];
    const alerts = data.alerts || [];
    const sys = data.system || {};

    let md = `# LAPORAN EVALUASI & AUDIT TELEMETRI EVENT\n\n`;
    md += `> **CYCLOPON RACE CONTROL // POST-EVENT AUDIT**  \n`;
    md += `> **Nama Event:** ${ev.name || '-'}  \n`;
    md += `> **Tanggal:** ${ev.date || '-'}  \n`;
    md += `> **Skor Kesiapan:** \`${kpi.healthScore || 100} / 100\` (${kpi.healthScore >= 85 ? 'SIAP UNTUK EVENT BESAR' : 'PERLU EVALUASI SEBELUM EVENT'})  \n`;
    md += `> **Waktu Analisis:** ${new Date().toLocaleString('id-ID')}  \n\n`;

    md += `---\n\n`;
    md += `## 1. Ringkasan Eksekutif & Metrik Utama\n\n`;
    md += `| Metrik | Nilai | Keterangan |\n`;
    md += `| :--- | :--- | :--- |\n`;
    md += `| **Total Titik GPS Masuk** | ${kpi.totalPings?.toLocaleString() || 0} titik | Durasi aktif ~${kpi.durationMinutes || 0} menit |\n`;
    md += `| **Konektivitas Rider** | ${kpi.activeRidersWithPings || 0} / ${kpi.totalRiders || 0} rider | ${kpi.totalRiders - kpi.activeRidersWithPings} rider tanpa data sinyal |\n`;
    md += `| **Insiden Blank Spot** | ${kpi.totalBlankSpotIncidents || 0} kejadian | Jeda sinyal rider > 10 menit |\n`;
    md += `| **Laporan Darurat (SOS)** | ${kpi.totalAlerts || 0} laporan | ${kpi.unresolvedAlerts || 0} belum diselesaikan |\n`;
    md += `| **Pengunjung Web Penonton** | ${kpi.eventVisitors || 0} orang | Total ${kpi.eventPageViews || 0} tayangan halaman |\n`;
    md += `| **Beban Server VPS** | RAM ${sys.vps?.memUsagePct || 0}%, CPU ${sys.vps?.cpuLoadPct || 0}% | Socket Plafon Linux 65.535 FD |\n\n`;

    md += `---\n\n`;
    md += `## 2. Temuan & Rekomendasi Pencegahan Masalah (Action Items)\n\n`;
    if (!recs.length) {
      md += `*Tidak ada catatan anomali atau rekomendasi khusus.*\n\n`;
    } else {
      recs.forEach((r, idx) => {
        md += `### ${idx + 1}. [${r.category}] ${r.title}\n`;
        md += `- **Kondisi Saat Uji Coba:** ${r.detail}\n`;
        md += `- **🎯 Rekomendasi Pencegahan:** ${r.action}\n\n`;
      });
    }

    md += `---\n\n`;
    md += `## 3. Audit Sinyal & Blank Spot Per Rider\n\n`;
    md += `| BIB | Nama Rider | Peran | Total Titik | Jeda Terlama | Interval Kirim | Kecepatan (Avg/Max) | Status Sinyal |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    riders.forEach(r => {
      const statusText = r.pings === 0 ? 'Tanpa Data' : (r.hasBlankSpot ? `Blank Spot (${r.longestGapMinutes}m)` : 'Lancar');
      const gapText = r.longestGapMinutes > 0 ? `${r.longestGapMinutes} m` : '—';
      const intText = r.avgIntervalSeconds > 0 ? `~${r.avgIntervalSeconds} dtk` : '—';
      md += `| #${r.bib} | ${r.name} | ${r.role} | ${r.pings} | ${gapText} | ${intText} | ${r.avgSpeed} / ${r.maxSpeed} km/h | ${statusText} |\n`;
    });
    md += `\n---\n\n`;

    md += `## 4. Kronologi Laporan Darurat (SOS)\n\n`;
    if (!alerts.length) {
      md += `*Tidak ada laporan insiden darurat atau SOS yang tercatat selama event ini.*\n\n`;
    } else {
      md += `| Waktu | Rider | Jenis | Pesan / Keterangan | Koordinat | Status Penanganan |\n`;
      md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
      alerts.forEach(a => {
        const time = a.created_at ? a.created_at.replace('T', ' ').slice(0, 19) : '—';
        const coords = a.latitude && a.longitude ? `${Number(a.latitude).toFixed(5)}, ${Number(a.longitude).toFixed(5)}` : '—';
        md += `| ${time} | #${a.bib || '?'} ${a.rider_name || 'Rider'} | ${a.type} | ${a.message || '—'} | ${coords} | ${a.resolved ? 'Selesai' : 'Belum Selesai'} |\n`;
      });
      md += `\n`;
    }

    return md;
  }

  // Generate CSV for Rider Telemetry
  function generateCsvData(data) {
    const riders = data.riderLogs || [];
    let csv = `BIB,Nama Rider,Peran,Total Titik,Jeda Terlama (Menit),Interval Kirim (Detik),Kecepatan Rata2 (km/h),Kecepatan Maks (km/h),Jarak Max (km),Status Sinyal\n`;
    riders.forEach(r => {
      const statusText = r.pings === 0 ? 'Tanpa Data' : (r.hasBlankSpot ? `Blank Spot (${r.longestGapMinutes}m)` : 'Lancar');
      const cleanName = `"${(r.name || '').replace(/"/g, '""')}"`;
      csv += `${r.bib},${cleanName},${r.role},${r.pings},${r.longestGapMinutes},${r.avgIntervalSeconds},${r.avgSpeed},${r.maxSpeed},${r.maxDistanceKm},"${statusText}"\n`;
    });
    return csv;
  }

  // Generate WhatsApp-Formatted Summary Text
  function generateWaSummary(data) {
    const ev = data.event || {};
    const kpi = data.kpi || {};
    const recs = data.recommendations || [];
    const score = kpi.healthScore || 100;
    const verdict = score >= 85 ? 'SIAP UNTUK EVENT BESAR' : (score >= 70 ? 'CUKUP SIAP (ADA CATATAN)' : 'PERLU EVALUASI SEBELUM EVENT');

    let wa = `🏁 *REKAP EVALUASI EVENT CYCLOPON*\n`;
    wa += `━━━━━━━━━━━━━━━━━━━━━\n`;
    wa += `📌 *Event:* ${ev.name || '-'}\n`;
    wa += `📅 *Tanggal:* ${ev.date || '-'}\n`;
    wa += `🎯 *Skor Kesiapan:* *${score}/100* (${verdict})\n\n`;

    wa += `📊 *Hasil Pantauan Lapangan:*\n`;
    wa += `• Total Titik GPS: *${kpi.totalPings?.toLocaleString() || 0} titik* (~${kpi.durationMinutes || 0} mnt)\n`;
    wa += `• Rider Terdeteksi: *${kpi.activeRidersWithPings || 0} dari ${kpi.totalRiders || 0} rider*\n`;
    wa += `• Insiden Blank Spot: *${kpi.totalBlankSpotIncidents || 0} kejadian*\n`;
    wa += `• Laporan Darurat SOS: *${kpi.totalAlerts || 0} laporan* (${kpi.unresolvedAlerts || 0} aktif)\n`;
    wa += `• Penonton Web: *${kpi.eventVisitors || 0} pengunjung unik*\n\n`;

    wa += `💡 *Temuan & Solusi Pencegahan Masalah:*\n`;
    if (!recs.length) {
      wa += `_Tidak ada kendala berarti. Sinyal dan server stabil._\n`;
    } else {
      recs.forEach((r, idx) => {
        wa += `${idx + 1}. *[${r.category}]* ${r.title}\n`;
        wa += `   👉 *Solusi:* ${r.action}\n`;
      });
    }

    wa += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    wa += `_Dokumen rekap resmi (PDF & CSV) dapat diunduh di Panel Admin CycloPon._`;
    return wa;
  }

  // Initial load
  loadEventsList();
}
