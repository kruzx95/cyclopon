# 🚀 Panduan Deployment & Operasional Produksi CycloPon di Server VPS (Docker)

Panduan ini menjelaskan langkah demi langkah cara men-deploy dan mengelola **CycloPon Live Cycling Tracker** bersama **Traccar GPS Server** di server VPS (Virtual Private Server) berbasis Linux (Ubuntu / Debian).

---

## 📋 Daftar Isi
1. [Rekomendasi Spesifikasi Server & Biaya](#1-rekomendasi-spesifikasi-server--biaya)
2. [Port Firewall yang Wajib Dibuka](#2-port-firewall-yang-wajib-dibuka)
3. [Instalasi Docker di Server Ubuntu/Debian](#3-instalasi-docker-di-server-ubuntudebian)
4. [Deployment Opsi A: Standalone (IP Publik / Uji Coba)](#4-deployment-opsi-a-standalone-ip-publik--uji-coba)
5. [Deployment Opsi B: Domain Resmi & SSL Otomatis (Caddy HTTPS) — Produksi Utama](#5-deployment-opsi-b-domain-resmi--ssl-otomatis-caddy-https--produksi-utama)
6. [Konfigurasi Smartphone Pesepeda (Traccar Client & Pocket Mode)](#6-konfigurasi-smartphone-pesepeda-traccar-client--pocket-mode)
7. [Alur Pembaruan & Deployment Otomatis ke VPS](#7-alur-pembaruan--deployment-otomatis-ke-vps)
8. [Prosedur Pencadangan (Backup) & Pemulihan (Restore)](#8-prosedur-pencadangan-backup--pemulihan-restore)
9. [Operasional Produksi Sehari-hari (Day-2 Ops) & Pemecahan Masalah](#9-operasional-produksi-sehari-hari-day-2-ops--pemecahan-masalah)

---

## 1. Rekomendasi Spesifikasi Server & Biaya

CycloPon dirancang sangat ringan (**zero-bloat**, Node.js + SQLite WAL mode). Kebutuhan sumber daya server sangat minimal:

| Komponen | Spesifikasi Minimum | Rekomendasi Event (>100 Rider) |
| :--- | :--- | :--- |
| **CPU** | 1 vCPU | 2 vCPU |
| **RAM** | 1 GB | 2 GB |
| **Disk** | 15 GB SSD / NVMe | 25 GB SSD |
| **OS** | Ubuntu 22.04 / 24.04 LTS | Ubuntu 24.04 LTS |
| **Estimasi Biaya** | $3.50 – $5 / bulan (Hetzner / DigitalOcean / IDCloudHost) | $6 – $10 / bulan |

---

## 2. Port Firewall yang Wajib Dibuka

Buka port berikut pada firewall VPS Anda (misalnya melalui UFW atau Security Group AWS/DigitalOcean):

| Port | Protokol | Peruntukan |
| :--- | :--- | :--- |
| `80` | TCP | HTTP Web (Pengalihan otomatis ke HTTPS oleh Caddy) |
| `443` | TCP / UDP | HTTPS Web & HTTP/3 QUIC (Spectator Live Map, Rider Cockpit, & endpoint native `/api/osmand`) |
| `5055` | TCP / UDP | **Protokol OsmAnd GPS Traccar Server** (Menerima koordinat jika menggunakan port raw Traccar) |
| `3000` | TCP | *(Opsi A saja)* Port langsung aplikasi jika tanpa reverse proxy |

Perintah konfigurasi UFW di Ubuntu:
```bash
sudo ufw allow 22/tcp      # SSH (Penting jangan sampai terkunci!)
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 443/udp     # HTTP/3 QUIC
sudo ufw allow 5055/tcp    # Traccar OsmAnd GPS (Opsional jika memakai port 5055)
sudo ufw enable
```

---

## 3. Instalasi Docker di Server Ubuntu/Debian

Jalankan perintah resmi Docker untuk memasang Docker Engine dan Docker Compose:

```bash
# Update repository paket
sudo apt update && sudo apt install -y ca-certificates curl gnupg

# Tambahkan GPG key resmi Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Tambahkan repository Docker ke Apt
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Pasang Docker Engine dan Docker Compose Plugin
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Masukkan user saat ini ke grup docker (opsional, agar tidak perlu 'sudo docker')
sudo usermod -aG docker $USER
```

---

## 4. Deployment Opsi A: Standalone (IP Publik / Uji Coba)

Gunakan opsi ini jika Anda ingin menguji langsung menggunakan alamat IP server (misalnya: `http://103.123.45.67:3000`).

### Langkah 1: Kloning Repositori
```bash
git clone https://github.com/kruzx95/cyclopon.git
cd cyclopon
```

### Langkah 2: Buat Berkas Konfigurasi `.env`
```bash
cp .env.example .env
nano .env
```
Sesuaikan variabel berikut di `.env`:
```env
PORT=3000
ADMIN_USER=admin
ADMIN_PASSWORD=KredensialKuatAdmin2026!
TRACCAR_HOST=http://traccar:8082
TRACCAR_USER=admin
TRACCAR_PASS=admin
SESSION_SECRET=buat_kombinasi_acak_yang_panjang_disini

# Notifikasi Eksternal Panitia (Opsional)
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRstuVWXyz
TELEGRAM_CHAT_ID=-1001234567890
WEBHOOK_URL=https://webhook.site/your-uuid
NOTIF_SOS_ENABLED=true
NOTIF_COT_ENABLED=true
```

### Langkah 3: Jalankan Layanan dengan Docker Compose
```bash
docker compose up -d --build
```

Setelah selesai, CycloPon dapat diakses di:
* **Web CycloPon:** `http://IP_VPS:3000`
* **Traccar Admin:** `http://IP_VPS:8082`
* **Endpoint GPS Rider:** `http://IP_VPS:5055` atau `http://IP_VPS:3000/api/osmand`

---

## 5. Deployment Opsi B: Domain Resmi & SSL Otomatis (Caddy HTTPS) — Produksi Utama

Gunakan opsi ini untuk **environment produksi resmi** dengan nama domain sendiri (contoh: `live.audaxrinjani.com`). Caddy akan menerbitkan sertifikat SSL Let's Encrypt secara otomatis.

### Langkah 1: Arahkan DNS Domain
Di panel DNS registrar domain Anda (Cloudflare, Niagahoster, Namecheap, dll.):
* Buat **A Record**: `live` (atau `@`) mengarah ke alamat **IP Publik VPS**.

### Langkah 2: Buat Berkas `.env` Produksi
```bash
cp .env.example .env
nano .env
```
Isi konfigurasi produksi:
```env
DOMAIN=live.audaxrinjani.com
ACME_EMAIL=panitia@audaxrinjani.com
ADMIN_USER=admin
ADMIN_PASSWORD=GantiPasswordKuatAdminCycloPon2026!
SESSION_SECRET=kunci_rahasia_acak_minimal_32_karakter_aman_sekali
TRACCAR_USER=admin
TRACCAR_PASS=GantiPasswordKuatTraccar2026!

# Notifikasi Telegram Panitia
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRstuVWXyz
TELEGRAM_CHAT_ID=-1001234567890
```

### Langkah 3: Jalankan Stack Produksi
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Caddy akan otomatis mendaftarkan sertifikat SSL gratis. Website langsung aktif di:
👉 **`https://live.audaxrinjani.com`** (Gembok hijau SSL aktif!)

---

## 6. Konfigurasi Smartphone Pesepeda (Traccar Client & Pocket Mode)

CycloPon mendukung 3 metode pelacakan posisi GPS:

### Metode 1: Traccar Client via Native Endpoint HTTPS (Sangat Direkomendasikan)
Menggunakan endpoint native `/api/osmand` lewat HTTPS port 443 standar Caddy, sehingga **bebas dari masalah pemblokiran port non-standar oleh operator seluler**.

1. Buka aplikasi **Traccar Client** di smartphone rider.
2. Masuk ke **Settings (⚙️)**:
   * **Device identifier**: Masukkan `BIB-` diikuti nomor BIB resmi (Contoh: `BIB-001` atau `BIB-012`).
   * **Server URL**: Masukkan URL HTTPS domain Anda:
     ```text
     https://live.domainanda.com/api/osmand
     ```
   * **Location accuracy**: Pilih **`Highest`**.
   * **Interval (seconds)**: Atur ke **`10` detik** (akurat) atau **`30` detik** (ultra-endurance).
   * **Distance (meters)**: Atur ke **`0` meter**.
3. **Pengaturan Lanjutan (Advanced Settings)**:
   * **Offline buffering**: **ON (Aktif)** — Titik GPS disimpan saat blank spot dan otomatis tersinkron ketika sinyal kembali.
   * **Stop detection**: **OFF (Nonaktifkan)**.
   * **Use system location**: **ON (Aktif)**.
4. Aktifkan saklar **Status layanan (▶ Start / Hijau)**.
5. **Izin Lokasi Latar Belakang Android (PENTING)**:
   * Pilih **`Allow all the time` (Izinkan sepanjang waktu)** agar GPS tidak mati saat layar HP dikunci atau masuk saku.
   * Pastikan **`Use precise location` tetap AKTIF (ON)**.

---

### Metode 2: Traccar Client via Port Raw 5055
Bila menggunakan port standar Traccar OsmAnd:
* **Server URL**: `http://IP_VPS:5055` atau `http://live.domainanda.com:5055`
* Pengaturan lainnya sama dengan Metode 1 di atas.

---

### Metode 3: In-Browser Pocket Tracker (Lacak di Kantong Tanpa Aplikasi Tambahan)
Rider tidak wajib menginstal aplikasi Traccar Client jika tidak mau:
1. Rider membuka web CycloPon di browser HP, login dengan **BIB & PIN**.
2. Pilih kartu **"Lacak di Kantong"**.
3. Tekan **"Mulai Lacak di Kantong"** dan izinkan akses lokasi browser.
4. CycloPon akan memutar loop audio sunyi (*silent audio keep-alive*) untuk mencegah browser tidur saat layar dikunci di saku jersey.

---

## 7. Alur Pembaruan & Deployment Otomatis ke VPS

Gunakan script deploy runner dari laptop untuk commit, push, dan build ulang container di VPS secara otomatis:

```bash
# Deploy rilis terbaru ke VPS
npm run deploy:vps

# Deploy dengan pesan commit kustom
npm run deploy:vps -- -m "feat: perbaikan fitur X"

# Deploy dengan build ulang image Docker (bila ada dependensi baru di package.json)
npm run deploy:vps -- --rebuild

# Deploy sekaligus sinkronisasi database lokal ke VPS (opsional)
npm run deploy:vps -- --sync-db
```

Konfigurasi IP VPS, SSH User, dan direktori target dapat disesuaikan lewat environment variable:
* `VPS_IP` (default: `43.173.51.161`)
* `VPS_USER` (default: `ubuntu`)
* `VPS_DIR` (default: `/home/ubuntu/cyclopon`)

---

## 8. Prosedur Pencadangan (Backup) & Pemulihan (Restore)

### Menjalankan Backup Manual
```bash
chmod +x scripts/backup.sh scripts/restore.sh
./scripts/backup.sh
```
File arsip berstempel waktu akan dibuat di `./backups/cyclopon_backup_YYYYMMDD_HHMMSS.tar.gz`.

### Mengatur Backup Otomatis Harian (Cron Job di VPS)
Buka crontab di VPS:
```bash
crontab -e
```
Tambahkan entri backup setiap pukul 02:00 pagi:
```cron
0 2 * * * cd /home/ubuntu/cyclopon && ./scripts/backup.sh >> /var/log/cyclopon-backup.log 2>&1
```

### Memulihkan Data (Restore)
```bash
./scripts/restore.sh ./backups/cyclopon_backup_YYYYMMDD_HHMMSS.tar.gz
docker compose -f docker-compose.prod.yml restart cyclopon
```

---

## 9. Operasional Produksi Sehari-hari (Day-2 Ops) & Pemecahan Masalah

### Memeriksa Status Kontainer Produksi
```bash
docker compose -f docker-compose.prod.yml ps
```

### Memeriksa Log Kontainer Produksi (Real-time)
```bash
# Log aplikasi CycloPon
docker compose -f docker-compose.prod.yml logs -f cyclopon

# Log Caddy Reverse Proxy & Sertifikat SSL
docker compose -f docker-compose.prod.yml logs -f caddy

# Log Traccar GPS Server
docker compose -f docker-compose.prod.yml logs -f traccar
```

### Membersihkan Data Demo Sebelum Hari-H Event
Untuk memastikan database bersih dari data rider demo dan jejak GPS uji coba sebelum event balap resmi dimulai:
```bash
docker compose -f docker-compose.prod.yml exec cyclopon node scripts/clean-demo-data.js
```

### Me-restart Seluruh Layanan Produksi
```bash
docker compose -f docker-compose.prod.yml restart
```

### Memperbarui CycloPon Manual di Server
```bash
git -c core.fileMode=false pull origin master
docker compose -f docker-compose.prod.yml up -d --build --force-recreate
```

> **Catatan:** Seluruh data event, nomor BIB, checkpoint, dan rute GPX tersimpan aman di Docker Named Volumes (`cyclopon_data` dan `cyclopon_gpx`), sehingga tidak akan hilang saat container di-rebuild atau di-restart.
