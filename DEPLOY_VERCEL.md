# Panduan deploy CivicSense ke Vercel

Versi: 14 November 2026 — Next.js 15 / TypeScript / Prisma 6 / Neon PostgreSQL / Cloudinary.

## A. Perbaikan dari error build sebelumnya

Screenshot Vercel menunjukkan error TypeScript di `src/services/report.service.ts`:

```
Type error: Variable 'photos' implicitly has type 'any[]'
```

Kedua array `photos` sekarang menggunakan tipe `CloudinaryPhoto[]` yang eksplisit. Selain itu, `package.json` menjalankan `prisma generate && next build` agar Prisma Client tidak kedaluwarsa akibat cache build Vercel. `postinstall: prisma generate` tetap dipertahankan.

## B. Struktur proyek dan impor GitHub

ZIP ini berisi **isi proyek langsung di root ZIP** (`package.json`, `src/`, `prisma/`, `vercel.json`).

1. Ekstrak ZIP. Push file/folder di dalamnya ke **root repository GitHub** (jangan mengunggah file ZIP sebagai satu file).
2. Jika GitHub Anda sudah memiliki source lama, timpa file yang berubah; jangan hapus `.git` atau kredensial lokal Anda. **Jangan push `.env`**.
3. Vercel > Add New > Project > Import Git Repository.
4. Framework Preset: **Next.js**. Root Directory: `./` bila `package.json` berada di root repo. Jika file aplikasi masih ditempatkan di folder `projrct`, pilih `projrct` sebagai Root Directory, bukan `./`.
5. Build Command: `npm run build` (atau biarkan default). Install Command: `npm install` (atau default). Output Directory: **kosong/default** (Next.js menentukan outputnya sendiri).
6. Versi Node.js: **22.x** (sudah ditentukan pada `package.json` -> `engines`).

## C. Environment Variables di Vercel

Masuk ke Project > Settings > Environment Variables. Tambahkan, **tanpa nama atau nilai contoh di bawah ini**:

| Name | Nilai | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | URL koneksi Neon **pooled** (`-pooler`) | Database saat aplikasi berjalan; isi yang asli |
| `DIRECT_URL` | URL koneksi Neon **direct** | Untuk Prisma migrate; isi yang asli |
| `CLOUDINARY_CLOUD_NAME` | Cloud name Cloudinary | Rahasia di sisi server |
| `CLOUDINARY_API_KEY` | API key Cloudinary | Rahasia di sisi server |
| `CLOUDINARY_API_SECRET` | API secret Cloudinary | Rahasia di sisi server |

Pilih environment yang diperlukan: Production, Preview, dan Development sesuai penggunaan. Gunakan database/akun foto uji terpisah untuk Preview jika memungkinkan. Nilai password dalam connection string yang mengandung karakter khusus harus di-URL-encode. Jangan gunakan awalan `NEXT_PUBLIC_` pada secret.

Contoh **format** koneksi, bukan nilai yang bisa digunakan:

```
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxxx-pooler.ap-southeast-1.aws.neon.tech/DB?sslmode=require
DIRECT_URL=postgresql://USER:PASSWORD@ep-xxxxx.ap-southeast-1.aws.neon.tech/DB?sslmode=require
```

Host/region Neon milik Anda bisa berbeda. Gunakan string koneksi dari konsol Neon, jangan menebak hostname.

**PENTING:** Jika sebelumnya environment variables disimpan di Vercel, cek apakah variabelnya juga diterapkan ke environment deployment yang gagal. Setelah mengubah variabel, lakukan Redeploy.

## D. Migrasi database Neon (sebelum deploy produksi)

Dari laptop/PC pada folder proyek yang sama:

```bash
npm install
# Buat .env dari .env.example; isi dengan kredensial Anda sendiri
npx prisma generate
npx prisma migrate deploy
```

Lakukan **backup/branch Neon terlebih dahulu** bila database sudah berisi data. `migrate deploy` menerapkan migrasi yang belum diterapkan dan tidak menghapus seluruh data secara otomatis. Jangan jalankan `prisma migrate reset` pada database produksi.

Jika membutuhkan kategori dan akun awal, masukkan `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_OFFICER_EMAIL`, `SEED_OFFICER_PASSWORD` ke `.env` lokal (kata sandi min. 12 karakter), lalu jalankan:

```bash
npm run db:seed
```

Seed ini opsional untuk database yang sudah berisi pengguna dan kategori. Tidak perlu menyimpan variabel `SEED_*` di Vercel; jalankan seed dari lingkungan terpercaya.

**Penting:** Migrasi Neon tidak dijalankan otomatis saat `next build`, supaya deployment Vercel tidak tanpa sengaja mengubah database produksi.

## E. Pemeriksaan build di komputer sebelum push

```bash
npm install
npm run typecheck
npm run build
```

Pastikan tidak ada error. Jika muncul error baru, lihat nama file dan baris pada Vercel Build Logs; bukan hanya pesan akhir `Command "npm run build" exited with 1`.

## F. Batas foto Cloudinary di Vercel

Vercel Function membatasi request body sekitar **4,5 MB**. Aplikasi ini masih memakai upload melalui backend (`/api/upload`) ke Cloudinary, namun batas foto di frontend dan server sudah diselaraskan ke **4 MB per foto**, dengan kompresi di browser. Jika ingin unggah file jauh lebih besar, pengembangan berikutnya adalah **signed direct browser-to-Cloudinary upload**, bukan menaikkan batas fungsi Vercel.

## G. Cek setelah deployment

1. Buka `/` untuk feed, `/register` untuk pendaftaran, `/login` untuk masuk.
2. Buka `/reports` dan `/api/reports` untuk menguji pembacaan database. Jika 500, cek `DATABASE_URL`, koneksi Neon dan migrasi.
3. Buat laporan: kategori tersedia, ambil GPS/alamat, unggah foto di bawah 4 MB ke Cloudinary, kirim laporan.
4. Uji login admin `/admin` dan petugas `/officer`, perubahan status, unggah bukti, dan profil `/users/[id]`.
5. Jika `PrismaClientInitializationError`: cek koneksi, `DATABASE_URL` dan Neon aktif. Jika tabel belum ditemukan (`P2021`): jalankan `npx prisma migrate deploy`. Jika unggahan gagal: cek variabel Cloudinary, ukuran foto, dan log `/api/upload`.
6. Jika deploy gagal sewaktu pengecekan TypeScript, jalankan `npm run typecheck` di source code yang sama dan periksa bahwa commit terbaru benar-benar digunakan Vercel.

## H. Batasan untuk pemakaian publik

- Rate limit di kode saat ini memakai memori proses dan **tidak global di Vercel serverless**. Untuk produksi serius, gunakan rate limiter berbasis penyimpanan bersama (mis. Redis/Upstash) dan moderasi konten.
- Foto tersimpan pada Cloudinary, **bukan** filesystem Vercel (yang tidak boleh dipakai untuk penyimpanan persisten).
- Prisma menggunakan pooled `DATABASE_URL` untuk beban serverless. Sebaiknya pilih region Vercel yang dekat dengan region Neon agar latency rendah.
- URL gambar Cloudinary yang dipublikasikan bisa diakses orang yang mengetahui URL-nya; jangan unggah informasi pribadi/sensitif.
- Paket ini telah melalui pemeriksaan sintaks dan path impor lokal, **belum melalui build penuh** di lingkungan pembuatan karena registry npm tidak dapat diakses. Wajib menjalankan cek pada bagian E sebelum produksi.


## I. Kotak Masuk, notifikasi komentar, dan pesan privat (14 November 2026)

Versi ini menambahkan migrasi `20261114110000_inbox_messaging`. Migrasi membuat tabel `Notification`, `Conversation`, dan `Message` tanpa menghapus data CivicSense sebelumnya.

**Sebelum deployment:**
1. Buat backup atau branch Neon.
2. Di root proyek, dengan `.env` berisi `DATABASE_URL` pooled dan `DIRECT_URL` direct:
   ```bash
   npm install
   npx prisma generate
   npx prisma migrate deploy
   npm run typecheck
   npm run build
   ```
3. Commit dan push source ke GitHub, lalu deploy ulang Vercel. Tidak ada environment variable baru yang diperlukan.

**Skenario uji setelah deployment:**
1. Login sebagai Warga A, buat satu laporan.
2. Login sebagai Warga B (browser/incognito berbeda), buka laporan Warga A, kirim komentar.
3. Kembali ke Warga A. Lencana merah Kotak Masuk harus bertambah; buka `/inbox` > **Aktivitas**, lalu klik notifikasi untuk kembali ke diskusi laporan.
4. Dari profil Warga B, klik **Kirim pesan**. Kirim pesan dari Warga A dan pastikan hanya Warga A/B dapat membuka URL percakapan.
5. Login sebagai petugas dan admin. Pastikan kedua peran juga memiliki Kotak Masuk, dapat memulai percakapan, dan hanya melihat percakapan yang mereka ikuti.
6. Buka chat di akun penerima. Pesan harus berubah menjadi status dibaca dan angka lencana berkurang.
7. Uji akses URL percakapan dengan akun ketiga; server harus mengembalikan 404.

Chat memakai polling 4 detik (bukan WebSocket), sehingga pembaruan mendekati real-time dan sesuai model fungsi Vercel. Rate limit saat ini best-effort per instance; untuk pemakaian publik skala besar, ganti dengan Redis/Upstash dan tambahkan fitur blokir/laporkan pengguna serta moderasi pesan.


## Pembaruan video, tema gelap, dan status pesan

Versi ini menambahkan migrasi `20261116140000_report_video_uploads` untuk tabel `ReportVideo`. Sebelum push kode baru ke Production:

1. Buat backup/branch database Neon Production.
2. Pastikan `DATABASE_URL` dan `DIRECT_URL` lokal mengarah ke database/branch Production yang benar.
3. Jalankan `npx prisma migrate status`.
4. Jika migrasi lama sudah tercatat dan tidak ada failed migration, jalankan `npx prisma migrate deploy`.
5. Jalankan `npx prisma generate`, `npm run typecheck`, dan `npm run build`.
6. Push ke GitHub agar Vercel melakukan deployment.

Migrasi baru hanya membuat tabel `ReportVideo` beserta index dan foreign key. Tidak ada `DROP`, `TRUNCATE`, atau perubahan data laporan lama. Jangan gunakan `prisma migrate reset` pada Production.

Video diunggah langsung dari browser ke Cloudinary menggunakan signature server, sehingga file video tidak melewati batas body request Vercel. Tidak ada environment variable baru; konfigurasi Cloudinary yang sudah ada tetap digunakan.
