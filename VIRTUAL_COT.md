# ⏱️ Virtual COT — Garis Potong Bergerak

> **Status desain**: Rev 2 — **sudah diimplementasikan** (DB, backend, API, UI, 22 test lulus)
> **Tanggal**: 17 November 2026 · **Revisi terakhir**: 18 November 2026
>
> **Riwayat revisi**
> - **Rev 1** (17 Nov): desain awal.
> - **Rev 2** (18 Nov): menambahkan pengaman agar posisi rider yang **basi**
>   tidak menghasilkan vonis DNF — gerbang kesegaran data, margin jarak, deteksi
>   gap telemetri, mode `dry_run`, dan pembatalan DNF oleh admin (§4.4 & §8.5).

---

## 1. 🎯 Konsep

**Virtual COT** adalah *cut-off time* berupa **marker bergerak** yang menyusuri rute GPX
seperti *sweeper* virtual. Marker mulai bergerak dari titik start pada jam yang
ditentukan admin, dengan **kecepatan konstan** (km/jam).

- Rider yang posisinya **di depan** marker → aman.
- Rider yang **tertinggal di belakang** marker — dan posisinya terbukti **segar**
  serta melewati margin 1 km — **otomatis berstatus DNF** dan tidak berubah lagi
  oleh sistem (koreksi hanya lewat void admin, §4.4).
- Bila telemetri tertunda (blank spot, HP mati, GPS macet), evaluator **menahan
  vonis** dan menandai rider sebagai `STALE` — bukan DNF.
- COT manual per checkpoint yang sudah ada **tetap dipertahankan** dan berjalan
  sejajar dengan Virtual COT.
- Tidak ada notifikasi eksternal (Telegram/Webhook) untuk DNF Virtual COT.

```
Rute GPX:  START ━━●━━━●━━━━━━━●━━━━━━━━ FINISH
                         ▲
                  [Marker COT Virtual]
                  jarak(t) = kecepatan × (waktu_sekarang − jam_mulai)
```

---

## 2. ✅ Keputusan Desain

| # | Keputusan | Pilihan |
|---|-----------|---------|
| 1 | Jenis COT | COT keseluruhan event (garis potong bergerak di rute) |
| 2 | Gerak marker | Kecepatan konstan, satu angka km/jam untuk seluruh rute |
| 3 | Status rider tertinggal | **DNF otomatis** & sticky — tidak dicabut sistem, koreksi hanya lewat void admin (#11) |
| 4 | COT checkpoint manual | Dipertahankan, berjalan sejajar dengan Virtual COT |
| 5 | Notifikasi eksternal | Tidak perlu |
| 6 | Sumber posisi rider | `distance_km` terakhir dari tabel `position_history` (algoritma nearest-point GPX yang sudah ada) |
| 7 | Tempat kalkulasi | **Server-side** agar konsisten untuk semua penonton & rider |
| 8 | Syarat penilaian DNF | Hanya bila posisi rider **segar** (≤ 10 menit) — data basi tidak dinilai |
| 9 | Margin jarak | Rider baru DNF bila tertinggal **> 1 km** di belakang marker |
| 10 | Mode operasi | `off` / `dry_run` (uji, tanpa mencatat) / `live` — per event |
| 11 | Pembatalan DNF | Admin dapat **void** DNF yang terbukti salah, dengan alasan & jejak audit |

> **Catatan revisi keputusan #3** — "DNF final" tetap berlaku untuk **evaluasi
> otomatis**: sistem tidak pernah mencabut DNF sendiri walau rider kemudian
> melaju. Namun admin memegang jalur *override* (keputusan #11), karena satu DNF
> palsu yang permanen lebih merugikan daripada DNF yang bisa dikoreksi manusia.

---

## 3. 🗄️ Perubahan Database (`db/database.js`)

### 3.1 Kolom baru pada tabel `events`

Mengikuti pola migrasi `ALTER TABLE ... try/catch` yang sudah ada:

```sql
ALTER TABLE events ADD COLUMN cot_start_time TEXT;   -- jam mulai marker, mis. '05:00' (WIB, hanya untuk display)
ALTER TABLE events ADD COLUMN cot_start_ms  INTEGER; -- epoch UTC (ms) hasil konversi cot_start_time → acuan kalkulasi
ALTER TABLE events ADD COLUMN cot_pace REAL;         -- kecepatan konstan, mis. 20.0 (km/jam)
ALTER TABLE events ADD COLUMN cot_mode TEXT;         -- 'off' | 'dry_run' | 'live' (default 'off')
```

- `cot_start_ms` dihitung **sekali saat admin menyimpan** event (konversi `events.date`
  + `cot_start_time` ke epoch UTC dengan offset tetap **UTC+7/WIB**) — semua
  kalkulasi marker memakai epoch, bukan parsing jam per-request (lihat §8.1).

- `cot_start_time` dan `cot_pace` **boleh `NULL`** → Virtual COT tidak aktif
  untuk event tersebut (perilaku lama tetap utuh).
- `cot_mode` adalah **saklar operasional**: `off` (tidak dihitung), `dry_run`
  (kandidat DNF hanya dilaporkan, tidak dicatat), `live` (aktif penuh).
  Event lama otomatis `off` karena kolomnya `NULL`.
- Saat admin mengaktifkan `live`, server menghitung **preview kandidat DNF**
  lebih dulu. Jika kandidat > 20% rider, penyimpanan ditolak kecuali admin
  mengirim `force: true` — mencegah salah konfigurasi jam/pace yang langsung
  memvonis banyak rider.

### 3.2 Tabel baru `virtual_dnf`

Pencatatan permanen agar status DNF bersifat *sticky* (tidak berubah otomatis
walau rider kembali melaju), sekaligus menyimpan jejak audit dan status void:

```sql
CREATE TABLE IF NOT EXISTS virtual_dnf (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id     INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  rider_id     INTEGER NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
  cot_km       REAL NOT NULL,                   -- jarak marker saat melewati rider
  rider_km     REAL,                            -- jarak rider yang jadi bukti
  last_seen_at TEXT,                            -- recorded_at posisi yang dipakai (audit)
  status       TEXT NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE | VOID
  marked_at    TEXT NOT NULL DEFAULT (datetime('now')),
  voided_at    TEXT,
  void_reason  TEXT,
  UNIQUE(rider_id)
);
CREATE INDEX IF NOT EXISTS idx_virtual_dnf_event_status ON virtual_dnf(event_id, status);
```

- `status = 'VOID'` dipakai saat admin membatalkan DNF; baris **tidak dihapus**
  agar riwayat keputusan tetap tersimpan dan rider tersebut tidak dinilai ulang
  otomatis oleh evaluator.
- `rider_km` & `last_seen_at` adalah **jejak audit**: membuktikan kapan dan dari
  posisi mana DNF dijatuhkan (krusial saat ada sengketa hasil).

---

## 4. ⚙️ Perubahan Backend

### 4.1 `routes/events.js`

- `POST /api/events/admin` menerima field opsional `cot_start_time`, `cot_pace`,
  `cot_mode`, dan `force`.
- `PUT /api/events/admin/:id` juga menerima field tersebut (untuk edit).
- Semua response event (`GET /api/events`, `GET /api/events/:id`) menyertakan
  field tersebut.
- Endpoint admin baru: `POST /api/events/:id/virtual-cot/preview` (hitung
  kandidat DNF tanpa menulis) dan `POST /api/events/:id/virtual-cot/void/:riderId`
  (harus menyertakan `reason`).

### 4.2 Helper kalkulasi posisi marker

Fungsi baru (diekstrak/dipakai ulang dari logika GPX yang sudah ada di file ini):

```
jarak_marker(t) = cot_pace × ((now_epoch − cot_start_ms) / 3600000)  [jam]
```

- Konversi **jarak → koordinat** (lat/lng) dengan menelusuri titik-titik GPX
  (`<trkpt>/<rtept>`) dan jarak kumulatif haversine — reuse `haversineDistance()`.
- Marker **berhenti (clamp)** di titik finish ketika jarak ≥ panjang rute.
- Marker **belum bergerak** jika `now < cot_start_ms` → status `NOT_STARTED`.

### 4.3 Endpoint baru

```
GET /api/events/:id/virtual-cot
```

Response (contoh):

```json
{
  "enabled": true,
  "mode": "live",
  "start_time": "05:00",
  "pace": 20.0,
  "status": "MOVING",            // MOVING | NOT_STARTED | FINISHED
  "distance_km": 45.3,
  "latitude": -6.9735,
  "longitude": 107.6312,
  "route_length_km": 210.0,
  "last_telemetry_age_sec": 42,
  "dnf_count": 3,
  "evaluation": {                 // null bila tidak ada evaluasi pada request ini
    "state": "ok",               // ok | deferred | dry_run | throttled
    "reason": null,              // data_gap | cooldown | ...
    "candidates": 0
  }
}
```

Ketika `enabled: false` (event tanpa konfigurasi Virtual COT) endpoint tetap
merespons dengan `enabled: false` agar frontend mudah menanganinya.

### 4.4 Logika DNF otomatis (dengan pengaman)

Evaluasi dilakukan **lazily** saat endpoint terkait diakses, tetapi hanya bila
semua gerbang berikut lolos:

1. `cot_mode` = `live` atau `dry_run`, event `active`, env
   `VIRTUAL_COT_ENABLED !== 'false'`.
2. Status marker `MOVING` (bukan `NOT_STARTED` / `FINISHED`).
3. Throttle in-memory maks. 1× per 15–30 detik per event.

#### Status per rider

| State | Kondisi | Aksi |
|-------|---------|------|
| `AHEAD` | `rider_km ≥ marker_km − margin` | aman |
| `BEHIND` | posisi **segar** & `rider_km < marker_km − margin` | `INSERT` DNF (`ACTIVE`) |
| `STALE` | posisi lebih tua dari `FRESH_MIN` | **tidak dinilai**, masuk daftar verifikasi admin |
| `NO_DATA` | belum punya baris `position_history` | diabaikan |

#### Ambang (env-tunable, default aman)

| Env | Default | Arti |
|-----|---------|------|
| `VIRTUAL_COT_FRESH_MIN` | `10` | umur maks. posisi agar layak dinilai (menit) |
| `VIRTUAL_COT_MARGIN_KM` | `1.0` | toleransi di belakang marker sebelum DNF |
| `VIRTUAL_COT_GAP_MIN` | `15` | gap telemetri event yang membekukan evaluasi |
| `VIRTUAL_COT_ENABLED` | `true` | kill-switch global |

#### Pseudokode

```
evaluate(eventId, nowMs, markerKm):
  if !enabled || mode == 'off' || marker.state != 'MOVING' → return
  if nowMs - lastEval[eventId] < 15000 → return

  # gerbang gap: event sama sekali tidak mengirim telemetri
  newest = MAX(recorded_at) FROM position_history WHERE event_id = ?
  if !newest || nowMs - newest > GAP_MIN → return { state: 'deferred', reason: 'data_gap' }

  for rider in riders(eventId) where role = 'rider' and not in virtual_dnf:
    pos = SELECT ... WHERE rider_id = ? ORDER BY id DESC LIMIT 1
    if !pos                                  → continue        # NO_DATA
    if nowMs - pos.recorded_at > FRESH_MIN   → mark STALE; continue
    if pos.distance_km >= markerKm - MARGIN  → continue        # AHEAD
    candidates.push({ rider, riderKm: pos.distance_km, lastSeen: pos.recorded_at })

  if mode == 'dry_run' → return { state: 'dry_run', candidates }

  BEGIN
    INSERT OR IGNORE INTO virtual_dnf
      (event_id, rider_id, cot_km, rider_km, last_seen_at, status)
    VALUES (?, ?, markerKm, riderKm, lastSeen, 'ACTIVE')
  COMMIT
```

Catatan implementasi:

- **Gerbang kesegaran adalah pengaman utama.** Posisi yang lebih tua dari
  `FRESH_MIN` otomatis berstatus `STALE` sampai rider mengirim titik baru —
  jadi tidak ada vonis yang dibuat dari posisi basi.
- **`dry_run` wajib dipakai saat gladi resik**: menampilkan siapa yang *akan*
  DNF tanpa menulis apa pun ke `virtual_dnf`.
- **Posisi rider diambil dari `MAX(id)`**, bukan `MAX(recorded_at)`, agar titik
  yang dikirim menyusul (*offline buffering*) tetap terbaca sebagai posisi
  terbaru yang diketahui server.
- Rider yang sudah tercatat `ACTIVE` **tidak pernah** dievaluasi ulang. Rider
  `VOID` juga tidak (barisnya tetap ada, sekaligus mencegah *flip-flop*).
- Role `sweeper` / `marshall` / `medic` **diabaikan** sepenuhnya.

### 4.5 `routes/results.js`

- Klasifikasi akhir menjadi: **FINISHER / OVER_COT / DNF** — DNF kini dapat
  berasal dari Virtual COT selain kriteria lama.
- Sumber DNF Virtual COT **hanya baris `virtual_dnf.status = 'ACTIVE'`**;
  rider yang di-void kembali mengikuti kriteria lama (tidak otomatis finisher).
- DNF yang berasal dari Virtual COT menyertakan `dnf_reason: 'VIRTUAL_COT'`
  beserta `cot_km` / `rider_km` / `last_seen_at` untuk kebutuhan badge & sengketa.
- Role non-`rider` tidak pernah muncul sebagai DNF Virtual COT.
- Urutan rank: FINISHER (waktu tercepat) → OVER_COT → DNF (prioritas lama tetap).

---

## 5. 💻 Perubahan Frontend

### 5.1 `public/js/pages/admin-dashboard.js` (form buat/edit event)

- Input **Jam Mulai COT** (`type="time"`, opsional).
- Input **Kecepatan COT** (`number`, km/jam, mis. `20`).
- Pilihan **Mode**: `off` / `dry_run` / `live` (default `off`).
- Kedua field opsional; dikosongkan = Virtual COT nonaktif.
- Saat memilih `live`, tampilkan **preview kandidat DNF** dan minta konfirmasi
  bila kandidat > 20% rider.

### 5.2 `public/js/pages/live-map.js`

- Polling `GET /api/events/:id/virtual-cot` (interval ringan, mengikuti pola
  update posisi yang sudah ada).
- Marker khusus di rute — ikon/jam merah ⏱️ dengan popup:
  `COT Virtual · km 45.3 · 20 km/jam`.
- Gerakan marker dibuat halus (interpolasi sederhana antar polling).
- Rider berstatus DNF Virtual COT mendapat penanda visual (badge/styling abu
  atau merah) di peta.
- Banner status bila `evaluation.state = 'deferred'` — "COT aktif, penilaian
  DNF ditunda karena telemetri belum segar" — supaya penonton tidak
  menyimpulkan hal yang salah.

### 5.3 `public/js/pages/rider-cockpit.js`

- Indikator jarak rider terhadap garis COT:
  - 🟢 `Anda 3.2 km DI DEPAN COT`
  - 🔴 `Anda DI BELAKANG COT · 1.5 km` (+ status DNF bila sudah dicatat)
  - ⚪ `Posisi Anda belum terbarui · cek GPS` bila state `STALE`
    (jangan tampilkan "DNF" saat data rider belum segar)

### 5.4 `public/js/pages/event-results.js`

- Badge DNF menampilkan penyebab: `DNF · Tertinggal COT Virtual`
  (bedakan dari DNF biasa bila kriteria lama masih ada).

### 5.5 Panel admin Virtual COT (baru)

- Saklar mode `off` / `dry_run` / `live` per event.
- **Preview kandidat DNF** sebelum menyalakan `live`.
- Tabel DNF: BIB, nama, `cot_km`, `rider_km`, `last_seen_at`, `marked_at`.
- Tombol **Batalkan DNF** (alasan wajib) → `status='VOID'`, `voided_at` diisi.
- Daftar rider `STALE` untuk verifikasi manual panitia.

---

## 6. 🧪 Rencana Pengujian

File baru: `tests/virtual-cot.test.js` (runner `node --test`).

| Kasus uji | Ekspektasi |
|-----------|------------|
| Kalkulasi jarak marker pada t tertentu | `jarak = pace × elapsed`, benar di jam lintas tengah malam |
| Marker sebelum jam mulai | `status: NOT_STARTED` |
| Marker melewati panjang rute | clamp di finish, `status: FINISHED` |
| Jarak → koordinat GPX | lat/lng sesuai titik rute pada km tersebut |
| Rider di depan marker | tidak masuk `virtual_dnf`, status aman |
| Rider tertinggal (marker melewati), posisi segar | otomatis tercatat `virtual_dnf`, status DNF |
| Rider DNF lalu `distance_km` naik kembali | tetap DNF (*sticky*) |
| Event tanpa konfigurasi COT | `enabled: false`, tidak ada perubahan perilaku |
| Role sweeper | diabaikan penilaian |
| Rider posisi > 10 menit di belakang marker | `STALE`, tidak DNF |
| Rider 0.5 km di belakang marker | tidak DNF (masih dalam margin 1 km) |
| Rider 2 km di belakang, posisi segar | DNF tercatat |
| Gap telemetri event > 15 menit | evaluasi ditunda (`deferred`) |
| Mode `dry_run` | kandidat dilaporkan, `virtual_dnf` tetap kosong |
| Mode `off` | evaluasi tidak berjalan sama sekali |
| DNF di-void admin | tidak dinilai ulang, hasil kembali normal |
| Restart server saat rider tertinggal | tidak langsung DNF, menunggu posisi segar |
| Endpoint CRUD event | field baru tersimpan & terbaca |

---

## 7. 📦 Urutan Eksekusi

1. Migrasi DB (`events` + tabel `virtual_dnf`) — `db/database.js`
2. Helper kalkulasi marker + gerbang evaluasi + endpoint `virtual-cot` — `routes/events.js`
3. Logika DNF otomatis + integrasi results — `routes/results.js`
4. Endpoint admin mode/void + panel admin — `routes/events.js`, `public/js/pages/admin-dashboard.js`
5. Test backend — `tests/virtual-cot.test.js`
6. Peta live + marker bergerak — `public/js/pages/live-map.js`
7. Cockpit rider — `public/js/pages/rider-cockpit.js`
8. Halaman hasil — `public/js/pages/event-results.js`
9. Gladi resik: `npm run seed:demo` → mode `dry_run` → `npm run simulate` → cocokkan kandidat DNF → baru `live`

---

## 8. ⚠️ Catatan Risiko & Mitigasi

### 8.1 Zona Waktu

**Fakta kode saat ini** (hasil audit):

- Semua timestamp disimpan **UTC**: `position_history.recorded_at` memakai
  `toISOString()`, `datetime('now')` SQLite juga UTC.
- Evaluasi COT yang sudah ada (`checkCotStatus` di `live-map.js`, countdown di
  cockpit) dilakukan **client-side** dengan `setHours()` → memakai jam lokal
  perangkat penonton/rider — ada inkonsistensi laten UTC vs jam lokal browser.
- Report generator sudah memakai `timeZone: 'Asia/Jakarta'` → project ini
  WIB-oriented.

**Mitigasi** — hitung semuanya dalam **epoch ms**, konversi zona waktu hanya
dilakukan sekali saat simpan:

1. Kolom `cot_start_ms` (epoch UTC) dihitung saat admin menyimpan event:
   `events.date` (YYYY-MM-DD) + `cot_start_time` (HH:MM) → epoch dengan offset
   tetap **UTC+7 (WIB)**, **bukan** zona waktu server/VPS.
2. Kalkulasi marker murni aritmetika: `jarak = pace × ((now − cot_start_ms) / 3600000)`
   — bebas bug lintas tengah malam (tidak ada `setHours` modular) dan kebal
   terhadap perubahan timezone server.
3. Indonesia **tidak memiliki DST** → offset UTC+7 konstan sepanjang tahun,
   aman di-hardcode.
4. Label waktu di UI ("05:00", dst.) hanya *rendering* via
   `toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })`.
5. Test wajib mencakup boundary: event mulai 23:30 WIB dan marker melewati
   tengah malam.

### 8.2 Kinerja

1. **Cache rute**: jarak kumulatif titik GPX di-parse sekali per event, cache
   by mtime — pola sama dengan `eventDistanceCache` yang sudah ada di
   `routes/events.js`.
2. **Cache posisi marker**: in-memory map per event, TTL ~5 detik — polling
   banyak penonton tidak memicu kalkulasi berulang; invalidate saat event
   di-edit.
3. **Short-circuit**: status `NOT_STARTED` / `FINISHED` → langsung return,
   **skip evaluasi DNF sama sekali** (kondisi paling sering terjadi).
4. **Throttle deteksi DNF**: lazily-on-read dibatasi maks. 1× per ~15–30 detik
   per event (timestamp in-memory).
5. **Query efisien**: posisi terakhir rider via `MAX(id)` didukung index yang
   sudah ada `idx_history_event_rider_id (event_id, rider_id, id)`; insert DNF
   batch memakai `INSERT OR IGNORE` + transaksi (`UNIQUE(rider_id)`) —
   sekaligus menutup race condition antar request konkuren.

### 8.3 Backward Compatibility

1. Migrasi **murni aditif** — `ALTER TABLE ADD COLUMN` nullable +
   `CREATE TABLE IF NOT EXISTS`; tidak ada modifikasi data lama.
2. Kontrak: **`cot_start_time` NULL = fitur off** — jalur kode lama (COT
   checkpoint, results, replay) tidak tersentuh sama sekali.
3. Frontend defensif: field baru di response API diabaikan client lama;
   `enabled: false` ditangani anggun.
4. **Kill-switch ops**: env `VIRTUAL_COT_ENABLED=false` mematikan fitur instan
   tanpa rollback kode, jika terjadi masalah di production.
5. Setelah perubahan DB, jalankan `npm test` (20 suite) sebagai smoke test.

### 8.4 Inkonsistensi COT Lama (Di Luar Scope)

Inkonsistensi laten evaluasi COT client-side (lihat §8.1) **tidak dibenahi**
dalam fitur ini agar scope tidak melebar. Virtual COT yang murni server-side +
epoch menetapkan *pattern* yang benar; refactoring COT checkpoint lama menjadi
task terpisah di kemudian hari.

### 8.5 Gap Telemetri & DNF Palsu

**Risiko**: evaluasi DNF membandingkan posisi terakhir rider dengan marker yang
bergerak menurut jam dinding. Bila telemetri rider/event tertunda (blank spot,
HP kehabisan baterai, GPS macet) sementara marker terus maju, perbandingan bisa
memvonis rider yang sebenarnya masih di depan → **DNF palsu yang sticky**.

**Mitigasi berlapis** (detail di §4.4):

| Lapis | Mekanisme | Efek saat telemetri tertunda |
|-------|-----------|------------------------------|
| 1 | Gerbang kesegaran (`FRESH_MIN` = 10 mnt) | posisi basi tidak dinilai |
| 2 | Deteksi gap event (`GAP_MIN` = 15 mnt) | evaluasi dibekukan selama data macet |
| 3 | Margin jarak (`MARGIN_KM` = 1 km) | rider di batas tidak langsung dihukum |
| 4 | Mode `dry_run` | gladi resik tanpa menulis DNF |
| 5 | Kill-switch `VIRTUAL_COT_ENABLED=false` | mematikan fitur seketika |
| 6 | Void oleh admin + audit | koreksi terakhir bila vonis tetap salah |

**Konsekuensi yang diterima**: rider yang HP-nya mati di tengah jalan berstatus
`STALE`, bukan DNF. Keputusan diserahkan ke verifikasi manual panitia — lebih
baik "tidak tahu" daripada vonis permanen berdasarkan data yang tidak ada.
