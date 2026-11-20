import { NextResponse } from "next/server";

// Endpoint video Cloudinary lama dinonaktifkan supaya semua klien memakai S3.
export async function POST() {
  return NextResponse.json({ error: "Fitur unggah video telah berpindah. Muat ulang CivicSense lalu coba lagi." }, { status: 410 });
}
