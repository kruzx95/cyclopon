# Panduan Penggunaan Skill & Plugin Global

Dokumen ini merangkum seluruh plugin, skill, dan subagent yang telah terpasang secara global di laptop Anda, beserta cara memanggil dan menggunakannya dalam alur kerja coding harian.

---

## Ringkasan Plugin yang Terpasang

| Plugin | Sumber | Jumlah Skill | Fokus Utama |
| :--- | :--- | :--- | :--- |
| **`antislop`** | [miqdadbadjuber/anti-slop](https://github.com/miqdadbadjuber/anti-slop) | 6 Skills | Memfilter generic AI slop (UI generik, teks basa-basi, komentar berlebihan). |
| **`everything-claude-code`** | [WorldFlowAI/everything-claude-code](https://github.com/WorldFlowAI/everything-claude-code) | 26 Skills + 9 Agents | Standar engineering komprehensif (TDD, review keamanan, perbaikan build, E2E). |
| **`superpowers`** | [obra/superpowers](https://github.com/obra/superpowers) | 15 Skills | Disiplin alur kerja software (Systematic debugging, worktree, plan execution). |

---

## 1. Plugin: Anti-Slop (`antislop`)

Anti-slop adalah **filter (bukan style guide)**. Tujuannya adalah menghentikan kebiasaan bawaan AI yang sering menghasilkan UI klise (seperti gradient ungu-ke-biru tanpa alasan), copy marketing yang penuh basa-basi (*"seamless, revolutionize"*), dan komentar kode yang tidak penting.

### Daftar Skill
1. **`antislop`** (Core): Filter utama yang memvalidasi pola output.
2. **`antislop-ui`**: Memfilter desain antarmuka, tata letak kartu bertingkat (excessive card wrappers), warna badge klise, dan estetika generic.
3. **`antislop-copywriting`**: Menghapus teks pemasaran hiperbolis, data palsu, dan struktur kalimat khas template AI.
4. **`antislop-human`**: Standar aksesibilitas manusia (kontras warna WCAG, navigasi keyboard, focus ring, state tombol).
5. **`antislop-layoutmobile`**: Layout responsif, breakpoint, sentuhan tap target, dan overflow handling.
6. **`antislop-code`**: Membersihkan komentar kode boilerplate/redundant tanpa mengubah logika program.

### Cara Penggunaan
- **Otomatis**: Skill ini otomatis aktif ketika Anda meminta pekerjaan terkait UI, penulisan copy, responsive layout, atau pembersihan kode.
- **Eksplisit**: Anda bisa memintanya langsung dalam prompt:
  ```text
  "Buatkan landing page untuk produk X, terapkan skill antislop-ui dan antislop-human."
  "Bersihkan file server.js menggunakan antislop-code."
  ```
- **Pengaturan Mode Global**:
  ```bash
  npx antislop-ai --mode during   # Filter aktif saat kode dibuat
  npx antislop-ai --mode after    # Filter berjalan sebagai audit setelah kode dibuat
  npx antislop-ai --mode ask      # AI menanyakan preferensi setiap sesi baru
  ```

---

## 2. Plugin: Everything Claude Code

Bundle alat engineering profesional yang berisi pola backend/frontend, verifikasi otomatis, dan subagent terspesialisasi.

### A. Subagents Tersedia
Anda dapat meminta agent utama mendelegasikan tugas ke subagent spesialis:
- **`planner`**: Membuat breakdown dan rencana implementasi fitur kompleks sebelum coding dimulai.
- **`architect`**: Mengevaluasi keputusan arsitektur, skalabilitas sistem, dan pemilihan pola desain.
- **`tdd-guide`**: Memandu metodologi Test-Driven Development (tes dibuat dulu sebelum kode implementasi).
- **`code-reviewer`**: Melakukan review menyeluruh pada kode yang baru ditulis (kualitas, performa, bug tersembunyi).
- **`security-reviewer`**: Audit celah keamanan (OWASP, injeksi SQL/XSS, leak API key, sanitasi input).
- **`build-error-resolver`**: Menyelesaikan kegagalan build dan type errors secara presisi dan minim diff.
- **`e2e-runner`**: Membuat dan menjalankan end-to-end testing dengan Playwright.
- **`refactor-cleaner`**: Membersihkan dead code, duplikasi logika, dan dependensi tidak terpakai.
- **`doc-updater`**: Memperbarui dokumentasi, README, dan codemap project.

### B. Command Skills Populer
| Command / Skill | Fungsi | Contoh Prompt |
| :--- | :--- | :--- |
| `plan` | Analisis kebutuhan dan susun langkah kerja bertahap | *"Gunakan skill plan untuk migrasi database dari sqlite ke postgres."* |
| `verify` / `verification-loop` | Menjalankan checklist verifikasi 4 tahap (Build, Types, Lint, Tests) | *"Jalankan verification-loop sebelum saya merge branch ini."* |
| `security-review` | Cek keamanan endpoint API atau modul auth | *"Lakukan security-review untuk routes/auth.js."* |
| `tdd` / `tdd-workflow` | Workflow RED-GREEN-REFACTOR | *"Implementasikan fitur pencarian produk dengan alur tdd-workflow."* |
| `build-fix` | Deteksi dan perbaiki error build secara instan | *"Jalankan build-fix untuk mengatasi error kompilasi sekarang."* |
| `refactor-clean` | Audit dan bersihkan fungsi/variabel yang tidak terpakai | *"Lakukan refactor-clean pada direktori lib/."* |

---

## 3. Plugin: Superpowers

Kumpulan runbook dan disiplin metodologi software engineering dari pengembang independen Jesse Vincent.

### Skill Unggulan
1. **`systematic-debugging`**:
   - Mencegah debugging tebak-tebakan.
   - Mengisolasi akar masalah, mengumpulkan bukti log/trace, mereproduksi kegagalan dengan minimal test case, baru memperbaiki.
   - *Prompt*: *"Ada bug pada fitur login, gunakan systematic-debugging untuk investigasi."*
2. **`test-driven-development`**:
   - Disiplin ketat: tulis unit test yang gagal (RED) $\rightarrow$ implementasi minimal hingga lulus (GREEN) $\rightarrow$ rapikan (REFACTOR).
3. **`using-git-worktrees`**:
   - Membantu isolasi pengerjaan fitur atau perbaikan darurat tanpa mengganggu workspace saat ini.
4. **`verification-before-completion`**:
   - Memastikan tidak ada klaim *"sudah selesai"* sebelum perintah tes dan bukti eksekusi diverifikasi langsung.

*(Catatan: Khusus di repositori `cyclopon`, rule `GEMINI.md` disetel agar agent merespons langsung tanpa birokrasi perencanaan, kecuali bila Anda secara spesifik memintanya).*

---

## Contoh Alur Kerja Harian (Use Cases)

### Skenario 1: Menambahkan Fitur Baru dengan TDD
```text
"Saya ingin menambahkan fitur verifikasi email pada pendaftaran user.
Tolong gunakan tdd-guide / tdd-workflow: buatkan test skenario dulu,
lalu implementasikan kodenya hingga pass."
```

### Skenario 2: Mereview Desain Tampilan Web
```text
"Saya baru membuat komponen kartu profil di public/profile.html.
Tolong audit tampilannya dengan skill antislop-ui dan antislop-human
agar tidak terkesan generic AI dan ramah aksesibilitas."
```

### Skenario 3: Investigasi Bug yang Sulit Dilacak
```text
"Endpoint GET /api/data kadang mengembalikan status 500 saat traffic tinggi.
Gunakan systematic-debugging untuk menemukan root cause dan rancang solusinya."
```

### Skenario 4: Audit Keamanan & Kualitas Sebelum Deploy
```text
"Sebelum rilis ke production, jalankan security-review dan verification-loop
pada seluruh perubahan terbaru."
```

---

## Perintah Terminal Berguna

- **Melihat status plugin yang aktif**:
  ```bash
  agy plugin list
  ```
- **Memvalidasi integritas plugin**:
  ```bash
  agy plugin validate ~/.gemini/config/plugins/<nama-plugin>
  ```
- **Menonaktifkan plugin sementara**:
  ```bash
  agy plugin disable <nama-plugin>
  ```
- **Mengaktifkan kembali plugin**:
  ```bash
  agy plugin enable <nama-plugin>
  ```

