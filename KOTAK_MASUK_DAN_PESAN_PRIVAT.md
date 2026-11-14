# CivicSense — Kotak Masuk & Pesan Privat

Tanggal: 14 November 2026

## Fitur
- Tab Aktivitas: notifikasi ketika pengguna lain mengomentari laporan milik akun.
- Tab Pesan: daftar percakapan privat satu lawan satu.
- Tombol Kirim pesan pada profil publik akun lain.
- Chat teks dengan polling 4 detik agar cocok dengan Vercel serverless.
- Lencana merah pada navigasi desktop dan mobile berisi jumlah notifikasi komentar + pesan yang belum dibaca.
- Status baca untuk notifikasi dan pesan.
- Berlaku bagi Warga, Petugas, dan Admin. Role admin tidak memberi akses khusus ke pesan privat milik orang lain.

## Rute
- `/inbox` — daftar notifikasi dan percakapan.
- `/inbox/[conversationId]` — ruang chat.
- `POST /api/inbox/conversations` — membuat/mengambil percakapan dengan pengguna lain.
- `GET/POST /api/inbox/conversations/[id]/messages` — mengambil/mengirim pesan.
- `POST /api/inbox/conversations/[id]/read` — tandai pesan masuk sebagai dibaca.
- `POST /api/inbox/notifications/read` — tandai semua notifikasi aktivitas sebagai dibaca.
- `GET /api/inbox/unread-count` — angka lencana navigasi.

## Privasi dan pembatasan
- Setiap endpoint chat memeriksa sesi dan keanggotaan percakapan.
- Pengguna tidak dapat mengirim pesan ke dirinya sendiri atau akun nonaktif.
- Admin/petugas tidak dapat membaca percakapan yang bukan miliknya.
- Isi pesan teks maksimum 2.000 karakter.
- Rate limit dan Origin check diterapkan pada endpoint mutasi.

## Migrasi Neon
`prisma/migrations/20261114110000_inbox_messaging/migration.sql`

Backup/branch Neon, kemudian jalankan dari root proyek:
```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run typecheck
npm run build
```

Tidak memerlukan environment variable baru. Jangan menjalankan `prisma migrate reset` pada database produksi.
