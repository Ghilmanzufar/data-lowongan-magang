# MagangHub IT & Informatika Tracker

Aplikasi web pelacak lowongan **Program Pemagangan Kemnaker RI** yang dikhususkan 100% untuk mahasiswa dan lulusan rumpun **Teknik Informatika, Ilmu Komputer, Sistem Informasi, Rekayasa Perangkat Lunak, dan Teknologi Informasi**.

Aplikasi ini menyaring lowongan dari luar bidang IT secara otomatis (*strict major filtering*) sehingga pelamar tidak perlu membuang waktu memilah ribuan lowongan non-IT di portal utama.

---

## Fitur Utama

- **Strict IT Major Filtering**: Secara otomatis menyaring lowongan agar hanya menampilkan posisi yang menerima rumpun Informatika/Ilkom/SI/TI/RPL.
- **Kategorisasi Sub-Bidang IT**:
  - 💻 **Software & Web Dev** (Programmer, Fullstack, Frontend, Backend, Mobile)
  - 📊 **Data & AI** (Data Analyst, Data Scientist, Machine Learning, Database)
  - 🛡️ **Jaringan & Cloud** (Network Engineer, Cloud, DevOps, SysAdmin, Cyber Security)
  - 🛠️ **IT Support & Ops** (IT Support, Helpdesk, Teknisi Komputer)
  - 🎨 **UI/UX & Produk** (UI/UX Designer, Product Design)
- **Tingkat Peluang Terbuka**: Indikator peluang persaingan berdasarkan rasio formasi kuota terhadap jumlah pelamar.
- **Filter Multi-Kriteria**: Filter jenjang (Sarjana S1 vs Diploma D3/D4), pencarian instansi/posisi, dan lokasi kota.
- **Sistem Bookmark Favorit**: Simpan lowongan yang diminati ke browser (`localStorage`) untuk dipantau sewaktu-waktu.
- **Tautan Pendaftaran Resmi**: Tombol langsung menuju laman lowongan resmi di portal Kemnaker (`https://maganghub.kemnaker.go.id/magang-nasional/lowongan/{id}`).
- **Modern Developer Aesthetic**: Antarmuka responsif bertema teknologi modern (*dark mode*, tipografi *Plus Jakarta Sans* & *JetBrains Mono*, ramah perangkat mobile & desktop).

---

## Struktur Proyek

```
magang-hub/
├── api/
│   └── jobs.js            # Serverless function: scraper, filter ketat IT, caching
├── public/
│   ├── index.html         # Antarmuka SPA
│   ├── style.css          # Desain tema teknologi modern & responsif
│   └── app.js             # State management, filter instan, & bookmark
├── server.js              # Server lokal Node.js (development)
├── vercel.json            # Konfigurasi deployment Vercel
├── package.json           # Metadata & script proyek
└── README.md              # Dokumentasi proyek
```

---

## Cara Menjalankan Secara Lokal

1. **Pastikan Node.js terpasang** (versi 18+ disarankan).
2. **Jalankan server lokal**:
   ```bash
   npm start
   ```
   *atau:*
   ```bash
   node server.js
   ```
3. **Buka peramban**:
   Kunjungi [http://localhost:3000](http://localhost:3000)

4. **Sinkronisasi / Memperbarui Database Lowongan Lengkap**:
   Untuk menjalankan penjelajahan mendalam (*deep crawler*) ke puluhan halaman nasional & 21 kategori IT Kemnaker:
   ```bash
   npm run sync
   ```
   Data akan otomatis diperbarui dan disimpan ke `data/jobs.json`.

---

## Endpoint API

- `GET /api/jobs`
  Mengembalikan daftar lowongan IT aktif dalam format JSON.
  - Parameter opsional:
    - `?refresh=true` : Memaksa pembaruan data langsung dari portal Kemnaker.
    - `?category=software` : Menyaring berdasarkan sub-role (`software`, `data`, `network`, `support`, `uiux`).
    - `?degree=sarjana` : Menyaring berdasarkan jenjang (`sarjana`, `diploma`).
    - `?opportunity=high` : Menyaring lowongan berpeluang besar (kuota longgar).
    - `?q=programmer` : Pencarian teks bebas.

---

## Deployment ke Vercel (Gratis 100%)

1. Pasang Vercel CLI (jika belum):
   ```bash
   npm i -g vercel
   ```
2. Deploy langsung dari folder ini:
   ```bash
   vercel
   ```
3. Ikuti petunjuk singkat di terminal. Aplikasi akan langsung aktif secara daring di domain gratis `.vercel.app`.
