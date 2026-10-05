# Spesifikasi Desain: ClimbPro & Analitik Elevasi (Grade % & Profil Tanjakan)

**Tanggal:** 5 Oktober 2026  
**Status:** Disetujui (Approved)  
**Tujuan:** Memberikan analitik tanjakan pintar (ClimbPro) dan kemiringan jalan real-time (Grade %) untuk CycloPon di sisi pesepeda (Rider Cockpit HUD) dan penonton (Spectator Live Map) dengan arsitektur super ringan, zero-heavy-framework, dan 100% offline-ready.

---

## 1. Arsitektur & Filosofi Sistem

Sesuai prinsip CycloPon yang hemat daya dan ringan:
- **Zero Heavy Library:** Menggunakan Vanilla JavaScript ES6+ murni dan Canvas 2D API bawaan browser.
- **Client-Side Processing:** Deteksi tanjakan dihitung secara instan saat GPX pertama kali diparsing di browser (~2-5ms untuk rute ribuan titik), tanpa membebani server Node.js maupun database SQLite.
- **Offline & PWA Friendly:** Terintegrasi penuh dengan Service Worker dan `gps-keeper.js` sehingga tetap beroperasi normal di daerah blank spot.

---

## 2. Modul & Algoritma Deteksi Tanjakan (`public/js/lib/gpx-utils.js`)

### 2.1 Pembersihan & Smoothing Elevasi
Sensor barometer dan GPS sering menghasilkan deviasi jitter acak. Sebelum mendeteksi tanjakan, array titik elevasi dihaluskan dengan moving average window 5 titik.

### 2.2 Kriteria Klasifikasi Tanjakan
Sebuah segmen diklasifikasikan sebagai tanjakan jika memenuhi tiga kriteria minimal:
1. **Panjang Segmen:** $\ge 500\text{ meter}$ ($0.5\text{ km}$).
2. **Kenaikan Elevasi (Elevation Gain):** $\ge 30\text{ meter}$.
3. **Rata-rata Kemiringan (Average Gradient):** $\ge 3.0\%$.

### 2.3 Formula Kategori Tanjakan (UCI / Strava Standard)
Skor kesulitan dihitung dengan formula:
$$\text{Score} = \text{Panjang (meter)} \times \text{Rata-rata Kemiringan (\% probabilitas)}$$

Pengelompokan kategori:
- **HC (Hors Catégorie):** $\text{Score} \ge 80.000$ *(Warna: `#8B5CF6` Ungu)*
- **Kategori 1 (CAT 1):** $\text{Score} \ge 64.000$ *(Warna: `#EF4444` Merah)*
- **Kategori 2 (CAT 2):** $\text{Score} \ge 32.000$ *(Warna: `#F97316` Oranye)*
- **Kategori 3 (CAT 3):** $\text{Score} \ge 16.000$ *(Warna: `#F59E0B` Kuning Amber)*
- **Kategori 4 (CAT 4):** $\text{Score} < 16.000$ *(Warna: `#10B981` Hijau Zamrud)*

### 2.4 Struktur Data Objek Tanjakan
```javascript
{
  id: 1,
  name: "Tanjakan 1",
  category: "CAT 3",
  color: "#F59E0B",
  startIndex: 150,
  endIndex: 280,
  startKm: 24.5,
  endKm: 28.2,
  lengthKm: 3.7,
  elevGain: 240,       // meter
  startEle: 110,       // mdpl
  topEle: 350,         // mdpl
  avgGrade: 6.5,       // %
  maxGrade: 12.0       // %
}
```

### 2.5 API Helper Baru yang Disediakan
- `detectClimbs(points)`: Memindai array titik elevasi GPX dan mengembalikan array objek tanjakan.
- `getLiveGrade(distKm, points)`: Mengembalikan gradien kemiringan instan (%) dan elevasi (mdpl) pada kilometer tertentu.
- `getCurrentClimbStatus(distKm, climbs)`: Mendeteksi apakah rider sedang mendekati (<300m) atau berada di dalam tanjakan, menghitung sisa jarak dan sisa elevasi ke puncak.

---

## 3. Komponen Antarmuka Pengguna (UI)

### 3.1 Rider Cockpit HUD (`/rider/cockpit`)
1. **Metrik Ringkas (Mode Datar/Turunan):**
   - Menambahkan kotak stat di Primary Metrics Grid:
     - **Grade %:** Angka persentase instan (misal `+6%`, `-3%`, `0%`) dengan warna dinamis.
     - **Altitude:** Elevasi saat ini (misal `345 mdpl`).
     - **Gain:** Total elevasi naik sejauh ini (`+520m`).
2. **Dynamic ClimbPro Card (Mode Menanjak):**
   - Aktif otomatis saat `startKm - 0.3 <= rider.distKm <= endKm`.
   - Menampilkan:
     - Badge Kategori (`CAT 3`), Nama Tanjakan (`Tanjakan 1`), dan Rata-rata Kemiringan (`Avg 6.5%`).
     - Mini Canvas Profil Lereng dengan posisi rider real-time.
     - Sisa Jarak ke Puncak (`1.2 km lagi`).
     - Sisa Elevasi Naik ke Puncak (`+85m`).
     - Live Kemiringan (`+8%`).
   - Otomatis tertutup dan kembali ke metrik ringkas saat rider melewati puncak.

### 3.2 Spectator Live Map (`/watch/:id`)
1. **Highlight Pita Kategori di Canvas Elevasi Komoot:**
   - Bagian bawah kurva elevasi pada segmen tanjakan diarsir sesuai warna kategori tanjakan.
   - Penanda puncak tanjakan (`⛰️ C1`, `⛰️ C2`).
2. **Drawer / Tab Daftar Tanjakan ("⛰️ Daftar Tanjakan"):**
   - Daftar seluruh tanjakan rute dengan statistik lengkap.
   - Status live rider yang sedang berada di lereng tanjakan tersebut.

---

## 4. Pengujian Otomatis (`tests/climb-detection.test.js`)

Membuat test suite mandiri yang menguji:
1. Deteksi tanjakan dengan berbagai kategori (Cat 4 hingga HC).
2. Perilaku rute datar (0 tanjakan terdeteksi tanpa crash).
3. Akurasi kalkulasi sisa jarak dan sisa elevasi rider di lereng tanjakan.
4. Kalkulasi moving gradient (%) dan toleransi smoothing GPS.

---

## 5. Rencana File yang Dimodifikasi & Dibuat

1. `tests/climb-detection.test.js` (Baru): Unit test deteksi tanjakan & kalkulasi gradien.
2. `public/js/lib/gpx-utils.js` (Modifikasi): Implementasi `detectClimbs`, `getLiveGrade`, `getCurrentClimbStatus`.
3. `public/js/pages/rider-cockpit.js` (Modifikasi): Integrasi widget Grade % dan Dynamic ClimbPro Card.
4. `public/css/cockpit.css` (Modifikasi): Gaya visual kartu ClimbPro dan badge kategori.
5. `public/js/pages/live-map.js` (Modifikasi): Highlight tanjakan di canvas Komoot & panel daftar tanjakan.
6. `public/css/map.css` (Modifikasi): Gaya visual daftar tanjakan dan badge elevasi.
