# 🚴 CycloPon Live Tracker

**CycloPon** adalah platform *live GPS tracking* berbasis web untuk kegiatan bersepeda jarak jauh (Gran Fondo, Audax, Tour, Ultra-cycling). Aplikasi ini dirancang untuk mengatasi masalah umum pelacakan sepeda: **baterai boros**, **aplikasi mati saat layar HP dikunci**, **penumpukan marker rider di peta**, serta manajemen rute GPX dan leaderboard secara *real-time*.

---

## 🌟 Fitur Utama

- **🔋 Hemat Baterai & Layar Mati Tetap Jalan**: Memanfaatkan aplikasi native **Traccar Client** (Android/iOS) yang berjalan sebagai background service resmi OS. Layar HP rider dapat dimatikan sepenuhnya dan posisi GPS tetap terkirim setiap **30 detik**.
- **🗺️ Rute GPX & Peta Interaktif**: Admin dapat mengunggah file rute `.gpx`. Peta menampilkan rute lengkap, titik start (hijau), titik finish (oranye), serta posisi langsung para rider dengan dark theme modern.
- **🛡️ Mitigasi Marker Bertumpuk (Clustering)**: Menggunakan algoritma *Marker Clustering* yang otomatis menggabungkan marker rider yang berdekatan menjadi satu badge counter bercahaya cyan saat di-zoom out, dan memecahnya saat di-zoom in.
- **📊 Real-time Leaderboard**: Menggunakan algoritma *nearest-point* pada koordinat rute GPX untuk menghitung jarak yang telah ditempuh (km) dan persentase progress rute (%) setiap rider secara live.
- **👥 3 Mode Akses**:
  - **Rider**: Login simpel menggunakan **Nomor BIB** dan **PIN** via on-screen keypad. Mendapatkan panduan setup Traccar Client otomatis (Server URL, Device ID, Interval 30s).
  - **Admin**: Login terintegrasi dengan kredensial Traccar Server. Manajemen event, upload file GPX, serta penambahan/penghapusan rider.
  - **Penonton / Publik**: Akses bebas tanpa login ke URL `/watch/:eventId` untuk memantau jalannya event.
- **📱 PWA (Progressive Web App)**: Dapat di-*install* langsung ke layar utama Android/iOS/Desktop seperti aplikasi native dan mendukung caching offline.

---

## 🏗️ Arsitektur Sistem

```
+-------------------------------------------------------------+
|                     RIDER SMARTPHONE                        |
|  [Traccar Client App] (Native Android / iOS Service)         |
|  - Interval: 30 detik                                       |
|  - Layar HP mati: TETAP BERJALAN di background              |
+------------------------------+------------------------------+
                               |
                               | HTTP OsmAnd Protocol (Port 5055)
                               v
+-------------------------------------------------------------+
|                     TRACCAR SERVER                          |
|  (Self-hosted di VPS / Dedicated Server)                    |
|  - Port 5055: Menerima data GPS dari Traccar Client         |
|  - Port 8082: Web UI & REST API & WebSocket (/api/socket)   |
+------------------------------+------------------------------+
                               |
                               | Internal WebSocket (/api/socket)
                               v
+-------------------------------------------------------------+
|                 CYCLOPON BACKEND (Node.js)                  |
|  - Express HTTP API (Port 3000)                             |
|  - SQLite (data/cyclopon.db) - Event & Rider Database       |
|  - Traccar WS Proxy (/traccar-ws)                           |
+------------------------------+------------------------------+
                               |
                               | WebSocket & HTTP JSON
                               v
+-------------------------------------------------------------+
|                  CYCLOPON FRONTEND (PWA)                    |
|  - Dark Theme UI (#0D1117, Cyan #00E5FF, Orange #FF6B35)   |
|  - Leaflet.js + Leaflet.markercluster                       |
|  - Real-time GPS & Leaderboard Calculation                  |
+-------------------------------------------------------------+
```

---

## 📂 Struktur Proyek

```
cyclopon/
├── data/                    # Database SQLite (cyclopon.db)
├── db/
│   └── database.js          # SQLite connection & queries (better-sqlite3)
├── lib/
│   └── traccar-ws-proxy.js  # WebSocket proxy (Express ↔ Traccar)
├── public/                  # Frontend SPA & PWA assets
│   ├── css/
│   │   ├── admin.css        # Gaya tata letak admin & tabel
│   │   ├── global.css       # Design tokens, tombol, kartu, badge
│   │   ├── map.css          # Peta Leaflet layar penuh & leaderboard
│   │   └── rider.css        # Keypad PIN & kotak konfigurasi setup
│   ├── gpx/                 # Folder penyimpanan file GPX rute event
│   ├── icons/               # Icon PWA SVG & PNG
│   ├── js/
│   │   ├── lib/
│   │   │   ├── gpx-utils.js # Parser GPX, Haversine, nearest-point math
│   │   │   └── utils.js     # Toast, loadScript, loadCss helper
│   │   ├── pages/
│   │   │   ├── admin-dashboard.js # Admin login & dashboard list event
│   │   │   ├── admin-event.js     # Form edit event, upload GPX, tabel rider
│   │   │   ├── landing.js         # Beranda & event aktif
│   │   │   ├── live-map.js        # Peta Leaflet + WS + Leaderboard
│   │   │   ├── rider-login.js     # Login BIB + Keypad PIN
│   │   │   └── rider-setup.js     # Panduan setup Traccar Client
│   │   ├── app.js           # Inisialisasi rute SPA
│   │   └── router.js        # Client-side router minimal
│   ├── index.html           # SPA HTML Shell
│   ├── manifest.json        # PWA Web App Manifest
│   └── sw.js                # Service Worker (offline cache & network-first)
├── routes/
│   ├── auth.js              # Auth rider (BIB+PIN) & proxy login admin
│   ├── events.js            # API event & upload GPX
│   └── riders.js            # API manajemen rider
├── .env.example             # Contoh variabel konfigurasi environment
├── package.json             # Dependensi & script npm
├── README.md                # Dokumentasi proyek
└── server.js                # Entry point server Express
```

---

## 🚀 Panduan Memulai Cepat (Local Development)

### 1. Prasyarat
- **Node.js**: Versi 18 atau lebih baru (direkomendasikan v20+)
- **Git**

### 2. Instalasi Dependensi
```bash
git clone https://github.com/username/cyclopon.git
cd cyclopon
npm install
```

### 3. Konfigurasi Environment
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Sesuaikan isi file `.env`:
```ini
PORT=3000
TRACCAR_HOST=http://localhost:8082
TRACCAR_USER=admin
TRACCAR_PASS=admin
SESSION_SECRET=cyclopon_super_secret_key_2026
```

### 4. Menjalankan Server & Pengujian Performa
```bash
# Mode development (auto-reload dengan nodemon)
npm run dev

# Menjalankan unit test suite otomatis (88 tests)
npm test

# Menjalankan stress & load benchmark (100 concurrent WS viewers & 200 HTTP burst)
npm run benchmark

# Atau mode production
npm start
```
Buka browser di: **`http://localhost:3000`**

---

## 🚴 Panduan Untuk Rider (Pesepeda)

1. Buka aplikasi web CycloPon di HP lalu klik **Tracking Rider** (atau akses `/rider`).
2. Masukkan **Nomor BIB** dan ketik **PIN** Anda pada keypad layar.
3. Anda akan diarahkan ke halaman **/rider/setup** yang menampilkan rincian konfigurasi:
   - **Server URL**: contoh `http://vps-anda.com:5055`
   - **Device Identifier**: contoh `BIB-001`
   - **Frequency / Interval**: `30` detik
   - **Accuracy**: `High`
4. Install **Traccar Client** dari [Google Play Store](https://play.google.com/store/apps/details?id=org.traccar.client) atau [Apple App Store](https://apps.apple.com/app/traccar-client/id843156976).
5. Buka Traccar Client, masuk ke menu **Settings (⚙️)**, dan masukkan data di atas.
6. Aktifkan saklar **Service status (▶ Start)** hingga muncul notifikasi running.
7. **Kunci atau matikan layar HP Anda** — pelacakan akan berjalan secara otomatis di latar belakang setiap 30 detik!

---

## 🛠️ Panduan Untuk Admin Event

1. Akses **`/admin`** dan login dengan kredensial Traccar Server Anda.
2. Pada Dashboard, klik **+ Buat Event Baru**.
3. Isi nama event dan tanggal kegiatan.
4. Unggah file rute **`.gpx`**.
5. Tambahkan rider ke dalam event:
   - Masukkan **Nomor BIB** (misal `001`).
   - Masukkan **Nama Rider**.
   - Berikan **PIN** (4-6 digit, misal `1234`).
   - Tentukan warna marker rider.
6. Bagikan link **`/watch/:eventId`** kepada penonton atau keluarga untuk memantau live tracking.

---

## 🌐 Panduan Deployment di VPS (Produksi)

CycloPon menyediakan dukungan penuh containerization menggunakan **Docker & Docker Compose** untuk kemudahan instalasi di server VPS tanpa repot menginstal Java, Node, atau web server manual.

### 🐳 Menjalankan Cepat dengan Docker Compose (Rekomendasi)

```bash
# 1. Kloning repositori
git clone https://github.com/kruzx95/cyclopon.git
cd cyclopon

# 2. Siapkan environment
cp .env.example .env

# 3. Jalankan CycloPon + Traccar GPS Server sekaligus
docker compose up -d
```
Aplikasi langsung berjalan di:
- **Web App**: `http://IP-VPS:3000`
- **OsmAnd GPS (Rider Phones)**: `http://IP-VPS:5055`
- **Traccar Dashboard**: `http://IP-VPS:8082`

### 🔒 Opsi Domain Resmi & Otomatis SSL (Caddy HTTPS)
```bash
# Jalankan dengan stack produksi (Caddy auto-SSL untuk port 80 & 443)
docker compose -f docker-compose.prod.yml up -d
```

> 📖 **Panduan Lengkap:** Silakan baca panduan komprehensif di [DEPLOYMENT.md](file:///c:/Users/Mallik/Documents/cyclopon/DEPLOYMENT.md) untuk konfigurasi firewall, domain DNS, skrip backup otomatis, dan setup aplikasi rider.

---

## 📑 Spesifikasi API

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/health` | Health check server status |
| `GET` | `/api/events` | Mendapatkan daftar semua event |
| `GET` | `/api/events/:id` | Detail event tertentu |
| `GET` | `/api/events/:id/riders` | Daftar publik rider dalam event (tanpa PIN) |
| `POST` | `/api/auth/rider` | Autentikasi rider dengan BIB & PIN |
| `POST` | `/api/auth/admin/login` | Login admin via Traccar Server session |
| `POST` | `/api/events/admin` | Membuat event baru |
| `PUT` | `/api/events/admin/:id` | Memperbarui nama/status/tanggal event |
| `POST` | `/api/events/admin/:id/gpx` | Mengunggah file `.gpx` rute event |
| `POST` | `/api/admin/riders` | Menambahkan rider baru ke event |
| `DELETE` | `/api/admin/riders/:id` | Menghapus rider dari event |
| `WS` | `/traccar-ws` | WebSocket proxy real-time stream data posisi GPS |

---

## 📄 Lisensi
MIT License © 2026 CycloPon.
