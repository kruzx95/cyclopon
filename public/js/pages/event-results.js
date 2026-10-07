/**
 * CycloPon Official Event Results & Digital Brevet Certificate Page (/events/:id/results)
 * Athletic Minimalist Pro Aesthetic (Rapha / Pas Normal Studios / Strava PRO)
 */

async function renderEventResults(params) {
  const eventId = params.id || params.eventId;
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="results-container">
      <div style="text-align:center;padding:70px 20px;color:var(--text-secondary)">
        <div style="font-size:36px;margin-bottom:14px;animation:spin 1.5s linear infinite">⏳</div>
        <div style="font-weight:700;font-size:15px;letter-spacing:0.02em;color:var(--text-primary)">
          Memuat Rekapitulasi Hasil Resmi Event...
        </div>
      </div>
    </div>
  `;

  try {
    const res = await fetch(`/api/events/${eventId}/results`);
    if (!res.ok) throw new Error('Event tidak ditemukan');

    const data = await res.json();
    const { event, results, summary } = data;

    const finisherRate = summary.total_riders > 0
      ? Math.round((summary.finishers / summary.total_riders) * 100)
      : 0;

    let currentFilter = 'ALL';
    let searchQuery = '';
    const expandedRiderIds = new Set();

    function renderView() {
      // Filter & search logic
      const filtered = results.filter(r => {
        const matchesFilter =
          currentFilter === 'ALL' ? true :
          currentFilter === 'FINISHER' ? r.status === 'FINISHER' :
          currentFilter === 'OVER_COT' ? r.status === 'OVER_COT' :
          currentFilter === 'DNF' ? r.status === 'DNF' : true;

        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = !q || r.name.toLowerCase().includes(q) || String(r.bib).toLowerCase().includes(q);

        return matchesFilter && matchesSearch;
      });

      app.innerHTML = `
        <div class="results-container">

          <!-- Micro Tag Header -->
          <div class="results-micro-tag">
            <span>// OFFICIAL CLASSIFICATION · DIGITAL BREVET HOMOLOGATION MATRIX</span>
            <span class="results-live-dot"></span>
          </div>

          <!-- Header -->
          <div class="results-header">
            <div class="results-title-group">
              <a href="/watch/${event.id}" data-link class="results-back-btn" title="Kembali ke Live Map">
                ←
              </a>
              <div>
                <h1 class="results-title">
                  <span>Hasil Resmi: ${event.name}</span>
                </h1>
                <div class="results-event-subtitle">
                  <span class="results-sub-pill">📅 ${event.date}</span>
                  <span class="results-sub-pill">🚴 Starter: <strong>${summary.total_riders}</strong></span>
                  <span class="results-sub-pill success">🏅 Finisher: <strong>${summary.finishers}</strong> (${finisherRate}%)</span>
                </div>
              </div>
            </div>

            <div class="results-actions">
              <a href="/api/events/${event.id}/gpx/download" download class="btn btn-outline" style="font-size:13px;padding:9px 16px" title="Unduh File GPX Rute">
                📍 &nbsp;Unduh GPX
              </a>
              <a href="/api/events/${event.id}/export/csv" download class="btn btn-outline" style="font-size:13px;padding:9px 16px" title="Ekspor Data Hasil Klasifikasi ke File CSV">
                📥 &nbsp;Unduh CSV
              </a>
              <a href="/watch/${event.id}" data-link class="btn btn-primary" style="font-size:13px;padding:9px 18px" title="Buka Pantauan Live Map">
                🗺️ &nbsp;Live Map
              </a>
            </div>
          </div>

          <!-- Summary Metric Cards (5 Cards) -->
          <div class="results-summary-grid">
            <div class="results-stat-card">
              <div class="results-stat-lbl">Total Starter</div>
              <div class="results-stat-num">${summary.total_riders}</div>
              <div class="results-stat-sub">Peserta Berangkat</div>
            </div>

            <div class="results-stat-card finishers">
              <div class="results-stat-lbl" style="color:var(--color-green)">Official Finisher</div>
              <div class="results-stat-num" style="color:var(--color-green)">${summary.finishers}</div>
              <div class="results-stat-sub">Lolos Seluruh Pos COT</div>
            </div>

            <div class="results-stat-card over-cot">
              <div class="results-stat-lbl" style="color:var(--color-orange)">Over COT</div>
              <div class="results-stat-num" style="color:var(--color-orange)">${summary.over_cot}</div>
              <div class="results-stat-sub">Melebihi Batas Waktu Pos</div>
            </div>

            <div class="results-stat-card dnf">
              <div class="results-stat-lbl" style="color:var(--color-red)">Did Not Finish (DNF)</div>
              <div class="results-stat-num" style="color:var(--color-red)">${summary.dnf}</div>
              <div class="results-stat-sub">Evakuasi / Berhenti</div>
            </div>

            <div class="results-stat-card rate">
              <div class="results-stat-lbl">Finisher Rate</div>
              <div class="results-stat-num">${finisherRate}%</div>
              <div class="results-stat-sub">Tingkat Keberhasilan</div>
            </div>
          </div>

          <!-- Filter & Search Toolbar -->
          <div class="results-toolbar">
            <div class="results-search-box">
              <span class="results-search-icon">🔍</span>
              <input type="text" id="resultsSearchInput" class="results-search-input"
                     placeholder="Cari nama rider atau nomor BIB..." value="${searchQuery}">
              ${searchQuery ? `<button id="btnClearSearch" class="results-search-clear" title="Hapus Pencarian">✕</button>` : ''}
            </div>

            <div class="results-filter-pills">
              <button class="results-pill ${currentFilter === 'ALL' ? 'active' : ''}" data-filter="ALL">
                <span>SEMUA</span>
                <span class="pill-count">${results.length}</span>
              </button>
              <button class="results-pill ${currentFilter === 'FINISHER' ? 'active' : ''}" data-filter="FINISHER">
                <span>FINISHER</span>
                <span class="pill-count">${summary.finishers}</span>
              </button>
              <button class="results-pill ${currentFilter === 'OVER_COT' ? 'active' : ''}" data-filter="OVER_COT">
                <span>OVER COT</span>
                <span class="pill-count">${summary.over_cot}</span>
              </button>
              <button class="results-pill ${currentFilter === 'DNF' ? 'active' : ''}" data-filter="DNF">
                <span>DNF</span>
                <span class="pill-count">${summary.dnf}</span>
              </button>
            </div>
          </div>

          <!-- Leaderboard Table -->
          <div class="results-table-card">
            <table class="results-table">
              <thead>
                <tr>
                  <th style="width:70px">RANK</th>
                  <th style="width:90px">BIB</th>
                  <th>PESEPEDA</th>
                  <th style="width:130px">STATUS</th>
                  <th style="width:120px">WAKTU TEMPUH</th>
                  <th style="width:95px">JARAK</th>
                  <th style="width:105px">KECEPATAN</th>
                  <th style="width:140px">CHECKPOINT</th>
                  <th style="width:130px;text-align:right">SERTIFIKAT</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.length === 0 ? `
                  <tr>
                    <td colspan="9" style="text-align:center;padding:50px 20px;color:var(--text-secondary)">
                      <div style="font-size:24px;margin-bottom:8px">🔍</div>
                      <div style="font-weight:700;color:var(--text-primary)">Tidak ada hasil yang sesuai dengan kriteria pencarian</div>
                      <div style="font-size:12px;margin-top:4px">Coba sesuaikan kata kunci nama atau filter status di atas.</div>
                    </td>
                  </tr>
                ` : filtered.map(r => {
                  const isExpanded = expandedRiderIds.has(r.rider_id);
                  const hasSplits = r.splits && r.splits.length > 0;
                  return `
                    <tr class="results-row ${isExpanded ? 'expanded' : ''}" data-rider-id="${r.rider_id}">
                      <td>
                        <span class="rank-badge ${r.rank === 1 ? 'rank-1' : r.rank === 2 ? 'rank-2' : r.rank === 3 ? 'rank-3' : 'rank-other'}">
                          ${r.rank === 1 ? '01' : r.rank === 2 ? '02' : r.rank === 3 ? '03' : String(r.rank).padStart(2, '0')}
                        </span>
                      </td>
                      <td>
                        <span class="bib-chip">#${r.bib}</span>
                      </td>
                      <td>
                        <div class="rider-name-cell">
                          <span class="rider-color-dot" style="background:${r.color || '#0D1117'}"></span>
                          <span class="rider-name-text">${r.name}</span>
                        </div>
                      </td>
                      <td>
                        <span class="badge-status ${r.status === 'FINISHER' ? 'badge-finisher' : r.status === 'OVER_COT' ? 'badge-over-cot' : 'badge-dnf'}">
                          ${r.status === 'FINISHER' ? '● FINISHER' : r.status === 'OVER_COT' ? '▲ OVER COT' : '✕ DNF'}
                        </span>
                      </td>
                      <td>
                        <span class="mono-stat time-val">
                          ${r.elapsed_time}
                        </span>
                      </td>
                      <td>
                        <span class="mono-stat secondary">
                          ${r.distance_km} km
                        </span>
                      </td>
                      <td>
                        <span class="mono-stat secondary">
                          ${r.avg_speed} km/h
                        </span>
                      </td>
                      <td>
                        <button class="btn-toggle-split" data-rider-id="${r.rider_id}" title="Klik untuk melihat rincian split waktu checkpoint">
                          <span class="cp-count ${r.checkpoints_cleared >= r.total_checkpoints && r.total_checkpoints > 0 ? 'cleared' : ''}">
                            ${r.checkpoints_cleared} / ${r.total_checkpoints} CP
                          </span>
                          <span class="split-arrow ${isExpanded ? 'open' : ''}">▾</span>
                        </button>
                      </td>
                      <td style="text-align:right">
                        <button class="btn-cert btn-open-cert" data-rider-id="${r.rider_id}">
                          <span>📜</span>
                          <span>Sertifikat</span>
                        </button>
                      </td>
                    </tr>
                    ${isExpanded ? `
                      <tr class="split-details-row">
                        <td colspan="9">
                          <div class="split-details-card">
                            <div class="split-details-header">
                              <span class="split-details-title">// RINCIAN SPLIT CHECKPOINT & CUT-OFF TIME (COT) · #${r.bib} ${r.name}</span>
                              <span class="split-details-meta">${r.checkpoints_cleared} dari ${r.total_checkpoints} Pos Selesai</span>
                            </div>
                            ${!hasSplits ? `
                              <div class="split-empty-msg">
                                Belum ada rekaman waktu pos kontrol untuk peserta ini.
                              </div>
                            ` : `
                              <div class="split-timeline-grid">
                                ${r.splits.map((s, sIdx) => `
                                  <div class="split-item ${s.status === 'OVER_COT' ? 'over-cot' : 'cleared'}">
                                    <div class="split-item-badge">CP ${sIdx + 1}</div>
                                    <div class="split-item-name">${s.checkpoint_name || 'Pos Kontrol'}</div>
                                    <div class="split-item-km">${s.checkpoint_km ? s.checkpoint_km + ' KM' : '-- KM'}</div>
                                    <div class="split-item-time">
                                      <span class="lbl">Tiba:</span>
                                      <span class="val">${s.arrival_time || '--:--'}</span>
                                    </div>
                                    <div class="split-item-cot">
                                      <span class="lbl">Batas COT:</span>
                                      <span class="val">${s.checkpoint_cot || '--:--'}</span>
                                    </div>
                                    <div class="split-item-status">
                                      ${s.status === 'OVER_COT' ? '⚠️ MELEBIHI COT' : '✓ LOLOS COT'}
                                    </div>
                                  </div>
                                `).join('')}
                              </div>
                            `}
                          </div>
                        </td>
                      </tr>
                    ` : ''}
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

        </div>

        <!-- Certificate Modal Container -->
        <div id="certModalOverlay" class="certificate-modal-overlay" style="display:none">
          <div class="certificate-modal-container">
            <div class="certificate-actions-bar">
              <div class="certificate-actions-title">
                <span class="cert-bar-tag">// DIGITAL HOMOLOGATION PASS</span>
                <span class="cert-bar-name">Pratinjau Sertifikat Resmi</span>
              </div>
              <div class="certificate-actions-buttons">
                <button id="btnSaveCertImg" class="btn btn-primary" style="font-size:12.5px;padding:8px 16px">
                  📸 &nbsp;Simpan Gambar (PNG)
                </button>
                <button id="btnShareCert" class="btn btn-outline" style="font-size:12.5px;padding:8px 16px">
                  📲 &nbsp;Bagikan (Medsos)
                </button>
                <button id="btnPrintCert" class="btn btn-outline" style="font-size:12.5px;padding:8px 16px">
                  🖨️ &nbsp;Cetak / PDF
                </button>
                <button id="btnCloseCertModal" class="btn btn-outline" style="font-size:12.5px;padding:8px 16px">
                  ✕ Tutup
                </button>
              </div>
            </div>

            <!-- Printable Certificate Body -->
            <div id="certificateBody" class="brevet-certificate">
              <!-- Dynamically populated -->
            </div>
          </div>
        </div>
      `;

      // ── Search handler ──
      const searchInput = document.getElementById('resultsSearchInput');
      if (searchInput) {
        searchInput.addEventListener('input', e => {
          searchQuery = e.target.value;
          renderView();
          const newEl = document.getElementById('resultsSearchInput');
          if (newEl) {
            newEl.focus();
            newEl.setSelectionRange(searchQuery.length, searchQuery.length);
          }
        });
      }

      const btnClearSearch = document.getElementById('btnClearSearch');
      if (btnClearSearch) {
        btnClearSearch.addEventListener('click', () => {
          searchQuery = '';
          renderView();
          const newEl = document.getElementById('resultsSearchInput');
          if (newEl) newEl.focus();
        });
      }

      // ── Filter pills handler ──
      document.querySelectorAll('.results-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          currentFilter = btn.dataset.filter;
          renderView();
        });
      });

      // ── Checkpoint Split Accordion Toggle ──
      document.querySelectorAll('.btn-toggle-split').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const rId = Number(btn.dataset.riderId);
          if (expandedRiderIds.has(rId)) {
            expandedRiderIds.delete(rId);
          } else {
            expandedRiderIds.add(rId);
          }
          renderView();
        });
      });

      // ── Certificate Modal Logic ──
      const modal = document.getElementById('certModalOverlay');
      const certBody = document.getElementById('certificateBody');
      const btnClose = document.getElementById('btnCloseCertModal');
      const btnPrint = document.getElementById('btnPrintCert');

      let currentRiderForCert = null;

      document.querySelectorAll('.btn-open-cert').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const rId = Number(btn.dataset.riderId);
          const r = results.find(item => item.rider_id === rId);
          if (!r) return;
          currentRiderForCert = r;

          const isFinisher = r.status === 'FINISHER';
          const homologationNum = `BRM-${String(event.id).padStart(2, '0')}-${String(r.bib).padStart(3, '0')}`;

          certBody.innerHTML = `
            <!-- Corner Registration Marks -->
            <div class="cert-corner-mark top-left">+</div>
            <div class="cert-corner-mark top-right">+</div>
            <div class="cert-corner-mark bottom-left">+</div>
            <div class="cert-corner-mark bottom-right">+</div>

            <div class="cert-inner-border">
              <!-- Header Brand & Seal -->
              <div class="cert-top-bar" style="display:flex;align-items:center;justify-content:space-between">
                <div style="display:flex;align-items:center;gap:8px">
                  <img src="/icons/logo-emblem-dark.svg" alt="CYCLOPON" width="22" height="22">
                  <div class="cert-organization-tag">
                    // CYCLOPON OFFICIAL TIMEKEEPING & HOMOLOGATION
                  </div>
                </div>
                <div class="cert-homologation-num">
                  HOMOLOGATION N° <strong>${homologationNum}</strong>
                </div>
              </div>

              <!-- Main Titles -->
              <div class="cert-seal-badge">
                <span class="cert-seal-badge-icon">${isFinisher ? '✓' : '●'}</span>
                <span class="cert-seal-badge-text">${isFinisher ? 'AUDITED FINISHER' : 'PARTICIPANT'}</span>
              </div>

              <div class="cert-header-title">
                ${isFinisher ? 'OFFICIAL BREVET CERTIFICATE' : 'CERTIFICATE OF PARTICIPATION'}
              </div>

              <h2 class="cert-main-title">${event.name}</h2>
              <div class="cert-subtitle">
                ${isFinisher 
                  ? 'Sertifikat resmi tanda kelulusan dan keberhasilan menyelesaikan seluruh rute event bersepeda jarak jauh (Brevet / Audax / Gran Fondo) sesuai regulasi Cut-Off Time resmi.'
                  : 'Sertifikat resmi tanda keikutsertaan dan ketangguhan dalam menyelesaikan tantangan rute event bersepeda jarak jauh CycloPon.'}
              </div>

              <!-- Recipient -->
              <div class="cert-recipient-section">
                <div class="cert-recipient-label">DIANUGERAHKAN KEPADA PESEPEDA:</div>
                <div class="cert-rider-name">${r.name}</div>
                <div class="cert-bib-tag">
                  <span>NOMOR BIB:</span>
                  <strong>#${r.bib}</strong>
                </div>
              </div>

              <!-- Metrics Grid (4 Cells) -->
              <div class="cert-metrics-row">
                <div class="cert-metric-box">
                  <div class="cert-metric-lbl">Waktu Tempuh Resmi</div>
                  <div class="cert-metric-val">${r.elapsed_time}</div>
                </div>
                <div class="cert-metric-box">
                  <div class="cert-metric-lbl">Jarak Tempuh Rute</div>
                  <div class="cert-metric-val">${r.distance_km} km</div>
                </div>
                <div class="cert-metric-box">
                  <div class="cert-metric-lbl">Kecepatan Rata-rata</div>
                  <div class="cert-metric-val">${r.avg_speed} km/h</div>
                </div>
                <div class="cert-metric-box">
                  <div class="cert-metric-lbl">Peringkat Klasifikasi</div>
                  <div class="cert-metric-val rank-val">Rank #${r.rank}</div>
                </div>
              </div>

              <!-- Checkpoint Verification Stamps -->
              ${r.splits && r.splits.length > 0 ? `
                <div class="cert-stamps-group">
                  <div class="cert-stamps-title">// VERIFIKASI CAP POS / CHECKPOINT RESMI:</div>
                  <div class="cert-stamps-list">
                    ${r.splits.map(s => `
                      <div class="cert-stamp-badge ${s.status === 'OVER_COT' ? 'over-cot' : ''}">
                        <div class="stamp-check">${s.status === 'OVER_COT' ? '⚠️' : '✓'}</div>
                        <div class="stamp-info">
                          <div class="stamp-name">${s.checkpoint_name || 'CP'}</div>
                          <div class="stamp-time">${s.checkpoint_km ? s.checkpoint_km + ' KM · ' : ''}${s.arrival_time}</div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              <!-- Signatures & Homologation Stamp Footer -->
              <div class="cert-footer-row">
                <div class="cert-signature-box">
                  <div class="cert-sign-title">Tanggal Pelaksanaan:</div>
                  <div class="cert-sign-name">${event.date}</div>
                </div>

                <div class="cert-verification-stamp ${isFinisher ? 'finisher' : ''}">
                  <img src="/icons/logo-emblem-dark.svg" alt="CYCLOPON" width="26" height="26" style="opacity:0.85;margin-bottom:2px">
                  <span class="stamp-main">✓ CYCLOPON AUDITED</span>
                  <span class="stamp-sub">HOMOLOGATION VERIFIED</span>
                </div>

                <div class="cert-signature-box" style="text-align:right">
                  <div class="cert-sign-title">Race Director & Homologation:</div>
                  <div class="cert-sign-name">Komisioner Event Resmi</div>
                </div>
              </div>

            </div>
          `;

          modal.style.display = 'flex';
        });
      });

      // ── Helper to render certificate to image Blob ──
      async function generateCertificateBlob() {
        await loadScript('/js/libs/html2canvas.min.js');
        if (typeof window.html2canvas !== 'function') {
          throw new Error('Modul html2canvas belum dimuat.');
        }

        const canvas = await window.html2canvas(certBody, {
          scale: 2, // 2x high resolution for retina crispness
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#FAF9F6',
          logging: false
        });

        return new Promise((resolve, reject) => {
          canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('Gagal menghasilkan file gambar'));
          }, 'image/png', 1.0);
        });
      }

      // ── Simpan Gambar (PNG) Button ──
      const btnSaveImg = document.getElementById('btnSaveCertImg');
      if (btnSaveImg) {
        btnSaveImg.addEventListener('click', async () => {
          if (!currentRiderForCert) return;
          const origHtml = btnSaveImg.innerHTML;
          btnSaveImg.disabled = true;
          btnSaveImg.innerHTML = '⏳ Menyiapkan PNG...';

          try {
            const blob = await generateCertificateBlob();
            const safeRiderName = (currentRiderForCert.name || 'Rider').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
            const safeEventName = (event.name || 'Event').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
            const fileName = `Sertifikat_${safeEventName}_BIB${currentRiderForCert.bib}_${safeRiderName}.png`;

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);

            showToast('✓ Sertifikat berhasil disimpan sebagai gambar PNG!', 'success');
          } catch (err) {
            console.error('Save certificate error:', err);
            showToast('Gagal menyimpan gambar: ' + err.message, 'error');
          } finally {
            btnSaveImg.disabled = false;
            btnSaveImg.innerHTML = origHtml;
          }
        });
      }

      // ── Bagikan (Medsos) Button ──
      const btnShare = document.getElementById('btnShareCert');
      if (btnShare) {
        btnShare.addEventListener('click', async () => {
          if (!currentRiderForCert) return;
          const origHtml = btnShare.innerHTML;
          btnShare.disabled = true;
          btnShare.innerHTML = '⏳ Menyiapkan...';

          try {
            const blob = await generateCertificateBlob();
            const safeRiderName = (currentRiderForCert.name || 'Rider').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
            const safeEventName = (event.name || 'Event').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
            const fileName = `Sertifikat_${safeEventName}_BIB${currentRiderForCert.bib}_${safeRiderName}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });

            const isFinisher = currentRiderForCert.status === 'FINISHER';
            const shareText = isFinisher
              ? `Resmi menyelesaikan ${event.name} (${currentRiderForCert.distance_km} km) dengan catatan waktu ${currentRiderForCert.elapsed_time}! 🚴🏅\n#CycloPon #Finisher #BIB${currentRiderForCert.bib}`
              : `Menyelesaikan rute ${event.name} (${currentRiderForCert.distance_km} km)! 🚴\n#CycloPon #BIB${currentRiderForCert.bib}`;

            const shareData = {
              title: `Sertifikat Resmi: ${event.name}`,
              text: shareText
            };

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                ...shareData,
                files: [file]
              });
              showToast('Berhasil membuka menu berbagi medsos!', 'success');
            } else if (navigator.share) {
              await navigator.share({
                ...shareData,
                url: window.location.href
              });
              showToast('Tautan berhasil dibagikan!', 'success');
            } else {
              // Direct download fallback
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = fileName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setTimeout(() => URL.revokeObjectURL(url), 1000);

              if (navigator.clipboard) {
                await navigator.clipboard.writeText(`${shareData.text}\n${window.location.href}`);
                showToast('Gambar diunduh & teks ucapan disalin ke clipboard!', 'success');
              } else {
                showToast('Gambar sertifikat berhasil diunduh!', 'success');
              }
            }
          } catch (err) {
            if (err.name !== 'AbortError') {
              console.error('Share certificate error:', err);
              showToast('Gagal membagikan: ' + err.message, 'error');
            }
          } finally {
            btnShare.disabled = false;
            btnShare.innerHTML = origHtml;
          }
        });
      }

      if (btnClose) {
        btnClose.addEventListener('click', () => {
          modal.style.display = 'none';
        });
      }

      // Close modal on click outside
      modal.addEventListener('click', e => {
        if (e.target === modal) modal.style.display = 'none';
      });

      // Close on Escape key
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
          modal.style.display = 'none';
        }
      });

      if (btnPrint) {
        btnPrint.addEventListener('click', () => {
          window.print();
        });
      }
    }

    renderView();

  } catch (err) {
    app.innerHTML = `
      <div class="results-container" style="text-align:center;padding:80px 20px">
        <div style="font-size:48px;margin-bottom:16px">⚠️</div>
        <h2 style="font-size:20px;font-weight:900;letter-spacing:-0.02em;margin-bottom:8px">Gagal Memuat Hasil Event</h2>
        <p style="color:var(--text-secondary);margin-bottom:24px">${err.message}</p>
        <a href="/" data-link class="btn btn-outline">← Kembali ke Beranda</a>
      </div>
    `;
  }
}
