CIVICSENSE PATCH — KOTAK MASUK & PESAN PRIVAT

Cara pakai:
1. Buat backup repository GitHub Anda terlebih dahulu.
2. Ekstrak isi ZIP ini ke root repository CivicSense yang berisi package.json.
3. Izinkan folder dan file dengan nama sama untuk ditimpa.
4. Commit dan push ke GitHub yang terhubung ke Vercel.
5. Backup/branch Neon, lalu dari root proyek jalankan:
   npm install
   npx prisma generate
   npx prisma migrate deploy
   npm run typecheck
   npm run build
6. Redeploy Vercel.

Tidak ada package baru dan tidak ada environment variable baru.
Migration baru: prisma/migrations/20261114110000_inbox_messaging/migration.sql
Jangan jalankan prisma migrate reset pada database produksi.

Paket patch hanya berisi file yang berubah/baru. Jika ingin versi proyek utuh, gunakan ZIP CivicSense_Kotak_Masuk_Pesan_Privat_Vercel_Neon_Cloudinary.
