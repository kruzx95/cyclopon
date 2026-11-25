'use strict';

const path = require('path');
const xlsx = require('./xlsx');

const REPORT_TITLE = 'LAPORAN PENDAFTARAN PESERTA - ALA-ALA ULTRA 2027';
const EVENT_TITLE = 'ALA-ALA ULTRA 2027';

function cleanStr(val, maxLen = 500) {
  if (val == null) return '';
  return String(val).trim().slice(0, maxLen);
}

function formatJakartaDateTime(val) {
  const date = val instanceof Date ? val : (() => {
    const raw = String(val || '').trim();
    if (!raw) return null;
    const iso = raw.includes('T') ? raw : `${raw.replace(' ', 'T')}Z`;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  })();
  if (!date) return cleanStr(val);
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(date);
    const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
    const hh = map.hour === '24' ? '00' : map.hour;
    return `${map.year}-${map.month}-${map.day} ${hh}:${map.minute} WIB`;
  } catch {
    return date.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  }
}

const COLORS = {
  ink: 'FF0F172A',
  inkSoft: 'FF1E293B',
  band: 'FF334155',
  bandAlt: 'FF475569',
  line: 'FFCBD5E1',
  lineSoft: 'FFE2E8F0',
  zebra: 'FFF1F5F9',
  muted: 'FF64748B',
  white: 'FFFFFFFF'
};

const GROUP_LABELS = [
  '1. REGISTRASI & STATUS',
  '2. VERIFIKASI & GRUP WHATSAPP',
  '3. DATA DIRI PESERTA',
  '4. KONTAK DARURAT',
  '5. SEPEDA & STRAVA',
  '6. KESELAMATAN & PERSETUJUAN',
  '7. PEMBAYARAN & CATATAN'
];

// Column order mirrors the registration table shown in Race Control.
const COLUMNS = [
  { key: 'no', label: 'No.', group: 0, width: 5, align: 'center' },
  { key: 'reg_code', label: 'Nomor Registrasi', group: 0, width: 19 },
  { key: 'created_at', label: 'Waktu Daftar (WIB)', group: 0, width: 21 },
  { key: 'registration_status', label: 'Status Pendaftaran', group: 0, width: 17 },
  { key: 'verify_data', label: 'Verifikasi Data', group: 1, width: 14, align: 'center' },
  { key: 'verify_strava', label: 'Verifikasi Strava', group: 1, width: 14, align: 'center' },
  { key: 'verify_payment', label: 'Verifikasi Pembayaran', group: 1, width: 17, align: 'center' },
  { key: 'wa_invite_status', label: 'Undangan Grup WA', group: 1, width: 16, align: 'center' },
  { key: 'wa_group_status', label: 'Status Grup WA', group: 1, width: 16, align: 'center' },
  { key: 'radar_sync', label: 'Sinkronisasi Radar', group: 1, width: 18, align: 'center' },
  { key: 'full_name', label: 'Nama Peserta', group: 2, width: 26 },
  { key: 'birth_date', label: 'Tanggal Lahir', group: 2, width: 13, align: 'center' },
  { key: 'gender', label: 'Jenis Kelamin', group: 2, width: 13, align: 'center' },
  { key: 'whatsapp', label: 'WhatsApp', group: 2, width: 17 },
  { key: 'email', label: 'Email', group: 2, width: 26 },
  { key: 'city', label: 'Kota/Kabupaten Domisili', group: 2, width: 24 },
  { key: 'instagram', label: 'Instagram', group: 2, width: 18 },
  { key: 'community', label: 'Komunitas Sepeda', group: 2, width: 22 },
  { key: 'emergency_name', label: 'Nama Kontak Darurat', group: 3, width: 22 },
  { key: 'emergency_relation', label: 'Hubungan Kontak Darurat', group: 3, width: 15 },
  { key: 'emergency_whatsapp', label: 'WhatsApp Kontak Darurat', group: 3, width: 18 },
  { key: 'bike_type', label: 'Jenis Sepeda', group: 4, width: 14 },
  { key: 'strava_profile_url', label: 'Profil Strava', group: 4, width: 38 },
  { key: 'strava_activity_url', label: 'Aktivitas Strava Terjauh', group: 4, width: 38 },
  { key: 'longest_distance_km', label: 'Jarak Terjauh (KM)', group: 4, width: 13, align: 'right', numFmt: '0.0' },
  { key: 'has_ultra_experience', label: 'Pernah Event Jarak Jauh', group: 4, width: 17, align: 'center' },
  { key: 'past_events', label: 'Nama Event Sebelumnya', group: 4, width: 26 },
  { key: 'bike_roadworthy', label: 'Sepeda Layak Jalan', group: 5, width: 14, align: 'center' },
  { key: 'has_helmet_gear', label: 'Helm & Perlengkapan', group: 5, width: 15, align: 'center' },
  { key: 'medical_conditions', label: 'Kondisi Kesehatan / Cedera', group: 5, width: 30 },
  { key: 'terms_agreed', label: 'Persetujuan Ketentuan', group: 5, width: 24 },
  { key: 'media_consent', label: 'Persetujuan Dokumentasi', group: 5, width: 20 },
  { key: 'payer_account_name', label: 'Pemilik Rekening Pengirim', group: 6, width: 24 },
  { key: 'payment_amount', label: 'Nominal Pembayaran (Rp)', group: 6, width: 18, align: 'right', numFmt: '"Rp" #,##0' },
  { key: 'payment_date', label: 'Tanggal Pembayaran', group: 6, width: 16, align: 'center' },
  { key: 'payment_proof', label: 'Berkas Bukti Transfer', group: 6, width: 28 },
  { key: 'admin_notes', label: 'Catatan Admin', group: 6, width: 30 }
];
function buildAlaUltraReport({ rows = [], cfg = {}, linkedEvent = null, exportedAt = new Date() } = {}) {
  const stats = rows.reduce((acc, r) => {
    const amount = Number(r.payment_amount) || 0;
    acc.totalAmount += amount;
    if (r.registration_status === 'Menunggu') acc.menunggu += 1;
    else if (r.registration_status === 'Disetujui') {
      acc.disetujui += 1;
      acc.approvedAmount += amount;
    } else if (r.registration_status === 'Ditolak') acc.ditolak += 1;
    if (r.wa_invite_status === 'Terkirim') acc.waTerkirim += 1;
    if (r.wa_group_status === 'Sudah Bergabung') acc.sudahGrup += 1;
    if (r.rider_id) acc.syncedRadar += 1;
    if (r.verify_data === 'Valid') acc.verifDataValid += 1;
    if (r.verify_strava === 'Valid') acc.verifStravaValid += 1;
    if (r.verify_payment === 'Valid') acc.verifPaymentValid += 1;
    return acc;
  }, {
    menunggu: 0,
    disetujui: 0,
    ditolak: 0,
    waTerkirim: 0,
    sudahGrup: 0,
    syncedRadar: 0,
    verifDataValid: 0,
    verifStravaValid: 0,
    verifPaymentValid: 0,
    approvedAmount: 0,
    totalAmount: 0
  });

  const quotaLabel = cfg.max_quota != null && Number(cfg.max_quota) > 0
    ? `${rows.length - stats.ditolak} / ${Number(cfg.max_quota)}`
    : 'Tidak Dibatasi';
  const eventLabel = linkedEvent ? `${linkedEvent.name} (#${linkedEvent.id})` : 'Belum Ditautkan';
  const feeAmount = cfg.fee_amount != null && cfg.fee_amount !== '' ? Number(cfg.fee_amount) : null;

  const records = rows.map((r, idx) => ({
    no: idx + 1,
    reg_code: cleanStr(r.reg_code),
    created_at: formatJakartaDateTime(r.created_at),
    registration_status: cleanStr(r.registration_status),
    verify_data: cleanStr(r.verify_data),
    verify_strava: cleanStr(r.verify_strava),
    verify_payment: cleanStr(r.verify_payment),
    wa_invite_status: cleanStr(r.wa_invite_status),
    wa_group_status: cleanStr(r.wa_group_status),
    radar_sync: r.rider_id ? `Sudah Sync (#${r.rider_id})` : 'Belum Sync',
    full_name: cleanStr(r.full_name),
    birth_date: cleanStr(r.birth_date),
    gender: cleanStr(r.gender),
    whatsapp: cleanStr(r.whatsapp),
    email: cleanStr(r.email),
    city: cleanStr(r.city),
    instagram: cleanStr(r.instagram),
    community: cleanStr(r.community),
    emergency_name: cleanStr(r.emergency_name),
    emergency_relation: cleanStr(r.emergency_relation),
    emergency_whatsapp: cleanStr(r.emergency_whatsapp),
    bike_type: cleanStr(r.bike_type),
    strava_profile_url: cleanStr(r.strava_profile_url, 800),
    strava_activity_url: cleanStr(r.strava_activity_url, 800),
    longest_distance_km: Number(r.longest_distance_km) || 0,
    has_ultra_experience: cleanStr(r.has_ultra_experience),
    past_events: cleanStr(r.past_events, 800),
    bike_roadworthy: cleanStr(r.bike_roadworthy),
    has_helmet_gear: cleanStr(r.has_helmet_gear),
    medical_conditions: cleanStr(r.medical_conditions, 800),
    terms_agreed: cleanStr(r.terms_agreed, 800),
    media_consent: cleanStr(r.media_consent),
    payer_account_name: cleanStr(r.payer_account_name),
    payment_amount: Number(r.payment_amount) || 0,
    payment_date: cleanStr(r.payment_date),
    payment_proof: cleanStr(r.payment_proof_original_name || (r.payment_proof_path ? path.basename(r.payment_proof_path) : ''), 800),
    admin_notes: cleanStr(r.admin_notes, 800)
  }));

  const groups = GROUP_LABELS.map((label, groupIndex) => {
    const indexes = COLUMNS.reduce((acc, col, i) => {
      if (col.group === groupIndex) acc.push(i);
      return acc;
    }, []);
    if (!indexes.length) return null;
    return { label, from: indexes[0], to: indexes[indexes.length - 1] };
  }).filter(Boolean);

  return {
    title: REPORT_TITLE,
    eventTitle: EVENT_TITLE,
    rows,
    stats,
    columns: COLUMNS,
    headers: COLUMNS.map(col => col.label),
    groups,
    records,
    quotaLabel,
    eventLabel,
    feeAmount,
    exportedAt,
    exportedAtLabel: formatJakartaDateTime(exportedAt)
  };
}
const THIN = { style: 'thin', color: COLORS.line };
const THIN_SOFT = { style: 'thin', color: COLORS.lineSoft };
const ALL_THIN = { all: THIN };
const ALL_SOFT = { all: THIN_SOFT };

const ST = {
  title: {
    font: { bold: true, size: 16, color: COLORS.white },
    fill: COLORS.ink,
    align: { horizontal: 'left', vertical: 'center' }
  },
  subtitle: {
    font: { bold: true, size: 12, color: COLORS.ink },
    align: { horizontal: 'left', vertical: 'center' }
  },
  tagline: {
    font: { size: 9, italic: true, color: COLORS.muted },
    align: { horizontal: 'left', vertical: 'center' }
  },
  section: {
    font: { bold: true, size: 10, color: COLORS.white },
    fill: COLORS.band,
    align: { horizontal: 'left', vertical: 'center' },
    border: ALL_SOFT
  },
  label: {
    font: { bold: true, size: 9.5, color: COLORS.inkSoft },
    align: { horizontal: 'left', vertical: 'center' },
    border: { bottom: THIN_SOFT }
  },
  value: {
    font: { size: 9.5, color: COLORS.ink },
    align: { horizontal: 'left', vertical: 'center' },
    border: { bottom: THIN_SOFT }
  },
  valueMoney: {
    font: { bold: true, size: 10, color: COLORS.ink },
    align: { horizontal: 'right', vertical: 'center' },
    border: { bottom: THIN_SOFT },
    numFmt: '"Rp" #,##0'
  },
  valueCount: {
    font: { bold: true, size: 10, color: COLORS.ink },
    align: { horizontal: 'right', vertical: 'center' },
    border: { bottom: THIN_SOFT },
    numFmt: '#,##0'
  },
  tableHead: {
    font: { bold: true, size: 9, color: COLORS.white },
    fill: COLORS.ink,
    align: { horizontal: 'center', vertical: 'center' },
    border: ALL_THIN
  },
  tableLabel: {
    font: { size: 9, color: COLORS.ink },
    fill: COLORS.white,
    align: { horizontal: 'left', vertical: 'center' },
    border: ALL_THIN
  },
  tableCount: {
    font: { size: 9, color: COLORS.ink },
    fill: COLORS.white,
    align: { horizontal: 'right', vertical: 'center' },
    border: ALL_THIN,
    numFmt: '#,##0'
  },
  tablePct: {
    font: { size: 9, color: COLORS.ink },
    fill: COLORS.white,
    align: { horizontal: 'right', vertical: 'center' },
    border: ALL_THIN,
    numFmt: '0.0%'
  },
  tableTotalLabel: {
    font: { bold: true, size: 9.5, color: COLORS.ink },
    fill: COLORS.lineSoft,
    align: { horizontal: 'left', vertical: 'center' },
    border: ALL_THIN
  },
  tableTotalCount: {
    font: { bold: true, size: 9.5, color: COLORS.ink },
    fill: COLORS.lineSoft,
    align: { horizontal: 'right', vertical: 'center' },
    border: ALL_THIN,
    numFmt: '#,##0'
  },
  tableTotalPct: {
    font: { bold: true, size: 9.5, color: COLORS.ink },
    fill: COLORS.lineSoft,
    align: { horizontal: 'right', vertical: 'center' },
    border: ALL_THIN,
    numFmt: '0.0%'
  },
  note: {
    font: { size: 9, color: COLORS.muted },
    fill: COLORS.zebra,
    align: { horizontal: 'left', vertical: 'top', wrapText: true },
    border: ALL_SOFT
  }
};
function addKeyValueRow(sheet, label, value, style) {
  const valueStyle = style ? { ...style, align: { horizontal: 'left', vertical: 'center' } } : ST.value;
  sheet.addRow({
    height: 20,
    merge: [1, 5],
    cells: [
      { value: label, style: ST.label },
      { value, style: valueStyle }
    ]
  });
}

function addSummarySheet(wb, report) {
  const sheet = wb.addSheet('Ringkasan', {
    columns: [{ width: 34 }, { width: 22 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }],
    print: {
      paperSize: 9,
      orientation: 'portrait',
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6 }
    },
    footer: '&L CycloPon Race Control&R Halaman &P dari &N'
  });

  const { stats } = report;
  const total = report.rows.length;

  sheet.addRow({ height: 36, merge: [0, 5], cells: [{ value: report.title, style: ST.title }] });
  sheet.addRow({ height: 24, merge: [0, 5], cells: [{ value: report.eventTitle, style: ST.subtitle }] });
  sheet.addRow({ height: 18, merge: [0, 5], cells: [{ value: 'Race Control · CycloPon — dokumen dihasilkan otomatis dari data pendaftaran', style: ST.tagline }] });
  sheet.addRow({ height: 8 });
  sheet.addRow({ height: 22, merge: [0, 5], cells: [{ value: 'INFORMASI LAPORAN', style: ST.section }] });

  addKeyValueRow(sheet, 'Tanggal Ekspor (WIB)', report.exportedAtLabel);
  addKeyValueRow(sheet, 'Event Terhubung', report.eventLabel);
  addKeyValueRow(sheet, 'Kuota Aktif', report.quotaLabel);
  addKeyValueRow(sheet, 'Total Pendaftar', total, ST.valueCount);

  sheet.addRow({ height: 8 });
  sheet.addRow({ height: 22, merge: [0, 5], cells: [{ value: 'RINGKASAN STATUS', style: ST.section }] });
  sheet.addRow({
    height: 20,
    cells: [
      { value: 'Status', style: ST.tableHead },
      { value: '', style: ST.tableHead },
      { value: 'Jumlah', style: ST.tableHead },
      { value: 'Porsi', style: ST.tableHead },
      { value: '', style: ST.tableHead },
      { value: '', style: ST.tableHead }
    ],
    merges: [[0, 1], [3, 5]]
  });

  const statusRows = [
    ['Menunggu Verifikasi', stats.menunggu],
    ['Disetujui', stats.disetujui],
    ['Ditolak', stats.ditolak]
  ];
  statusRows.forEach(([label, count], idx) => {
    const alt = idx % 2 === 1;
    const fill = alt ? COLORS.zebra : COLORS.white;
    sheet.addRow({
      height: 19,
      cells: [
        { value: label, style: { ...ST.tableLabel, fill } },
        { value: '', style: { ...ST.tableLabel, fill } },
        { value: count, style: { ...ST.tableCount, fill } },
        { value: total ? count / total : 0, style: { ...ST.tablePct, fill } },
        { value: '', style: { ...ST.tablePct, fill } },
        { value: '', style: { ...ST.tablePct, fill } }
      ],
      merges: [[0, 1], [3, 5]]
    });
  });
  sheet.addRow({
    height: 20,
    cells: [
      { value: 'Total', style: ST.tableTotalLabel },
      { value: '', style: ST.tableTotalLabel },
      { value: total, style: ST.tableTotalCount },
      { value: total ? 1 : 0, style: ST.tableTotalPct },
      { value: '', style: ST.tableTotalPct },
      { value: '', style: ST.tableTotalPct }
    ],
    merges: [[0, 1], [3, 5]]
  });

  sheet.addRow({ height: 8 });
  sheet.addRow({ height: 22, merge: [0, 5], cells: [{ value: 'RINGKASAN VERIFIKASI', style: ST.section }] });
  addKeyValueRow(sheet, 'Data Peserta Valid', stats.verifDataValid, ST.valueCount);
  addKeyValueRow(sheet, 'Profil Strava Valid', stats.verifStravaValid, ST.valueCount);
  addKeyValueRow(sheet, 'Bukti Pembayaran Valid', stats.verifPaymentValid, ST.valueCount);
  addKeyValueRow(sheet, 'Undangan Grup WA Terkirim', stats.waTerkirim, ST.valueCount);
  addKeyValueRow(sheet, 'Sudah Bergabung Grup WA', stats.sudahGrup, ST.valueCount);
  addKeyValueRow(sheet, 'Sudah Sync ke Radar', stats.syncedRadar, ST.valueCount);

  sheet.addRow({ height: 8 });
  sheet.addRow({ height: 22, merge: [0, 5], cells: [{ value: 'RINGKASAN PEMBAYARAN', style: ST.section }] });
  addKeyValueRow(sheet, 'Dana Disetujui', stats.approvedAmount, ST.valueMoney);
  addKeyValueRow(sheet, 'Total Dana Semua Entri', stats.totalAmount, ST.valueMoney);
  addKeyValueRow(
    sheet,
    'Biaya Pendaftaran',
    report.feeAmount != null ? report.feeAmount : '-',
    report.feeAmount != null ? ST.valueMoney : ST.value
  );

  sheet.addRow({ height: 8 });
  sheet.addRow({ height: 22, merge: [0, 5], cells: [{ value: 'KETERANGAN', style: ST.section }] });
  sheet.addRow({
    height: 72,
    merge: [0, 5],
    cells: [{
      value: 'Laporan ini dihasilkan otomatis oleh Race Control CycloPon. Data ditampilkan sesuai isian formulir peserta dan hasil verifikasi admin. Gunakan sheet "Data Peserta" untuk melihat rincian per peserta, lalu manfaatkan filter pada baris header untuk menyaring status pendaftaran, verifikasi, atau grup WhatsApp.',
      style: ST.note
    }]
  });
  sheet.addRow({ height: 8 });
  sheet.addRow({ height: 18, merge: [0, 5], cells: [{ value: `Dicetak: ${report.exportedAtLabel} · CycloPon Race Control`, style: ST.tagline }] });
}
Object.assign(ST, {
  dataTitle: {
    font: { bold: true, size: 14, color: COLORS.white },
    fill: COLORS.ink,
    align: { horizontal: 'left', vertical: 'center' }
  },
  groupBand: {
    font: { bold: true, size: 8.5, color: COLORS.white },
    fill: COLORS.band,
    align: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: ALL_THIN
  },
  header: {
    font: { bold: true, size: 8, color: COLORS.white },
    fill: COLORS.ink,
    align: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: ALL_THIN
  },
  totalBlank: { fill: COLORS.lineSoft, border: ALL_THIN },
  totalLabel: {
    font: { bold: true, size: 9.5, color: COLORS.ink },
    fill: COLORS.lineSoft,
    align: { horizontal: 'right', vertical: 'center' },
    border: ALL_THIN
  },
  totalCount: {
    font: { bold: true, size: 9.5, color: COLORS.ink },
    fill: COLORS.lineSoft,
    align: { horizontal: 'center', vertical: 'center' },
    border: ALL_THIN
  },
  totalMoney: {
    font: { bold: true, size: 9.5, color: COLORS.ink },
    fill: COLORS.lineSoft,
    align: { horizontal: 'right', vertical: 'center' },
    border: ALL_THIN,
    numFmt: '"Rp" #,##0'
  },
  emptyRow: {
    font: { italic: true, size: 9.5, color: COLORS.muted },
    align: { horizontal: 'center', vertical: 'center' },
    border: ALL_SOFT
  }
});

function dataCellStyle(col, alt) {
  const style = {
    font: { size: 9, color: COLORS.ink },
    fill: alt ? COLORS.zebra : COLORS.white,
    border: ALL_THIN,
    align: { horizontal: col.align || 'left', vertical: 'center' }
  };
  if (col.numFmt) style.numFmt = col.numFmt;
  return style;
}

function addDataSheet(wb, report) {
  const totalColumns = report.columns.length;
  const lastColLetter = xlsx.columnName(totalColumns - 1);
  const headerRow = 5;
  const lastDataRow = headerRow + report.rows.length;
  const fullWidth = [0, totalColumns - 1];
  // Judul & tagline dibatasi beberapa kolom pertama agar tidak menjadi pita
  // gelap kosong saat tabel dicetak melebar ke halaman berikutnya.
  const titleWidth = [0, Math.min(totalColumns - 1, 7)];

  const sheet = wb.addSheet('Data Peserta', {
    columns: report.columns.map(col => ({ width: col.width })),
    freeze: { rows: headerRow },
    autoFilter: report.rows.length ? `A${headerRow}:${lastColLetter}${lastDataRow}` : null,
    print: {
      paperSize: 9,
      orientation: 'landscape',
      fitToWidth: 3,
      fitToHeight: 0,
      margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4 }
    },
    printTitles: '$4:$5',
    footer: '&L CycloPon Race Control · ALA-ALA ULTRA 2027&R Halaman &P dari &N'
  });

  sheet.addRow({ height: 32, merge: titleWidth, cells: [{ value: `DATA PESERTA — ${report.eventTitle}`, style: ST.dataTitle }] });
  sheet.addRow({
    height: 20,
    merge: titleWidth,
    cells: [{ value: `Tanggal Ekspor: ${report.exportedAtLabel} · Event: ${report.eventLabel} · Kuota: ${report.quotaLabel}`, style: ST.tagline }]
  });
  sheet.addRow({ height: 6 });

  const bandCells = report.columns.map(() => ({ value: '', style: ST.groupBand }));
  for (const group of report.groups) {
    bandCells[group.from] = { value: group.label, style: ST.groupBand };
  }
  sheet.addRow({ height: 22, cells: bandCells, merges: report.groups.map(g => [g.from, g.to]) });

  sheet.addRow({ height: 38, cells: report.columns.map(col => ({ value: col.label, style: ST.header })) });

  if (report.rows.length) {
    for (const record of report.records) {
      const alt = (record.no - 1) % 2 === 1;
      sheet.addRow({
        height: 20,
        cells: report.columns.map(col => ({ value: record[col.key], style: dataCellStyle(col, alt) }))
      });
    }

    const amountIndex = report.columns.findIndex(col => col.key === 'payment_amount');
    const totalCells = report.columns.map(() => ({ value: '', style: ST.totalBlank }));
    const totalMerges = [];
    const labelEnd = amountIndex > 1 ? amountIndex - 2 : 0;
    totalCells[0] = { value: `TOTAL PENDAFTAR: ${report.rows.length} PESERTA`, style: ST.totalLabel };
    if (labelEnd > 0) totalMerges.push([0, labelEnd]);
    if (amountIndex > 0) {
      totalCells[amountIndex - 1] = { value: 'TOTAL NOMINAL', style: ST.totalLabel };
      totalCells[amountIndex] = { value: report.stats.totalAmount, style: ST.totalMoney };
    }
    sheet.addRow({ height: 24, cells: totalCells, merges: totalMerges });
  } else {
    sheet.addRow({ height: 24, merge: fullWidth, cells: [{ value: 'Belum ada data pendaftaran.', style: ST.emptyRow }] });
  }

  sheet.addRow({ height: 8 });
  sheet.addRow({
    height: 18,
    merge: fullWidth,
    cells: [{ value: `Dicetak dari Race Control CycloPon pada ${report.exportedAtLabel}. Gunakan filter pada baris header untuk menyaring data.`, style: ST.tagline }]
  });
}

function renderAlaUltraXlsx(report) {
  const wb = new xlsx.Workbook({
    title: 'Laporan Pendaftaran ALA-ALA ULTRA 2027',
    creator: 'CycloPon Race Control'
  });
  addSummarySheet(wb, report);
  addDataSheet(wb, report);
  return wb.toBuffer();
}

module.exports = {
  buildAlaUltraReport,
  renderAlaUltraXlsx,
  COLUMNS,
  REPORT_TITLE
};