# ⏱️ Virtual COT — Garis Potong Bergerak

> **Status desain**: Disetujui, menunggu eksekusi
> **Tanggal**: 17 November 2026

---

## 1. 🎯 Konsep

**Virtual COT** adalah *cut-off time* berupa **marker bergerak** yang menyusuri rute GPX
seperti *sweeper* virtual. Marker mulai bergerak dari titik start pada jam yang
ditentukan admin, dengan **kecepatan konstan** (km/jam).

- Rider yang posisinya **di depan** marker → aman.
- Rider yang **tertinggal di belakang** marker (marker sudah melewatinya) →
  **otomatis berstatus DNF final** dan tidak dapat berubah kembali.
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
| 3 | Status rider tertinggal | **DNF otomatis & final** — sekali dilewati marker, tidak bisa kembali |
| 4 | COT checkpoint manual | Dipertahankan, berjalan sejajar dengan Virtual COT |
| 5 | Notifikasi eksternal | Tidak perlu |
| 6 | Sumber posisi rider | `distance_km` terakhir dari tabel `position_history` (algoritma nearest-point GPX yang sudah ada) |
| 7 | Tempat kalkulasi | **Server-side** agar konsisten untuk semua penonton & rider |

---

## 3. 🗄️ Perubahan Database (`db/database.js`)

### 3.1 Kolom baru pada tabel `events`

Mengikuti pola migrasi `ALTER TABLE ... try/catch` yang sudah ada:

```sql
ALTER TABLE events ADD COLUMN cot_start_time TEXT;  -- jam mulai marker, mis. '05:00' (WIB, hanya untuk display)
ALTER TABLE events ADD COLUMN cot_start_ms  INTEGER; -- epoch UTC (ms) hasil konversi cot_start_time → acuan kalkulasi
ALTER TABLE events ADD COLUMN cot_pace REAL;        -- kecepatan konstan, mis. 20.0 (km/jam)
```

- `cot_start_ms` dihitung **sekali saat admin menyimpan** event (konversi `events.date`
  + `cot_start_time` ke epoch UTC dengan offset tetap **UTC+7/WIB**) — semua
  kalkulasi marker memakai epoch, bukan parsing jam per-request (lihat §8.1).

- `cot_start_time` dan `cot_pace` **boleh `NULL`** → Virtual COT tidak aktif
  untuk event tersebut (perilaku lama tetap utuh).

### 3.2 Tabel baru `virtual_dnf`

Pencatatan permanen agar status DNF bersifat *sticky* (tidak berubah walau rider
kembali melaju):

```sql
CREATE TABLE IF NOT EXISTS virtual_dnf (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id    INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  rider_id    INTEGER NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
  cot_km      REAL NOT NULL,              -- jarak marker saat melewati rider
  marked_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(rider_id)
);
CREATE INDEX IF NOT EXISTS idx_virtual_dnf_event ON virtual_dnf(event_id);
```

---

## 4. ⚙️ Perubahan Backend

### 4.1 `routes/events.js`

- `POST /api/events/admin` menerima field opsional `cot_start_time` & `cot_pace`.
- `PUT /api/events/admin/:id` juga menerima kedua field tersebut (untuk edit).
- Semua response event (`GET /api/events`, `GET /api/events/:id`) menyertakan
  kedua field.

### 4.2 Helper kalkulasi posisi marker

Fungsi baru (diekstrak/dipakai ulang dari logika GPX yang sudah ada di file ini):

```
jarak_marker(t) = cot_pace × ((now_epoch − cot_start_ms) / 3600000)  [jam]
```

- Konversi **jarak → koordinat** (lat/lng) dengan menelusuri titik-titik GPX
  (`<trkpt>/<rtept>`) dan jarak kumulatif haversine — reuse `haversineDistance()`.
- Marker **berhenti (clamp)** di titik finish ketika jarak ≥ panjang rute.
- Marker **belum bergerak** jika `now < cot_start_time` → status `not_started`.

### 4.3 Endpoint baru

```
GET /api/events/:id/virtual-cot
```

Response (contoh):

```json
{
  "enabled": true,
  "start_time": "05:00",
  "pace": 20.0,
  "status": "MOVING",            // MOVING | NOT_STARTED | FINISHED
  "distance_km": 45.3,
  "latitude": -6.9735,
  "longitude": 107.6312,
  "route_length_km": 210.0
}
```

Ketika `enabled: false` (event tanpa konfigurasi Virtual COT) endpoint tetap
merespons dengan `enabled: false` agar frontend mudah menanganinya.

### 4.4 Logika DNF otomatis

- Rider dianggap tertinggal bila: `distance_km_rider < jarak_marker`
  (menggunakan posisi terakhir rider dari `position_history`).
- Evaluasi dilakukan **lazily** setiap kali endpoint terkait diakses
  (leaderboard, virtual-cot, results) — rider yang terdeteksi tertinggal dan
  belum tercatat di `virtual_dnf` langsung di-`INSERT`.
- Rider yang sudah tercatat di `virtual_dnf` **tetap DNF** meskipun nanti
  `distance_km`-nya melampaui marker (keputusan #3).
- Rider dengan role non-rider (mis. *sweeper*) **diabaikan** dari penilaian.

### 4.5 `routes/results.js`

- Klasifikasi akhir menjadi: **FINISHER / OVER_COT / DNF** — DNF kini dapat
  berasal dari Virtual COT (tabel `virtual_dnf`) selain kriteria lama.
- Urutan rank: FINISHER (waktu tercepat) → OVER_COT → DNF (prioritas lama tetap).

---

## 5. 💻 Perubahan Frontend

### 5.1 `public/js/pages/admin-dashboard.js` (form buat/edit event)

- Input **Jam Mulai COT** (`type="time"`, opsional).
- Input **Kecepatan COT** (`number`, km/jam, mis. `20`).
- Kedua field opsional; dikosongkan = Virtual COT nonaktif.

### 5.2 `public/js/pages/live-map.js`

- Polling `GET /api/events/:id/virtual-cot` (interval ringan, mengikuti pola
  update posisi yang sudah ada).
- Marker khusus di rute — ikon/jam merah ⏱️ dengan popup:
  `COT Virtual · km 45.3 · 20 km/jam`.
- Gerakan marker dibuat halus (interpolasi sederhana antar polling).
- Rider berstatus DNF Virtual COT mendapat penanda visual (badge/styling abu
  atau merah) di peta.

### 5.3 `public/js/pages/rider-cockpit.js`

- Indikator jarak rider terhadap garis COT:
  - 🟢 `Anda 3.2 km DI DEPAN COT`
  - 🔴 `Anda DI BELAKANG COT · 1.5 km` (+ status DNF bila sudah dicatat)

### 5.4 `public/js/pages/event-results.js`

- Badge DNF menampilkan penyebab: `DNF · Tertinggal COT Virtual`
  (bedakan dari DNF biasa bila kriteria lama masih ada).

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
| Rider tertinggal (marker melewati) | otomatis tercatat `virtual_dnf`, status DNF |
| Rider DNF lalu `distance_km` naik kembali | tetap DNF (*sticky*) |
| Event tanpa konfigurasi COT | `enabled: false`, tidak ada perubahan perilaku |
| Role sweeper | diabaikan penilaian |
| Endpoint CRUD event | field baru tersimpan & terbaca |

---

## 7. 📦 Urutan Eksekusi

1. Migrasi DB (`events` + tabel `virtual_dnf`) — `db/database.js`
2. Helper kalkulasi marker + endpoint `virtual-cot` — `routes/events.js`
3. Logika DNF otomatis + integrasi results — `routes/results.js`
4. Test backend — `tests/virtual-cot.test.js`
5. Form admin — `public/js/pages/admin-dashboard.js`
6. Peta live + marker bergerak — `public/js/pages/live-map.js`
7. Cockpit rider — `public/js/pages/rider-cockpit.js`
8. Halaman hasil — `public/js/pages/event-results.js`
9. Verifikasi manual: `npm run seed:demo` → `npm run simulate` → cek peta & results

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
