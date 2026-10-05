# 🚀 Panduan Deployment Produksi CycloPon di Server VPS (Docker)

Panduan ini menjelaskan langkah demi langkah cara men-deploy **CycloPon Live Cycling Tracker** bersama **Traccar GPS Server** di server VPS (Virtual Private Server) berbasis Linux (Ubuntu / Debian).

---

## 📋 Daftar Isi
1. [Rekomendasi Spesifikasi Server & Biaya](#1-rekomendasi-spesifikasi-server--biaya)
2. [Port Firewall yang Wajib Dibuka](#2-port-firewall-yang-wajib-dibuka)
3. [Instalasi Docker di Server Ubuntu/Debian](#3-instalasi-docker-di-server-ubuntudebian)
4. [Deployment Opsi A: Standalone (IP Publik / Uji Coba)](#4-deployment-opsi-a-standalone-ip-publik--uji-coba)
5. [Deployment Opsi B: Domain Resmi & SSL Otomatis (Caddy HTTPS)](#5-deployment-opsi-b-domain-resmi--ssl-otomatis-caddy-https)
6. [Konfigurasi Smartphone Pesepeda (Traccar Client / OsmAnd)](#6-konfigurasi-smartphone-pesepeda-traccar-client--osmand)
7. [Prosedur Pencadangan (Backup) & Pemulihan (Restore)](#7-prosedur-pencadangan-backup--pemulihan-restore)
8. [Pemecahan Masalah (Troubleshooting) & Perintah Berguna](#8-pemecahan-masalah-troubleshooting--perintah-berguna)

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
| `443` | TCP / UDP | HTTPS Web & HTTP/3 QUIC (Spectator Live Map & Rider Cockpit) |
| `5055` | TCP / UDP | **Protokol OsmAnd GPS** (Menerima koordinat dari smartphone rider) |
| `3000` | TCP | *(Opsi A saja)* Port langsung aplikasi jika tanpa reverse proxy |

Perintah konfigurasi UFW di Ubuntu:
```bash
sudo ufw allow 22/tcp      # SSH (Penting jangan sampai terkunci!)
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 443/udp     # HTTP/3 QUIC
sudo ufw allow 5055/tcp    # Traccar OsmAnd GPS
sudo ufw allow 3000/tcp    # Opsi A Standalone
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

Setelah selesai, CycloPon dapat diakses di browser:
* **Web CycloPon:** `http://IP_VPS:3000`
* **Traccar Admin:** `http://IP_VPS:8082` (User: `admin`, Pass: `admin`)
* **Endpoint GPS Rider:** `http://IP_VPS:5055`

---

## 5. Deployment Opsi B: Domain Resmi & SSL Otomatis (Caddy HTTPS)

Gunakan opsi ini untuk **event resmi** dengan nama domain sendiri (contoh: `live.audaxrinjani.com`). Caddy akan menerbitkan sertifikat SSL Let's Encrypt secara otomatis dalam hitungan detik.

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

Caddy akan otomatis mendaftarkan sertifikat SSL gratis. Website Anda langsung aktif di:
👉 **`https://live.audaxrinjani.com`** (Gembok hijau SSL aktif!)

---

## 6. Konfigurasi Smartphone Pesepeda (Traccar Client / OsmAnd)

Pesepeda tidak perlu mengunduh aplikasi aneh. Cukup gunakan **Traccar Client** resmi (tersedia gratis di Google Play Store & Apple App Store) atau langsung dari browser via Rider Cockpit.

Jika menggunakan aplikasi **Traccar Client** di HP rider:
1. Buka aplikasi **Traccar Client**.
2. **Device Identifier:** Masukkan `BIB-` diikuti nomor BIB (Contoh: `BIB-101` atau `BIB-002`).
3. **Server URL:**
   * Jika Opsi A: `http://IP_VPS:5055`
   * Jika Opsi B: `http://live.audaxrinjani.com:5055`
4. **Location Accuracy:** *High*
5. **Frequency / Interval:** `10` detik (ideal untuk event sepeda jalan raya).
6. Nyalakan tombol switch **Status: Service Running**.

Data posisi GPS rider akan langsung muncul di peta secara real-time!

---

## 7. Prosedur Pencadangan (Backup) & Pemulihan (Restore)

### Menjalankan Backup Manual
Skrip pencadangan telah disiapkan di folder `scripts/`:
```bash
chmod +x scripts/backup.sh scripts/restore.sh
./scripts/backup.sh
```
Skrip akan membuat berkas arsip berstempel waktu di folder `./backups/cyclopon_backup_YYYYMMDD_HHMMSS.tar.gz`.

### Mengatur Backup Otomatis Harian (Cron Job)
Tambahkan entri cron job agar server mencadangkan data setiap pukul 02:00 pagi:
```bash
crontab -e
```
Tambahkan baris berikut:
```cron
0 2 * * * cd /home/ubuntu/cyclopon && ./scripts/backup.sh >> /var/log/cyclopon-backup.log 2>&1
```

### Memulihkan Data (Restore)
Bila ingin memulihkan database dari arsip backup:
```bash
./scripts/restore.sh ./backups/cyclopon_backup_20261006_120000.tar.gz
docker compose restart cyclopon
```

---

## 8. Pemecahan Masalah (Troubleshooting) & Perintah Berguna

### Memeriksa Log Kontainer
```bash
# Lihat log CycloPon secara live
docker compose logs -f cyclopon

# Lihat log Traccar Server
docker compose logs -f traccar

# Lihat log Reverse Proxy Caddy
docker compose -f docker-compose.prod.yml logs -f caddy
```

### Memeriksa Status Kontainer
```bash
docker compose ps
```

### Me-restart Seluruh Layanan
```bash
docker compose restart
```

### Meng-update CycloPon ke Versi Terbaru
```bash
git pull
docker compose build --no-cache cyclopon
docker compose up -d
```
> **Catatan:** Seluruh data event, nomor BIB, dan checkpoint **tidak akan hilang** karena tersimpan aman di Docker Named Volume (`cyclopon_data`).
