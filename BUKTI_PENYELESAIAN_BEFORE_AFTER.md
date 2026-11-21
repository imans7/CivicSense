# CivicSense — Bukti Penyelesaian Before & After

## Perilaku fitur

- Petugas hanya dapat menyelesaikan laporan yang memang ditugaskan kepadanya dan sudah berstatus `IN_PROGRESS`.
- Saat memilih status `RESOLVED`, petugas wajib mengunggah tepat satu foto **Before** dan tepat satu foto **After**.
- Tombol simpan dinonaktifkan sampai kedua foto tersedia.
- API memvalidasi ulang kedua foto di server: keduanya wajib berasal dari folder Cloudinary milik akun yang sedang masuk, harus merupakan dua `publicId` berbeda, belum pernah dipakai pada laporan lain, dan benar-benar tersedia di Cloudinary.
- Status, riwayat, dan satu pasangan bukti disimpan dalam satu transaksi database. Jika transaksi gagal, status tidak berubah menjadi selesai.
- Foto Before dan After ditampilkan pada feed/laporan warga, detail laporan, panel administrator, serta riwayat pekerjaan petugas. Foto dapat diklik untuk diperbesar.
- Bukti penyelesaian lama yang hanya memiliki satu foto `RESOLUTION` tetap disimpan. Foto lama tetap ditampilkan sebagai bukti lama pada riwayat petugas; data lama tidak dihapus atau diubah.

## Penyimpanan

- File foto tetap disimpan di Cloudinary pada folder `civicsense/resolution/<userId>/`.
- Neon/PostgreSQL menyimpan URL, Cloudinary public ID, MIME type, ukuran file, laporan terkait, akun pengunggah, dan waktu unggah.
- Video tetap menggunakan IDCloudHost Object Storage. Perubahan ini tidak mengubah konfigurasi atau file video.

## Perubahan database yang aman

Migrasi `20261121100000_report_completion_before_after` hanya membuat tabel baru `ReportCompletionEvidence`, indeks unik, dan foreign key. Migrasi tidak menghapus atau mengubah tabel maupun baris data yang sudah ada. Satu baris menyimpan kedua foto sekaligus, sehingga aplikasi tidak dapat mencatat bukti penyelesaian yang hanya berisi salah satu foto.

**Jangan menjalankan** `prisma migrate reset`, `prisma db push`, atau menghapus tabel/database Neon.

## Langkah penerapan

1. Simpan salinan source code saat ini. Buat backup atau Neon branch sebelum menjalankan migrasi produksi.
2. Ekstrak source code hasil pembaruan ke folder baru. Pertahankan `.env` lokal milik Anda; file kredensial tidak disertakan dalam paket.
3. Pastikan `DATABASE_URL` mengarah ke koneksi pooled Neon dan `DIRECT_URL` mengarah ke koneksi direct Neon. Jangan mengirim atau membagikan isi `.env`.
4. Jalankan:

   ```bash
   npm ci
   npx prisma generate
   npx prisma migrate status
   ```

   Pastikan migration lama yang sesuai dengan database Neon sudah tercatat sebagai applied. Jika hanya migration `20261121100000_report_completion_before_after` yang pending, lanjutkan:

   ```bash
   npx prisma migrate deploy
   npm run typecheck
   npm run build
   ```

   Jika migration yang lebih lama juga berstatus pending, **jangan lanjutkan dulu**. Simpan output `npx prisma migrate status` dan periksa riwayat database agar tidak terjadi konflik dengan tabel yang sudah ada.

5. Pastikan pemeriksaan TypeScript dan build berhasil. Setelah itu push source code ke GitHub dan uji melalui Preview Deployment Vercel terlebih dahulu.
6. Uji alur dengan akun petugas: buka tugas `IN_PROGRESS`, pilih `Selesai`, unggah satu foto Before dan satu foto After, lalu simpan.
7. Periksa akun warga pemilik laporan dan akun admin. Pastikan kedua foto tampil pada feed/detail laporan dan panel admin, serta dapat dibuka dalam tampilan besar.
8. Coba mengirim permintaan penyelesaian tanpa salah satu foto. Server harus menolak dan status laporan harus tetap `IN_PROGRESS`.

## File utama yang berubah

- `prisma/schema.prisma`
- `prisma/migrations/20261121100000_report_completion_before_after/migration.sql`
- `src/lib/validators.ts`
- `src/services/report.service.ts`
- `src/services/image.service.ts`
- `src/components/status-control.tsx`
- `src/components/community/completion-evidence-gallery.tsx` (baru)
- `src/lib/community.ts`
- `src/components/community/post-card.tsx`
- `src/components/community/feed.tsx`
- `src/app/(dashboard)/admin/page.tsx`
- `src/app/(dashboard)/officer/page.tsx`
- `src/app/(dashboard)/officer/history/page.tsx`
- `src/app/globals.css`
- `README.md`

## Batas pengujian

Paket ini disiapkan tanpa mengakses database produksi dan tanpa menjalankan migrasi pada Neon. Migrasi perlu diterapkan oleh pemilik proyek setelah backup/branch tersedia. Uji integrasi Cloudinary dan deployment harus dilakukan pada Preview Deployment dengan environment variables proyek Anda.
