# CivicSense — Patch Optimasi Performa

Tanggal: 20 November 2026

Patch ini ditujukan untuk source code CivicSense yang diberikan pada 20 November 2026. Fokusnya mengurangi pemanggilan API dan query berulang, memperbaiki polling chat, serta mempercepat beberapa proses unggah. Patch tidak mengubah skema Prisma dan tidak menjalankan migrasi database.

## Perubahan yang diterapkan

1. **Region Vercel dikunci ke Singapura (`sin1`)** melalui `vercel.json`. Ini menyamakan konfigurasi source dengan region Functions yang dikonfirmasi pemilik proyek.
2. **Session dibaca dengan kolom minimum** dan `currentUser()` memakai React `cache()` agar pemanggilan berulang dalam satu render server dapat dibagikan. Kolom password tidak lagi diambil untuk kebutuhan layout/halaman.
3. **Kategori aktif di-cache selama 5 menit** melalui `unstable_cache`, untuk kategori navigasi, filter Jelajahi, dan formulir laporan.
4. **Polling badge Kotak Masuk disatukan** melalui `InboxCountProvider`. Navigasi desktop dan mobile sekarang memakai satu timer bersama, bukan masing-masing menjalankan polling. Interval berubah dari 20 detik menjadi 45 detik, dengan refresh saat tab kembali aktif atau setelah status baca diperbarui.
5. **Polling chat dioptimalkan** dari 6 detik menjadi 10 detik, tidak berjalan ketika tab tidak terlihat, dan mencegah polling tumpang tindih.
6. **Pengambilan pesan chat bersifat incremental** menggunakan timestamp dan ID pesan; daftar read receipt hanya diperiksa untuk ID pesan milik pengguna yang masih menunggu centang biru. Ini menghindari pengambilan ulang 100 read receipt pada setiap polling.
7. **Pemeriksaan foto laporan diparalelkan** setelah validasi kepemilikan dan pemeriksaan duplikasi dikumpulkan menjadi query `findMany`. Pemeriksaan foto bukti penyelesaian juga dijalankan paralel.
8. **Unggah beberapa foto dibatasi dua proses paralel**, sehingga lebih cepat daripada unggah berurutan tanpa membanjiri browser/Cloudinary.
9. **Prisma Client tidak digenerate dua kali saat build**. `postinstall` tetap menjalankan `prisma generate`; perintah build cukup menjalankan `next build`.

## File yang berubah

- `vercel.json`
- `package.json`
- `src/lib/session.ts`
- `src/lib/community.ts`
- `src/components/community/forum-shell.tsx`
- `src/components/community/inbox-count-provider.tsx` (baru)
- `src/components/community/inbox-nav-link.tsx`
- `src/components/community/chat-view.tsx`
- `src/components/community/inbox-view.tsx`
- `src/app/api/inbox/conversations/[id]/messages/route.ts`
- `src/services/report.service.ts`
- `src/components/reports/image-uploader.tsx`
- `src/app/(dashboard)/reports/new/page.tsx`
- `src/app/(public)/reports/page.tsx`

## Dampak pada database dan penyimpanan

- Tidak ada perubahan `prisma/schema.prisma`.
- Tidak ada file migration baru.
- Tidak menjalankan `prisma migrate`, `db push`, `migrate reset`, atau operasi penghapusan data.
- Tidak mengubah `DATABASE_URL`, `DIRECT_URL`, Cloudinary credentials, atau S3/IDCloudHost credentials.
- Tidak mengubah data Neon, foto Cloudinary, atau video IDCloudHost.
- Tidak menambahkan environment variable baru.

## Cara menerapkan dengan aman

1. Buat salinan/backup folder source code lokal yang sekarang.
2. Ekstrak ZIP optimasi ke folder baru, jangan langsung menimpa folder kerja lama.
3. Pertahankan file `.env` lokal Anda sendiri; file itu memang tidak disertakan dalam ZIP.
4. Dari folder proyek hasil ekstrak, jalankan:

   ```bash
   npm ci
   npm run typecheck
   npm run build
   ```

5. Jika kedua pemeriksaan berhasil, uji secara lokal: login warga, petugas, admin; navigasi desktop/mobile; badge Kotak Masuk; kirim/baca pesan dan centang biru; buat laporan dengan foto; buat laporan dengan video; ubah status laporan; serta buka peta dan profil.
6. Push ke branch uji atau gunakan Preview Deployment Vercel terlebih dahulu. Jangan langsung mengganti deployment produksi sebelum uji fitur selesai.
7. Jika Preview Deployment lolos, baru merge/push ke branch produksi.

**Jangan menjalankan** `npx prisma migrate reset`, `prisma db push`, atau migrasi lain untuk patch performa ini.

## Status pemeriksaan pada saat paket dibuat

- Seluruh 92 file TypeScript/TSX berhasil melalui pemeriksaan transpile sintaks.
- `package.json` dan `vercel.json` berhasil diparse sebagai JSON.
- Full `npm ci`, TypeScript typecheck, dan Next.js production build belum dapat dijalankan di lingkungan pembuatan patch karena akses ke npm registry gagal dengan `EAI_AGAIN`. Karena itu, jalankan tiga perintah pada langkah penerapan sebelum deploy.

## Catatan teknis

- Pengurangan request badge diperkirakan signifikan untuk sesi yang memuat navigasi desktop dan mobile bersamaan; angka aktual harus dibandingkan di Vercel setelah deployment.
- Polling chat menjadi sedikit lebih jarang (10 detik). Pesan tetap diperbarui saat tab aktif dan ketika pengguna kembali ke tab chat.
- Kategori dapat tertinggal hingga 5 menit setelah perubahan karena cache. Jika kelak ada fitur pengelolaan kategori, tambahkan invalidasi tag `civicsense-categories` pada proses perubahan kategori.
- Patch ini tidak mengklaim menjamin seluruh aplikasi langsung cepat; pengukuran setelah Preview Deployment tetap diperlukan untuk mengisolasi TTFB, latency database, dan beban browser.
