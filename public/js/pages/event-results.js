/**
 * CycloPon Official Event Results & Digital Brevet Certificate Page (/events/:id/results)
 */

async function renderEventResults(params) {
  const eventId = params.id || params.eventId;
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="results-container">
      <div style="text-align:center;padding:60px 20px;color:var(--text-secondary)">
        <div style="font-size:32px;margin-bottom:12px">⏳</div>
        <div>Memuat Rekapitulasi Hasil Resmi Event...</div>
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

          <!-- Header -->
          <div class="results-header">
            <div class="results-title-group">
              <a href="/watch/${event.id}" data-link class="results-back-btn" title="Kembali ke Live Map">←</a>
              <div>
                <h1 class="results-title">
                  <span>🏆</span>
                  <span>Hasil Resmi: ${event.name}</span>
                </h1>
                <div class="results-event-subtitle">
                  📅 Tanggal: ${event.date} • Total Peserta Terdaftar: ${summary.total_riders}
                </div>
              </div>
            </div>

            <div class="results-actions">
              <a href="/api/events/${event.id}/gpx/download" download class="btn btn-outline" style="font-size:13px;padding:9px 16px" title="Unduh File GPX Rute untuk Garmin / Wahoo / Hammerhead">
                📍 &nbsp;Unduh GPX
              </a>
              <a href="/api/events/${event.id}/export/csv" download class="btn btn-outline" style="font-size:13px;padding:9px 16px">
                📥 &nbsp;Unduh CSV
              </a>
              <a href="/watch/${event.id}" data-link class="btn btn-primary" style="font-size:13px;padding:9px 18px">
                🗺️ &nbsp;Live Map
              </a>
            </div>
          </div>

          <!-- Summary Metric Cards -->
          <div class="results-summary-grid">
            <div class="results-stat-card">
              <div class="results-stat-lbl">Total Starter</div>
              <div class="results-stat-num">${summary.total_riders}</div>
              <div class="results-stat-sub">Peserta Berangkat</div>
            </div>

            <div class="results-stat-card finishers">
              <div class="results-stat-lbl" style="color:var(--color-green)">Official Finisher</div>
              <div class="results-stat-num" style="color:var(--color-green)">${summary.finishers}</div>
              <div class="results-stat-sub">Lolos Semua Checkpoint</div>
            </div>

            <div class="results-stat-card over-cot">
              <div class="results-stat-lbl" style="color:var(--color-orange)">Over COT</div>
              <div class="results-stat-num" style="color:var(--color-orange)">${summary.over_cot}</div>
              <div class="results-stat-sub">Melebihi Batas Waktu Pos</div>
            </div>

            <div class="results-stat-card dnf">
              <div class="results-stat-lbl" style="color:var(--color-red)">Did Not Finish (DNF)</div>
              <div class="results-stat-num" style="color:var(--color-red)">${summary.dnf}</div>
              <div class="results-stat-sub">Evakuasi / Tidak Tuntas</div>
            </div>

            <div class="results-stat-card">
              <div class="results-stat-lbl">Finisher Rate</div>
              <div class="results-stat-num" style="color:var(--color-yellow)">${finisherRate}%</div>
              <div class="results-stat-sub">Persentase Sukses</div>
            </div>
          </div>

          <!-- Filter & Search Toolbar -->
          <div class="results-toolbar">
            <div class="results-search-box">
              <span class="results-search-icon">🔍</span>
              <input type="text" id="resultsSearchInput" class="results-search-input"
                     placeholder="Cari nama rider atau nomor BIB..." value="${searchQuery}">
            </div>

            <div class="results-filter-pills">
              <button class="results-pill ${currentFilter === 'ALL' ? 'active' : ''}" data-filter="ALL">
                Semua (${results.length})
              </button>
              <button class="results-pill ${currentFilter === 'FINISHER' ? 'active' : ''}" data-filter="FINISHER">
                Finisher (${summary.finishers})
              </button>
              <button class="results-pill ${currentFilter === 'OVER_COT' ? 'active' : ''}" data-filter="OVER_COT">
                Over COT (${summary.over_cot})
              </button>
              <button class="results-pill ${currentFilter === 'DNF' ? 'active' : ''}" data-filter="DNF">
                DNF (${summary.dnf})
              </button>
            </div>
          </div>

          <!-- Leaderboard Table -->
          <div class="results-table-card">
            <table class="results-table">
              <thead>
                <tr>
                  <th style="width:60px">Rank</th>
                  <th style="width:80px">BIB</th>
                  <th>Nama Rider</th>
                  <th style="width:120px">Status</th>
                  <th style="width:110px">Total Waktu</th>
                  <th style="width:90px">Jarak</th>
                  <th style="width:100px">Kecepatan</th>
                  <th style="width:110px">Checkpoint</th>
                  <th style="width:130px;text-align:right">Sertifikat</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.length === 0 ? `
                  <tr>
                    <td colspan="9" style="text-align:center;padding:40px;color:var(--text-secondary)">
                      Tidak ada hasil yang sesuai dengan filter pencarian.
                    </td>
                  </tr>
                ` : filtered.map(r => `
                  <tr>
                    <td>
                      <span class="rank-badge ${r.rank === 1 ? 'rank-1' : r.rank === 2 ? 'rank-2' : r.rank === 3 ? 'rank-3' : 'rank-other'}">
                        ${r.rank}
                      </span>
                    </td>
                    <td>
                      <strong style="color:var(--color-yellow);font-size:14px">#${r.bib}</strong>
                    </td>
                    <td>
                      <div style="display:flex;align-items:center;gap:8px">
                        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${r.color || '#D1A980'}"></span>
                        <strong style="color:var(--text-primary);font-size:14px">${r.name}</strong>
                      </div>
                    </td>
                    <td>
                      <span class="badge-status ${r.status === 'FINISHER' ? 'badge-finisher' : r.status === 'OVER_COT' ? 'badge-over-cot' : 'badge-dnf'}">
                        ${r.status === 'FINISHER' ? '✓ FINISHER' : r.status === 'OVER_COT' ? '⚠️ OVER COT' : '⛔ DNF'}
                      </span>
                    </td>
                    <td>
                      <span style="font-family:monospace;font-size:13px;font-weight:700;color:var(--text-primary)">
                        ${r.elapsed_time}
                      </span>
                    </td>
                    <td>
                      <span style="color:var(--text-secondary);font-weight:600">${r.distance_km} km</span>
                    </td>
                    <td>
                      <span style="color:var(--text-secondary);font-weight:600">${r.avg_speed} km/h</span>
                    </td>
                    <td>
                      <span style="font-weight:700;color:${r.checkpoints_cleared >= r.total_checkpoints && r.total_checkpoints > 0 ? 'var(--color-green)' : 'var(--text-secondary)'}">
                        ${r.checkpoints_cleared} / ${r.total_checkpoints} CP
                      </span>
                    </td>
                    <td style="text-align:right">
                      <button class="btn-cert btn-open-cert" data-rider-id="${r.rider_id}">
                        <span>📜</span>
                        <span>Sertifikat</span>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

        </div>

        <!-- Certificate Modal Container -->
        <div id="certModalOverlay" class="certificate-modal-overlay" style="display:none">
          <div class="certificate-modal-container">
            <div class="certificate-actions-bar">
              <span style="font-size:13px;font-weight:600;color:var(--text-secondary)">Pratinjau Sertifikat Finisher Resmi CycloPon</span>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button id="btnSaveCertImg" class="btn btn-primary" style="font-size:12px;padding:8px 14px">
                  📸 &nbsp;Simpan Gambar (PNG)
                </button>
                <button id="btnShareCert" class="btn btn-outline" style="font-size:12px;padding:8px 14px">
                  📲 &nbsp;Bagikan (Medsos)
                </button>
                <button id="btnPrintCert" class="btn btn-outline" style="font-size:12px;padding:8px 14px">
                  🖨️ &nbsp;Cetak / PDF
                </button>
                <button id="btnCloseCertModal" class="btn btn-outline" style="font-size:12px;padding:8px 14px">
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
          // Restore focus & cursor to end of input
          const newEl = document.getElementById('resultsSearchInput');
          if (newEl) {
            newEl.focus();
            newEl.setSelectionRange(searchQuery.length, searchQuery.length);
          }
        });
      }

      // ── Filter pills handler ──
      document.querySelectorAll('.results-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          currentFilter = btn.dataset.filter;
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
        btn.addEventListener('click', () => {
          const rId = Number(btn.dataset.riderId);
          const r = results.find(item => item.rider_id === rId);
          if (!r) return;
          currentRiderForCert = r;

          certBody.innerHTML = `
            <div class="cert-seal">
              <span class="cert-seal-icon">🚴</span>
              <span class="cert-seal-text">VERIFIED</span>
            </div>

            <div class="cert-header-title">OFFICIAL BREVET CERTIFICATE</div>
            <h2 class="cert-main-title">${event.name}</h2>
            <div class="cert-subtitle">
              Sertifikat resmi tanda kelulusan dan keberhasilan menyelesaikan seluruh rute event bersepeda jarak jauh (Brevet / Gran Fondo) sesuai regulasi Cut-Off Time resmi.
            </div>

            <div class="cert-recipient-label">Diberikan Kepada Pesepeda:</div>
            <div class="cert-rider-name">${r.name}</div>
            <div class="cert-bib-tag">NOMOR BIB: #${r.bib}</div>

            <div class="cert-metrics-row">
              <div class="cert-metric-box">
                <div class="cert-metric-lbl">Total Waktu Tempuh</div>
                <div class="cert-metric-val" style="color:var(--color-yellow)">${r.elapsed_time}</div>
              </div>
              <div class="cert-metric-box">
                <div class="cert-metric-lbl">Total Jarak Rute</div>
                <div class="cert-metric-val">${r.distance_km} km</div>
              </div>
              <div class="cert-metric-box">
                <div class="cert-metric-lbl">Kecepatan Rata-rata</div>
                <div class="cert-metric-val">${r.avg_speed} km/h</div>
              </div>
              <div class="cert-metric-box">
                <div class="cert-metric-lbl">Peringkat Finisher</div>
                <div class="cert-metric-val" style="color:var(--color-green)">Rank #${r.rank}</div>
              </div>
            </div>

            ${r.splits && r.splits.length > 0 ? `
              <div class="cert-stamps-group">
                <div class="cert-stamps-title">Verifikasi Cap Pos / Checkpoint Resmi:</div>
                <div class="cert-stamps-list">
                  ${r.splits.map(s => `
                    <div class="cert-stamp-badge">
                      <span>✓</span>
                      <span>${s.checkpoint_name || 'CP'} (${s.arrival_time})</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <div class="cert-footer-row">
              <div class="cert-signature-box">
                <div class="cert-sign-title">Tanggal Penyelenggaraan:</div>
                <div class="cert-sign-name">${event.date}</div>
              </div>

              <div class="cert-verification-stamp">
                ✓ CYCLOPON AUDITED
              </div>

              <div class="cert-signature-box" style="text-align:right">
                <div class="cert-sign-title">Race Director & Homologation:</div>
                <div class="cert-sign-name">Panitia Event Resmi</div>
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
          backgroundColor: '#FAF7F2',
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

            const shareData = {
              title: `Sertifikat Finisher: ${event.name}`,
              text: `Alhamdulillah resmi menyelesaikan ${event.name} (${currentRiderForCert.distance_km} km) dengan catatan waktu ${currentRiderForCert.elapsed_time}! 🚴🏅\n#CycloPon #Finisher #BIB${currentRiderForCert.bib}`,
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
        <h2 style="font-size:20px;font-weight:800;margin-bottom:8px">Gagal Memuat Hasil Event</h2>
        <p style="color:var(--text-secondary);margin-bottom:24px">${err.message}</p>
        <a href="/" data-link class="btn btn-outline">← Kembali ke Beranda</a>
      </div>
    `;
  }
}
